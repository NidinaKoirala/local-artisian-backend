import { Router } from "express";
import { createClient } from "@libsql/client";
import { config } from "dotenv";

config();

const dbClient = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.AUTH_TOKEN,
});

const router = Router();

// Route to post a review for a product
router.post("/reviews", async (req, res) => {
  const { userId, itemId, orderId, rating, comment } = req.body;

  // Validate input
  if (!userId || !itemId || !orderId || !rating || rating < 1 || rating > 5) {
    console.log("Invalid input for /reviews:", req.body);
    return res.status(400).json({
      error: "Invalid input. Provide userId, itemId, orderId, rating (1-5), and an optional comment.",
    });
  }

  try {
    // Check if the user has purchased the item
    const purchaseCheckQuery = `
      SELECT COUNT(*) as purchaseCount
      FROM Orders
      WHERE userId = ? AND itemId = ? AND id = ?
    `;
    const purchaseCheckResult = await dbClient.execute(purchaseCheckQuery, [userId, itemId, orderId]);

    if (purchaseCheckResult.rows[0].purchaseCount === 0) {
      console.log("User has not purchased the item.");
      return res.status(403).json({
        error: "User must purchase the item before submitting a review.",
      });
    }

    // Check if the item is already reviewed
    const reviewCheckQuery = `
      SELECT isReviewed
      FROM Orders
      WHERE userId = ? AND itemId = ? AND id = ?
    `;
    const reviewCheckResult = await dbClient.execute(reviewCheckQuery, [userId, itemId, orderId]);

    if (reviewCheckResult.rows[0].isReviewed) {
      console.log("Item already reviewed.");
      return res.status(400).json({
        error: "This item has already been reviewed by the user.",
      });
    }

    // Insert the review into the Ratings table
    const insertReviewQuery = `
      INSERT INTO Ratings (userId, itemId, rating, comment, createdAt)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    await dbClient.execute(insertReviewQuery, [userId, itemId, rating, comment]);

    // Update the isReviewed field in the Orders table
    const updateOrderQuery = `
      UPDATE Orders
      SET isReviewed = 1
      WHERE userId = ? AND itemId = ? AND id = ?
    `;
    const result = await dbClient.execute(updateOrderQuery, [userId, itemId, orderId]);

    if (result.affectedRows === 0) {
      console.error('No rows updated. Ensure the order exists and matches the criteria.');
      return res.status(404).json({ error: 'Order not found or already updated.' });
    }

    console.log("Review submitted and isReviewed updated successfully.");
    res.status(201).json({
      message: "Review submitted successfully!",
    });
  } catch (error) {
    console.error("Error posting review:", error);
    res.status(500).json({
      error: "Failed to submit review. Please try again later.",
    });
  }
});


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
