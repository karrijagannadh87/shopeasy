/**
 * Seed script — creates the schema and demo data.
 *   npm run seed
 * Idempotent: safe to run multiple times (recreates schema & data).
 */
require('dotenv').config();
const path = require('path');
const bcrypt = require('bcryptjs');
const { initDb, query, runSqlFile, closeDb } = require('../config/database');

const PRODUCTS = [
  // ── Electronics ────────────────────────────────────────────
  { name: 'Aurora Wireless Headphones', category: 'Electronics', brand: 'Aurora', price: 89.99, compare_at_price: 129.99, stock: 42, rating: 4.8, review_count: 231, featured: true, tags: ['audio', 'wireless', 'bestseller'], image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80&auto=format&fit=crop', description: 'Over-ear wireless headphones with active noise cancellation, 40h battery life and plush memory-foam earcups. Bluetooth 5.3, multipoint pairing and a built-in mic for calls.' },
  { name: 'Nimbus Ultra Laptop 14"', category: 'Electronics', brand: 'Nimbus', price: 1099.00, compare_at_price: 1249.00, stock: 12, rating: 4.7, review_count: 89, featured: true, tags: ['laptop', 'work'], image_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80&auto=format&fit=crop', description: 'Thin-and-light 14" laptop with a 3K display, 16GB RAM and a 512GB NVMe SSD. All-day battery and a backlit keyboard for productivity anywhere.' },
  { name: 'Pulse Smartwatch Pro', category: 'Electronics', brand: 'Pulse', price: 199.99, compare_at_price: 249.99, stock: 30, rating: 4.6, review_count: 412, featured: false, tags: ['wearable', 'fitness'], image_url: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80&auto=format&fit=crop', description: 'GPS smartwatch with heart-rate and SpO2 tracking, 100+ sport modes, and 7-day battery. AMOLED display with always-on option.' },
  { name: 'PixelView 4K Action Camera', category: 'Electronics', brand: 'PixelView', price: 149.50, compare_at_price: 189.00, stock: 18, rating: 4.5, review_count: 156, featured: false, tags: ['camera', 'travel'], image_url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80&auto=format&fit=crop', description: 'Waterproof 4K action camera with image stabilization, touch screen and a wide 170° lens. Includes mounts, case and two batteries.' },
  { name: 'Sonic Boom Bluetooth Speaker', category: 'Electronics', brand: 'Sonic', price: 59.99, compare_at_price: 79.99, stock: 64, rating: 4.4, review_count: 98, featured: false, tags: ['audio', 'portable'], image_url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80&auto=format&fit=crop', description: 'Portable 360° Bluetooth speaker with deep bass, 24h playtime and IPX7 waterproofing. Pair two for stereo.' },
  { name: 'Vertex Mechanical Keyboard', category: 'Electronics', brand: 'Vertex', price: 119.00, compare_at_price: null, stock: 25, rating: 4.9, review_count: 203, featured: false, tags: ['gaming', 'peripherals'], image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80&auto=format&fit=crop', description: 'Hot-swappable 75% mechanical keyboard with gasket mount, PBT keycaps and per-key RGB. Linear silent switches included.' },
  { name: 'GlidePad Wireless Mouse', category: 'Electronics', brand: 'GlidePad', price: 39.99, compare_at_price: 49.99, stock: 55, rating: 4.3, review_count: 67, featured: false, tags: ['peripherals'], image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80&auto=format&fit=crop', description: 'Ergonomic wireless mouse with 26,000 DPI sensor, silent clicks and 90-day battery. Tri-mode: Bluetooth, 2.4GHz, USB-C.' },
  { name: 'Nova 27" 4K Monitor', category: 'Electronics', brand: 'Nova', price: 379.00, compare_at_price: 449.00, stock: 9, rating: 4.6, review_count: 74, featured: false, tags: ['monitor', 'work'], image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80&auto=format&fit=crop', description: '27" 4K IPS monitor with 99% sRGB, USB-C 90W charging and height-adjustable stand. Great for creators and multi-taskers.' },
  // ── Fashion ────────────────────────────────────────────────
  { name: 'Velocity Runner Sneakers', category: 'Fashion', brand: 'Velocity', price: 119.99, compare_at_price: 149.99, stock: 38, rating: 4.7, review_count: 345, featured: true, tags: ['shoes', 'running', 'bestseller'], image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80&auto=format&fit=crop', description: 'Featherlight running sneakers with responsive foam cushioning and a breathable knit upper. Designed for daily miles.' },
  { name: 'Classic Fit Crew Tee (2-Pack)', category: 'Fashion', brand: 'Everlane Co.', price: 29.99, compare_at_price: 39.99, stock: 120, rating: 4.5, review_count: 512, featured: false, tags: ['t-shirt', 'basics'], image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80&auto=format&fit=crop', description: 'Soft, pre-shrunk cotton tees with a classic crew neck. Two-pack in everyday colors that go with everything.' },
  { name: 'Urban Canvas Backpack', category: 'Fashion', brand: 'Urban', price: 64.99, compare_at_price: 89.99, stock: 47, rating: 4.6, review_count: 189, featured: true, tags: ['bag', 'travel'], image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80&auto=format&fit=crop', description: 'Water-resistant canvas backpack with padded 15" laptop sleeve, USB pass-through port and hidden anti-theft pocket.' },
  { name: 'Trail Hiker Boots', category: 'Fashion', brand: 'Summit', price: 139.00, compare_at_price: null, stock: 21, rating: 4.8, review_count: 142, featured: false, tags: ['shoes', 'outdoor'], image_url: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800&q=80&auto=format&fit=crop', description: 'Waterproof leather hiking boots with grippy Vibram outsoles and cushioned ankles. Break-in free from day one.' },
  { name: 'Aviator Sunglasses', category: 'Fashion', brand: 'SunLine', price: 79.99, compare_at_price: 99.99, stock: 33, rating: 4.4, review_count: 76, featured: false, tags: ['accessories'], image_url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80&auto=format&fit=crop', description: 'Classic aviators with polarized UV400 lenses and a lightweight metal frame. Includes hard case and cleaning cloth.' },
  { name: 'Smart Leather Wallet', category: 'Fashion', brand: 'Urban', price: 45.00, compare_at_price: 59.00, stock: 58, rating: 4.2, review_count: 61, featured: false, tags: ['accessories'], image_url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80&auto=format&fit=crop', description: 'Slim RFID-blocking leather wallet with card slots, cash pocket and a quick-access pull tab.' },
  // ── Home & Living ──────────────────────────────────────────
  { name: 'CloudNine Ergonomic Chair', category: 'Home & Living', brand: 'CloudNine', price: 249.00, compare_at_price: 329.00, stock: 15, rating: 4.7, review_count: 158, featured: true, tags: ['furniture', 'office'], image_url: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=800&q=80&auto=format&fit=crop', description: 'Ergonomic office chair with 4D armrests, lumbar support and breathable mesh. Sit comfortably for 12-hour days.' },
  { name: 'Lumen Smart Table Lamp', category: 'Home & Living', brand: 'Lumen', price: 49.99, compare_at_price: 69.99, stock: 72, rating: 4.5, review_count: 214, featured: false, tags: ['lighting', 'smart-home'], image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80&auto=format&fit=crop', description: 'Dimmable smart lamp with 16M colors, wireless charging base and app + voice control. Perfect nightstand upgrade.' },
  { name: 'Botanic Planter Set (3)', category: 'Home & Living', brand: 'Botanic', price: 34.99, compare_at_price: null, stock: 90, rating: 4.3, review_count: 44, featured: false, tags: ['decor', 'plants'], image_url: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80&auto=format&fit=crop', description: 'Set of three ceramic planters in matte finishes with drainage holes and bamboo trays. Indoor plants not included.' },
  { name: 'CozyLoom Throw Blanket', category: 'Home & Living', brand: 'CozyLoom', price: 39.99, compare_at_price: 54.99, stock: 66, rating: 4.8, review_count: 289, featured: false, tags: ['bedding'], image_url: 'https://images.unsplash.com/photo-1580301762395-83a675e7f201?w=800&q=80&auto=format&fit=crop', description: 'Ultra-soft chunky knit throw blanket in a warm oatmeal tone. Machine washable and gets cozier with every wash.' },
  { name: 'Barista Pour-Over Kettle', category: 'Home & Living', brand: 'Barista', price: 69.00, compare_at_price: 89.00, stock: 27, rating: 4.6, review_count: 133, featured: false, tags: ['kitchen', 'coffee'], image_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=80&auto=format&fit=crop', description: 'Gooseneck kettle with precise temperature control (135–212°F) and a counterbalanced handle for perfect pours.' },
  // ── Beauty ─────────────────────────────────────────────────
  { name: 'Éclat Eau de Parfum 50ml', category: 'Beauty', brand: 'Éclat', price: 85.00, compare_at_price: 110.00, stock: 40, rating: 4.9, review_count: 321, featured: true, tags: ['fragrance', 'bestseller'], image_url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80&auto=format&fit=crop', description: 'A luminous floral-woody fragrance with notes of bergamot, jasmine and sandalwood. Long-lasting, evening-ready elegance.' },
  { name: 'Glow Serum Vitamin C', category: 'Beauty', brand: 'GlowLab', price: 42.50, compare_at_price: 54.00, stock: 85, rating: 4.6, review_count: 267, featured: false, tags: ['skincare'], image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80&auto=format&fit=crop', description: '15% vitamin C serum with hyaluronic acid and vitamin E. Brightens, firms and evens skin tone in 4 weeks.' },
  { name: 'Silk Touch Lipstick Set', category: 'Beauty', brand: 'SilkTouch', price: 32.99, compare_at_price: 45.99, stock: 60, rating: 4.4, review_count: 178, featured: false, tags: ['makeup'], image_url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&q=80&auto=format&fit=crop', description: 'Four creamy, transfer-proof lipsticks in universally flattering nudes and reds. One-swipe color, all-day wear.' },
  { name: 'Botanic Hair Oil', category: 'Beauty', brand: 'Botanic', price: 24.99, compare_at_price: null, stock: 95, rating: 4.5, review_count: 91, featured: false, tags: ['haircare'], image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80&auto=format&fit=crop', description: 'Argan, jojoba and rosemary oil blend that tames frizz, adds shine and nourishes the scalp. 100% vegan.' },
  // ── Sports ─────────────────────────────────────────────────
  { name: 'FlexPro Yoga Mat', category: 'Sports', brand: 'FlexPro', price: 49.99, compare_at_price: 69.99, stock: 52, rating: 4.7, review_count: 356, featured: false, tags: ['yoga', 'fitness'], image_url: 'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=800&q=80&auto=format&fit=crop', description: '6mm extra-thick TPE yoga mat with alignment lines and a travel strap. Non-slip wet or dry.' },
  { name: 'IronCore Dumbbell Set 20kg', category: 'Sports', brand: 'IronCore', price: 129.99, compare_at_price: 169.99, stock: 14, rating: 4.6, review_count: 122, featured: false, tags: ['strength'], image_url: 'https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=800&q=80&auto=format&fit=crop', description: 'Adjustable dumbbell set with ergonomic grips and a sturdy storage tray. From 2.5kg to 20kg in seconds.' },
  { name: 'TrailBlazer Insulated Bottle', category: 'Sports', brand: 'TrailBlazer', price: 27.99, compare_at_price: 34.99, stock: 110, rating: 4.8, review_count: 431, featured: false, tags: ['hydration', 'outdoor'], image_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80&auto=format&fit=crop', description: 'Double-wall vacuum-insulated steel bottle keeps drinks cold 24h / hot 12h. Leak-proof lid and powder coat finish.' },
  // ── Books ──────────────────────────────────────────────────
  { name: 'The Midnight Library (Hardcover)', category: 'Books', brand: 'Penguin', price: 18.99, compare_at_price: 26.99, stock: 75, rating: 4.9, review_count: 1087, featured: false, tags: ['fiction', 'bestseller'], image_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80&auto=format&fit=crop', description: 'Between life and death there is a library, and within that library, the shelves go on forever. A dazzling novel about choices.' },
  { name: 'Atomic Habits — James Clear', category: 'Books', brand: 'Penguin', price: 16.99, compare_at_price: 22.00, stock: 88, rating: 4.8, review_count: 2214, featured: false, tags: ['self-help', 'bestseller'], image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80&auto=format&fit=crop', description: 'The #1 New York Times bestseller: a proven framework for improving every day by making tiny changes that yield remarkable results.' },
];

const SEED_ORDERS = [
  { daysAgo: 12, status: 'delivered', items: [0, 8], qty: [1, 1] },   // headphones + sneakers
  { daysAgo: 9, status: 'delivered', items: [12, 20], qty: [1, 2] },  // sunglasses + yoga mat
  { daysAgo: 4, status: 'shipped', items: [23], qty: [1] },           // midnight library
  { daysAgo: 1, status: 'paid', items: [1], qty: [1] },               // nimbus laptop
];

const USERS = [
  { name: 'ShopEasy Admin', email: 'admin@shopeasy.dev', password: 'admin123', role: 'admin' },
  { name: 'Demo Customer', email: 'demo@shopeasy.dev', password: 'demo123', role: 'customer' },
];

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function seed() {
  await initDb();
  console.log(`[seed] mode=${process.env.DATABASE_URL ? 'postgres' : 'pglite'}`);

  await runSqlFile(path.join(__dirname, 'schema.sql'));
  // Fresh demo data on every seed.
  await query('TRUNCATE order_items, orders, cart_items, products, users RESTART IDENTITY CASCADE');

  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
  const userIds = {};
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, rounds);
    const res = await query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [u.name, u.email, hash, u.role]
    );
    userIds[u.email] = res.rows[0].id;
    console.log(`[seed] user ${u.email} (${u.role}) id=${userIds[u.email]}`);
  }

  const productIds = [];
  for (const p of PRODUCTS) {
    const res = await query(
      `INSERT INTO products
        (name, slug, description, price, compare_at_price, category, brand, image_url, stock, rating, review_count, featured, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [p.name, slugify(p.name), p.description, p.price, p.compare_at_price ?? null,
       p.category, p.brand, p.image_url, p.stock, p.rating, p.review_count, p.featured, p.tags]
    );
    productIds.push(res.rows[0].id);
  }
  console.log(`[seed] ${productIds.length} products`);

  // Sample orders for the demo customer (so the admin dashboard has data).
  const customerId = userIds['demo@shopeasy.dev'];
  for (let i = 0; i < SEED_ORDERS.length; i++) {
    const o = SEED_ORDERS[i];
    const created = new Date(Date.now() - o.daysAgo * 86400000).toISOString();
    let subtotal = 0;
    const lines = [];
    for (let j = 0; j < o.items.length; j++) {
      const p = PRODUCTS[o.items[j]];
      const pid = productIds[o.items[j]];
      const qty = o.qty[j];
      const price = p.compare_at_price ?? p.price;
      subtotal += price * qty;
      lines.push({ pid, name: p.name, price, qty, image: p.image_url });
    }
    const shipping = 4.99;
    const tax = +(subtotal * 0.08).toFixed(2);
    const total = +(subtotal + shipping + tax).toFixed(2);
    const orderNumber = `SHOP-${new Date(created).getTime().toString(36).toUpperCase()}-${i + 1}`;
    const orderRes = await query(
      `INSERT INTO orders (order_number, user_id, status, subtotal, shipping, tax, total, payment_method, shipping_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'demo', $8, $9) RETURNING id`,
      [orderNumber, customerId, o.status, subtotal, shipping, tax, total,
       JSON.stringify({ fullName: 'Demo Customer', address: '123 Market Street', city: 'San Francisco', zip: '94103', country: 'US' }),
       created]
    );
    for (const l of lines) {
      await query(
        'INSERT INTO order_items (order_id, product_id, product_name, price, quantity, image_url) VALUES ($1, $2, $3, $4, $5, $6)',
        [orderRes.rows[0].id, l.pid, l.name, l.price, l.qty, l.image]
      );
    }
  }
  console.log(`[seed] ${SEED_ORDERS.length} sample orders`);

  // A couple of items in the demo customer's cart.
  await query(
    'INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, 1), ($1, $3, 2)',
    [customerId, productIds[0], productIds[8]]
  );
  console.log('[seed] demo cart seeded');

  await closeDb();
  console.log('✅ Seed complete.');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
