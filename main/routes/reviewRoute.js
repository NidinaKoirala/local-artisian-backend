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
  const { userId, itemId, rating, comment } = req.body;

  // Validate input
  if (!userId || !itemId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      error: "Invalid input. Please provide userId, itemId, rating (1-5), and an optional comment.",
    });
  }

  try {
    // Check if the user has purchased the item
    const purchaseCheckQuery = `
      SELECT COUNT(*) as purchaseCount
      FROM Orders
      WHERE userId = ? AND itemId = ?
    `;
    const purchaseCheckResult = await dbClient.execute(purchaseCheckQuery, [userId, itemId]);

    if (purchaseCheckResult.rows[0].purchaseCount === 0) {
      return res.status(403).json({
        error: "User must purchase the item before submitting a review.",
      });
    }

    // Insert the review into the Ratings table
    const insertReviewQuery = `
      INSERT INTO Ratings (userId, itemId, rating, comment, createdAt)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    await dbClient.execute(insertReviewQuery, [userId, itemId, rating, comment]);

    // Update the item's average rating
    const updateRatingQuery = `
      UPDATE Item
      SET rating = (
        SELECT AVG(rating) 
        FROM Ratings 
        WHERE itemId = ?
      )
      WHERE id = ?
    `;
    await dbClient.execute(updateRatingQuery, [itemId, itemId]);

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
// Route to get reviews for a product
router.get("/items/:itemId/reviews", async (req, res) => {
    const { itemId } = req.params;
  
    try {
      const reviewsQuery = `
        SELECT Ratings.rating, Ratings.comment, Ratings.createdAt, User.username 
        FROM Ratings
        INNER JOIN User ON Ratings.userId = User.id
        WHERE Ratings.itemId = ?
        ORDER BY Ratings.createdAt DESC
      `;
      const reviewsResult = await dbClient.execute(reviewsQuery, [itemId]);
  
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
