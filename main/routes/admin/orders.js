import { Router } from "express";
import { config } from "dotenv";
import db from "../../../prisma/database.js";
import { authenticate, authorizeAdmin } from "../../middleware/authMiddleware.js"; // Adjust the path to your middleware file

config(); // Load environment variables

const router = Router();

// Fetch all orders grouped by sellers or buyers
router.get('/', authenticate, authorizeAdmin , async (req, res) => {
  const { groupBy } = req.query; // groupBy can be 'seller' or 'buyer'

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

    if (groupBy === 'seller') {
      query += ' ORDER BY s.shopName';
    } else if (groupBy === 'buyer') {
      query += ' ORDER BY u.firstName';
    }

    const orders = await db.prepare(query).all();
    res.json(orders);
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status
router.put('/:id',  authenticate, authorizeAdmin ,  async (req, res) => {
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
router.delete('/:id',  authenticate, authorizeAdmin ,  async (req, res) => {
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