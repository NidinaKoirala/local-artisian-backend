import { Router } from "express";
import { config } from "dotenv";
import db from "../../../prisma/database.js";

config(); // Load environment variables

const router = Router();

// Fetch all products
router.get("/", async (req, res) => {
  try {
    const query = "SELECT * FROM Item";
    const products = await db.prepare(query).all();
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Search products by title or category
router.get("/search", async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  try {
    const query = `
      SELECT * FROM Item
      WHERE title LIKE '%' || ? || '%'
      OR category LIKE '%' || ? || '%'
    `;
    const products = await db.prepare(query).all(q, q);
    res.json(products);
  } catch (error) {
    console.error("Error searching products:", error);
    res.status(500).json({ error: "Failed to search products" });
  }
});

// Get product by ID
router.get("/:id", async (req, res) => {
  const productId = req.params.id;

  try {
    const query = "SELECT * FROM Item WHERE id = ?";
    const product = await db.prepare(query).get(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// Delete product by ID
router.delete("/:id", async (req, res) => {
  const productId = req.params.id;

  try {
    const query = "DELETE FROM Item WHERE id = ?";
    const result = await db.prepare(query).run(productId);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
