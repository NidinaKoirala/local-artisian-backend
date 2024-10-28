import express from "express";
import bcrypt from "bcryptjs";
import db from "../../prisma/database.js";
import passport from "../../passport/passportConfig.js";

const router = express.Router();

router.get("/sign-up", (req, res) => res.render("sign-up-form"));

// Prepared statement for inserting a new user
const insertUserStmt = db.prepare(
  "INSERT INTO User (username, email, password) VALUES (?, ?, ?)"
);

router.post("/sign-up", (req, res, next) => {
  const { username, email, password } = req.body;

  // Basic input validation to avoid undefined values
  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Hash the password
    bcrypt.hash(password, 10, async (err, hashedPassword) => {
      if (err) {
        console.error("Error hashing password:", err);
        return res.status(500).json({ error: "Error hashing password" });
      }

      // Logging values for debugging, be careful not to log sensitive data in production
      console.log("Inserting user with:", { username, email });

      try {
        // Execute the insert statement with the callback function
        insertUserStmt.run(username, email, hashedPassword, function (err) {
          if (err) {
            console.error("Database insertion error:", err);
            return res.status(500).json({ error: "Error inserting user into database" });
          }

          // Send success response only after confirming insertion
          console.log("User registered successfully");
          res.status(201).json({ message: "User registered successfully" });
        });
      } catch (err) {
        console.error("Error executing statement:", err);
        return res.status(500).json({ error: "Database execution error" });
      }
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return next(err);
  }
});

router.post("/log-in", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    req.login(user, (loginErr) => {
      if (loginErr) {
        return res.status(500).json({ error: "Login failed" });
      }
      return res.status(200).json({ message: "Login successful", user });
    });
  })(req, res, next);
});

router.post("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.status(200).json({ message: "Logged out successfully" });
  });
});

export default router;
