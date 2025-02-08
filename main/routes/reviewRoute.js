import { Router } from "express";
import { createClient } from "@libsql/client";
import { config } from "dotenv";

config();

const dbClient = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.AUTH_TOKEN,
});

const router = Router();

router.get('/review/status', async (req, res) => {
  const { userId, itemId, orderId } = req.query;

  // Log the received query parameters
  console.log('Received query params:', { userId, itemId, orderId });

  if (!userId || !itemId || !orderId) {
    return res.status(400).json({ error: 'Invalid input. Provide userId, itemId, and orderId.' });
  }

  try {
    const query = `
      SELECT isReviewed
      FROM Orders
      WHERE userId = ? AND itemId = ? AND id = ?
    `;
    const result = await dbClient.execute(query, [userId, itemId, orderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const isReviewed = result.rows[0].isReviewed;
    res.status(200).json({ isReviewed });
  } catch (error) {
    console.error('Error fetching review status:', error);
    res.status(500).json({ error: 'Failed to fetch review status.' });
  }
});


// Route to get reviews for a product
router.get("/items/:itemId/reviews", async (req, res) => {
  const { itemId } = req.params;

  try {
    console.log(`Fetching reviews for itemId: ${itemId}`);
    const reviewsQuery = `
      SELECT Ratings.rating, Ratings.comment, Ratings.createdAt, User.username 
      FROM Ratings
      INNER JOIN User ON Ratings.userId = User.id
      WHERE Ratings.itemId = ?
      ORDER BY Ratings.createdAt DESC
    `;
    const reviewsResult = await dbClient.execute(reviewsQuery, [itemId]);

    console.log("Reviews fetched successfully:", reviewsResult.rows.length);
    res.status(200).json({
      success: true,
      reviews: reviewsResult.rows,
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({
      error: "Failed to fetch reviews. Please try again later.",
    });
  }
});

export default router;
