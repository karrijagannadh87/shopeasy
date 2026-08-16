/**
 * Admin controller — product CRUD, order management, dashboard stats.
 */
const { query } = require('../config/database');
const cache = require('../config/redis');
const aiService = require('../services/aiService');

function slugify(name) {
  const base = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return base || `product-${Date.now()}`;
}

/* ── Products ─────────────────────────────────────────────── */

async function createProduct(req, res, next) {
  try {
    const b = req.body || {};
    if (!b.name || !b.price || !b.category) {
      return res.status(400).json({ error: 'name, price and category are required' });
    }
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : (b.image_url || '');
    const result = await query(
      `INSERT INTO products
         (name, slug, description, price, compare_at_price, category, brand, image_url, stock, rating, review_count, featured, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        b.name, slugify(b.name), b.description || '', b.price, b.compare_at_price || null,
        b.category, b.brand || '', imageUrl, Math.max(0, parseInt(b.stock, 10) || 0),
        b.rating || 4.5, b.review_count || 0, !!b.featured,
        Array.isArray(b.tags) ? b.tags : String(b.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
      ]
    );
    await cache.del('products:featured');
    res.status(201).json({ product: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const b = req.body || {};
    const existing = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Product not found' });

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : (b.image_url ?? existing.rows[0].image_url);
    const tags = b.tags !== undefined
      ? (Array.isArray(b.tags) ? b.tags : String(b.tags).split(',').map((t) => t.trim()).filter(Boolean))
      : existing.rows[0].tags;

    const result = await query(
      `UPDATE products SET
         name = $1, slug = $2, description = $3, price = $4, compare_at_price = $5,
         category = $6, brand = $7, image_url = $8, stock = $9, rating = $10,
         review_count = $11, featured = $12, tags = $13
       WHERE id = $14 RETURNING *`,
      [
        b.name ?? existing.rows[0].name,
        b.name ? slugify(b.name) : existing.rows[0].slug,
        b.description ?? existing.rows[0].description,
        b.price ?? existing.rows[0].price,
        b.compare_at_price !== undefined ? b.compare_at_price : existing.rows[0].compare_at_price,
        b.category ?? existing.rows[0].category,
        b.brand ?? existing.rows[0].brand,
        imageUrl,
        b.stock !== undefined ? Math.max(0, parseInt(b.stock, 10)) : existing.rows[0].stock,
        b.rating ?? existing.rows[0].rating,
        b.review_count ?? existing.rows[0].review_count,
        b.featured !== undefined ? !!b.featured : existing.rows[0].featured,
        tags,
        id,
      ]
    );
    await cache.del('products:featured');
    res.json({ product: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    await query('DELETE FROM cart_items WHERE product_id = $1', [id]);
    const result = await query('DELETE FROM products WHERE id = $1', [id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Product not found' });
    await cache.del('products:featured');
    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
}

/* ── Orders ───────────────────────────────────────────────── */

async function listOrders(req, res, next) {
  try {
    const status = req.query.status;
    const params = [];
    let sql = 'SELECT * FROM orders';
    if (status) {
      params.push(status);
      sql += ` WHERE status = $1`;
    }
    sql += ' ORDER BY created_at DESC LIMIT 200';
    const result = await query(sql, params);
    res.json({ orders: result.rows });
  } catch (err) {
    next(err);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body || {};
    const allowed = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
    }
    const result = await query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json({ order: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/* ── Dashboard stats + AI insights ────────────────────────── */

async function dashboard(req, res, next) {
  try {
    const [rev, orders, customers, products, recentOrders, daily] = await Promise.all([
      query(`SELECT COALESCE(SUM(total), 0)::numeric(10,2) AS v FROM orders WHERE status NOT IN ('cancelled','pending')`),
      query(`SELECT COUNT(*)::int AS v FROM orders`),
      query(`SELECT COUNT(*)::int AS v FROM users WHERE role = 'customer'`),
      query(`SELECT COUNT(*)::int AS v FROM products`),
      query(`SELECT id, order_number, status, total, created_at FROM orders ORDER BY created_at DESC LIMIT 8`),
      query(
        `SELECT to_char(created_at, 'YYYY-MM-DD') AS day, COUNT(*)::int AS orders, COALESCE(SUM(total),0)::numeric(10,2) AS revenue
         FROM orders WHERE created_at > now() - interval '14 days' AND status NOT IN ('cancelled','pending')
         GROUP BY day ORDER BY day`
      ),
    ]);

    const topProducts = (await query(
      `SELECT oi.product_name AS name, SUM(oi.quantity) AS units,
              SUM(oi.price * oi.quantity)::numeric(10,2) AS revenue
       FROM order_items oi GROUP BY oi.product_name ORDER BY revenue DESC LIMIT 5`
    )).rows;

    const lowStock = (await query(
      `SELECT name, stock FROM products WHERE stock <= 20 ORDER BY stock ASC LIMIT 5`
    )).rows;

    // AI-written insights from the MCP server (Claude when a key is present).
    let ai;
    try {
      ai = await aiService.analytics('overview');
    } catch {
      ai = null;
    }

    res.json({
      stats: {
        revenue: rev.rows[0].v,
        orders: orders.rows[0].v,
        customers: customers.rows[0].v,
        products: products.rows[0].v,
      },
      recentOrders: recentOrders.rows,
      daily: daily.rows,
      topProducts,
      lowStock,
      aiInsights: ai?.insights || null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createProduct, updateProduct, deleteProduct,
  listOrders, updateOrderStatus, dashboard,
};
