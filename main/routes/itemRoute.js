import { Router } from "express";
import getItems from "../../prisma/itemsData.js";
const router = Router();

let items;

console.log(items);
router.get("/products", async (req, res)=> {
    try {
        items = await getItems();
        res.json(items);
    } catch (error) {
        console.log("Error fetching items", error);
        res.status(500).json({ error: "Failed to fetch items" });
    }
});

export default router;