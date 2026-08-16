/**
 * Node harness that exercises the static-demo service worker router
 * (public/sw.js) against the bundled demo data — no browser needed.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const swSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8');

// ── stubs ──────────────────────────────────────────────────────
const memory = new Map(); // localStorage
const listeners = {};
const cacheStore = new Map();

global.localStorage = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
};

const caches = {
  open: async () => ({
    match: async () => undefined,
    put: async () => {},
  }),
  keys: async () => [],
  delete: async () => true,
};

const registration = { scope: 'https://demo.example.com/shopeasy/' };

const self = {
  registration,
  addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
  skipWaiting: () => {},
  clients: { claim: () => {} },
};

// serve demo-data.json from disk
const demoDataUrl = 'https://demo.example.com/shopeasy/demo-data.json';
const demoJson = fs.readFileSync(path.join(__dirname, '..', 'lib', 'demoData.json'), 'utf8');

const sandbox = {
  self,
  caches,
  fetch: async (url) => {
    if (String(url) === demoDataUrl) {
      return new Response(demoJson, { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response('{}', { status: 404 });
  },
  Response,
  Request,
  URL,
  URLSearchParams,
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  console,
  setTimeout,
  clearTimeout,
  localStorage: global.localStorage,
};
sandbox.self = self;
vm.createContext(sandbox);
vm.runInContext(swSource, sandbox);

async function callApi(method, pathname, body, token) {
  const req = new Request(`https://demo.example.com${pathname}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let respondWith = null;
  const event = { request: req, respondWith: (p) => { respondWith = p; } };
  for (const fn of listeners.fetch) fn(event);
  const res = await respondWith;
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
}

const assert = (cond, label) => { if (!cond) { console.error('❌ FAIL:', label); process.exitCode = 1; } else { console.log('✅', label); } };

(async () => {
  // 1. products list
  let r = await callApi('GET', '/shopeasy/api/products?limit=5');
  assert(r.status === 200 && r.json.products.length === 5, 'GET /api/products?limit=5 → 5 products');

  // 2. search + filter
  r = await callApi('GET', '/shopeasy/api/products?search=headphones&max_price=100&sort=price_asc');
  assert(r.status === 200 && r.json.products.length === 1 && r.json.products[0].name.includes('Headphones'), 'search+filter "headphones under 100"');

  // 3. featured
  r = await callApi('GET', '/shopeasy/api/products/featured');
  assert(r.status === 200 && r.json.products.length > 0 && r.json.products.every((p) => p.featured), 'featured products');

  // 4. categories
  r = await callApi('GET', '/shopeasy/api/products/categories');
  assert(r.status === 200 && r.json.categories.length === 6, '6 categories');

  // 5. product detail
  r = await callApi('GET', '/shopeasy/api/products/1');
  assert(r.status === 200 && r.json.product.id === 1, 'product detail id=1');
  r = await callApi('GET', '/shopeasy/api/products/9999');
  assert(r.status === 404, 'product 404');

  // 6. auth
  r = await callApi('POST', '/shopeasy/api/auth/login', { email: 'demo@shopeasy.dev', password: 'demo123' });
  assert(r.status === 200 && r.json.token, 'login demo user');
  const token = r.json.token;
  r = await callApi('POST', '/shopeasy/api/auth/login', { email: 'demo@shopeasy.dev', password: 'wrong' });
  assert(r.status === 401, 'login wrong password → 401');
  r = await callApi('GET', '/shopeasy/api/auth/me', undefined, token);
  assert(r.status === 200 && r.json.user.role === 'customer', 'auth/me');

  // 7. cart
  r = await callApi('GET', '/shopeasy/api/cart', undefined, token);
  assert(r.status === 200 && Array.isArray(r.json.items), 'get cart');
  r = await callApi('POST', '/shopeasy/api/cart', { product_id: 3, quantity: 2 }, token);
  assert(r.status === 200 && r.json.items.some((i) => i.product_id === 3), 'add to cart');
  r = await callApi('PATCH', '/shopeasy/api/cart/3', { quantity: 5 }, token);
  assert(r.status === 200 && r.json.items.find((i) => i.product_id === 3).quantity === 5, 'update cart qty');
  r = await callApi('DELETE', '/shopeasy/api/cart/3', undefined, token);
  assert(r.status === 200 && !r.json.items.some((i) => i.product_id === 3), 'remove from cart');
  r = await callApi('GET', '/shopeasy/api/cart');
  assert(r.status === 401, 'cart without token → 401');

  // 8. order + payment flow
  r = await callApi('POST', '/shopeasy/api/orders', {
    items: [{ product_id: 1, quantity: 1 }, { product_id: 9, quantity: 1 }],
    shipping_address: { fullName: 'Demo', address: '1 St', city: 'NYC', zip: '10001', country: 'US' },
  }, token);
  assert(r.status === 201 && r.json.order_number, 'create order');
  const on = r.json.order_number;
  r = await callApi('POST', '/shopeasy/api/payments/checkout', { order_number: on }, token);
  assert(r.status === 200 && r.json.checkout.mode === 'demo' && r.json.checkout.url.includes('/shopeasy/checkout/demo?order='), 'checkout demo url scoped');
  r = await callApi('POST', '/shopeasy/api/payments/demo-pay', { order_number: on }, token);
  assert(r.status === 200 && r.json.order.status === 'paid', 'demo pay → paid');
  r = await callApi('GET', `/shopeasy/api/orders/${on}`, undefined, token);
  assert(r.status === 200 && r.json.order.status === 'paid', 'order detail after pay');
  r = await callApi('GET', '/shopeasy/api/orders', undefined, token);
  assert(r.status === 200 && r.json.orders.length >= 4, 'order list (3 seeded + new)');

  // 9. AI endpoints
  r = await callApi('POST', '/shopeasy/api/ai/chat', { message: 'yoga mats under 60 dollars' });
  assert(r.status === 200 && /yoga/i.test(r.json.reply), 'AI chat finds yoga mat');
  r = await callApi('GET', '/shopeasy/api/ai/search?q=wireless%20headphones%20under%20%24100');
  assert(r.status === 200 && r.json.products.some((p) => p.name.includes('Headphones')), 'AI smart search');
  r = await callApi('GET', '/shopeasy/api/ai/recommendations?productId=1&limit=3');
  assert(r.status === 200 && r.json.products.length === 3, 'AI recommendations');

  // 10. admin
  r = await callApi('POST', '/shopeasy/api/auth/login', { email: 'admin@shopeasy.dev', password: 'admin123' });
  const atoken = r.json.token;
  r = await callApi('GET', '/shopeasy/api/admin/dashboard', undefined, atoken);
  assert(r.status === 200 && r.json.stats.products === 28 && r.json.aiInsights.length === 3, 'admin dashboard + AI insights');
  r = await callApi('GET', '/shopeasy/api/admin/orders', undefined, atoken);
  assert(r.status === 200 && Array.isArray(r.json.orders), 'admin orders list');
  r = await callApi('GET', '/shopeasy/api/admin/dashboard', undefined, token);
  assert(r.status === 403, 'admin blocked for customer');

  console.log('\nDone.', process.exitCode ? 'SOME TESTS FAILED' : 'ALL PASSED ✔');
  process.exit(process.exitCode || 0);
})().catch((e) => { console.error('HARNESS ERROR:', e); process.exit(1); });
