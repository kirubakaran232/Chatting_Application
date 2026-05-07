import { Router } from "express";
import { blockUser, searchUsers } from "../controllers/userController.js";
import { protect } from "../middleware/auth.js";

export const userRoutes = Router();

userRoutes.use(protect);
userRoutes.get("/search", searchUsers);
userRoutes.patch("/:username/block", blockUser);
