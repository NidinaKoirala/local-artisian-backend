import { Router } from "express";
import { createClient } from "@libsql/client";
import { config } from "dotenv";
import Stripe from "stripe";

config();

const dbClient = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.AUTH_TOKEN,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const router = Router();

// Route to create a payment intent
router.post("/", async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount. Amount should be greater than 0." });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // Amount in cents
      currency: "usd",
      payment_method_types: ["card"],
    });

    res.status(201).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({
      error: "Failed to create payment intent. Please try again later.",
    });
  }
});

export default router;
