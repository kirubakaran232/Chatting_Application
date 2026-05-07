import { Router } from "express";
import { firebaseLogin, login, loginRules, me, signup, signupRules, updateProfile } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

export const authRoutes = Router();

authRoutes.post("/signup", signupRules, validate, signup);
authRoutes.post("/login", loginRules, validate, login);
authRoutes.post("/firebase", firebaseLogin);
authRoutes.get("/me", protect, me);
authRoutes.patch("/profile", protect, updateProfile);
