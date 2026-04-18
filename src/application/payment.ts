import Stripe from "stripe";
import { Request, Response, NextFunction } from "express";
import { Invoice } from "../infrastructure/entities/Invoice";
import { NotFoundError, ValidationError } from "../domain/error/errors";

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

// POST /api/payments/create-checkout-session
export const createCheckoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { invoiceId } = req.body;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new NotFoundError("Invoice not found");
    if (invoice.paymentStatus === "PAID")
      throw new ValidationError("Invoice already paid");

    // Guard: Stripe requires quantity >= 1. Block payment for zero-kWh invoices.
    if (invoice.totalEnergyGenerated <= 0) {
      throw new ValidationError("Invoice has no energy usage to bill.");
    }

    // Create a Stripe session
    // quantity = kWh, price = your rate from Stripe Dashboard ($0.05/unit)
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page" as any,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: Math.max(1, Math.round(invoice.totalEnergyGenerated)),
        },
      ],
      mode: "payment",
      return_url: `${process.env.FRONTEND_URL}/dashboard/invoices/complete?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        invoiceId: invoice._id.toString(), // ← Links this payment back to your invoice
      },
    });

    res.status(200).json({ clientSecret: session.client_secret });
  } catch (error) {
    next(error);
  }
};

// GET /api/payments/session-status
export const getSessionStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { session_id } = req.query;
    if (!session_id) throw new ValidationError("Session ID required");

    const session = await stripe.checkout.sessions.retrieve(
      session_id as string,
    );

    res.status(200).json({
      status: session.status,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total, // in cents — divide by 100 for dollars
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/stripe/webhook — Stripe calls this after payment
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  let event: any;

  try {
    // SECURITY: Verify this request is actually from Stripe
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch (err: any) {
    console.error(`[Stripe Webhook Error] ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // When payment is confirmed → mark invoice PAID
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const invoiceId = session.metadata?.invoiceId;

    if (invoiceId && session.payment_status === "paid") {
      await Invoice.findByIdAndUpdate(invoiceId, {
        paymentStatus: "PAID",
        paidAt: new Date(),
      });
      console.log(`[Stripe] Invoice ${invoiceId} → PAID`);
    }
  }

  // Always return 200 to acknowledge receipt
  res.status(200).json({ received: true });
};

// const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
// if (!stripeSecretKey) {
//   console.error("❌ [CRITICAL] STRIPE_SECRET_KEY is missing in .env file!");
// }

// const stripe = new Stripe(stripeSecretKey || "sk_test_dummy_key_to_prevent_crash");

// // Validate Price ID format locally to prevent runtime errors
// const PRICE_ID = process.env.STRIPE_PRICE_ID;
// if (PRICE_ID && PRICE_ID.startsWith("prod_")) {
//   console.warn("⚠️  [WARNING] STRIPE_PRICE_ID starts with 'prod_'. You must use a Price ID (starts with 'price_') for checkout to work!");
// }

// /**
//  * Controller: createCheckoutSession
//  * Purpose: Creates a Stripe Embedded Checkout session for a specific invoice.
//  */
// export const createCheckoutSession = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { invoiceId } = req.body;

//     // 1. Fetch the invoice and verify it is not already paid
//     const invoice = await Invoice.findById(invoiceId);
//     if (!invoice) throw new NotFoundError("Invoice not found");
//     if (invoice.paymentStatus === "PAID") throw new ValidationError("Invoice is already paid");

//     // 2. Create the Stripe Checkout Session
//     const session = await stripe.checkout.sessions.create({
//       ui_mode: "embedded_page" as any,
//       line_items: [
//         {
//           // Ensure you have created this Price ID in your Stripe Dashboard
//           price: process.env.STRIPE_PRICE_ID,
//           // We cast the kWh to a rounded quantity for Stripe
//           quantity: Math.round(invoice.totalEnergyGenerated),
//         },
//       ],
//       mode: "payment",
//       // Stripe replaces {CHECKOUT_SESSION_ID} with the actual ID on success
//       return_url: `${process.env.FRONTEND_URL}/dashboard/invoices/complete?session_id={CHECKOUT_SESSION_ID}`,
//       metadata: {
//         invoiceId: invoice._id.toString(), // CRITICAL for the webhook handler
//       },
//     });

//     // 3. Return the client secret to the frontend to render the form
//     res.status(200).json({ clientSecret: session.client_secret });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Controller: getSessionStatus
//  * Purpose: Retrieves payment details after a user returns from Stripe.
//  */
// export const getSessionStatus = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { session_id } = req.query;
//     if (!session_id) throw new ValidationError("Session ID is required");

//     const session = await stripe.checkout.sessions.retrieve(session_id as string);

//     res.status(200).json({
//       status: session.status,
//       paymentStatus: session.payment_status,
//       amountTotal: session.amount_total, // in cents
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Webhook Handler: handleStripeWebhook
//  * Purpose: Secured endpoint that Stripe calls to confirm payment.
//  */
// export const handleStripeWebhook = async (req: Request, res: Response) => {
//   const sig = req.headers["stripe-signature"] as string;
//   let event: any; // Using any to bypass strict type check for the event object

//   try {
//     // SECURITY: Use the signing secret to verify the request actually came from Stripe
//     event = stripe.webhooks.constructEvent(
//       req.body, // Must be the raw body
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET as string
//     );
//   } catch (err: any) {
//     console.error(`[Stripe Webhook Error] ${err.message}`);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   // Handle the 'checkout.session.completed' event
//   if (event.type === "checkout.session.completed") {
//     const session = event.data.object as any;
//     const invoiceId = session.metadata?.invoiceId;

//     if (invoiceId && session.payment_status === "paid") {
//       // Update our database to mark the invoice as PAID
//       await Invoice.findByIdAndUpdate(invoiceId, {
//         paymentStatus: "PAID",
//         paidAt: new Date(),
//       });
//       console.log(`[Stripe] Invoice ${invoiceId} marked as PAID via webhook.`);
//     }
//   }

//   // Always return 200 to acknowledge receipt of the event
//   res.status(200).json({ received: true });
// };
