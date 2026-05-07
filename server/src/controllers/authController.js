import { body } from "express-validator";
import { admin, firebaseAdmin } from "../config/firebase.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signToken } from "../utils/tokens.js";

export const signupRules = [
  body("username").isLength({ min: 3, max: 24 }).matches(/^[a-zA-Z0-9_]+$/),
  body("displayName").isLength({ min: 2, max: 60 }),
  body("email").isEmail(),
  body("password").isLength({ min: 8 })
];

export const loginRules = [body("identifier").notEmpty(), body("password").notEmpty()];

function authResponse(user) {
  const safeUser = user.toObject ? user.toObject() : user;
  delete safeUser.password;
  return { token: signToken(user), user: safeUser };
}

export const signup = asyncHandler(async (req, res) => {
  const { username, displayName, email, password } = req.body;
  const exists = await User.findOne({ $or: [{ email }, { username: username.toLowerCase() }] });
  if (exists) return res.status(409).json({ message: "Email or username already exists" });
  const user = await User.create({ username, displayName, email, password, profileComplete: true });
  res.status(201).json(authResponse(user));
});

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }]
  }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  res.json(authResponse(user));
});

export const firebaseLogin = asyncHandler(async (req, res) => {
  if (!firebaseAdmin) return res.status(503).json({ message: "Firebase Admin is not configured" });
  const decoded = await admin.auth().verifyIdToken(req.body.idToken);
  let user = await User.findOne({ $or: [{ firebaseUid: decoded.uid }, { email: decoded.email }] });
  if (!user) {
    const base = decoded.email?.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "") || "user";
    const username = `${base}${Math.floor(Math.random() * 10000)}`.toLowerCase();
    user = await User.create({
      username,
      displayName: decoded.name || username,
      email: decoded.email,
      firebaseUid: decoded.uid,
      avatar: decoded.picture,
      profileComplete: false
    });
  }
  res.json(authResponse(user));
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ["displayName", "bio", "avatar", "username"];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) req.user[key] = req.body[key];
  });

  if (req.body.storyPrivacy?.mode) {
    req.user.storyPrivacy = req.user.storyPrivacy || { mode: "public", allowedUsers: [] };
    req.user.storyPrivacy.mode = req.body.storyPrivacy.mode === "selected" ? "selected" : "public";
    req.user.storyPrivacy.allowedUsers =
      req.user.storyPrivacy.mode === "selected" && Array.isArray(req.body.storyPrivacy.allowedUsers)
        ? req.body.storyPrivacy.allowedUsers
        : [];
  }

  req.user.profileComplete = Boolean(req.user.displayName && req.user.username);
  await req.user.save();
  res.json({ user: req.user });
});
