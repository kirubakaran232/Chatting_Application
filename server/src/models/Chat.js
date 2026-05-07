import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["direct", "group"], required: true },
    name: String,
    avatar: String,
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lockedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        pinHash: { type: String, required: true },
        lockedAt: { type: Date, default: Date.now }
      }
    ],
    reportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

chatSchema.index({ members: 1, updatedAt: -1 });

export const Chat = mongoose.model("Chat", chatSchema);
