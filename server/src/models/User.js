import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    displayName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    firebaseUid: { type: String, index: true },
    avatar: String,
    bio: { type: String, default: "" },
    status: { type: String, enum: ["online", "offline", "busy"], default: "offline" },
    lastSeen: Date,
    fcmTokens: [String],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    profileComplete: { type: Boolean, default: false }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model("User", userSchema);
