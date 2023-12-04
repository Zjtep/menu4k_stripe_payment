import Stripe from "stripe";
import { NextApiRequest, NextApiResponse } from "next";
import { buffer } from "micro";
import {
  doc,
  updateDoc,
  query,
  where,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";

// Initialize Firebase

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function webhook(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const sig = req.headers["stripe-signature"];

  let event;

  const reqBuffer = await buffer(req);
  const reqBody = reqBuffer.toString();

  try {
    event = stripe.webhooks.constructEvent(
      reqBody,
      sig as string,
      process.env.WEBHOOK_SECRET_KEY as string
    );
  } catch (err: any) {
    console.log({ err });
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case "invoice.payment_succeeded":
      await handlePaymentSucceeded(event);
      break;

    case "invoice.payment_failed":
      await handlePaymentFailed(event);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeletion(event);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
}

//  Handle payment Succeded

async function handlePaymentSucceeded(event: any) {
  const invoice = event.data.object;
  if (invoice.billing_reason === "subscription_create") {
    //  getting payment Intent Id
    const payment_intent_id = invoice.payment_intent;

    //  retrieving paymentIntent infos
    const payment_intent = await stripe.paymentIntents.retrieve(
      payment_intent_id as string
    );

    // Update Firestore
    //  retrieving customer infos
    const customer = await stripe.customers.retrieve(
      payment_intent.customer as string
    );
    // customer email
    const customerEmail = customer.email;
    // csutomer  id
    const customerId = customer.id;

    // getting subscription Id
    const subId = invoice.subscription;

    //  updating the doc
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", customerEmail));

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (docSnapshot) => {
      const userDocRef = doc(db, "users", docSnapshot.id);
      await updateDoc(userDocRef, {
        subscribed: true,
        subId,
        customerId,
      });
    });
  }
}

//  handle payment failed
async function handlePaymentFailed(event: any) {
  const failedInvoice = event.data.object;
  console.log(`Payment failed for invoice ${failedInvoice.id}`);

  // Update Firestore
  const subscription_id = failedInvoice.subscription;
  const subscription = await stripe.subscriptions.retrieve(subscription_id);

  const customer = await stripe.customers.retrieve(
    subscription.customer as string
  );
  const customerEmail = customer.email;

  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", customerEmail));

  const querySnapshot = await getDocs(q);
  querySnapshot.forEach(async (docSnapshot) => {
    const userDocRef = doc(db, "users", docSnapshot.id);
    await updateDoc(userDocRef, {
      subscribed: false,
    });
  });
}

async function handleSubscriptionDeletion(event: any) {
  const subscription = event.data.object;
  console.log(`Payment failed for invoice ${subscription.id}`);

  // Update Firestore

  const customer = await stripe.customers.retrieve(
    subscription.customer as string
  );
  const customerEmail = customer.email;

  const usersRef = collection(db, "users");

  const q = query(usersRef, where("email", "==", customerEmail));

  const querySnapshot = await getDocs(q);

  querySnapshot.forEach(async (docSnapshot) => {
    const userDocRef = doc(db, "users", docSnapshot.id);

    await updateDoc(userDocRef, {
      subscribed: false,
    });
  });
}
