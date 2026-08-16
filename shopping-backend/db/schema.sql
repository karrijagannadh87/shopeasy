-- ── ShopEasy schema (PostgreSQL) ─────────────────────────────
-- Works on real PostgreSQL and embedded PGlite.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer',   -- customer | admin
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  description      TEXT NOT NULL DEFAULT '',
  price            NUMERIC(10,2) NOT NULL,
  compare_at_price NUMERIC(10,2),
  category         TEXT NOT NULL,
  brand            TEXT,
  image_url        TEXT NOT NULL DEFAULT '',
  stock            INTEGER NOT NULL DEFAULT 0,
  rating           NUMERIC(2,1) NOT NULL DEFAULT 4.5,
  review_count     INTEGER NOT NULL DEFAULT 0,
  featured         BOOLEAN NOT NULL DEFAULT FALSE,
  tags             TEXT[] NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_featured  ON products (featured) WHERE featured = TRUE;

CREATE TABLE IF NOT EXISTS cart_items (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id               SERIAL PRIMARY KEY,
  order_number     TEXT NOT NULL UNIQUE,
  user_id          INTEGER REFERENCES users (id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'pending', -- pending | paid | shipped | delivered | cancelled
  subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping         NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax              NUMERIC(10,2) NOT NULL DEFAULT 0,
  total            NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method   TEXT NOT NULL DEFAULT 'demo',
  payment_id       TEXT,
  shipping_address JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id   INTEGER REFERENCES products (id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  price        NUMERIC(10,2) NOT NULL,
  quantity     INTEGER NOT NULL,
  image_url    TEXT NOT NULL DEFAULT ''
);
