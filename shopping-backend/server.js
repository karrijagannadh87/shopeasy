/**
 * ShopEasy API — main entry point.
 *
 *   npm install && npm run seed && npm start
 *
 * Endpoints (all under /api):
 *   /auth      register / login / me
 *   /products  browse, search, filter, detail
 *   /cart      server-side cart (JWT)
 *   /orders    create / history (JWT, guests allowed)
 *   /payments  Stripe checkout + webhook (demo mode when no key)
 *   /ai        MCP-backed chat, recommendations, smart search, analytics
 *   /admin     product CRUD + order management (admin JWT)
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { initDb, closeDb, runSqlFile } = require('./config/database');
const { initCache } = require('./config/redis');
const { initStripe } = require('./services/stripeService');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

async function bootstrap() {
  await initDb();
  await runSqlFile(path.join(__dirname, 'db', 'schema.sql'));

  // Seed demo data on first boot (empty products table).
  const count = await require('./config/database').query('SELECT COUNT(*)::int AS n FROM products');
  if (count.rows[0].n === 0) {
    console.log('[boot] Empty catalog — seeding demo data…');
    const { execFileSync } = require('child_process');
    try {
      execFileSync(process.execPath, [path.join(__dirname, 'db', 'seed.js')], { stdio: 'inherit', env: process.env });
    } catch (err) {
      console.error('[boot] Seed failed:', err.message);
    }
  }

  await initCache();
  initStripe();

  // Middleware
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: process.env.CORS_ORIGINS === '*' ? true : process.env.CORS_ORIGINS?.split(',') || true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  // Uploaded product images.
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Health check
  app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ShopEasy API listening on http://0.0.0.0:${PORT}`);
    console.log(`   Demo login → admin@shopeasy.dev / admin123 · demo@shopeasy.dev / demo123`);
  });

  const shutdown = async () => {
    server.close();
    await closeDb();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
