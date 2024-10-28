import express from "express";
import bcrypt from "bcryptjs";
import db from "../../prisma/database.js"; // Points to Turso client setup
import passport from "../../passport/passportConfig.js";

const router = express.Router();

router.get("/sign-up", (req, res) => res.render("sign-up-form"));

router.post("/sign-up", async (req, res, next) => {
  const { username, email, password } = req.body;

  if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: "Invalid input types" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const usernameStr = String(username);
    const emailStr = String(email);
    const hashedPasswordStr = String(hashedPassword);

    console.log("Inserting user with values:", { usernameStr, emailStr, hashedPasswordStr });

    // Insert user data using Turso client
    try {
      await db.execute(
        "INSERT INTO User (username, email, password) VALUES (?, ?, ?)",
        [usernameStr, emailStr, hashedPasswordStr]
      );
      console.log("User registered successfully");
      res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
      console.error("Database insertion error:", err);
      return res.status(500).json({ error: "Error inserting user into database" });
    }
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
