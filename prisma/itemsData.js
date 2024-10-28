import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
  {
    id: 2,
    title: "Thanka",
    description: "Portable thanka painting with excellent quality.",
    price: 49.99,
    rating: 4.2,
    photos: [{ url: "url3" }],
    category: "handmade",
    inStock: 50,
    sellerId: 1,
  },
  {
    id: 3,
    title: "dhaka topi",
    description: "Reflects the culture of Nepal.",
    price: 29.99,
    rating: 4.7,
    photos: [
      { url: "url1" },
      { url: "url1" },
      { url: "url1" },
      { url: "url1" },
      { url: "url1" },
      { url: "url1" },
      { url: "url1" },
    ],
    category: "handmade",
    inStock: 15,
    sellerId: 2,
  },
  {
    id: 4,
    title: "Dalla achar",
    description: "Organic taste from the Karnali.",
    price: 79.99,
    rating: 4.3,
    photos: [{ url: "url1" }, { url: "url2" }],
    category: "edible",
    inStock: 10,
    adminId: 1, // Admin posted this item
  },
  {
    id: 5,
    title: "bangles",
    description: "Nepali bangles that make you bangable.",
    price: 19.99,
    rating: null, // No ratings yet
    photos: [{ url: "url1" }, { url: "url2" }],
    category: "accessories",
    inStock: 30,
    sellerId: 1,
  },
];

//simple add not upsert
async function insertItems(itemsData) {
    try {
        // Create items one by one to get their IDs
        for (const item of itemsData) {
            const createdItem = await prisma.item.create({
                data: {
                    title: item.title,
                    description: item.description,
                    price: item.price,
                    rating: item.rating,
                    category: item.category,
                    inStock: item.inStock,
                    sellerId: item.sellerId,
                },
            });

            // Insert associated photos
            await prisma.photo.createMany({
                data: item.photos.map(photo => ({
                    url: photo.url,
                    itemId: createdItem.id, // Associate photo with the correct item ID
                })),
            });
        }
        console.log('Items added successfully');
    } catch (error) {
        console.log("Error inserting items:", error);
    }
}

//new value of a field in the item of given id
async function updateItem(id, field, value) {
  try {
    // Check if the item exists
    const existingItem = await prisma.item.findUnique({
      where: { id },
    });

    if (!existingItem) {
      console.log(`Item with ID ${id} does not exist.`);
      return;
    }

    // Prepare data for update
    const dataToUpdate = {};
    dataToUpdate[field] = value; // Dynamically set the field to update

    // Update the item
    const updatedItem = await prisma.item.update({
      where: { id },
      data: dataToUpdate,
    });

    console.log("Item updated successfully:", updatedItem);
  } catch (error) {
    console.log("error updating items", error);
  }
}

async function updateItemPhotos(itemId, newPhotoUrls) {
  try {
      const existingItem = await prisma.item.findUnique({
          where: { id: itemId },
          include: { photos: true }, // Include related photos
      });

      if (!existingItem) {
          console.log(`Item with ID ${itemId} does not exist.`);
          return;
      }

      // Clear existing photos
      await prisma.photo.deleteMany({
          where: { itemId: existingItem.id },
      });

      // Add new photo URLs
      const newPhotos = newPhotoUrls.map(url => ({
          url,
          itemId: existingItem.id,
      }));

      await prisma.photo.createMany({
          data: newPhotos,
      });

      console.log("Photos updated successfully for item ID:", itemId);
  } catch (error) {
      console.log("Error updating photos:", error);
  }
}
