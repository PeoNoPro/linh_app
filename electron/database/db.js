const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

const DB_PATH = path.join(app.getPath('userData'), 'linh_app.db');
let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');
  }
  return db;
}

function initializeSchema() {
  const database = getDB();
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      username     TEXT    NOT NULL UNIQUE,
      display_name TEXT    NOT NULL,
      currency     TEXT    DEFAULT 'VND',
      created_at   TEXT    DEFAULT (datetime('now','localtime')),
      last_login   TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name        TEXT    NOT NULL,
      description TEXT,
      color       TEXT    DEFAULT '#6366f1'
    );

    CREATE TABLE IF NOT EXISTS products (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      sku           TEXT,
      name          TEXT    NOT NULL,
      description   TEXT,
      unit          TEXT    DEFAULT 'cái',
      cost_price    REAL    DEFAULT 0,
      sell_price    REAL    NOT NULL DEFAULT 0,
      stock_qty     REAL    DEFAULT 0,
      min_stock_qty REAL    DEFAULT 0,
      is_active     INTEGER DEFAULT 1,
      created_at    TEXT    DEFAULT (datetime('now','localtime')),
      updated_at    TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code        TEXT,
      name        TEXT    NOT NULL,
      phone       TEXT,
      address     TEXT,
      email       TEXT,
      notes       TEXT,
      debt_amount REAL    DEFAULT 0,
      created_at  TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      customer_id     INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      order_code      TEXT    NOT NULL UNIQUE,
      order_date      TEXT    DEFAULT (datetime('now','localtime')),
      subtotal        REAL    DEFAULT 0,
      discount_amount REAL    DEFAULT 0,
      total_amount    REAL    DEFAULT 0,
      paid_amount     REAL    DEFAULT 0,
      change_amount   REAL    DEFAULT 0,
      debt_amount     REAL    DEFAULT 0,
      payment_method  TEXT    DEFAULT 'cash',
      status          TEXT    DEFAULT 'completed',
      notes           TEXT,
      created_at      TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id   INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT    NOT NULL,
      unit         TEXT,
      quantity     REAL    NOT NULL DEFAULT 1,
      unit_price   REAL    NOT NULL DEFAULT 0,
      cost_price   REAL    DEFAULT 0,
      discount     REAL    DEFAULT 0,
      total_price  REAL    NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_id         INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      type             TEXT    NOT NULL CHECK(type IN ('income','expense')),
      category         TEXT    DEFAULT 'other',
      amount           REAL    NOT NULL DEFAULT 0,
      description      TEXT,
      payment_method   TEXT    DEFAULT 'cash',
      transaction_date TEXT    DEFAULT (datetime('now','localtime')),
      created_at       TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      customer_id   INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      title         TEXT    NOT NULL,
      description   TEXT,
      reminder_type TEXT    DEFAULT 'general',
      due_datetime  TEXT    NOT NULL,
      is_completed  INTEGER DEFAULT 0,
      is_notified   INTEGER DEFAULT 0,
      created_at    TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS import_sessions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL,
      file_name    TEXT    NOT NULL,
      import_type  TEXT    NOT NULL,
      mode         TEXT    NOT NULL,
      total_rows   INTEGER DEFAULT 0,
      success_rows INTEGER DEFAULT 0,
      error_rows   INTEGER DEFAULT 0,
      imported_at  TEXT    DEFAULT (datetime('now','localtime'))
    );

    -- Default admin user
    INSERT OR IGNORE INTO users (id, username, display_name)
    VALUES (1, 'admin', 'Quản trị viên');
  `);
}

module.exports = { getDB, initializeSchema };
