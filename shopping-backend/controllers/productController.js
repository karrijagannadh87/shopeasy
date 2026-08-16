/**
 * Product controller — browse, search, filter, detail.
 */
const { query } = require('../config/database');
const cache = require('../config/redis');

const PAGE_SIZE = 24;

async function listProducts(req, res, next) {
  try {
    const {
      search = '', category = '', brand = '',
      min_price, max_price, sort = 'featured', page = '1',
    } = req.query;

    const params = [];
    const where = [];
    const limit = Math.min(parseInt(req.query.limit, 10) || PAGE_SIZE, 48);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;

    if (search) {
      params.push(`%${search}%`);
      where.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length} OR brand ILIKE $${params.length} OR category ILIKE $${params.length} OR array_to_string(tags, ' ') ILIKE $${params.length})`);
    }
    if (category) { params.push(category); where.push(`category = $${params.length}`); }
    if (brand) { params.push(brand); where.push(`brand = $${params.length}`); }
    if (min_price != null && min_price !== '') { params.push(Number(min_price)); where.push(`price >= $${params.length}`); }
    if (max_price != null && max_price !== '') { params.push(Number(max_price)); where.push(`price <= $${params.length}`); }

    const orderBy = {
      featured: 'featured DESC, rating DESC',
      price_asc: 'price ASC',
      price_desc: 'price DESC',
      rating: 'rating DESC, review_count DESC',
      newest: 'created_at DESC',
      name: 'name ASC',
    }[sort] || 'featured DESC, rating DESC';

    const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';
    const countRes = await query(`SELECT COUNT(*)::int AS total FROM products${whereSql}`, params);
    const listRes = await query(
      `SELECT * FROM products${whereSql} ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      products: listRes.rows,
      total: countRes.rows[0].total,
      page: Math.max(parseInt(page, 10) || 1, 1),
      pages: Math.max(1, Math.ceil(countRes.rows[0].total / limit)),
    });
  } catch (err) {
    next(err);
  }
}

async function getProduct(req, res, next) {
  try {
    const { id } = req.params;
    // Avoid Postgres parameter-type inference issues (id = $1 OR slug = $1).
    const isNumeric = /^\d+$/.test(id);
    const found = await query(
      isNumeric
        ? 'SELECT * FROM products WHERE id = $1'
        : 'SELECT * FROM products WHERE slug = $1',
      [id]
    );
    if (!found.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: found.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function featuredProducts(req, res, next) {
  try {
    const cached = await cache.remember('products:featured', 60, async () => {
      const result = await query(
        'SELECT * FROM products WHERE featured = TRUE ORDER BY rating DESC, review_count DESC LIMIT 8'
      );
      return result.rows;
    });
    res.json({ products: cached });
  } catch (err) {
    next(err);
  }
}

async function categories(req, res, next) {
  try {
    const cached = await cache.remember('products:categories', 300, async () => {
      const result = await query(
        `SELECT category, COUNT(*)::int AS count FROM products GROUP BY category ORDER BY count DESC`
      );
      return result.rows;
    });
    res.json({ categories: cached });
  } catch (err) {
    next(err);
  }
}

module.exports = { listProducts, getProduct, featuredProducts, categories };
