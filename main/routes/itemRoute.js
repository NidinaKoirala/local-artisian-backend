import { Router } from "express";
import { createClient } from "@libsql/client";
import { config } from "dotenv";

config(); // Load environment variables

const dbClient = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.AUTH_TOKEN,
});

const router = Router();

// Route to get all items
router.get("/items", async (req, res) => {
  try {
    const result = await dbClient.execute("SELECT * FROM item");
    const items = result.rows;
    res.json({ items });
  } catch (error) {
    console.error("Error fetching items", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

// Route to get distinct categories
router.get("/items/categories", async (req, res) => {
  try {
    const result = await dbClient.execute("SELECT DISTINCT category FROM item");
    const categories = result.rows.map(row => row.category);
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Route to get items by category
router.get("/items/categories/:category", async (req, res) => {
  const category = req.params.category;
  try {
    const result = await dbClient.execute("SELECT * FROM item WHERE category = ?", [category]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching items by category", error);
    res.status(500).json({ error: "Failed to fetch items for the specified category" });
  }
});

// Route to get a single item by ID
router.get("/items/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const result = await dbClient.execute("SELECT * FROM item WHERE id = ?", [id]);
    const item = result.rows[0];

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Fetch associated photos
    const photosResult = await dbClient.execute("SELECT * FROM photo WHERE itemId = ?", [id]);
    item.photos = photosResult.rows;

    res.json(item);
  } catch (error) {
    console.error("Error fetching item by ID", error);
    res.status(500).json({ error: "Failed to fetch item" });
  }
});

export default router;
