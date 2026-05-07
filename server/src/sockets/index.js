import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { Chat } from "../models/Chat.js";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";

const onlineUsers = new Map();

export function registerSockets(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const decoded = jwt.verify(token, env.jwtSecret);
      socket.user = await User.findById(decoded.id);
      if (!socket.user) return next(new Error("Unauthorized"));
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = String(socket.user._id);
    onlineUsers.set(userId, socket.id);
    await User.findByIdAndUpdate(userId, { status: "online" });
    io.emit("presence:update", { userId, status: "online" });

    const chats = await Chat.find({ members: userId }).select("_id");
    chats.forEach((chat) => socket.join(String(chat._id)));

    socket.on("chat:join", async ({ chatId }) => {
      const chat = await Chat.findOne({ _id: chatId, members: userId });
      if (chat) socket.join(String(chatId));
    });

    socket.on("typing:start", ({ chatId }) => socket.to(String(chatId)).emit("typing:start", { chatId, user: socket.user }));
    socket.on("typing:stop", ({ chatId }) => socket.to(String(chatId)).emit("typing:stop", { chatId, userId }));

    socket.on("message:delivered", async ({ messageId }) => {
      const message = await Message.findByIdAndUpdate(
        messageId,
        { $addToSet: { deliveredTo: { user: userId, at: new Date() } } },
        { new: true }
      );
      if (message) io.to(String(message.chat)).emit("message:delivered", { messageId, userId });
    });

    socket.on("message:seen", async ({ chatId }) => {
      await Message.updateMany(
        { chat: chatId, "seenBy.user": { $ne: userId } },
        { $addToSet: { seenBy: { user: userId, at: new Date() } } }
      );
      socket.to(String(chatId)).emit("message:seen", { chatId, userId });
    });

    socket.on("call:offer", (payload) => socket.to(String(payload.chatId)).emit("call:offer", { ...payload, from: userId }));
    socket.on("call:answer", (payload) => socket.to(String(payload.chatId)).emit("call:answer", { ...payload, from: userId }));
    socket.on("call:ice", (payload) => socket.to(String(payload.chatId)).emit("call:ice", { ...payload, from: userId }));
    socket.on("call:end", (payload) => socket.to(String(payload.chatId)).emit("call:end", { ...payload, from: userId }));

    socket.on("disconnect", async () => {
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, { status: "offline", lastSeen: new Date() });
      io.emit("presence:update", { userId, status: "offline", lastSeen: new Date() });
    });
  });
}
