/**
 * ShopEasy static-demo service worker.
 *
 * Makes the GitHub Pages build a *fully working* store without a backend:
 * every /api/* request is answered from bundled demo data + localStorage.
 * This file is only registered in static-demo builds (NEXT_PUBLIC_STATIC_DEMO=true)
 * and is never used in normal dev/production (which talk to the real Express API).
 *
 * Mocked endpoints mirror the real backend:
 *   products (search/filter/sort), featured, categories
 *   auth (login/register/me)          — demo users, fake JWT
 *   cart (CRUD + merge)               — per-user, localStorage
 *   orders (create/list/detail)       — localStorage + 3 seeded demo orders
 *   payments (checkout/demo-pay)      — instant demo payment
 *   ai (chat, recommendations, search, analytics) — rule-based brain
 *   admin (dashboard, products CRUD, orders)
 */
const CACHE_NAME = 'shopeasy-demo-v1';

// Injected at build time (demoData.json is bundled separately — we cannot
// import it here, so it is fetched once and cached).
let DEMO = null;
const demoPromise = (async () => {
  const res = await fetch(`${scope()}/demo-data.json`, { cache: 'force-cache' });
  DEMO = await res.json();
  return DEMO;
})();

function scope() {
  return (self.registration && self.registration.scope ? self.registration.scope : '/').replace(/\/$/, '');
}

/* ── tiny storage helpers ─────────────────────────────────────── */
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
};

const KEYS = {
  users: 'se_demo_users',
  orders: 'se_demo_orders',
  carts: 'se_demo_carts',
  tokens: 'se_demo_tokens',
};

function seededUsers() {
  let users = store.get(KEYS.users, null);
  if (!users) {
    users = DEMO.users.map((u) => ({ ...u })); // keep plaintext pw: demo only
    store.set(KEYS.users, users);
  }
  return users;
}

function demoToken(user) {
  return 'demo.' + btoa(JSON.stringify({ id: user.id, email: user.email, role: user.role, name: user.name }));
}
function parseToken(token) {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}
function userFromRequest(req) {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const payload = parseToken(token);
  return seededUsers().find((u) => u.id === payload?.id) || null;
}

function currentCart(user) {
  const carts = store.get(KEYS.carts, {});
  carts[user.id] = carts[user.id] || [];
  return carts[user.id];
}

function money(n) { return Math.round(n * 100) / 100; }
function orderNumber() {
  return 'SHOP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(16).slice(2, 6).toUpperCase();
}

