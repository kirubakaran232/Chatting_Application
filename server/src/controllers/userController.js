import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const searchUsers = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").toLowerCase();
  const users = await User.find({
    _id: { $ne: req.user._id },
    $or: [{ username: new RegExp(q, "i") }, { displayName: new RegExp(q, "i") }]
  })
    .select("username displayName avatar status")
    .limit(20);
  res.json({ users });
});

export const blockUser = asyncHandler(async (req, res) => {
  const target = await User.findOne({ username: req.params.username.toLowerCase() });
  if (!target) return res.status(404).json({ message: "User not found" });
  const exists = req.user.blockedUsers.some((id) => id.toString() === target._id.toString());
  req.user.blockedUsers = exists
    ? req.user.blockedUsers.filter((id) => id.toString() !== target._id.toString())
    : [...req.user.blockedUsers, target._id];
  await req.user.save();
  res.json({ blockedUsers: req.user.blockedUsers });
});
