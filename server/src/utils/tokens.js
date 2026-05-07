import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signToken(user) {
  return jwt.sign({ id: user._id, username: user.username }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });
}
