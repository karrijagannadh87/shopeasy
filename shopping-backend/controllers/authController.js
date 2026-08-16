/**
 * Auth controller — register / login / me.
 */
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { signToken } = require('../middleware/auth');

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role, createdAt: row.created_at };
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const normalized = String(email).trim().toLowerCase();
    const existing = await query('SELECT id FROM users WHERE email = $1', [normalized]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    const hash = await bcrypt.hash(String(password), ROUNDS);
    const created = await query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [String(name).trim(), normalized, hash, 'customer']
    );
    const user = publicUser(created.rows[0]);
    res.status(201).json({ user, token: signToken(user) });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const normalized = String(email).trim().toLowerCase();
    const found = await query('SELECT * FROM users WHERE email = $1', [normalized]);
    if (!found.rows.length) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const row = found.rows[0];
    const ok = await bcrypt.compare(String(password), row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = publicUser(row);
    res.json({ user, token: signToken(user) });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  const found = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!found.rows.length) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(found.rows[0]) });
}

module.exports = { register, login, me };
