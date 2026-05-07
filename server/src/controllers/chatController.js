import bcrypt from "bcryptjs";
import { Chat } from "../models/Chat.js";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({ members: req.user._id })
    .populate("members", "username displayName avatar status lastSeen")
    .populate({ path: "lastMessage", populate: { path: "sender", select: "username displayName avatar" } })
    .sort({ updatedAt: -1 });
  res.json({ chats });
});

export const startDirectChat = asyncHandler(async (req, res) => {
  const other = await User.findOne({ username: req.body.username?.toLowerCase() });
  if (!other) return res.status(404).json({ message: "User not found" });
  let chat = await Chat.findOne({ type: "direct", members: { $all: [req.user._id, other._id] } });
  if (!chat) chat = await Chat.create({ type: "direct", members: [req.user._id, other._id] });
  await chat.populate("members", "username displayName avatar status lastSeen");
  res.status(201).json({ chat });
});

export const createGroup = asyncHandler(async (req, res) => {
  const users = await User.find({ username: { $in: req.body.usernames || [] } });
  const memberIds = [...new Set([req.user._id.toString(), ...users.map((u) => u._id.toString())])];
  const chat = await Chat.create({ type: "group", name: req.body.name, members: memberIds, admins: [req.user._id] });
  await chat.populate("members", "username displayName avatar status lastSeen");
  res.status(201).json({ chat });
});

export const getMessages = asyncHandler(async (req, res) => {
  const chat = await Chat.findOne({ _id: req.params.chatId, members: req.user._id });
  if (!chat) return res.status(404).json({ message: "Chat not found" });
  const messages = await Message.find({ chat: chat._id, deletedFor: { $ne: req.user._id } })
    .populate("sender", "username displayName avatar")
    .populate("replyTo")
    .sort({ createdAt: -1 })
    .limit(Number(req.query.limit) || 50);
  res.json({ messages: messages.reverse() });
});

export const lockChat = asyncHandler(async (req, res) => {
  const { pin } = req.body;
  if (!pin || String(pin).length < 4) return res.status(422).json({ message: "PIN must be at least 4 digits" });
  const chat = await Chat.findOne({ _id: req.params.chatId, members: req.user._id });
  if (!chat) return res.status(404).json({ message: "Chat not found" });
  chat.lockedBy = chat.lockedBy.filter((item) => item.user.toString() !== req.user._id.toString());
  chat.lockedBy.push({ user: req.user._id, pinHash: await bcrypt.hash(String(pin), 12) });
  await chat.save();
  res.json({ message: "Chat locked" });
});

export const unlockChat = asyncHandler(async (req, res) => {
  const chat = await Chat.findOne({ _id: req.params.chatId, members: req.user._id });
  const lock = chat?.lockedBy.find((item) => item.user.toString() === req.user._id.toString());
  if (!lock || !(await bcrypt.compare(String(req.body.pin), lock.pinHash))) {
    return res.status(401).json({ message: "Invalid PIN" });
  }
  res.json({ message: "Unlocked" });
});

export const chatAction = asyncHandler(async (req, res) => {
  const field = { pin: "pinnedBy", archive: "archivedBy", report: "reportedBy" }[req.body.action];
  if (!field) return res.status(422).json({ message: "Unsupported action" });
  const chat = await Chat.findOne({ _id: req.params.chatId, members: req.user._id });
  if (!chat) return res.status(404).json({ message: "Chat not found" });
  const exists = chat[field].some((id) => id.toString() === req.user._id.toString());
  chat[field] = exists ? chat[field].filter((id) => id.toString() !== req.user._id.toString()) : [...chat[field], req.user._id];
  await chat.save();
  res.json({ chat });
});
