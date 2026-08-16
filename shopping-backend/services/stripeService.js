/**
 * Stripe service — real Stripe Checkout when STRIPE_SECRET_KEY is set,
 * simulated "demo payments" otherwise (no real charges, full flow works).
 */
let stripe = null;
let enabled = false;

function initStripe() {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    enabled = true;
    console.log('[stripe] Connected to Stripe (live mode)');
  } else {
    console.log('[stripe] DEMO mode — set STRIPE_SECRET_KEY for real payments');
  }
  return enabled;
}

const isEnabled = () => enabled;

function frontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
}

/**
 * Create a Stripe Checkout session for an order.
 * Returns { mode: 'stripe'|'demo', url, sessionId }.
 */
async function createCheckoutSession({ order, lineItems, customerEmail }) {
  if (!enabled || !stripe) {
    return {
      mode: 'demo',
      url: `${frontendUrl()}/checkout/demo?order=${order.order_number}`,
      sessionId: `demo_${order.order_number}`,
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: customerEmail,
    client_reference_id: String(order.order_number),
    line_items: lineItems.map((item) => ({
      price_data: {
        currency: process.env.STRIPE_CURRENCY || 'usd',
        product_data: { name: item.name, images: item.image ? [item.image] : undefined },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: item.quantity,
    })),
    metadata: { order_id: String(order.id), order_number: order.order_number },
    success_url: `${frontendUrl()}/orders/${order.order_number}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl()}/cart`,
  });

  return { mode: 'stripe', url: session.url, sessionId: session.id };
}

/** Verify a Checkout session and return its payment status. */
async function getSessionStatus(sessionId) {
  if (!enabled || !stripe) {
    return { paid: true, paymentId: sessionId };
  }
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return {
    paid: session.payment_status === 'paid',
    paymentId: session.payment_intent || session.id,
    orderNumber: session.client_reference_id,
  };
}

/** Construct the webhook event from the raw body + signature. */
function constructWebhookEvent(rawBody, signature) {
  if (!enabled || !stripe || !process.env.STRIPE_WEBHOOK_SECRET) return null;
  return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}

module.exports = { initStripe, isEnabled, createCheckoutSession, getSessionStatus, constructWebhookEvent };
