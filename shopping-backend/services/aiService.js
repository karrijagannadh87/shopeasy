/**
 * AI service — everything the frontend AI features call.
 *
 * Every call goes through the Python MCP server (Model Context Protocol):
 *   /api/ai/chat            → mcp chat tool  (Claude brain when ANTHROPIC_API_KEY is set)
 *   /api/ai/recommendations → mcp get_recommendations
 *   /api/ai/search          → mcp search_products
 *   /api/ai/analytics       → mcp ai_analysis
 *
 * If the Python server cannot be reached, we degrade to direct database
 * queries + a rule-based fallback so AI features never take the site down.
 */
const { getMCPClient } = require('./mcpClient');
const { query } = require('../config/database');

async function withMCP(fn) {
  const client = getMCPClient();
  try {
    return await fn(client);
  } catch (err) {
    console.warn('[ai] MCP unavailable, using fallback:', err.message);
    return null;
  }
}

/* ── Fallback implementations (no Python / no Claude needed) ── */

async function fallbackSearch(queryText, filters = {}) {
  const clean = (queryText || '').trim();
  const params = [];
  const where = [];
  let q = 'SELECT * FROM products WHERE 1=1';

  if (filters.category) { params.push(filters.category); where.push(`category = $${params.length}`); }
  if (filters.min_price != null) { params.push(filters.min_price); where.push(`price >= $${params.length}`); }
  if (filters.max_price != null) { params.push(filters.max_price); where.push(`price <= $${params.length}`); }
  if (clean) {
    params.push(`%${clean}%`);
    where.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length} OR brand ILIKE $${params.length} OR category ILIKE $${params.length} OR array_to_string(tags, ' ') ILIKE $${params.length})`);
  }
  params.push(filters.limit || 12);
  q += where.length ? ' AND ' + where.join(' AND ') : '';
  q += ` ORDER BY rating DESC, review_count DESC LIMIT $${params.length}`;
  const res = await query(q, params);
  return res.rows;
}

async function fallbackRecommendations({ productId, userId, limit = 8 }) {
  let res;
  if (productId) {
    // Same category + similar price band first, then top rated.
    res = await query(
      `SELECT * FROM products
       WHERE id != $1 AND category = (SELECT category FROM products WHERE id = $1)
       ORDER BY ABS(price - (SELECT price FROM products WHERE id = $1)), rating DESC
       LIMIT $2`,
      [productId, limit]
    );
  } else if (userId) {
    // Based on categories the user has ordered before.
    res = await query(
      `SELECT p.*, COUNT(*) AS overlap
       FROM products p
       JOIN order_items oi ON oi.product_id != p.id
       JOIN orders o ON o.id = oi.order_id AND o.user_id = $1
       WHERE p.category IN (
         SELECT DISTINCT p2.category FROM order_items oi2
         JOIN orders o2 ON o2.id = oi2.order_id AND o2.user_id = $1
         JOIN products p2 ON p2.id = oi2.product_id
       )
       GROUP BY p.id
       ORDER BY overlap DESC, p.rating DESC
       LIMIT $2`,
      [userId, limit]
    );
  }
  if (!res || !res.rows.length) {
    res = await query('SELECT * FROM products WHERE featured = TRUE ORDER BY rating DESC LIMIT $1', [limit]);
  }
  return res.rows;
}

async function fallbackInsights(scope = 'overview') {
  const stats = {
    overview: {
      totalRevenue: (await query('SELECT COALESCE(SUM(total),0)::numeric(10,2) AS v FROM orders WHERE status != \'cancelled\'')).rows[0].v,
      orderCount: (await query('SELECT COUNT(*)::int AS v FROM orders')).rows[0].v,
      customerCount: (await query('SELECT COUNT(*)::int AS v FROM users WHERE role=\'customer\'')).rows[0].v,
      productCount: (await query('SELECT COUNT(*)::int AS v FROM products')).rows[0].v,
    },
    topProducts: (await query(
      'SELECT oi.product_name AS name, SUM(oi.quantity) AS units, SUM(oi.price*oi.quantity)::numeric(10,2) AS revenue FROM order_items oi GROUP BY oi.product_name ORDER BY revenue DESC LIMIT 5'
    )).rows,
    lowStock: (await query('SELECT name, stock FROM products WHERE stock <= 20 ORDER BY stock ASC LIMIT 5')).rows,
  };
  const insights = [
    `Top seller is “${stats.topProducts[0]?.name || '—'}” with ${stats.topProducts[0]?.units || 0} units sold. Consider featuring it on the home page.`,
    stats.lowStock.length
      ? `${stats.lowStock.length} products are at or below 20 units. Restock “${stats.lowStock[0].name}” first (${stats.lowStock[0].stock} left).`
      : 'Stock levels are healthy across all products.',
    `Average order value is ${stats.orderCount ? '$' + (stats.overview.totalRevenue / stats.orderCount).toFixed(2) : '$0.00'}.`,
  ];
  return { stats, insights };
}

/* ── Public API used by controllers ── */

async function chat(message, { userId, history = [] } = {}) {
  const viaMCP = await withMCP(async (client) => {
    const result = await client.callTool('chat', {
      message,
      user_id: userId ?? null,
      history: history.slice(-8),
    });
    return typeof result === 'object' && result !== null ? result : { reply: String(result) };
  });
  if (viaMCP) return viaMCP;
  return { reply: await fallbackChat(message, { userId }), source: 'fallback' };
}

async function fallbackChat(message, { userId }) {
  const msg = message.toLowerCase();
  const found = await fallbackSearch(msg, { limit: 3 });
  const cheap = /under \$?(\d+)|less than \$?(\d+)|budget/i.exec(msg);
  let products = found;
  if (cheap) {
    const max = parseInt(cheap[1], 10);
    products = (await fallbackSearch(msg, { max_price: max, limit: 3 })).length
      ? await fallbackSearch(msg, { max_price: max, limit: 3 })
      : found;
  }
  if (/recommend|suggest|what should i (buy|get)/.test(msg) || products.length === 0) {
    const recs = await fallbackRecommendations({ userId, limit: 3 });
    const lines = recs.map((p) => `• ${p.name} — $${Number(p.price).toFixed(2)}`).join('\n');
    return `Here are a few picks I think you'll love:\n${lines}\n\nWant me to find something cheaper or in a specific category?`;
  }
  const lines = products.map((p) => `• ${p.name} — $${Number(p.price).toFixed(2)} ⭐ ${p.rating}`).join('\n');
  return `I found these matching products:\n${lines}\n\nYou can also ask me things like “recommend a gift under $50” or “add the headphones to my cart”.`;
}

async function recommendations({ productId, userId, limit = 8 }) {
  const viaMCP = await withMCP(async (client) => {
    const result = await client.callTool('get_recommendations', {
      product_id: productId ?? null,
      user_id: userId ?? null,
      limit,
    });
    return Array.isArray(result) ? result : result?.products;
  });
  if (viaMCP) return viaMCP;
  return fallbackRecommendations({ productId, userId, limit });
}

async function smartSearch(queryText, { userId, filters = {} } = {}) {
  const viaMCP = await withMCP(async (client) => {
    const result = await client.callTool('search_products', {
      query: queryText,
      user_id: userId ?? null,
      category: filters.category ?? null,
      min_price: filters.min_price ?? null,
      max_price: filters.max_price ?? null,
      limit: filters.limit ?? 12,
    });
    return Array.isArray(result) ? result : result?.products;
  });
  if (viaMCP) return viaMCP;
  return fallbackSearch(queryText, filters);
}

async function analytics(scope = 'overview') {
  const viaMCP = await withMCP(async (client) => {
    const result = await client.callTool('ai_analysis', { scope });
    return result;
  });
  if (viaMCP) return viaMCP;
  return fallbackInsights(scope);
}

module.exports = { chat, recommendations, smartSearch, analytics };
