import express from "express";
import bcrypt from "bcryptjs";
import db from "../../prisma/database.js";
import passport from "../../passport/passportConfig.js";

const router = express.Router();

router.get("/sign-up", (req, res) => res.render("sign-up-form"));

const insertUserStmt = db.prepare(
  "INSERT INTO User (username, email, password) VALUES (?, ?, ?)"
);

router.post("/sign-up", (req, res, next) => {
  try {
    bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
      if (err) {
        return res.status(500).json({ error: "Error hashing password" });
      }

      try {
        insertUserStmt.run(req.body.username, req.body.email, hashedPassword);
        res.status(201).json({ message: "User registered successfully" });
      } catch (err) {
        res.status(500).json({ error: "Error inserting user into database" });
      }
    });
  } catch (err) {
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
