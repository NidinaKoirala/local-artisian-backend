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
      SELECT item.*, photo.url AS photoUrl, item.soldQuantity, item.discount
      FROM item
      LEFT JOIN photo ON item.id = photo.itemId
      ORDER BY item.soldQuantity DESC
    `;
    const result = await dbClient.execute(query);

    const itemsMap = {};
    result.rows.forEach((row) => {
      const { id, title, description, price, rating, category, inStock, soldQuantity, discount, sellerId, adminId, photoUrl } = row;

      if (!itemsMap[id]) {
        itemsMap[id] = {
          id,
          title,
          description,
          price,
          rating,
          category,
          inStock,
          soldQuantity,
          sellerId,
          adminId,
          discount,
          photos: [],
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

// New Route: Get User Details
router.get("/user/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const query = "SELECT * FROM User WHERE id = ?";
    const result = await dbClient.execute(query, [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching user details", error);
    res.status(500).json({ error: "Failed to fetch user details" });
  }
});

// New Route: Update Stock
router.post("/update-stock", async (req, res) => {
  const { itemId, quantity } = req.body;

  if (!itemId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: "Invalid item ID or quantity" });
  }

  try {
    const query = "SELECT inStock FROM item WHERE id = ?";
    const result = await dbClient.execute(query, [itemId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    const currentStock = result.rows[0].inStock;
    if (currentStock < quantity) {
      return res.status(400).json({ error: "Insufficient stock" });
    }

    const updateQuery = "UPDATE item SET inStock = inStock - ? WHERE id = ?";
    await dbClient.execute(updateQuery, [quantity, itemId]);

    res.status(200).json({ message: "Stock updated successfully" });
  } catch (error) {
    console.error("Error updating stock", error);
    res.status(500).json({ error: "Failed to update stock" });
  }
});

// New Route: Track User Orders
router.get("/orders/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const query = "SELECT * FROM orders WHERE userId = ?";
    const result = await dbClient.execute(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No orders found for this user" });
    }

    res.json({ orders: result.rows });
  } catch (error) {
    console.error("Error fetching orders", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// New Route: Rate Item
router.post("/rate-item", async (req, res) => {
  const { userId, itemId, rating, comment } = req.body;

  if (!userId || !itemId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Invalid rating or missing fields" });
  }

  try {
    const checkPurchaseQuery = "SELECT * FROM orders WHERE userId = ? AND itemId = ?";
    const purchaseResult = await dbClient.execute(checkPurchaseQuery, [userId, itemId]);

    if (purchaseResult.rows.length === 0) {
      return res.status(403).json({ error: "User must purchase the item to rate" });
    }

    const insertQuery = `
      INSERT INTO ratings (userId, itemId, rating, comment)
      VALUES (?, ?, ?, ?)
    `;
    await dbClient.execute(insertQuery, [userId, itemId, rating, comment]);

    res.status(201).json({ message: "Rating submitted successfully" });
  } catch (error) {
    console.error("Error submitting rating", error);
    res.status(500).json({ error: "Failed to submit rating" });
  }
});

export default router;
