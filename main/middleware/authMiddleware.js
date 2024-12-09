import jwt from "jsonwebtoken";
import db from "../../prisma/database.js"; // Adjust to your database setup
import { config } from "dotenv";

config(); // Load environment variables

/**
 * Middleware to authenticate a user via JWT token.
 * It verifies the token, decodes it, and fetches the user from the database.
 */
export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Expecting Bearer token

  if (!token) {
    console.log("No token provided");
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded);

    const userId = decoded.id;

    // Fetch user from database
    const query = "SELECT * FROM User WHERE id = ?";
    const user = await db.prepare(query).get(userId);

    if (!user) {
      console.log(`User not found for ID: ${userId}`);
      return res.status(404).json({ error: "User not found." });
    }

    console.log("Authenticated User:", user);
    req.user = user; // Attach user details to request object
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(403).json({ error: "Invalid token or authentication failed." });
  }
};

/**
 * Middleware to authorize admin users.
 * Ensures the authenticated user has an `admin` role.
 */
export const authorizeAdmin = (req, res, next) => {
  console.log("User Role for Authorization:", req.user?.role);

  if (req.user.role !== "admin") {
    console.log("Access denied. Not an admin.");
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  console.log("Authorization successful for admin.");
  next();
};

/**
 * Middleware to authorize seller users.
 * Ensures the authenticated user has a `seller` role.
 */
export const authorizeSeller = (req, res, next) => {
  console.log("User Role for Authorization:", req.user?.role);

  if (req.user.role !== "seller") {
    console.log("Access denied. Not a seller.");
    return res.status(403).json({ error: "Access denied. Sellers only." });
  }

  console.log("Authorization successful for seller.");
  next();
};

/**
 * Middleware to authorize buyer users.
 * Ensures the authenticated user has a `buyer` role.
 */
export const authorizeBuyer = (req, res, next) => {
  console.log("User Role for Authorization:", req.user?.role);

  if (req.user.role !== "buyer") {
    console.log("Access denied. Not a buyer.");
    return res.status(403).json({ error: "Access denied. Buyers only." });
  }

  console.log("Authorization successful for buyer.");
  next();
};
