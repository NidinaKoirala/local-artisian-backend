import express from 'express';
import db from '../../prisma/database.js';

const router = express.Router();

router.post('/add', async (req, res) => {
  const { title, price, description, category, stock, imageUrls, sellerId } = req.body;

  console.log('Received request to add product:', req.body);

  if (!title || !price || !description || !category || !stock || !sellerId || !imageUrls || !Array.isArray(imageUrls)) {
    console.error('Missing required fields:', { title, price, description, category, stock, sellerId, imageUrls });
    return res.status(400).json({ error: 'Missing required fields or invalid imageUrls' });
  }

  try {
    // Validate the sellerId in the Seller table
    console.log('Validating sellerId in Seller table:', sellerId);
    const sellerCheckStmt = db.prepare('SELECT id FROM Seller WHERE userId = ?');
    const seller = await sellerCheckStmt.get(sellerId);

    if (!seller) {
      console.error(`Invalid sellerId: Seller with userId ${sellerId} does not exist in the Seller table`);
      return res.status(400).json({ error: 'Invalid sellerId: Seller does not exist' });
    }

    const actualSellerId = seller.id; // Get the Seller table's ID
    console.log(`Seller validation passed. Mapped sellerId: ${actualSellerId}`);

    // Insert the product into the Item table
    console.log('Inserting product into Item table:', { title, price, description, category, stock, actualSellerId });
    const insertProductStmt = db.prepare(`
      INSERT INTO Item (title, price, description, category, inStock, sellerId)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = await insertProductStmt.run(title, price, description, category, stock, actualSellerId);
    const newItemId = Number(result.lastInsertRowid); // Convert BigInt to Number
    console.log('Product inserted successfully with ID:', newItemId);

    // Insert each photo URL into the Photo table
    console.log('Inserting photos into Photo table:', { imageUrls, itemId: newItemId });
    const insertPhotoStmt = db.prepare(`
      INSERT INTO Photo (url, itemId)
      VALUES (?, ?)
    `);

    const photoInsertPromises = imageUrls.map((url) => insertPhotoStmt.run(url, newItemId));
    await Promise.all(photoInsertPromises);

    console.log('Product and photos added successfully');
    res.status(201).json({ message: 'Product and photos added successfully' });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});
router.delete('/delete/:id', async (req, res) => {
  const { id } = req.params;

  console.log('Received request to delete product:', id);

  if (!id) {
    console.error('Missing required product ID');
    return res.status(400).json({ error: 'Missing required product ID' });
  }

  try {
    // Validate if the product exists in the Item table
    console.log('Checking if product exists with ID:', id);
    const productCheckStmt = db.prepare('SELECT id FROM Item WHERE id = ?');
    const product = await productCheckStmt.get(id);

    if (!product) {
      console.error(`Product with ID ${id} does not exist`);
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete associated photos from the Photo table
    console.log('Deleting photos associated with product ID:', id);
    const deletePhotosStmt = db.prepare('DELETE FROM Photo WHERE itemId = ?');
    await deletePhotosStmt.run(id);

    // Delete the product from the Item table
    console.log('Deleting product from Item table with ID:', id);
    const deleteProductStmt = db.prepare('DELETE FROM Item WHERE id = ?');
    await deleteProductStmt.run(id);

    console.log('Product deleted successfully');
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

router.put('/edit/:id', async (req, res) => {
  const { id } = req.params; // Product ID from the URL
  const { title, price, description, category, inStock, imageUrls, sellerId, removedImages } = req.body;

  console.log('Received request to edit product:', req.body);

  if (!sellerId) {
    console.error('Missing required field: sellerId');
    return res.status(400).json({ error: 'Missing required field: sellerId' });
  }

  try {
    // Fetch the existing product to ensure it exists
    const existingProductStmt = db.prepare(`
      SELECT id FROM Item WHERE id = ?
    `);
    const existingProduct = await existingProductStmt.get(id);

    if (!existingProduct) {
      console.error(`Product with ID ${id} not found`);
      return res.status(404).json({ error: 'Product not found' });
    }

    // Dynamically build the update query
    const updates = [];
    const updateValues = [];

    if (title !== undefined) {
      updates.push('title = ?');
      updateValues.push(title);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      updateValues.push(price);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      updateValues.push(description);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      updateValues.push(category);
    }
    if (inStock !== undefined) {
      updates.push('inStock = ?');
      updateValues.push(parseInt(inStock, 10)); // Ensure it's a number
    }

    if (updates.length > 0) {
      const updateQuery = `
        UPDATE Item
        SET ${updates.join(', ')}
        WHERE id = ?
      `;
      updateValues.push(id);

      console.log('Executing update query:', updateQuery, updateValues);
      const updateProductStmt = db.prepare(updateQuery);
      await updateProductStmt.run(...updateValues);
    }

    // **REMOVE SELECTED IMAGES**
    if (removedImages && Array.isArray(removedImages) && removedImages.length > 0) {
      console.log('Removing selected images:', removedImages);
      const deleteImagesStmt = db.prepare(`
        DELETE FROM Photo WHERE url IN (${removedImages.map(() => '?').join(', ')}) AND itemId = ?
      `);
      await deleteImagesStmt.run(...removedImages, id);
    }

    // **ADD NEW IMAGES**
    if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
      console.log('Adding new photos for product:', { imageUrls, id });

      // Insert only new image URLs into the Photo table
      const insertPhotoStmt = db.prepare(`
        INSERT INTO Photo (url, itemId)
        VALUES (?, ?)
      `);

      const existingPhotosStmt = db.prepare(`
        SELECT url FROM Photo WHERE itemId = ?
      `);
      const existingPhotos = await existingPhotosStmt.all(id);
      const existingUrls = existingPhotos.map((photo) => photo.url);

      const newUrls = imageUrls.filter((url) => url.trim() !== '' && !existingUrls.includes(url));

      const insertPhotoPromises = newUrls.map((url) => insertPhotoStmt.run(url, id));
      await Promise.all(insertPhotoPromises);
    }

    // Fetch updated image URLs to send back as a response
    const updatedPhotosStmt = db.prepare(`
      SELECT url FROM Photo WHERE itemId = ?
    `);
    const updatedPhotos = await updatedPhotosStmt.all(id);

    console.log('Product updated successfully');
    res.status(200).json({ 
      message: 'Product updated successfully', 
      updatedPhotos 
    });
  } catch (error) {
    console.error('Error updating product:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to update product' });
    }
  }
});

router.get('/seller-details', async (req, res) => {
  const { userId } = req.query;

  console.log('Received userId:', userId);

  if (!userId) {
    console.error('Missing userId in request');
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    // Retrieve the sellerId from the Seller table using the provided userId
    const sellerStmt = db.prepare('SELECT id FROM Seller WHERE userId = ?');
    const seller = await sellerStmt.get(userId); // Replace db.get with db.prepare().get()

    if (!seller) {
      console.error(`No seller found for userId: ${userId}`);
      return res.status(404).json({ error: 'Seller not found' });
    }

    const sellerId = seller.id;
    console.log(`Mapped userId ${userId} to sellerId ${sellerId}`);

    // Retrieve products associated with the sellerId
    const productStmt = db.prepare(
      'SELECT id, title, description, price, category, inStock, soldQuantity FROM Item WHERE sellerId = ?'
    );
    const products = await productStmt.all(sellerId); // Replace db.all with db.prepare().all()

    if (!products || products.length === 0) {
      console.log(`No products found for sellerId: ${sellerId}`);
      return res.status(200).json([]);
    }

    console.log(`Found ${products.length} products for sellerId: ${sellerId}`);

    // Retrieve associated photo URLs for each product
    const productsWithPhotos = await Promise.all(
      products.map(async (product) => {
        const photoStmt = db.prepare('SELECT url FROM Photo WHERE itemId = ?');
        const photo = await photoStmt.get(product.id); // Replace db.get with db.prepare().get()
        return { ...product, imageUrl: photo?.url || '' };
      })
    );

    res.status(200).json(productsWithPhotos);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});


export default router;
