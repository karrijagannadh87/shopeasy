/**
 * Database access layer.
 *
 * Two backends, one SQL:
 *  - PostgreSQL via `pg` when DATABASE_URL is set (production / Railway / Neon)
 *  - PGlite (real PostgreSQL compiled to WASM) when it isn't (zero-setup demo)
 *
 * Both accept the same parameterized SQL, so models are identical either way.
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { PGlite } = require('@electric-sql/pglite');

let pool = null;
let pglite = null;
let mode = 'unknown';

/** @returns {'postgres' | 'pglite'} */
function getMode() {
  return mode;
}

async function initDb() {
  if (process.env.DATABASE_URL) {
    mode = 'postgres';
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: /localhost|127\.0\.0\.1|::1/.test(process.env.DATABASE_URL)
        ? false
        : { rejectUnauthorized: false },
    });
    await pool.query('SELECT 1');
    console.log('[db] Connected to PostgreSQL');
  } else {
    mode = 'pglite';
    // Persist to disk when possible so the demo survives restarts.
    const dataDir = path.join(__dirname, '..', '.pglite-data');
    pglite = new PGlite(dataDir);
    await pglite.waitReady;
    console.log('[db] Using embedded PGlite (PostgreSQL WASM). Set DATABASE_URL for real Postgres.');
  }
  return mode;
}

/**
 * Run a parameterized query. Mirrors the pg Pool#query contract:
 * resolves with { rows, rowCount }.
 */
async function query(text, params = []) {
  if (mode === 'postgres') {
    const res = await pool.query(text, params);
    return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
  }
  const res = await pglite.query(text, params);
  // PGlite reports affected rows via `affectedRows` for DML (pg uses rowCount).
  return { rows: res.rows, rowCount: res.rows.length > 0 ? res.rows.length : (res.affectedRows ?? 0) };
}

/** Run a multi-statement SQL file (used to apply schema.sql). */
async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  if (mode === 'postgres') {
    await pool.query(sql);
  } else {
    await pglite.exec(sql);
  }
}

async function closeDb() {
  if (pool) await pool.end();
  if (pglite) await pglite.close();
}

module.exports = { initDb, query, runSqlFile, closeDb, getMode };
