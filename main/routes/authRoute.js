import express from "express";
import bcrypt from "bcryptjs";
import db from "../../prisma/database.js"; // Points to Turso client setup
import passport from "../../passport/passportConfig.js";

const router = express.Router();

router.get("/sign-up", (req, res) => res.render("sign-up-form"));

router.post("/sign-up", async (req, res, next) => {
  const {
    firstName,
    middleName,
    lastName,
    username,
    email,
    password,
    phoneNumber,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
  } = req.body;

  // Validate required fields
  if (
    !firstName ||
    !lastName ||
    !username ||
    !email ||
    !password ||
    !addressLine1 ||
    !city ||
    !state ||
    !postalCode ||
    !country
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Ensure email and username are strings
  if (typeof username !== "string" || typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Invalid input types" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare data for insertion
    const userData = {
      firstName,
      middleName: middleName || null, // Optional field
      lastName,
      username,
      email,
      password: hashedPassword,
      phoneNumber: phoneNumber || null, // Optional field
      addressLine1,
      addressLine2: addressLine2 || null, // Optional field
      city,
      state,
      postalCode,
      country,
    };

    console.log("Inserting user with values:", userData);

    // Insert user data using Turso client with `prepare().run()`
    try {
      const insertUserStmt = db.prepare(`
        INSERT INTO User (
          firstName, middleName, lastName, username, email, password, phoneNumber, 
          addressLine1, addressLine2, city, state, postalCode, country
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      await insertUserStmt.run(
        userData.firstName,
        userData.middleName,
        userData.lastName,
        userData.username,
        userData.email,
        userData.password,
        userData.phoneNumber,
        userData.addressLine1,
        userData.addressLine2,
        userData.city,
        userData.state,
        userData.postalCode,
        userData.country
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
