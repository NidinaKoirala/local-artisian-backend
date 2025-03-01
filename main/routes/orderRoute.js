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
            `Insufficient stock for item. Please update item count. Available: ${currentStock}, Requested: ${quantity}`
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
          i.id AS itemId,
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

// API to fetch orders for a seller
// API to fetch orders for a seller with pagination
router.get("/forsellers", async (req, res) => {
  const { userId, page = 1, limit = 10 } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    console.info(`Fetching seller ID for user ID: ${userId}`);

    // Get seller ID from the user ID
    const sellerResult = await dbClient.execute(
      "SELECT id FROM Seller WHERE userId = ?",
      [userId]
    );

    if (!sellerResult.rows.length) {
      return res.status(404).json({ error: "Seller not found for this user" });
    }

    const sellerId = sellerResult.rows[0].id;
    console.info(`Mapped user ID ${userId} to seller ID ${sellerId}`);

    // Calculate pagination offsets
    const offset = (page - 1) * limit;

    // Fetch orders for the seller with pagination
    const ordersQuery = `
      SELECT 
        o.id AS orderId,
        o.orderDate,
        o.quantity,
        u.firstName || ' ' || u.lastName AS customerName,
        u.phoneNumber AS customerPhone,
        u.addressLine1 || ', ' || 
        IFNULL(u.addressLine2 || ', ', '') || 
        u.city || ', ' || 
        u.state || ', ' || 
        u.postalCode || ', ' || 
        u.country AS customerAddress,
        i.title AS itemName,
        i.price AS itemPrice,
        o.quantity * i.price AS totalPrice
      FROM orders o
      JOIN item i ON o.itemId = i.id
      JOIN User u ON o.userId = u.id
      WHERE i.sellerId = ?
      ORDER BY o.orderDate DESC
      LIMIT ? OFFSET ?
    `;

    console.info(`Fetching orders for seller ID: ${sellerId}, Page: ${page}, Limit: ${limit}`);
    const ordersResult = await dbClient.execute(ordersQuery, [sellerId, parseInt(limit), parseInt(offset)]);

    if (!ordersResult.rows.length) {
      console.info(`No orders found for seller ID ${sellerId}`);
      return res.status(200).json({ orders: [], message: "No orders found" });
    }

    console.info(`Found ${ordersResult.rows.length} orders for seller ID ${sellerId}`);
    res.status(200).json({ orders: ordersResult.rows });
  } catch (error) {
    console.error("Error fetching orders for sellers:", error.message);
    res.status(500).json({ error: "Failed to fetch orders. Please try again later." });
  }
});
router.put("/status", async (req, res) => {
  const { orderId, status } = req.body;

  if (!orderId || !status) {
    return res.status(400).json({ error: "Order ID and status are required." });
  }

  try {
    const updateQuery = `
      UPDATE orders
      SET status = ?
      WHERE id = ?
    `;

    const result = await dbClient.execute(updateQuery, [status, orderId]);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Order not found or status unchanged." });
    }

    res.status(200).json({ message: "Order status updated successfully." });
  } catch (error) {
    console.error("Error updating order status:", error.message);
    res.status(500).json({ error: "Failed to update order status." });
  }
});
// GET route to fetch the order status
router.get("/status", async (req, res) => {
  const { orderId } = req.query;

  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required." });
  }

  try {
    const selectQuery = `
      SELECT status
      FROM orders
      WHERE id = ?
    `;

    // Execute query and directly access the `rows` property
    const result = await dbClient.execute(selectQuery, [orderId]);

    // Log the result to ensure we're accessing it correctly
    console.log("Query Result:", result);

    // Extract the status from the rows
    const rows = result.rows;

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Order not found." });
    }

    // Access the status field
    const status = rows[0].status;
    if (!status) {
      return res.status(404).json({ error: "Status not found for the specified order." });
    }

    // Return only the status
    res.status(200).json({ status });
  } catch (error) {
    console.error("Error fetching order status:", error.message);
    res.status(500).json({ error: "Failed to fetch order status.", details: error.message });
  }
});

router.get("/timeline", async (req, res) => {
  const { orderId } = req.query;

  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required." });
  }

  try {
    const query = `
      SELECT 
        o.id AS orderId, 
        o.orderDate, 
        o.status, 
        i.title AS itemName, 
        u.firstName || ' ' || u.lastName AS customerName, 
        u.email AS customerEmail
      FROM Orders o
      JOIN Item i ON o.itemId = i.id
      JOIN User u ON o.userId = u.id
      WHERE o.id = ?
    `;

    const result = await dbClient.execute(query, [orderId]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found." });
    }

    const order = result.rows[0];

    // Create a timeline array based on the order status
    const timeline = [
      { date: order.orderDate, status: "Order Placed" },
      ...(order.status === "Shipped" || order.status === "Delivered"
        ? [{ date: new Date().toISOString(), status: "Order Shipped" }]
        : []),
      ...(order.status === "Delivered"
        ? [{ date: new Date().toISOString(), status: "Order Delivered" }]
        : []),
    ];

    res.status(200).json({ order, timeline });
  } catch (error) {
    console.error("Error fetching order timeline:", error.message);
    res.status(500).json({ error: "Failed to fetch order timeline." });
  }
});


export default router;
