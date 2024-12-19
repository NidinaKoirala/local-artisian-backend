import express from "express"; // Import express
import { createClient } from "@libsql/client";
import { config } from "dotenv";
import Stripe from "stripe";

config();

const dbClient = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.AUTH_TOKEN,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const router = express.Router(); // Initialize the router

// Parse JSON payloads for this router
router.use(express.json());

router.post("/", async (req, res) => {
  try {
    console.log("Request payload:", req.body); // Debugging log
    const { amount } = req.body;

    // Validate the request payload
    if (!amount || typeof amount !== "number" || amount <= 0) {
      console.error("Invalid amount received:", amount);
      return res.status(400).json({
        error: "Invalid amount. Amount should be a positive number greater than 0.",
      });
    }

    // Create payment intent
    console.log("Creating payment intent for amount (cents):", amount);
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // Amount in cents
      currency: "usd",
      payment_method_types: ["card"],
    });

    // Respond with client secret
    console.log("Payment intent created successfully:", paymentIntent.id);
    res.status(201).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    // Handle any errors
    console.error("Error creating payment intent:", error.message);
    res.status(500).json({
      error: `Failed to create payment intent: ${error.message}`,
    });
  }
});

export default router;
