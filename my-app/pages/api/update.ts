import Stripe from "stripe";

import { NextApiRequest, NextApiResponse } from "next";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  const { subId, quantity } = req.body;
  console.log(req.body);

  if (!subId || !quantity) {
    return res
      .status(400)
      .json({ error: "Subscription ID and new quantity are required" });
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subId);

    const subscriptionItem = subscription.items.data[0];
    const prevQuantity = subscription.items.data[0].quantity;

    console.log({ prevQuantity, quantity });
    const newQuantity = prevQuantity + quantity;

    await stripe.subscriptionItems.update(subscriptionItem.id, {
      quantity: newQuantity,
    });

    res.status(200).json({ message: "Subscription updated successfully" });
  } catch (error) {
    console.error("Error updating subscription: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
