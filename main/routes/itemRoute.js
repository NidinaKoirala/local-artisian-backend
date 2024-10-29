import { Router } from "express";
import getItems from "../../prisma/itemsData.js";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const router = Router();

router.get("/items", async (req, res)=> {
    try {
        const items = await getItems();
        res.json(items);
    } catch (error) {
        console.log("Error fetching items", error);
        res.status(500).json({ error: "Failed to fetch items" });
    }
});

router.get("/items/categories", async (req,res) =>{
    try {
        const distinctCategories = await prisma.item.findMany({
            select: {
                category: true, // Select only the category field
            },
            distinct: ['category'], // Ensure categories are distinct
        });
        const categories = distinctCategories.map(item => item.category);
        res.json(categories);
    } catch (error) {
        res.status(500).json({error: "Failed to fetch categories"});
    }
})

router.get("/items/categories/:category", async (req,res) => {
    const category = req.params.category;
    try {
        const products = await prisma.item.findMany({
            where: {
                category: category, // Filter by the specified category
            },
        });
        res.json(products);
    } catch (error) {
        res.status(500).json({error: 'Failed to fetch the category items'})
    }
});

//keep this last, as :id can conflict with stuff like "categories"
router.get("/items/:id", async (req, res)=> {
    try {
        const id = Number(req.params.id);
        const item =  await prisma.item.findUnique({
            where: { id },
            })
        res.json(item);
    } catch (error) {
        console.log("Error fetching items", error);
        res.status(500).json({ error: "Failed to fetch item" });
    }
});

export default router;