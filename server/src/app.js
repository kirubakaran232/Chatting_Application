import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { authRoutes } from "./routes/authRoutes.js";
import { chatRoutes } from "./routes/chatRoutes.js";
import { messageRoutes } from "./routes/messageRoutes.js";
import { storyRoutes } from "./routes/storyRoutes.js";
import { userRoutes } from "./routes/userRoutes.js";

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "2mb" }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRoutes);
  app.use("/api/chats", chatRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/stories", storyRoutes);
  app.use("/api/users", userRoutes);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || "Server error" });
  });

  return app;
}
