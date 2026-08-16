/**
 * Order controller — create orders (auth or guest), list history, get by number.
 */
const crypto = require('crypto');
const { query } = require('../config/database');

function newOrderNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SHOP-${ts}-${rand}`;
}

async function computeTotals(lines) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const shipping = subtotal >= 100 ? 0 : 4.99;
  const tax = +(subtotal * 0.08).toFixed(2);
  return {
    subtotal: +subtotal.toFixed(2),
    shipping,
    tax,
    total: +(subtotal + shipping + tax).toFixed(2),
  };
}

/**
 * Body: { items: [{product_id, quantity}], shipping_address: {...} }
 * Authenticated users may omit items to use their server-side cart.
 */
async function createOrder(req, res, next) {
  try {
    let items = Array.isArray(req.body.items) ? req.body.items : null;
    if (req.user && !items) {
      const cart = await query(
        `SELECT p.id AS product_id, ci.quantity, p.name, p.price, p.image_url
         FROM cart_items ci JOIN products p ON p.id = ci.product_id WHERE ci.user_id = $1`,
        [req.user.id]
      );
      items = cart.rows;
    }
    if (!items || !items.length) {
      return res.status(400).json({ error: 'Your cart is empty' });
    }

    const shippingAddress = req.body.shipping_address || req.body.shippingAddress || {};
    if (!shippingAddress.fullName || !shippingAddress.address || !shippingAddress.city) {
      return res.status(400).json({ error: 'Shipping address is incomplete (fullName, address, city required)' });
    }

    // Resolve products & prices server-side (never trust client prices).
    const lines = [];
    for (const it of items) {
      const pid = parseInt(it.product_id ?? it.productId, 10);
      const qty = Math.max(1, parseInt(it.quantity ?? 1, 10));
      if (!pid) continue;
      const product = await query('SELECT id, name, price, image_url, stock FROM products WHERE id = $1', [pid]);
      if (!product.rows.length) {
        return res.status(400).json({ error: `Product ${pid} not found` });
      }
      const p = product.rows[0];
      if (qty > p.stock) {
        return res.status(409).json({ error: `Only ${p.stock} of "${p.name}" in stock` });
      }
      lines.push({
        product_id: p.id, name: p.name, price: Number(p.price), quantity: qty, image_url: p.image_url,
      });
    }
    if (!lines.length) return res.status(400).json({ error: 'Your cart is empty' });

    const totals = await computeTotals(lines);
    const orderNumber = newOrderNumber();
    const paymentMethod = process.env.STRIPE_SECRET_KEY ? 'stripe' : 'demo';

    const orderRes = await query(
      `INSERT INTO orders (order_number, user_id, status, subtotal, shipping, tax, total, payment_method, shipping_address)
       VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8) RETURNING *`,
      [orderNumber, req.user?.id ?? null, totals.subtotal, totals.shipping, totals.tax, totals.total,
       paymentMethod, JSON.stringify(shippingAddress)]
    );
    const order = orderRes.rows[0];

    for (const l of lines) {
      await query(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, image_url)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.id, l.product_id, l.name, l.price, l.quantity, l.image_url]
      );
    }

    // Clear the user's cart for items that were ordered.
    if (req.user) {
      for (const l of lines) {
        await query('DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2', [req.user.id, l.product_id]);
      }
    }

    res.status(201).json({ order: await getOrderByNumber(orderNumber), order_number: orderNumber });
  } catch (err) {
    next(err);
  }
}

async function getOrderByNumber(orderNumber) {
  const found = await query('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);
  if (!found.rows.length) return null;
  const order = found.rows[0];
  const items = await query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
  return { ...order, items: items.rows };
}

async function listMyOrders(req, res, next) {
  try {
    const result = await query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]
    );
    res.json({ orders: result.rows });
  } catch (err) {
    next(err);
  }
}

async function getOrder(req, res, next) {
  try {
    const order = await getOrderByNumber(req.params.orderNumber);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user && order.user_id && order.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not your order' });
    }
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

/** Mark an order paid (used by demo payments + Stripe confirm). */
async function markPaid(orderNumber, { paymentId, method = 'demo' } = {}) {
  const result = await query(
    `UPDATE orders SET status = 'paid', payment_id = COALESCE($1, payment_id), payment_method = $2
     WHERE order_number = $3 RETURNING *`,
    [paymentId || null, method, orderNumber]
  );
  if (!result.rows.length) return null;
  // Decrement stock for ordered items.
  const items = await query('SELECT * FROM order_items WHERE order_id = $1', [result.rows[0].id]);
  for (const it of items.rows) {
    if (it.product_id) {
      await query('UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2', [it.quantity, it.product_id]);
    }
  }
  return result.rows[0];
}

module.exports = { createOrder, listMyOrders, getOrder, getOrderByNumber, markPaid };
