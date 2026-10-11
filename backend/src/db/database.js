import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../../vending.db');

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await dbInstance.exec('PRAGMA foreign_keys = ON;');
  await initSchema(dbInstance);
  return dbInstance;
}

async function initSchema(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'SHOP_OWNER',
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT NOT NULL,
      icon TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('SOLID', 'LIQUID')),
      unit TEXT NOT NULL CHECK(unit IN ('kg', 'g', 'L', 'ml')),
      selling_price REAL NOT NULL,
      cost_price REAL NOT NULL,
      stock REAL NOT NULL DEFAULT 0.0,
      minimum_stock REAL DEFAULT 5.0,
      maximum_stock REAL DEFAULT 50.0,
      preset_quantities TEXT DEFAULT '[]',
      image TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS machines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'ONLINE',
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      current_operation TEXT,
      total_transactions INTEGER DEFAULT 0,
      total_revenue REAL DEFAULT 0.0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      machine_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      product_type TEXT NOT NULL,
      target_quantity REAL NOT NULL,
      actual_dispensed_quantity REAL DEFAULT 0.0,
      unit TEXT NOT NULL,
      selling_price REAL NOT NULL,
      cost_price REAL NOT NULL,
      total_revenue REAL NOT NULL,
      total_cost REAL NOT NULL,
      profit REAL NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'DISPENSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'PARTIALLY_DISPENSED')),
      checkout_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK(checkout_status IN ('UNPAID', 'CHECKOUT_SCANNED', 'PAID', 'CANCELLED')),
      shortfall REAL DEFAULT 0.0,
      error_reason TEXT,
      sticker_code TEXT,
      pos_barcode_strategy TEXT DEFAULT 'EAN13_TEST',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (machine_id) REFERENCES machines(id)
    );

    CREATE TABLE IF NOT EXISTS transaction_bags (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      bag_index INTEGER NOT NULL,
      total_bags INTEGER NOT NULL,
      net_quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      unit_price REAL NOT NULL,
      final_amount REAL NOT NULL,
      sticker_code TEXT UNIQUE NOT NULL,
      label_printed INTEGER DEFAULT 0,
      printed_at DATETIME,
      checkout_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK(checkout_status IN ('UNPAID', 'CHECKOUT_SCANNED', 'PAID')),
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );

    CREATE TABLE IF NOT EXISTS inventory_adjustments (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      quantity_change REAL NOT NULL,
      reason TEXT NOT NULL,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      machine_id TEXT,
      product_id TEXT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration checks for existing databases
  try {
    const columns = await db.all(`PRAGMA table_info(transactions);`);
    const hasCheckoutStatus = columns.some(c => c.name === 'checkout_status');
    if (!hasCheckoutStatus) {
      await db.exec(`ALTER TABLE transactions ADD COLUMN checkout_status TEXT NOT NULL DEFAULT 'UNPAID';`);
    }
    const hasPosStrategy = columns.some(c => c.name === 'pos_barcode_strategy');
    if (!hasPosStrategy) {
      await db.exec(`ALTER TABLE transactions ADD COLUMN pos_barcode_strategy TEXT DEFAULT 'EAN13_TEST';`);
    }
  } catch (err) {
    console.log('Migration check info:', err.message);
  }
}
