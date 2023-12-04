// pages/api/create-customer-portal.js
import Stripe from "stripe";
import type { NextApiRequest, NextApiResponse } from "next";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { customerId } = req.body;

  if (!customerId) {
    return res.status(400).json({ error: "Customer ID is required" });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: "https://your-website.com/dashboard", // Replace with your return URL
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Error creating customer portal session:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
