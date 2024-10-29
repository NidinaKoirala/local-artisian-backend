import { Router } from "express";
import { createClient } from "@libsql/client";
import { config } from "dotenv";

config(); // Load environment variables

const dbClient = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.AUTH_TOKEN,
});

const router = Router();

// Route to get all items with their associated photos
router.get("/items", async (req, res) => {
  try {
    const query = `
      SELECT item.*, photo.url AS photoUrl
      FROM item
      LEFT JOIN photo ON item.id = photo.itemId
    `;
    const result = await dbClient.execute(query);
    
    const itemsMap = {};
    result.rows.forEach(row => {
      const { id, title, description, price, rating, category, inStock, sellerId, adminId, photoUrl } = row;
      
      if (!itemsMap[id]) {
        itemsMap[id] = {
          id,
          title,
          description,
          price,
          rating,
          category,
          inStock,
          sellerId,
          adminId,
          photos: []
        };
      }
      
      if (photoUrl) {
        itemsMap[id].photos.push({ url: photoUrl });
      }
    });

    const items = Object.values(itemsMap);
    res.json({ items });
  } catch (error) {
    console.error("Error fetching items", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

// Route to get distinct categories
router.get("/categories", async (req, res) => {
  try {
    const query = "SELECT DISTINCT category FROM item";
    const result = await dbClient.execute(query);
    const categories = result.rows.map(row => row.category);
    res.json(categories);
  } catch (error) {
    console.error("Error fetching categories", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Route to get items by category
router.get("/categories/:category", async (req, res) => {
  const category = req.params.category;
  try {
    const query = "SELECT * FROM item WHERE category = ?";
    const result = await dbClient.execute(query, [category]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching items by category", error);
    res.status(500).json({ error: "Failed to fetch items for the specified category" });
  }
});

// Route to get a single item by ID with its associated photos
router.get("/items/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const query = `
      SELECT item.*, photo.url AS photoUrl
      FROM item
      LEFT JOIN photo ON item.id = photo.itemId
      WHERE item.id = ?
    `;
    const result = await dbClient.execute(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    const item = {
      id: result.rows[0].id,
      title: result.rows[0].title,
      description: result.rows[0].description,
      price: result.rows[0].price,
      rating: result.rows[0].rating,
      category: result.rows[0].category,
      inStock: result.rows[0].inStock,
      sellerId: result.rows[0].sellerId,
      adminId: result.rows[0].adminId,
      photos: result.rows.map(row => row.photoUrl ? { url: row.photoUrl } : null).filter(photo => photo)
    };

    res.json(item);
  } catch (error) {
    console.error("Error fetching item by ID", error);
    res.status(500).json({ error: "Failed to fetch item" });
  }
});

export default router;
