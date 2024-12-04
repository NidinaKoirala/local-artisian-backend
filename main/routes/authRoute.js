import express from "express";
import bcrypt from "bcryptjs";
import db from "../../prisma/database.js"; // Points to Turso client setup
import passport from "../../passport/passportConfig.js";

const router = express.Router();

router.get("/sign-up", (req, res) => res.render("sign-up-form"));

router.post('/signup/user', async (req, res) => {
  const {
    firstName,
    lastName,
    username,
    email,
    password,
    phoneNumber,
    address,
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
    !phoneNumber ||
    !address ||
    !city ||
    !state ||
    !postalCode ||
    !country
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into User table
    const insertUserStmt = db.prepare(`
      INSERT INTO User (firstName, lastName, username, email, password, phoneNumber, addressLine1, city, state, postalCode, country, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user')
    `);

    const userResult = await insertUserStmt.run(
      firstName,
      lastName,
      username,
      email,
      hashedPassword,
      phoneNumber,
      address,
      city,
      state,
      postalCode,
      country
    );

    const userId = userResult.lastInsertRowid;

    // Insert into Buyer table
    const insertBuyerStmt = db.prepare(`
      INSERT INTO Buyer (userId, email, address, phoneNumber)
      VALUES (?, ?, ?, ?)
    `);

    await insertBuyerStmt.run(userId, email, address, phoneNumber);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error during signup as buyer:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});


router.post('/signup/seller', async (req, res) => {
  const {
    firstName,
    lastName,
    username,
    email,
    password,
    shopName,
    address,
    city,
    state,
    postalCode,
    country,
  } = req.body;

  if (
    !firstName ||
    !lastName ||
    !username ||
    !email ||
    !password ||
    !shopName ||
    !address ||
    !city ||
    !state ||
    !postalCode ||
    !country
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into User table
    const insertUserStmt = db.prepare(`
      INSERT INTO User (firstName, lastName, username, email, password, addressLine1, city, state, postalCode, country, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'seller')
    `);

    const userResult = await insertUserStmt.run(
      firstName,
      lastName,
      username,
      email,
      hashedPassword,
      address,
      city,
      state,
      postalCode,
      country
    );

    const userId = userResult.lastInsertRowid;

    // Insert into Seller table
    const insertSellerStmt = db.prepare(`
      INSERT INTO Seller (userId, email, shopName, address)
      VALUES (?, ?, ?, ?)
    `);

    await insertSellerStmt.run(userId, email, shopName, address);

    res.status(201).json({ message: 'Seller registered successfully' });
  } catch (error) {
    console.error('Error during signup as seller:', error);
    res.status(500).json({ error: 'Failed to register seller' });
  }
});


router.post('/sign-up-seller', async (req, res) => {
  const {
    firstName,
    middleName,
    lastName,
    username,
    email,
    password,
    shopName,
    shopAddress,
  } = req.body;

  console.log('Received seller signup request:', req.body);

  // Validate required fields
  if (
    !firstName ||
    !lastName ||
    !username ||
    !email ||
    !password ||
    !shopName ||
    !shopAddress
  ) {
    console.error('Missing required fields:', req.body);
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Start transaction
    await db.run('BEGIN');
    console.log('Transaction started.');

    // Insert into User table
    console.log('Inserting into User table...');
    const insertUserStmt = db.prepare(`
      INSERT INTO User (
        firstName, middleName, lastName, username, email, password, role
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const userResult = await insertUserStmt.run(
      firstName,
      middleName || null,
      lastName,
      username,
      email,
      hashedPassword,
      'seller'
    );
    const newUserId = userResult.lastInsertRowid; // Get the newly inserted user's ID
    console.log('User inserted with ID:', newUserId);

    // Insert into Seller table
    console.log('Inserting into Seller table...');
    const insertSellerStmt = db.prepare(`
      INSERT INTO Seller (userId, email, shopName, address)
      VALUES (?, ?, ?, ?)
    `);
    await insertSellerStmt.run(newUserId, email, shopName, shopAddress);
    console.log('Seller inserted successfully.');

    // Commit transaction
    await db.run('COMMIT');
    console.log('Transaction committed.');

    res.status(201).json({ message: 'Seller account created successfully' });
  } catch (error) {
    console.error('Error during seller signup:', error);

    // Rollback transaction in case of error
    try {
      console.log('Rolling back transaction...');
      await db.run('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error during rollback:', rollbackError);
    }

    res.status(500).json({ error: 'Failed to create seller account' });
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
