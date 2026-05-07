import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String,
    type: { type: String, enum: ["image", "video", "audio", "file"], default: "file" },
    name: String,
    size: Number,
    format: String,
    duration: Number,
    hd: { type: Boolean, default: false }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    attachments: [attachmentSchema],
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    reactions: [
      {
        emoji: String,
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
      }
    ],
    deliveredTo: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, at: Date }],
    seenBy: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, at: Date }],
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deletedForEveryone: { type: Boolean, default: false },
    selfDestructAt: Date,
    scheduledFor: Date,
    poll: {
      question: String,
      options: [{ text: String, votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }] }]
    },
    spamScore: { type: Number, default: 0 }
  },
  { timestamps: true }
);

messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ text: "text" });

export const Message = mongoose.model("Message", messageSchema);
