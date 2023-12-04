// pages/api/create-subscription.js
import Stripe from "stripe";
import { NextApiRequest, NextApiResponse } from "next";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export default async function subscribe(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const { paymentMethod, email, quantity } = req.body;

      const unitPrice = 20; // Define your unit price here

      // Calculate total price based on quantity

      // Create a Stripe customer
      const customer = await stripe.customers.create({
        email: email,
        payment_method: paymentMethod.id,
        invoice_settings: {
          default_payment_method: paymentMethod.id,
        },
      });

      const productId = process.env.PRODUCT_ID;

      // Create a price object
      const price = await stripe.prices.create({
        //  stripe needs the price in cents
        unit_amount: unitPrice * 100,
        currency: "usd", // Set your currency here
        recurring: { interval: "month" }, // Define your interval
        product: productId,
      });

      //  susbcription api  ===> stripe server ===>  webhook

      // Create a subscription with the new price
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: price.id, quantity: quantity }],
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.payment_intent"],
        payment_settings: {
          payment_method_types: ["acss_debit"],
        },
      });

      const intent = subscription.latest_invoice.payment_intent;
      const clientSecret = intent.client_secret;

      res.status(200).json({ subscription, clientSecret });
    } catch (error: any) {
      console.log(error.message);
      res.status(400).json({ error: error.message });
    }
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
}
