import { Router } from "express";
import { config } from "dotenv";
import db from "../../../prisma/database.js";
import { authenticate, authorizeAdmin } from "../../middleware/authMiddleware.js";

config(); // Load environment variables

const router = Router();

// Fetch all categories
router.get("/", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT category 
      FROM Item
      ORDER BY category ASC
    `;
    const categories = await db.prepare(query).all();
    res.json(categories.map((row) => row.category));
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Add a new category
router.post("/", authenticate, authorizeAdmin, async (req, res) => {
    const { category } = req.body;
  
    if (!category || !category.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }
  
    try {
      // Check if category already exists
      const checkQuery = `
        SELECT DISTINCT category 
        FROM Item 
        WHERE category = ?
      `;
      const existing = await db.prepare(checkQuery).get(category);
  
      if (existing) {
        return res.status(400).json({ error: "Category already exists" });
      }
  
      // Insert a new category (using placeholder values for NOT NULL constraints)
      const query = `
        INSERT INTO Item (title, description, price, category, inStock, soldQuantity) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      await db.prepare(query).run(
        `Placeholder Title`, // Title placeholder
        `Placeholder Description`, // Description placeholder
        0.0, // Price placeholder
        category, // Category name
        0, // Stock placeholder
        0 // Sold quantity placeholder
      );
  
      res.status(201).json({ message: "Category added successfully" });
    } catch (error) {
      console.error("Error adding category:", error);
      res.status(500).json({ error: "Failed to add category" });
    }
  });

// Update an existing category
router.put("/:oldCategory", authenticate, authorizeAdmin, async (req, res) => {
    const { oldCategory } = req.params;
    const { name } = req.body; // Change newCategory to name to match the frontend
  
    if (!name) {
      return res.status(400).json({ error: "New category name is required" });
    }
  
    try {
      const query = `
        UPDATE Item 
        SET category = ? 
        WHERE category = ?
      `;
      const result = await db.prepare(query).run(name, oldCategory);
  
      if (result.changes === 0) {
        return res.status(404).json({ error: "Category not found" });
      }
  
      res.status(200).json({ message: "Category updated successfully" });
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  });
  
// Delete a category
router.delete("/:category", authenticate, authorizeAdmin, async (req, res) => {
  const { category } = req.params;

  try {
    const query = `
      DELETE FROM Item 
      WHERE category = ?
    `;
    const result = await db.prepare(query).run(category);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// Search for categories
router.get("/search", authenticate, authorizeAdmin, async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: "Search query 'q' is required" });
  }

  try {
    const query = `
      SELECT DISTINCT category 
      FROM Item 
      WHERE category LIKE '%' || ? || '%'
    `;
    const categories = await db.prepare(query).all(q);

    res.json(categories.map((row) => row.category));
  } catch (error) {
    console.error("Error searching categories:", error);
    res.status(500).json({ error: "Failed to search categories" });
  }
});

export default router;
