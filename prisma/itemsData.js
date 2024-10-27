import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const itemsData = [
  {
    id: 1,
    title: "marijuana bag",
    description: "High-quality bags made of marijuana.",
    price: 89.99,
    rating: 4.5,
    photoUrl: "https://example.com/images/bag.jpg",
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
    photoUrl: "https://example.com/images/thanka.jpg",
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
    photoUrl: "https://example.com/images/dhaka.jpg",
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
    photoUrl: "https://example.com/images/achar.jpg",
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
    photoUrl: "https://example.com/images/bangles.jpg",
    category: "accessories",
    inStock: 30,
    sellerId: 1,
  },
];

//simple add not upsert
async function insertItems(itemsData){
    try {
        const createdItems = await prisma.item.createMany({
            data: itemsData,
        });

        console.log('Items added successfully:', createdItems);
    } catch (error) {
        console.log("error upserting items: ", error);
    }
}

//new value of a field in the item of given id
async function updateItem(id, field, value){
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

        console.log('Item updated successfully:', updatedItem);
    } catch (error) {
        console.log("error updating items", error)
    }
}

async function addItems(params = itemsData) {
    await insertItems(params);
}

updateItem(1, "photoUrl", "heheboi");
// addItems()
//   .catch((e) => {
//     console.error(e);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
