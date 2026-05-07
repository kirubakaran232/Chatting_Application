import { Router } from "express";
import { createStory, deleteStory, listStories, reactStory } from "../controllers/storyController.js";
import { protect } from "../middleware/auth.js";

export const storyRoutes = Router();

storyRoutes.use(protect);
storyRoutes.get("/", listStories);
storyRoutes.post("/", createStory);
storyRoutes.post("/:storyId/reactions", reactStory);
storyRoutes.delete("/:storyId", deleteStory);
