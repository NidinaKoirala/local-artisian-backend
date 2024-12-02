import express from "express";
import { createClient } from "@libsql/client";
import { config } from "dotenv";

config(); // Load environment variables

const dbClient = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.AUTH_TOKEN,
});

if (!dbClient) {
  console.error("Database client is not initialized. Check database configuration.");
  process.exit(1);
} else {
  console.info("Database client initialized successfully.");
}

const router = express.Router();

// Route to place an order
router.post("/place", async (req, res) => {
    const { userId, orderItems } = req.body;
  
    if (!userId || !Array.isArray(orderItems) || orderItems.length === 0) {
      console.error("Invalid request payload:", req.body);
      return res.status(400).json({ error: "Invalid request payload" });
    }
  
    const operations = []; // Track successful operations for rollback
  
    try {
      console.info("Starting transaction for placing an order...");
  
      // Extract item IDs and quantities from the payload
      const itemsToProcess = orderItems.map((item) => ({
        id: Number(item.id),
        quantity: Number(item.quantity),
      }));
  
      const itemIds = itemsToProcess.map((item) => item.id);
  
      if (itemIds.length === 0) {
        throw new Error("No valid items to process in the order.");
      }
  
      console.info(`Collected item IDs for stock validation: ${itemIds.join(", ")}`);
  
      // Fetch stock data for the items
      const stockCheckQuery = `SELECT id, inStock FROM item WHERE id IN (${itemIds.join(",")})`;
      console.info("Executing stock check query:", stockCheckQuery);
  
      const stockCheckResult = await dbClient.execute(stockCheckQuery);
  
      if (!stockCheckResult || !Array.isArray(stockCheckResult.rows) || stockCheckResult.rows.length === 0) {
        console.error("Query execution failed or no matching rows found. Result:", stockCheckResult);
        throw new Error("Failed to fetch stock data or no items match the query.");
      }
  
      console.info("Stock check result:", stockCheckResult.rows);
  
      // Create a map for stock validation
      const stockMap = new Map(stockCheckResult.rows.map((row) => [row.id, row.inStock]));
  
      // Validate stock availability for each item
      for (const { id, quantity } of itemsToProcess) {
        const currentStock = stockMap.get(id);
        if (currentStock === undefined) {
          throw new Error(`Item with ID ${id} does not exist.`);
        }
        if (currentStock < quantity) {
          throw new Error(
            `Insufficient stock for item ID ${id}. Available: ${currentStock}, Requested: ${quantity}`
          );
        }
      }
  
      // Process each order item
      for (const { id, quantity } of itemsToProcess) {
        console.info(`Processing item ID ${id} with quantity ${quantity}...`);
  
        // Update stock for the item
        const updateStockQuery = "UPDATE item SET inStock = inStock - ?, soldQuantity = soldQuantity + ? WHERE id = ?";
        console.info("Executing stock update query:", updateStockQuery, "with params:", [quantity, quantity, id]);
        const stockUpdateResult = await dbClient.execute(updateStockQuery, [quantity, quantity, id]);
  
        if (!stockUpdateResult || stockUpdateResult.rowsAffected === 0) {
          console.error("Failed to update stock. Result:", stockUpdateResult);
          throw new Error(`Failed to update stock for item ID ${id}.`);
        }
  
        console.info(`Stock and sold quantity updated for item ID ${id}. Rows affected: ${stockUpdateResult.rowsAffected}`);
  
        operations.push({ type: "updateStock", itemId: id, quantity });
  
        // Insert order details into Orders table
        const insertOrderQuery = `
          INSERT INTO orders (userId, itemId, quantity, orderDate)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `;
        console.info("Executing order insertion query:", insertOrderQuery, "with params:", [userId, id, quantity]);
  
        const orderInsertResult = await dbClient.execute(insertOrderQuery, [userId, id, quantity]);
  
        if (!orderInsertResult || orderInsertResult.rowsAffected === 0) {
          console.error("Failed to insert order. Result:", orderInsertResult);
          throw new Error(`Failed to insert order for item ID ${id}.`);
        }
  
        console.info(`Order successfully inserted for user ID ${userId}, item ID ${id}. Rows affected: ${orderInsertResult.rowsAffected}`);
  
        operations.push({ type: "insertOrder", userId, itemId: id, quantity });
      }
  
      console.info("Order placed successfully.");
      res.status(200).json({ message: "Order placed successfully" });
    } catch (error) {
      console.error("Error placing order:", error);
  
      // Rollback operations manually
      console.warn("Rolling back successful operations...");
      for (const operation of operations.reverse()) {
        try {
          if (operation.type === "updateStock") {
            console.info(`Rolling back stock update for item ID ${operation.itemId}...`);
            await dbClient.execute("UPDATE item SET inStock = inStock + ?, soldQuantity = soldQuantity - ? WHERE id = ?", [
              operation.quantity,
              operation.quantity,
              operation.itemId,
            ]);
          } else if (operation.type === "insertOrder") {
            console.info(`Rolling back order insertion for user ID ${operation.userId}, item ID ${operation.itemId}...`);
            await dbClient.execute("DELETE FROM orders WHERE userId = ? AND itemId = ?", [
              operation.userId,
              operation.itemId,
            ]);
          }
        } catch (rollbackError) {
          console.error("Error during manual rollback:", rollbackError);
        }
      }
  
      res.status(500).json({ error: error.message || "Failed to place order" });
    }
  });
  
// Route to fetch order history for a user
router.get("/history/:userId", async (req, res) => {
    const { userId } = req.params;
  
    if (!userId || isNaN(userId)) {
      console.error("Valid User ID is required for fetching order history.");
      return res.status(400).json({ error: "Valid User ID is required" });
    }
  
    try {
      console.info(`Fetching order history for user ID ${userId}...`);
      const query = `
        SELECT 
          o.id AS orderId, 
          o.orderDate, 
          o.quantity, 
          i.title AS itemName, 
          i.price AS itemPrice, 
          i.category
        FROM orders o
        JOIN item i ON o.itemId = i.id
        WHERE o.userId = ?
        ORDER BY o.orderDate DESC
      `;
  
      const result = await dbClient.execute(query, [userId]);
  
      if (result.rows.length === 0) {
        console.info(`No order history found for user ID ${userId}.`);
        return res.status(200).json({ orders: [], message: "No order history found." });
      }
  
      console.info(`Order history retrieved for user ID ${userId}. Total orders: ${result.rows.length}`);
      res.status(200).json({
        success: true,
        orders: result.rows,
      });
    } catch (error) {
      console.error(`Error fetching order history for user ID ${userId}:`, error.message);
      res.status(500).json({ error: "Failed to fetch order history. Please try again later." });
    }
  });
  
export default router;
