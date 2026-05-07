import { cloudinary } from "../config/cloudinary.js";
import { Chat } from "../models/Chat.js";
import { Message } from "../models/Message.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ai } from "../utils/ai.js";

function resourceType(mime) {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "video";
  return "raw";
}

function attachmentType(mime) {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

export const uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(422).json({ message: "File is required" });
  const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  const uploaded = await cloudinary.uploader.upload(dataUri, {
    folder: "realtime-ai-chat",
    resource_type: resourceType(req.file.mimetype),
    quality: "auto:best"
  });
  res.status(201).json({
    attachment: {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      type: attachmentType(req.file.mimetype),
      name: req.file.originalname,
      size: req.file.size,
      format: uploaded.format,
      hd: true
    }
  });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const chat = await Chat.findOne({ _id: req.params.chatId, members: req.user._id });
  if (!chat) return res.status(404).json({ message: "Chat not found" });
  const message = await Message.create({
    chat: chat._id,
    sender: req.user._id,
    text: req.body.text,
    attachments: req.body.attachments || [],
    replyTo: req.body.replyTo,
    scheduledFor: req.body.scheduledFor,
    selfDestructAt: req.body.selfDestructAt,
    poll: req.body.poll,
    spamScore: 0
  });
  chat.lastMessage = message._id;
  await chat.save();
  await message.populate("sender", "username displayName avatar");
  const io = req.app.get("io");
  io.to(String(chat._id)).emit("message:new", message);
  chat.members.forEach((memberId) => io.to(String(memberId)).emit("chat:updated", { chatId: chat._id, lastMessage: message }));
  res.status(201).json({ message });
});

export const reactToMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.messageId);
  if (!message) return res.status(404).json({ message: "Message not found" });
  message.reactions = message.reactions.filter((r) => r.user.toString() !== req.user._id.toString());
  if (req.body.emoji) message.reactions.push({ emoji: req.body.emoji, user: req.user._id });
  await message.save();
  req.app.get("io").to(String(message.chat)).emit("message:reaction", { messageId: message._id, reactions: message.reactions });
  res.json({ message });
});

export const deleteForEveryone = asyncHandler(async (req, res) => {
  const message = await Message.findOne({ _id: req.params.messageId, sender: req.user._id });
  if (!message) return res.status(404).json({ message: "Message not found" });
  message.deletedForEveryone = true;
  message.text = "";
  message.attachments = [];
  await message.save();
  req.app.get("io").to(String(message.chat)).emit("message:deleted", { messageId: message._id });
  res.json({ message: "Deleted" });
});

export const aiTools = asyncHandler(async (req, res) => {
  try {
    const { action, text, language, chatId } = req.body;
    if (action === "summarize") {
      const messages = await Message.find({ chat: chatId }).sort({ createdAt: -1 }).limit(80).populate("sender", "displayName");
      const transcript = messages.reverse().map((m) => `${m.sender.displayName}: ${m.text}`).join("\n");
      return res.json({ result: await ai.summarize(transcript) });
    }
    if (action === "suggest") return res.json({ result: await ai.suggestReply(text) });
    if (action === "translate") return res.json({ result: await ai.translate(text, language || "English") });
    return res.status(422).json({ message: "Unknown AI action" });
  } catch (error) {
    console.error(error);
    return res.status(503).json({ message: "AI is temporarily unavailable. Normal chat still works." });
  }
});
