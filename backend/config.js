import dotenv from "dotenv";
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
export const SESSION_USER_CAP = process.env.SESSION_USER_CAP || "10";
