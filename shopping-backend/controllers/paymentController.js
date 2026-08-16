/**
 * Payment controller — Stripe Checkout (real or demo).
 *
 * Flow (demo & Stripe):
 *   1. POST /api/orders            → creates order (status=pending)
 *   2. POST /api/payments/checkout → Stripe session or demo URL
 *   3a. Stripe: user pays on Stripe → success_url → POST /api/payments/confirm
 *   3b. Demo:  user pays on /checkout/demo → POST /api/payments/demo-pay
 *   4. Order marked 'paid', stock decremented.
 */
const stripeService = require('../services/stripeService');
const { getOrderByNumber, markPaid } = require('./orderController');

async function checkout(req, res, next) {
  try {
    const { order_number } = req.body;
    if (!order_number) return res.status(400).json({ error: 'order_number is required' });

    const order = await getOrderByNumber(order_number);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'pending') {
      return res.status(400).json({ error: `Order is already ${order.status}` });
    }

    const lineItems = order.items.map((it) => ({
      name: it.product_name,
      price: Number(it.price),
      quantity: it.quantity,
      image: it.image_url,
    }));

    const session = await stripeService.createCheckoutSession({
      order,
      lineItems,
      customerEmail: req.user?.email,
    });

    res.json({ checkout: session });
  } catch (err) {
    next(err);
  }
}

/** Demo payment: instantly mark the order paid. */
async function demoPay(req, res, next) {
  try {
    const { order_number } = req.body;
    if (!order_number) return res.status(400).json({ error: 'order_number is required' });
    const updated = await markPaid(order_number, { paymentId: `demo_${Date.now()}`, method: 'demo' });
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Payment successful (demo)', order: updated });
  } catch (err) {
    next(err);
  }
}

/** Confirm a Stripe Checkout session after redirect from success_url. */
async function confirm(req, res, next) {
  try {
    const { session_id, order_number } = req.body;
    if (!session_id) return res.status(400).json({ error: 'session_id is required' });
    const status = await stripeService.getSessionStatus(session_id);
    if (!status.paid) {
      return res.status(402).json({ error: 'Payment not completed', order_number });
    }
    const target = order_number || status.orderNumber;
    if (!target) return res.status(400).json({ error: 'order_number is required' });
    const updated = await markPaid(target, { paymentId: status.paymentId, method: 'stripe' });
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Payment confirmed', order: updated });
  } catch (err) {
    next(err);
  }
}

/** Stripe webhook — confirm orders asynchronously. */
async function webhook(req, res, next) {
  try {
    const event = stripeService.constructWebhookEvent(
      req.rawBody || req.body,
      req.headers['stripe-signature']
    );
    if (!event) {
      return res.status(400).json({ error: 'Webhook not supported (missing Stripe keys)' });
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.client_reference_id) {
        await markPaid(session.client_reference_id, { paymentId: session.payment_intent || session.id, method: 'stripe' });
      }
    }
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { checkout, demoPay, confirm, webhook };
