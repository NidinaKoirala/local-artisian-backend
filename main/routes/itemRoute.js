import { Router } from "express";
import getItems from "../../prisma/itemsData.js";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const router = Router();

router.get("/products", async (req, res)=> {
    try {
        const items = await getItems();
        res.json(items);
    } catch (error) {
        console.log("Error fetching items", error);
        res.status(500).json({ error: "Failed to fetch items" });
    }
});

router.get("/products/:id", async (req, res)=> {
    try {
        const id = Number(req.params.id);
        const item =  await prisma.item.findUnique({
            where: { id },
            })
        res.json(item);
    } catch (error) {
        console.log("Error fetching items", error);
        res.status(500).json({ error: "Failed to fetch items" });
    }
});

export default router;