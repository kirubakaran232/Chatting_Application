import { Router } from "express";
import { aiTools, deleteForEveryone, deleteForMe, reactToMessage, uploadMedia } from "../controllers/messageController.js";
import { protect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

export const messageRoutes = Router();

messageRoutes.use(protect);
messageRoutes.post("/upload", upload.single("file"), uploadMedia);
messageRoutes.post("/ai", aiTools);
messageRoutes.patch("/:messageId/reaction", reactToMessage);
messageRoutes.delete("/:messageId/me", deleteForMe);
messageRoutes.delete("/:messageId/everyone", deleteForEveryone);
