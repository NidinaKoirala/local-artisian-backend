import jwt from "jsonwebtoken";
import db from "../../prisma/database.js"; // Adjust to your Turso client setup
import { config } from "dotenv";

config(); // Load environment variables

// Middleware to verify the token and set `req.user`
export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Expecting Bearer token

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    // Fetch user details from the database
    const query = "SELECT * FROM User WHERE id = ?";
    const user = await db.prepare(query).get(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    req.user = user; // Attach user details to the request
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(403).json({ error: "Invalid token or authentication failed." });
  }
};

// Middleware to authorize only admin users
export const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }
  next();
};
