import { Router } from "express";
import { chatAction, createGroup, getMessages, listChats, lockChat, startDirectChat, unlockChat } from "../controllers/chatController.js";
import { sendMessage } from "../controllers/messageController.js";
import { protect } from "../middleware/auth.js";

export const chatRoutes = Router();

chatRoutes.use(protect);
chatRoutes.get("/", listChats);
chatRoutes.post("/direct", startDirectChat);
chatRoutes.post("/groups", createGroup);
chatRoutes.get("/:chatId/messages", getMessages);
chatRoutes.post("/:chatId/messages", sendMessage);
chatRoutes.post("/:chatId/lock", lockChat);
chatRoutes.post("/:chatId/unlock", unlockChat);
chatRoutes.patch("/:chatId/action", chatAction);
