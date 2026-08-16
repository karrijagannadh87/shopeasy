/**
 * AI controller — exposes the MCP-backed AI features as REST endpoints.
 */
const aiService = require('../services/aiService');

async function chat(req, res, next) {
  try {
    const { message, history } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'message is required' });
    }
    const result = await aiService.chat(String(message).trim(), {
      userId: req.user?.id ?? null,
      history: Array.isArray(history) ? history : [],
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function recommendations(req, res, next) {
  try {
    const productId = req.query.productId ? parseInt(req.query.productId, 10) : null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 8, 12);
    const products = await aiService.recommendations({
      productId,
      userId: req.user?.id ?? null,
      limit,
    });
    res.json({ products, generated_by: 'mcp' });
  } catch (err) {
    next(err);
  }
}

async function smartSearch(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || !String(q).trim()) {
      return res.status(400).json({ error: 'q is required' });
    }
    const products = await aiService.smartSearch(String(q).trim(), {
      userId: req.user?.id ?? null,
      filters: {
        category: req.query.category || null,
        min_price: req.query.min_price ? Number(req.query.min_price) : null,
        max_price: req.query.max_price ? Number(req.query.max_price) : null,
        limit: Math.min(parseInt(req.query.limit, 10) || 12, 24),
      },
    });
    res.json({ query: String(q).trim(), products, generated_by: 'mcp' });
  } catch (err) {
    next(err);
  }
}

async function analytics(req, res, next) {
  try {
    const scope = String(req.query.scope || 'overview');
    const result = await aiService.analytics(scope);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { chat, recommendations, smartSearch, analytics };
