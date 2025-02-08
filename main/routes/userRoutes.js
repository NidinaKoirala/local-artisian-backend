import { Router } from "express";
import { createClient } from "@libsql/client";
import { config } from "dotenv";

config(); // Load environment variables

const dbClient = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.AUTH_TOKEN,
});

const router = Router();

// Get user's order status counts
router.get('/order/status-counts/:userId', async (req, res) => {
  try {
    const result = await dbClient.execute({
      sql: `SELECT status, COUNT(*) as count 
            FROM Orders 
            WHERE userId = ? 
            GROUP BY status`,
      args: [req.params.userId]
    });
    
    const counts = result.rows.reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {});
    
    res.json(counts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's reviews
router.get('/reviews/user/:userId', async (req, res) => {
  try {
    const result = await dbClient.execute({
      sql: `SELECT r.*, i.title as itemTitle 
            FROM Ratings r
            JOIN Item i ON r.itemId = i.id
            WHERE r.userId = ?`,
      args: [req.params.userId]
    });
    
    res.json({ reviews: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update review
router.put('/reviews/:reviewId', async (req, res) => {
  try {
    const { rating, comment } = req.body;
    await dbClient.execute({
      sql: `UPDATE Ratings 
            SET rating = ?, comment = ? 
            WHERE id = ?`,
      args: [rating, comment, req.params.reviewId]
    });
    
    res.json({ message: 'Review updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete review
router.delete('/reviews/:reviewId', async (req, res) => {
  try {
    await dbClient.execute({
      sql: 'DELETE FROM Ratings WHERE id = ?',
      args: [req.params.reviewId]
    });
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/user/:userId', async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, address } = req.body;
    await dbClient.execute({
      sql: `UPDATE User SET 
            firstName = ?, 
            lastName = ?,
            email = ?,
            phoneNumber = ?,
            addressLine1 = ?
            WHERE id = ?`,
      args: [firstName, lastName, email, phoneNumber, address, req.params.userId]
    });
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Get user profile
router.get('/user/:userId', async (req, res) => {
    try {
      const result = await dbClient.execute({
        sql: 'SELECT * FROM User WHERE id = ?',
        args: [req.params.userId]
      });
  
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get user's order history
  router.get('/order/history/:userId', async (req, res) => {
    try {
      const result = await dbClient.execute({
        sql: `SELECT o.*, i.title as itemTitle 
              FROM Orders o
              JOIN Item i ON o.itemId = i.id
              WHERE o.userId = ?`,
        args: [req.params.userId]
      });
      
      res.json({ orders: result.rows });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
// Update user profile
router.put('/user/:userId', async (req, res) => {
    try {
      const {
        firstName, middleName, lastName, email, phoneNumber,
        addressLine1, addressLine2, city, state, postalCode, country
      } = req.body;
      await dbClient.execute({
        sql: `UPDATE User SET 
              firstName = ?, 
              middleName = ?, 
              lastName = ?,
              email = ?,
              phoneNumber = ?,
              addressLine1 = ?,
              addressLine2 = ?,
              city = ?,
              state = ?,
              postalCode = ?,
              country = ?
              WHERE id = ?`,
        args: [
          firstName, middleName, lastName, email, phoneNumber,
          addressLine1, addressLine2, city, state, postalCode, country,
          req.params.userId
        ]
      });
  
      res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
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

  router.patch('/user/:userId', async (req, res) => {
    try {
      console.log('Received update data:', req.body);
  
      const updateFields = Object.keys(req.body);
      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
  
      const setClause = updateFields.map(field => `${field} = ?`).join(', ');
      const query = `UPDATE User SET ${setClause} WHERE id = ?`;
      
      const values = [...updateFields.map(field => req.body[field]), req.params.userId];
  
      await dbClient.execute({
        sql: query,
        args: values
      });
  
      res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: error.message });
    }
  });
export default router;