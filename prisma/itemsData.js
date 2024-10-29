import { createClient } from "@libsql/client";
import { config } from "dotenv";

// Load environment variables
config();

const dbClient = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.AUTH_TOKEN,
});

// Sample items data
const itemsData = [
  {
    id: 1,
    title: "marijuana bag",
    description: "High-quality bags made of marijuana.",
    price: 89.99,
    rating: 4.5,
    photos: [{ url: "url1" }, { url: "url2" }],
    category: "accessories",
    inStock: 25,
    sellerId: 1,
  },
  // Additional items...
];

// Insert items and associated photos
async function insertItems(itemsData) {
  try {
    for (const item of itemsData) {
      // Insert item
      const insertItemQuery = `
        INSERT INTO items (title, description, price, rating, category, inStock, sellerId)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const itemResult = await dbClient.execute(insertItemQuery, [
        item.title,
        item.description,
        item.price,
        item.rating,
        item.category,
        item.inStock,
        item.sellerId,
      ]);

      const itemId = itemResult.lastInsertRowId;

      // Insert photos associated with the item
      for (const photo of item.photos) {
        const insertPhotoQuery = `
          INSERT INTO photos (url, itemId)
          VALUES (?, ?)
        `;
        await dbClient.execute(insertPhotoQuery, [photo.url, itemId]);
      }
    }
    console.log("Items added successfully");
  } catch (error) {
    console.error("Error inserting items:", error);
  }
}

// Update a specific field in an item
async function updateItem(id, field, value) {
  try {
    const updateItemQuery = `
      UPDATE items
      SET ${field} = ?
      WHERE id = ?
    `;
    await dbClient.execute(updateItemQuery, [value, id]);
    console.log(`Item with ID ${id} updated successfully`);
  } catch (error) {
    console.error("Error updating item:", error);
  }
}

// Update photos for a specific item
async function updateItemPhotos(itemId, newPhotoUrls) {
  try {
    // Delete existing photos
    const deletePhotosQuery = `
      DELETE FROM photo WHERE itemId = ?
    `;
    await dbClient.execute(deletePhotosQuery, [itemId]);

    // Add new photos
    for (const url of newPhotoUrls) {
      const insertPhotoQuery = `
        INSERT INTO photo (url, itemId)
        VALUES (?, ?)
      `;
      await dbClient.execute(insertPhotoQuery, [url, itemId]);
    }
    console.log(`Photos updated successfully for item ID: ${itemId}`);
  } catch (error) {
    console.error("Error updating photos:", error);
  }
}

// Fetch all items with associated photos
async function getItems() {
  try {
    const getItemsQuery = `
      SELECT item.*, photo.url AS photoUrl
      FROM item
      LEFT JOIN photo ON items.id = photo.itemId
    `;
    const result = await dbClient.execute(getItemsQuery);

    // Group photos under each item
    const itemsMap = {};
    result.rows.forEach(row => {
      const { id, title, description, price, rating, category, inStock, sellerId, photoUrl } = row;
      if (!itemsMap[id]) {
        itemsMap[id] = {
          id,
          title,
          description,
          price,
          rating,
          category,
          inStock,
          sellerId,
          photos: []
        };
      }
      if (photoUrl) itemsMap[id].photos.push({ url: photoUrl });
    });

    // Convert map to array
    const allItems = Object.values(itemsMap);
    return { items: allItems };
  } catch (error) {
    console.error("Error fetching items:", error);
    return { error: "Failed to fetch items" };
  }
}

export default getItems;
