import { Story } from "../models/Story.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listStories = asyncHandler(async (_req, res) => {
  const stories = await Story.find({ expiresAt: { $gt: new Date() } }).populate("author", "username displayName avatar");
  res.json({ stories });
});

export const createStory = asyncHandler(async (req, res) => {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const story = await Story.create({ ...req.body, author: req.user._id, expiresAt });
  await story.populate("author", "username displayName avatar");
  req.app.get("io").emit("story:new", story);
  res.status(201).json({ story });
});

export const deleteStory = asyncHandler(async (req, res) => {
  const story = await Story.findOne({ _id: req.params.storyId, author: req.user._id });
  if (!story) return res.status(404).json({ message: "Story not found" });
  await story.deleteOne();
  req.app.get("io").emit("story:deleted", { storyId: req.params.storyId });
  res.json({ message: "Story deleted" });
});

export const reactStory = asyncHandler(async (req, res) => {
  const story = await Story.findById(req.params.storyId);
  if (!story) return res.status(404).json({ message: "Story not found" });
  story.reactions.push({ user: req.user._id, emoji: req.body.emoji, at: new Date() });
  await story.save();
  res.json({ story });
});
