import { Router } from "express";
import getUsers from "../../prisma/usersData.js";
const router = Router();

router.get("/allUsers", async (req, res)=> {
    try {
        const users = await getUsers();
        res.json(users);
    } catch (error) {
        console.log("Error fetching users", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

export default router;
