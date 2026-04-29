const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db;

function getDb() {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'storepilot.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id          TEXT PRIMARY KEY,
      data        TEXT NOT NULL,
      updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS pending_queue (
      key         TEXT PRIMARY KEY,
      action      TEXT NOT NULL,
      product     TEXT NOT NULL,
      image_file  TEXT,
      image_preview TEXT,
      created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id          TEXT PRIMARY KEY,
      data        TEXT NOT NULL,
      updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
  `);
}

// ── Products ──────────────────────────────────────────────────────────────────
function loadProducts() {
  try {
    const rows = getDb().prepare('SELECT data FROM products ORDER BY updated_at DESC').all();
    return { ok: true, data: rows.map(r => JSON.parse(r.data)) };
  } catch (e) { return { ok: false, error: e.message }; }
}

function saveProducts(products) {
  try {
    const insert = getDb().prepare(`
      INSERT INTO products (id, data, updated_at)
      VALUES (?, ?, strftime('%s','now'))
      ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `);
    const tx = getDb().transaction((items) => {
      for (const p of items) insert.run(String(p.id), JSON.stringify(p));
    });
    tx(products);
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

function clearProducts() {
  try { getDb().prepare('DELETE FROM products').run(); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
}

// ── Pending Queue ─────────────────────────────────────────────────────────────
function loadQueue() {
  try {
    const rows = getDb().prepare('SELECT * FROM pending_queue ORDER BY created_at ASC').all();
    const queue = {};
    for (const row of rows) {
      queue[row.key] = {
        action:       row.action,
        product:      JSON.parse(row.product),
        imageFile:    row.image_file    ? JSON.parse(row.image_file)    : null,
        imagePreview: row.image_preview ? row.image_preview             : null,
      };
    }
    return { ok: true, data: queue };
  } catch (e) { return { ok: false, error: e.message }; }
}

function upsertQueueItem(key, item) {
  try {
    getDb().prepare(`
      INSERT INTO pending_queue (key, action, product, image_file, image_preview)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        action        = excluded.action,
        product       = excluded.product,
        image_file    = excluded.image_file,
        image_preview = excluded.image_preview
    `).run(
      key,
      item.action,
      JSON.stringify(item.product),
      item.imageFile    ? JSON.stringify(item.imageFile) : null,
      item.imagePreview ? item.imagePreview              : null,
    );
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

function deleteQueueItem(key) {
  try { getDb().prepare('DELETE FROM pending_queue WHERE key = ?').run(key); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
}

function clearQueue() {
  try { getDb().prepare('DELETE FROM pending_queue').run(); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
}

// ── Orders ────────────────────────────────────────────────────────────────────
function loadOrders() {
  try {
    const rows = getDb().prepare('SELECT data FROM orders ORDER BY updated_at DESC').all();
    return { ok: true, data: rows.map(r => JSON.parse(r.data)) };
  } catch (e) { return { ok: false, error: e.message }; }
}

function saveOrders(orders) {
  try {
    getDb().prepare('DELETE FROM orders').run();
    const insert = getDb().prepare(`
      INSERT INTO orders (id, data, updated_at)
      VALUES (?, ?, strftime('%s','now'))
    `);
    const tx = getDb().transaction((items) => {
      for (const o of items) insert.run(String(o.id), JSON.stringify(o));
    });
    tx(orders);
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

module.exports = {
  loadProducts, saveProducts, clearProducts,
  loadQueue, upsertQueueItem, deleteQueueItem, clearQueue,
  loadOrders, saveOrders,
};