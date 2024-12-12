import { Router } from "express";
import { config } from "dotenv";
import db from "../../../prisma/database.js";
import { authenticate, authorizeAdmin } from "../../middleware/authMiddleware.js";

config(); // Load environment variables

const router = Router();

// Fetch all orders grouped by sellers or buyers with pagination
router.get('/', authenticate, authorizeAdmin, async (req, res) => {
    const { groupBy, page = 1, limit = 20, orderId } = req.query;
  
    const offset = (page - 1) * limit; // Calculate offset for pagination
  
    try {
      let query = `
        SELECT o.id, o.userId, o.itemId, o.quantity, o.orderDate, o.status, 
               u.firstName || ' ' || u.lastName AS buyerName,
               s.shopName AS sellerName,
               i.title AS itemTitle
        FROM Orders o
        JOIN User u ON o.userId = u.id
        JOIN Item i ON o.itemId = i.id
        JOIN Seller s ON i.sellerId = s.id
      `;
  
      // If orderId is provided, filter by it
      if (orderId) {
        query += ` WHERE o.id = ?`;
      }
  
      if (!orderId) {
        if (groupBy === 'seller') {
          query += ' ORDER BY s.shopName, o.id DESC';
        } else if (groupBy === 'buyer') {
          query += ' ORDER BY u.firstName, o.id DESC';
        } else {
          query += ' ORDER BY o.id DESC'; // Default sorting by order ID
        }
        query += ` LIMIT ${limit} OFFSET ${offset}`;
      }
  
      const orders = orderId
        ? await db.prepare(query).all(orderId) // Pass orderId as a parameter if provided
        : await db.prepare(query).all();
  
      // If orderId is provided, only return filtered results
      if (orderId) {
        return res.json({
          orders,
          totalPages: 1,
          currentPage: 1,
        });
      }
  
      // Count total orders for pagination metadata
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM Orders o
        JOIN User u ON o.userId = u.id
        JOIN Item i ON o.itemId = i.id
        JOIN Seller s ON i.sellerId = s.id
      `;
  
      const totalResult = await db.prepare(countQuery).get();
      const totalOrders = totalResult.total || 0;
  
      res.json({
        orders,
        totalPages: Math.ceil(totalOrders / limit),
        currentPage: Number(page),
      });
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });
  

// Update order status
router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const query = `UPDATE Orders SET status = ? WHERE id = ?`;
    const result = await db.prepare(query).run(status, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Failed to update order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Delete an order
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const query = `DELETE FROM Orders WHERE id = ?`;
    const result = await db.prepare(query).run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Failed to delete order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

export default router;
