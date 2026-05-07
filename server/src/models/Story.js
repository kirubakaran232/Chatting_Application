import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["text", "image", "video"], required: true },
    text: String,
    media: {
      url: String,
      publicId: String,
      format: String
    },
    visibility: { type: String, enum: ["public", "selected"], default: "public" },
    allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    background: String,
    viewers: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, at: Date }],
    reactions: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, emoji: String, at: Date }],
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), index: { expires: 0 } }
  },
  { timestamps: true }
);

export const Story = mongoose.model("Story", storySchema);