/* ── product search (mirrors backend logic) ───────────────────── */
function findProducts(params) {
  let rows = DEMO.products.slice();
  const q = (params.get('search') || '').trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (p) =>
        [p.name, p.description, p.brand, p.category, (p.tags || []).join(' ')]
          .join(' ').toLowerCase().includes(q)
    );
  }
  const cat = params.get('category');
  if (cat) rows = rows.filter((p) => p.category === cat);
  const minP = parseFloat(params.get('min_price'));
  const maxP = parseFloat(params.get('max_price'));
  if (!Number.isNaN(minP)) rows = rows.filter((p) => Number(p.price) >= minP);
  if (!Number.isNaN(maxP)) rows = rows.filter((p) => Number(p.price) <= maxP);

  const sort = params.get('sort') || 'featured';
  const by = {
    featured: (a, b) => (b.featured - a.featured) || (b.rating - a.rating),
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    rating: (a, b) => (b.rating - a.rating) || (b.review_count - a.review_count),
    newest: (a, b) => (b.created_at || '').localeCompare(a.created_at || ''),
    name: (a, b) => a.name.localeCompare(b.name),
  }[sort] || by.featured;
  rows.sort(by);

  const page = Math.max(1, parseInt(params.get('page') || '1', 10));
  const limit = Math.min(parseInt(params.get('limit') || '24', 10), 48);
  const total = rows.length;
  return { products: rows.slice((page - 1) * limit, page * limit), total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

/* ── AI brain (mirrors mcp-server rule fallback) ──────────────── */
const STOP = new Set(['the','a','an','for','me','my','i','want','need','show','find','some','cheap','best','good','buy','get','under','over','with','and','of','to','looking','what','do','you','have','please','dollars','dollar','usd','bucks','price','priced','around','gift','nice','something','really','hi','hello','hey']);
function tokensOf(text) {
  return (text || '').toLowerCase().match(/[a-z0-9]+/g)?.filter((w) => !STOP.has(w) && w.length > 1) || [];
}
function score(p, toks) {
  const text = [p.name, p.description, p.brand, p.category, (p.tags || []).join(' ')].join(' ').toLowerCase();
  return toks.filter((t) => text.includes(t) || text.includes(t.replace(/s$/, ''))).length;
}

function aiSearch(query, limit = 12) {
  const params = new URLSearchParams({ limit: '200' });
  const under = /under\s+\$?(\d+(?:\.\d+)?)|less than \$?(\d+(?:\.\d+)?)/i.exec(query);
  const over = /over\s+\$?(\d+(?:\.\d+)?)|above \$?(\d+(?:\.\d+)?)/i.exec(query);
  let rows = DEMO.products.slice();
  if (under) rows = rows.filter((p) => Number(p.price) <= parseFloat(under[1] || under[2]));
  if (over) rows = rows.filter((p) => Number(p.price) >= parseFloat(over[1] || over[2]));
  const toks = tokensOf(query);
  if (toks.length) {
    rows = rows.filter((p) => score(p, toks) > 0);
    rows.sort((a, b) => (score(b, toks) - score(a, toks)) || (b.rating - a.rating));
  } else {
    rows.sort((a, b) => b.rating - a.rating);
  }
  if (!rows.length && (under || over)) rows = DEMO.products.slice().sort((a, b) => b.rating - a.rating);
  return rows.slice(0, limit);
}

function aiChat(message) {
  const msg = (message || '').toLowerCase();
  if (/(add|put).*cart|cart.*(add|put)/.test(msg)) {
    const m = /(?:add|put)\s+(?:the\s+)?([a-z0-9 ]+?)\s+(?:to\s+)?(?:my\s+)?cart/i.exec(msg);
    const prod = m ? aiSearch(m[1], 1)[0] : null;
    if (prod) {
      return { reply: `I found “${prod.name}” — $${Number(prod.price).toFixed(2)}. To add it to your cart, open its product page and hit “Add to cart” (demo mode keeps cart actions on the product page).` };
    }
    return { reply: 'Sure! Tell me the product name and I\'ll find it for you.' };
  }
  if (/track|status|where is/.test(msg)) {
    const m = msg.toUpperCase().match(/SHOP-[A-Z0-9-]+/);
    if (m) {
      const order = store.get(KEYS.orders, []).find((o) => o.order_number === m[0]) || DEMO.demoOrders.find((o) => o.order_number === m[0]);
      if (order) return { reply: `Order ${order.order_number} is “${order.status}” — total $${Number(order.total).toFixed(2)}.` };
    }
    return { reply: 'I can track orders like SHOP-DEMO-1. Try one of the demo order numbers!' };
  }
  const found = aiSearch(msg, 3);
  if (found.length) {
    const lines = found.map((p) => `• ${p.name} — $${Number(p.price).toFixed(2)} ⭐ ${p.rating}`).join('\n');
    return { reply: `I found these for you:\n${lines}\n\nWant recommendations or a cheaper option?` };
  }
  const recs = DEMO.products.slice().sort((a, b) => (b.rating - a.rating) || (b.review_count - a.review_count)).slice(0, 3);
  const lines = recs.map((p) => `• ${p.name} — $${Number(p.price).toFixed(2)}`).join('\n');
  return { reply: `Here are some popular picks:\n${lines}\n\nTry asking “yoga mats under $60” or “show me sneakers”.` };
}

/* ── response helpers ─────────────────────────────────────────── */
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
function error(msg, status = 400) { return json({ error: msg }, status); }

/* ── router ───────────────────────────────────────────────────── */
async function handle(event) {
  await demoPromise;
  const url = new URL(event.request.url);
  const path = url.pathname.replace(/\/+$/, '');
  const method = event.request.method;
  let body = {};
  try {
    body = await event.request.json();
  } catch {
    try {
      const fd = await event.request.formData();
      fd.forEach((v, k) => { if (typeof v === 'string') body[k] = v; });
    } catch { /* empty */ }
  }
  const user = userFromRequest(event.request);
  const users = seededUsers();
  const scopePath = scope();

  /* Products */
  if (method === 'GET' && path.endsWith('/api/products/featured')) {
    return json({ products: DEMO.products.filter((p) => p.featured).slice(0, 8) });
  }
  if (method === 'GET' && path.endsWith('/api/products/categories')) {
    return json({ categories: DEMO.categories });
  }
  if (method === 'GET' && path.endsWith('/api/products')) {
    return json(findProducts(url.searchParams));
  }
  let m = path.match(/\/api\/products\/(\d+)$/);
  if (method === 'GET' && m) {
    const p = DEMO.products.find((x) => x.id === parseInt(m[1], 10));
    return p ? json({ product: p }) : error('Product not found', 404);
  }

  /* Auth */
  if (method === 'POST' && path.endsWith('/api/auth/login')) {
    const u = users.find((x) => x.email === (body.email || '').toLowerCase() && x.password === body.password);
    if (!u) return error('Invalid email or password', 401);
    return json({ user: { id: u.id, name: u.name, email: u.email, role: u.role }, token: demoToken(u) });
  }
  if (method === 'POST' && path.endsWith('/api/auth/register')) {
    if (users.some((x) => x.email === (body.email || '').toLowerCase())) return error('An account with this email already exists', 409);
    const u = { id: users.length + 10, name: body.name, email: body.email.toLowerCase(), password: body.password, role: 'customer' };
    users.push(u);
    store.set(KEYS.users, users);
    return json({ user: { id: u.id, name: u.name, email: u.email, role: u.role }, token: demoToken(u) }, 201);
  }
  if (method === 'GET' && path.endsWith('/api/auth/me')) {
    return user ? json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }) : error('Authentication required', 401);
  }

  /* Cart (auth required) */
  if (path.includes('/api/cart')) {
    if (!user) return error('Authentication required', 401);
    const cart = currentCart(user);
    const enrich = (src = cart) => src.map((c) => {
      const p = DEMO.products.find((x) => x.id === c.product_id) || {};
      return { ...c, name: p.name, price: p.price, image_url: p.image_url, stock: p.stock, slug: p.slug, category: p.category, compare_at_price: p.compare_at_price };
    });
    if (method === 'GET' && path.endsWith('/api/cart')) {
      const items = enrich();
      return json({ items, subtotal: money(items.reduce((s, i) => s + Number(i.price) * i.quantity, 0)), count: items.reduce((s, i) => s + i.quantity, 0) });
    }
    if (method === 'POST' && path.endsWith('/api/cart')) {
      const pid = parseInt(body.product_id ?? body.productId, 10);
      const qty = Math.max(1, parseInt(body.quantity ?? 1, 10));
      const p = DEMO.products.find((x) => x.id === pid);
      if (!p) return error('Product not found', 404);
      const existing = cart.find((c) => c.product_id === pid);
      if (existing) existing.quantity = Math.min(existing.quantity + qty, p.stock);
      else cart.push({ product_id: pid, quantity: Math.min(qty, p.stock) });
      const carts = store.get(KEYS.carts, {});
      carts[user.id] = cart;
      store.set(KEYS.carts, carts);
      return json({ message: 'Added to cart', items: enrich() });
    }
    m = path.match(/\/api\/cart\/(\d+)$/);
    if (m) {
      const pid = parseInt(m[1], 10);
      if (method === 'PATCH') {
        const qty = parseInt(body.quantity, 10);
        const c = cart.find((x) => x.product_id === pid);
        if (!c) return error('Item not in cart', 404);
        c.quantity = Math.max(1, qty);
        const carts = store.get(KEYS.carts, {});
        carts[user.id] = cart;
        store.set(KEYS.carts, carts);
        return json({ message: 'Cart updated', items: enrich() });
      }
      if (method === 'DELETE') {
        const next = cart.filter((x) => x.product_id !== pid);
        const carts = store.get(KEYS.carts, {});
        carts[user.id] = next;
        store.set(KEYS.carts, carts);
        return json({ message: 'Removed from cart', items: enrich(next) });
      }
    }
    if (method === 'POST' && path.endsWith('/api/cart/merge')) {
      for (const it of body.items || []) {
        const pid = parseInt(it.product_id ?? it.productId, 10);
        const p = DEMO.products.find((x) => x.id === pid);
        if (!p) continue;
        const existing = cart.find((c) => c.product_id === pid);
        const qty = Math.max(1, parseInt(it.quantity ?? 1, 10));
        if (existing) existing.quantity = Math.min(existing.quantity + qty, p.stock);
        else cart.push({ product_id: pid, quantity: Math.min(qty, p.stock) });
      }
      const carts = store.get(KEYS.carts, {});
      carts[user.id] = cart;
      store.set(KEYS.carts, carts);
      return json({ message: 'Cart merged', items: enrich() });
    }
  }

  /* Orders */
  const localOrders = store.get(KEYS.orders, []);
  const allOrders = () => [...localOrders, ...DEMO.demoOrders];
  if (method === 'GET' && path.endsWith('/api/orders')) {
    if (!user) return error('Authentication required', 401);
    return json({ orders: allOrders().filter((o) => o.user_id === user.id || !o.user_id) });
  }
  m = path.match(/\/api\/orders\/([^/]+)$/);
  if (m && method === 'GET') {
    const order = allOrders().find((o) => o.order_number === decodeURIComponent(m[1]));
    return order ? json({ order }) : error('Order not found', 404);
  }
  if (method === 'POST' && path.endsWith('/api/orders')) {
    let items = Array.isArray(body.items) ? body.items : [];
    if (!items.length && user) {
      items = currentCart(user).map((c) => ({ product_id: c.product_id, quantity: c.quantity }));
    }
    if (!items.length) return error('Your cart is empty', 400);
    const addr = body.shipping_address || body.shippingAddress || {};
    if (!addr.fullName || !addr.address || !addr.city) return error('Shipping address is incomplete (fullName, address, city required)', 400);
    const lines = [];
    for (const it of items) {
      const p = DEMO.products.find((x) => x.id === parseInt(it.product_id ?? it.productId, 10));
      if (!p) return error('Product not found', 400);
      const qty = Math.max(1, parseInt(it.quantity ?? 1, 10));
      lines.push({ product_id: p.id, product_name: p.name, price: Number(p.price), quantity: qty, image_url: p.image_url });
    }
    const subtotal = money(lines.reduce((s, l) => s + l.price * l.quantity, 0));
    const shipping = subtotal >= 100 ? 0 : 4.99;
    const tax = money(subtotal * 0.08);
    const order = {
      id: Date.now(), order_number: orderNumber(), user_id: user?.id ?? null,
      status: 'pending', subtotal, shipping, tax, total: money(subtotal + shipping + tax),
      payment_method: 'demo', shipping_address: addr, created_at: new Date().toISOString(), items: lines.map((l, i) => ({ id: i + 1, ...l })),
    };
    localOrders.unshift(order);
    store.set(KEYS.orders, localOrders);
    if (user) {
      const cart = currentCart(user).filter((c) => !lines.some((l) => l.product_id === c.product_id));
      store.set(KEYS.carts, { ...store.get(KEYS.carts, {}), [user.id]: cart });
    }
    return json({ order, order_number: order.order_number }, 201);
  }

  /* Payments */
  if (method === 'POST' && path.endsWith('/api/payments/checkout')) {
    const order = allOrders().find((o) => o.order_number === body.order_number);
    if (!order) return error('Order not found', 404);
    return json({ checkout: { mode: 'demo', url: `${scopePath}/checkout/demo?order=${order.order_number}`, sessionId: `demo_${order.order_number}` } });
  }
  if (method === 'POST' && path.endsWith('/api/payments/demo-pay')) {
    const order = allOrders().find((o) => o.order_number === body.order_number);
    if (!order) return error('Order not found', 404);
    order.status = 'paid';
    order.payment_id = 'demo_' + Date.now();
    store.set(KEYS.orders, localOrders);
    return json({ message: 'Payment successful (demo)', order });
  }
  if (method === 'POST' && path.endsWith('/api/payments/confirm')) {
    return json({ message: 'Payment confirmed (demo)', order: {} });
  }

  /* AI */
  if (method === 'POST' && path.endsWith('/api/ai/chat')) {
    return json({ ...aiChat(body.message), brain: 'rule', source: 'mcp' });
  }
  if (method === 'GET' && path.includes('/api/ai/search')) {
    const q = url.searchParams.get('q') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '12', 10), 24);
    return json({ query: q, products: aiSearch(q, limit), generated_by: 'mcp' });
  }
  if (method === 'GET' && path.includes('/api/ai/recommendations')) {
    const pid = parseInt(url.searchParams.get('productId') || '0', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '8', 10), 12);
    const target = DEMO.products.find((p) => p.id === pid);
    let recs = [];
    if (target) {
      recs = DEMO.products
        .filter((p) => p.id !== pid && p.category === target.category)
        .sort((a, b) => Math.abs(a.price - target.price) - Math.abs(b.price - target.price));
    }
    if (!recs.length) recs = DEMO.products.slice().sort((a, b) => (b.rating - a.rating) || (b.review_count - a.review_count));
    return json({ products: recs.slice(0, limit), generated_by: 'mcp' });
  }
  if (method === 'GET' && path.includes('/api/ai/analytics')) {
    const revenue = DEMO.demoOrders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
    return json({
      stats: {
        totalRevenue: money(revenue), orderCount: allOrders().length, customerCount: users.length, productCount: DEMO.products.length,
        topProducts: [
          { name: DEMO.products[0].name, units: 3, revenue: money(Number(DEMO.products[0].price) * 3) },
          { name: DEMO.products[8].name, units: 2, revenue: money(Number(DEMO.products[8].price) * 2) },
          { name: DEMO.products[23].name, units: 1, revenue: Number(DEMO.products[23].price) },
        ],
        lowStock: DEMO.products.filter((p) => p.stock <= 20).slice(0, 5).map((p) => ({ name: p.name, stock: p.stock })),
      },
      insights: [
        `Top seller is “${DEMO.products[0].name}” — feature it on the home page banner.`,
        `${DEMO.products.filter((p) => p.stock <= 20).length} products are at or below 20 units. Restock soon.`,
        'Average order value is healthy. Consider an email campaign for repeat customers.',
      ],
    });
  }

  /* Admin */
  if (path.includes('/api/admin')) {
    if (!user || user.role !== 'admin') return error(user ? 'Admin access required' : 'Authentication required', user ? 403 : 401);
    if (method === 'GET' && path.endsWith('/api/admin/dashboard')) {
      const revenue = DEMO.demoOrders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
      const lowStock = DEMO.products.filter((p) => p.stock <= 20).map((p) => ({ name: p.name, stock: p.stock }));
      return json({
        stats: { revenue: money(revenue), orders: allOrders().length, customers: users.filter((u) => u.role === 'customer').length, products: DEMO.products.length },
        recentOrders: allOrders().slice(0, 8).map(({ items, ...o }) => o),
        daily: DEMO.demoOrders.map((o) => ({ day: o.created_at.slice(0, 10), orders: 1, revenue: money(Number(o.total)) })),
        topProducts: [
          { name: DEMO.products[0].name, units: 3, revenue: money(Number(DEMO.products[0].price) * 3) },
          { name: DEMO.products[8].name, units: 2, revenue: money(Number(DEMO.products[8].price) * 2) },
          { name: DEMO.products[23].name, units: 1, revenue: Number(DEMO.products[23].price) },
        ],
        lowStock,
        aiInsights: [
          `Top seller is “${DEMO.products[0].name}” with 3 units sold. Feature it on the home page banner.`,
          `${lowStock.length} products are at or below 20 units. Restock “${lowStock[0]?.name || '—'}” first (${lowStock[0]?.stock ?? '—'} left).`,
          'Average order value is healthy across the demo orders. Consider an email campaign for repeat customers.',
        ],
      });
    }
    if (method === 'GET' && path.endsWith('/api/admin/orders')) {
      let orders = allOrders();
      const status = url.searchParams.get('status');
      if (status) orders = orders.filter((o) => o.status === status);
      return json({ orders: orders.map(({ items, ...o }) => o) });
    }
    m = path.match(/\/api\/admin\/orders\/(\d+)$/);
    if (m && method === 'PATCH') {
      const order = allOrders().find((o) => o.id === parseInt(m[1], 10));
      if (!order) return error('Order not found', 404);
      order.status = body.status;
      store.set(KEYS.orders, localOrders);
      return json({ order });
    }
    if (method === 'POST' && path.endsWith('/api/admin/products')) {
      const p = {
        id: DEMO.products.length + 100, name: body.name, slug: body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: body.description || '', price: parseFloat(body.price), compare_at_price: body.compare_at_price ? parseFloat(body.compare_at_price) : null,
        category: body.category, brand: body.brand || '', image_url: body.image_url || DEMO.products[0].image_url,
        stock: parseInt(body.stock || '0', 10), rating: 4.5, review_count: 0, featured: body.featured === 'true',
        tags: String(body.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
      };
      DEMO.products.unshift(p);
      return json({ product: p }, 201);
    }
    m = path.match(/\/api\/admin\/products\/(\d+)$/);
    if (m) {
      const p = DEMO.products.find((x) => x.id === parseInt(m[1], 10));
      if (!p) return error('Product not found', 404);
      if (method === 'PUT') {
        Object.assign(p, {
          name: body.name ?? p.name, description: body.description ?? p.description,
          price: body.price !== undefined ? parseFloat(body.price) : p.price,
          category: body.category ?? p.category, brand: body.brand ?? p.brand,
          stock: body.stock !== undefined ? parseInt(body.stock, 10) : p.stock,
          featured: body.featured === 'true' || p.featured,
        });
        return json({ product: p });
      }
      if (method === 'DELETE') {
        DEMO.products = DEMO.products.filter((x) => x.id !== p.id);
        return json({ message: 'Product deleted' });
      }
    }
  }

  return error(`Mock API: no handler for ${method} ${path}`, 404);
}

self.addEventListener('install', (e) => {
  e.waitUntil(demoPromise.then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method === 'GET' && url.pathname.endsWith('/demo-data.json')) {
    // Cache-first for the demo catalog so the API mock works offline.
    e.respondWith(
      caches.match(e.request).then(
        (hit) => hit || fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
          return res;
        })
      )
    );
    return;
  }
  if (url.pathname.includes('/api/')) {
    e.respondWith(handle(e).catch((err) => json({ error: 'Demo API error: ' + err.message }, 500)));
  }
});

// Keep a reference so the fetch cache for demoData works on first paint.
self.addEventListener('message', (e) => {
  if (e.data?.type === 'CACHE_DEMO_DATA' && e.data.url) {
    e.waitUntil(caches.open(CACHE_NAME).then((c) => c.add(e.data.url)));
  }
});
