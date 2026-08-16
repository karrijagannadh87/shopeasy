/**
 * Cart controller — server-side cart for authenticated users.
 * Guests keep their cart in localStorage; it merges in on login/checkout.
 */
const { query } = require('../config/database');

const CART_SELECT = `
  SELECT ci.quantity, p.id AS product_id, p.name, p.price, p.image_url,
         p.stock, p.slug, p.category, p.compare_at_price
  FROM cart_items ci
  JOIN products p ON p.id = ci.product_id
  WHERE ci.user_id = $1
  ORDER BY ci.id`;

async function getCart(req, res, next) {
  try {
    const result = await query(CART_SELECT, [req.user.id]);
    const items = result.rows;
    const subtotal = items.reduce((sum, it) => sum + Number(it.price) * it.quantity, 0);
    res.json({ items, subtotal: +subtotal.toFixed(2), count: items.reduce((s, it) => s + it.quantity, 0) });
  } catch (err) {
    next(err);
  }
}

async function addToCart(req, res, next) {
  try {
    const productId = parseInt(req.body.product_id ?? req.body.productId, 10);
    const quantity = Math.max(1, parseInt(req.body.quantity ?? 1, 10));
    if (!productId) return res.status(400).json({ error: 'product_id is required' });

    const product = await query('SELECT id, stock FROM products WHERE id = $1', [productId]);
    if (!product.rows.length) return res.status(404).json({ error: 'Product not found' });

    const existing = await query(
      'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [req.user.id, productId]
    );
    if (existing.rows.length) {
      const newQty = Math.min(existing.rows[0].quantity + quantity, product.rows[0].stock);
      await query('UPDATE cart_items SET quantity = $1 WHERE id = $2', [newQty, existing.rows[0].id]);
    } else {
      await query(
        'INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)',
        [req.user.id, productId, Math.min(quantity, product.rows[0].stock)]
      );
    }
    const cart = await query(CART_SELECT, [req.user.id]);
    res.json({ message: 'Added to cart', items: cart.rows });
  } catch (err) {
    next(err);
  }
}

async function updateCartItem(req, res, next) {
  try {
    const productId = parseInt(req.params.productId, 10);
    const quantity = parseInt(req.body.quantity, 10);
    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'quantity must be >= 1' });
    }
    const product = await query('SELECT stock FROM products WHERE id = $1', [productId]);
    const maxQty = product.rows.length ? product.rows[0].stock : quantity;
    const result = await query(
      'UPDATE cart_items SET quantity = $1 WHERE user_id = $2 AND product_id = $3',
      [Math.min(quantity, maxQty), req.user.id, productId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Item not in cart' });
    const cart = await query(CART_SELECT, [req.user.id]);
    res.json({ message: 'Cart updated', items: cart.rows });
  } catch (err) {
    next(err);
  }
}

async function removeCartItem(req, res, next) {
  try {
    const productId = parseInt(req.params.productId, 10);
    await query('DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2', [req.user.id, productId]);
    const cart = await query(CART_SELECT, [req.user.id]);
    res.json({ message: 'Removed from cart', items: cart.rows });
  } catch (err) {
    next(err);
  }
}

/** Merge a guest cart (from localStorage) into the user's server cart. */
async function mergeCart(req, res, next) {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    for (const it of items) {
      const pid = parseInt(it.product_id ?? it.productId, 10);
      const qty = Math.max(1, parseInt(it.quantity ?? 1, 10));
      if (!pid) continue;
      const product = await query('SELECT id, stock FROM products WHERE id = $1', [pid]);
      if (!product.rows.length) continue;
      const existing = await query(
        'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
        [req.user.id, pid]
      );
      if (existing.rows.length) {
        await query('UPDATE cart_items SET quantity = $1 WHERE id = $2',
          [Math.min(existing.rows[0].quantity + qty, product.rows[0].stock), existing.rows[0].id]);
      } else {
        await query('INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)',
          [req.user.id, pid, Math.min(qty, product.rows[0].stock)]);
      }
    }
    const cart = await query(CART_SELECT, [req.user.id]);
    res.json({ message: 'Cart merged', items: cart.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, mergeCart };
