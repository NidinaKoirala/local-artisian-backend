import { Router } from "express";
import { config } from "dotenv";
import db from "../../../prisma/database.js";

config(); // Load environment variables

const router = Router();

// Fetch all users with details
router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id, 
        u.firstName || ' ' || IFNULL(u.middleName, '') || ' ' || u.lastName AS fullName, 
        u.email, 
        u.phoneNumber, 
        u.addressLine1 || ', ' || IFNULL(u.addressLine2, '') || ', ' || u.city || ', ' || u.state || ', ' || u.postalCode || ', ' || u.country AS fullAddress, 
        u.role,
        CASE 
          WHEN s.id IS NOT NULL THEN 'Seller'
          WHEN b.id IS NOT NULL THEN 'Buyer'
          WHEN d.id IS NOT NULL THEN 'Deliverer'
          WHEN a.id IS NOT NULL THEN 'Admin'
          ELSE 'User'
        END AS userType
      FROM User u
      LEFT JOIN Seller s ON u.id = s.userId
      LEFT JOIN Buyer b ON u.id = b.userId
      LEFT JOIN Deliverer d ON u.id = d.userId
      LEFT JOIN Admin a ON u.id = a.userId
    `;
    const users = await db.prepare(query).all();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Fetch user statistics
router.get("/statistics", async (req, res) => {
  try {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM User) AS totalUsers,
        (SELECT COUNT(*) FROM Seller) AS totalSellers,
        (SELECT COUNT(*) FROM Buyer) AS totalBuyers,
        (SELECT COUNT(*) FROM Deliverer) AS totalDeliverers,
        (SELECT COUNT(*) FROM Admin) AS totalAdmins
    `;
    const stats = await db.prepare(query).get();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    res.status(500).json({ error: "Failed to fetch user statistics" });
  }
});

// Delete a user by ID
router.delete("/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const query = "DELETE FROM User WHERE id = ?";
    const result = await db.prepare(query).run(userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Update a user's details
router.put("/:id", async (req, res) => {
  const userId = req.params.id;
  const {
    firstName,
    middleName,
    lastName,
    email,
    phoneNumber,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
    role,
  } = req.body;

  try {
    const query = `
      UPDATE User
      SET 
        firstName = ?, 
        middleName = ?, 
        lastName = ?, 
        email = ?, 
        phoneNumber = ?, 
        addressLine1 = ?, 
        addressLine2 = ?, 
        city = ?, 
        state = ?, 
        postalCode = ?, 
        country = ?, 
        role = ?
      WHERE id = ?
    `;
    const result = await db.prepare(query).run(
      firstName,
      middleName,
      lastName,
      email,
      phoneNumber,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      role,
      userId
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

export default router;
