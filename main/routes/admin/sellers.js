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
      SELECT 
        item.*,
        photo.url AS photoUrl
      FROM item
      LEFT JOIN photo ON item.id = photo.itemId
      WHERE item.sellerId = ?
    `;

    const result = await db.prepare(query).all(sellerId);

    if (result.length === 0) {
      return res.status(404).json({ error: "No products found for this seller" });
    }

    const itemsMap = {};
    result.forEach((row) => {
      const {
        id,
        title,
        description,
        price,
        category,
        inStock,
        soldQuantity,
        discount,
        sellerId,
        adminId,
        photoUrl,
      } = row;

      if (!itemsMap[id]) {
        itemsMap[id] = {
          id,
          title,
          description,
          price,
          category,
          inStock,
          soldQuantity,
          discount,
          sellerId,
          adminId,
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
    console.error("Error fetching products for seller:", error);
    res.status(500).json({ error: "Failed to fetch products for seller" });
  }
});


// Delete seller by ID
router.delete("/:id", async (req, res) => {
  const sellerId = req.params.id;

  try {
    // Check if the seller exists
    const sellerQuery = "SELECT * FROM Seller WHERE id = ?";
    const seller = await db.prepare(sellerQuery).get(sellerId);

    if (!seller) {
      return res.status(404).json({ error: "Seller not found" });
    }

    // Fetch the associated user
    const userQuery = "SELECT * FROM User WHERE id = ?";
    const user = await db.prepare(userQuery).get(seller.userId);

    if (!user) {
      return res.status(404).json({ error: "Associated user not found" });
    }

    // Delete the user (this will cascade to delete the seller due to foreign key constraints)
    const deleteUserQuery = "DELETE FROM User WHERE id = ?";
    const userDeleteResult = await db.prepare(deleteUserQuery).run(seller.userId);

    if (userDeleteResult.changes === 0) {
      return res.status(500).json({ error: "Failed to delete user" });
    }

    // Explicitly return success status and message
    return res.status(200).json({ message: "Seller and associated user deleted successfully" });
  } catch (error) {
    console.error("Error deleting seller and associated user:", error);
    return res.status(500).json({ error: "Failed to delete seller and associated user" });
  }
});


export default router;
