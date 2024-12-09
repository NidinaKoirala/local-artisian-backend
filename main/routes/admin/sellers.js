import { Router } from "express";
import { config } from "dotenv";
import db from "../../../prisma/database.js";
import { authenticate, authorizeAdmin } from "../../middleware/authMiddleware.js"; // Adjust the path to your middleware file

config(); // Load environment variables

const router = Router();

// Fetch all sellers with total products
router.get("/", authenticate, authorizeAdmin ,async (req, res) => {
  try {
    const query = `
      SELECT 
        s.*,
        COUNT(i.id) AS totalProducts
      FROM Seller s
      LEFT JOIN Item i ON s.id = i.sellerId
      GROUP BY s.id
    `;
    const sellers = await db.prepare(query).all();
    res.json(sellers);
  } catch (error) {
    console.error("Error fetching sellers:", error);
    res.status(500).json({ error: "Failed to fetch sellers" });
  }
});

// Search sellers by shopName or email
router.get("/search", async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  try {
    const query = `
      SELECT * FROM Seller
      WHERE shopName LIKE '%' || ? || '%'
      OR email LIKE '%' || ? || '%'
    `;
    const sellers = await db.prepare(query).all(q, q);
    res.json(sellers);
  } catch (error) {
    console.error("Error searching sellers:", error);
    res.status(500).json({ error: "Failed to search sellers" });
  }
});

// Get seller by ID and their associated products
router.get("/:id/products", async (req, res) => {
  const sellerId = req.params.id;

  try {
    const query = `
      SELECT * FROM Item 
      WHERE sellerId = ?
    `;
    const products = await db.prepare(query).all(sellerId);

    if (products.length === 0) {
      return res.status(404).json({ error: "No products found for this seller" });
    }

    res.json(products);
  } catch (error) {
    console.error("Error fetching products for seller:", error);
    res.status(500).json({ error: "Failed to fetch products for seller" });
  }
});

// Delete seller by ID
router.delete("/:id", async (req, res) => {
  const sellerId = req.params.id;

  try {
    const query = "DELETE FROM Seller WHERE id = ?";
    const result = await db.prepare(query).run(sellerId);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Seller not found" });
    }

    res.json({ message: "Seller deleted successfully" });
  } catch (error) {
    console.error("Error deleting seller:", error);
    res.status(500).json({ error: "Failed to delete seller" });
  }
});

export default router;
