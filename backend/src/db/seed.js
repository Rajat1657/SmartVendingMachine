import { getDb } from './database.js';
import bcrypt from 'bcryptjs';

export async function seedDatabase() {
  const db = await getDb();

  console.log('Seeding database with realistic deterministic data...');

  // Clean existing tables
  await db.exec(`
    DELETE FROM alerts;
    DELETE FROM inventory_adjustments;
    DELETE FROM transactions;
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM machines;
    DELETE FROM users;
  `);

  // 1. Seed Admin User
  const passwordHash = await bcrypt.hash('admin123', 10);
  await db.run(
    `INSERT INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)`,
    ['usr_admin01', 'admin@vending.com', passwordHash, 'SHOP_OWNER', 'Rajesh Sharma (Shopkeeper)']
  );

  // 2. Seed Categories
  const categories = [
    { id: 'cat_rice', name: 'Rice', slug: 'rice', icon: 'Wheat', description: 'Premium daily staple rice varieties' },
    { id: 'cat_wheat', name: 'Wheat & Flour', slug: 'wheat-flour', icon: 'Wheat', description: 'Whole wheat grains and stone-ground chakki flour' },
    { id: 'cat_pulses', name: 'Pulses & Dal', slug: 'pulses-dal', icon: 'Utensils', description: 'High protein unpolished lentils, toor, moong, and chana dal' },
    { id: 'cat_grains', name: 'Grains & Sugar', slug: 'grains-sugar', icon: 'Boxes', description: 'Refined sugar, millets, and dry solids' },
    { id: 'cat_oil', name: 'Cooking Oils', slug: 'cooking-oils', icon: 'Droplets', description: 'Filtered sunflower, groundnut, and mustard cooking oils' }
  ];

  for (const cat of categories) {
    await db.run(
      `INSERT INTO categories (id, name, slug, icon, description) VALUES (?, ?, ?, ?, ?)`,
      [cat.id, cat.name, cat.slug, cat.icon, cat.description]
    );
  }

  // 3. Seed Products
  const products = [
    {
      id: 'prod_basmati',
      name: 'Premium Basmati Rice',
      description: 'Extra long grain aged aromatic basmati rice',
      category_id: 'cat_rice',
      type: 'SOLID',
      unit: 'kg',
      selling_price: 90.0,
      cost_price: 65.0,
      stock: 35.0,
      minimum_stock: 5.0,
      maximum_stock: 50.0,
      preset_quantities: JSON.stringify([0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 5]),
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500',
      active: 1
    },
    {
      id: 'prod_sona_masoori',
      name: 'Sona Masoori Rice',
      description: 'Lightweight aromatic daily staple rice',
      category_id: 'cat_rice',
      type: 'SOLID',
      unit: 'kg',
      selling_price: 60.0,
      cost_price: 42.0,
      stock: 42.0,
      minimum_stock: 8.0,
      maximum_stock: 60.0,
      preset_quantities: JSON.stringify([0.5, 0.75, 1, 1.5, 2, 3, 5]),
      image: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=500',
      active: 1
    },
    {
      id: 'prod_atta',
      name: 'Whole Wheat Flour (Atta)',
      description: '100% stone ground whole wheat flour',
      category_id: 'cat_wheat',
      type: 'SOLID',
      unit: 'kg',
      selling_price: 45.0,
      cost_price: 32.0,
      stock: 48.0,
      minimum_stock: 10.0,
      maximum_stock: 75.0,
      preset_quantities: JSON.stringify([0.5, 1, 1.5, 2, 3, 5]),
      image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=500',
      active: 1
    },
    {
      id: 'prod_toor_dal',
      name: 'Unpolished Toor Dal',
      description: 'High protein organic yellow arhar/toor dal',
      category_id: 'cat_pulses',
      type: 'SOLID',
      unit: 'kg',
      selling_price: 140.0,
      cost_price: 105.0,
      stock: 22.0,
      minimum_stock: 5.0,
      maximum_stock: 40.0,
      preset_quantities: JSON.stringify([0.25, 0.5, 0.75, 1, 1.5, 2, 2.5]),
      image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=500',
      active: 1
    },
    {
      id: 'prod_moong_dal',
      name: 'Yellow Moong Dal',
      description: 'Washed yellow moong split lentils',
      category_id: 'cat_pulses',
      type: 'SOLID',
      unit: 'kg',
      selling_price: 125.0,
      cost_price: 90.0,
      stock: 18.0,
      minimum_stock: 4.0,
      maximum_stock: 35.0,
      preset_quantities: JSON.stringify([0.25, 0.5, 0.75, 1, 1.5, 2]),
      image: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=500',
      active: 1
    },
    {
      id: 'prod_sugar',
      name: 'Refined White Sugar',
      description: 'Sulfur-free refined white sugar crystals',
      category_id: 'cat_grains',
      type: 'SOLID',
      unit: 'kg',
      selling_price: 48.0,
      cost_price: 36.0,
      stock: 30.0,
      minimum_stock: 6.0,
      maximum_stock: 50.0,
      preset_quantities: JSON.stringify([0.5, 1, 1.5, 2, 3, 5]),
      image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500',
      active: 1
    },
    {
      id: 'prod_sunflower_oil',
      name: 'Refined Sunflower Oil',
      description: 'Light heart-healthy refined cooking oil',
      category_id: 'cat_oil',
      type: 'LIQUID',
      unit: 'L',
      selling_price: 150.0,
      cost_price: 115.0,
      stock: 24.0,
      minimum_stock: 5.0,
      maximum_stock: 40.0,
      preset_quantities: JSON.stringify([0.25, 0.5, 0.75, 1, 1.5, 2, 5]),
      image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500',
      active: 1
    },
    {
      id: 'prod_groundnut_oil',
      name: 'Cold Pressed Groundnut Oil',
      description: 'Traditional wood pressed filtered peanut oil',
      category_id: 'cat_oil',
      type: 'LIQUID',
      unit: 'L',
      selling_price: 190.0,
      cost_price: 145.0,
      stock: 16.0,
      minimum_stock: 4.0,
      maximum_stock: 30.0,
      preset_quantities: JSON.stringify([0.25, 0.5, 0.75, 1, 1.5, 2]),
      image: 'https://images.unsplash.com/photo-1612170153139-6f881ff067e0?w=500',
      active: 1
    },
    {
      id: 'prod_mustard_oil',
      name: 'Kachi Ghani Mustard Oil',
      description: 'Pure mustard oil for spicy Indian recipes',
      category_id: 'cat_oil',
      type: 'LIQUID',
      unit: 'L',
      selling_price: 165.0,
      cost_price: 125.0,
      stock: 3.5, // Low stock demo
      minimum_stock: 5.0,
      maximum_stock: 30.0,
      preset_quantities: JSON.stringify([0.25, 0.5, 0.75, 1, 1.5, 2]),
      image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500',
      active: 1
    }
  ];

  for (const p of products) {
    await db.run(
      `INSERT INTO products (
        id, name, description, category_id, type, unit, selling_price, cost_price,
        stock, minimum_stock, maximum_stock, preset_quantities, image, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id, p.name, p.description, p.category_id, p.type, p.unit, p.selling_price, p.cost_price,
        p.stock, p.minimum_stock, p.maximum_stock, p.preset_quantities, p.image, p.active
      ]
    );
  }

  // 4. Seed Machine
  await db.run(
    `INSERT INTO machines (id, name, code, status, last_seen, current_operation, total_transactions, total_revenue)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 'IDLE', 42, 12850.00)`,
    ['mach-001', 'Smart Grain & Oil Express #01', 'VM-001', 'ONLINE']
  );

  // 5. Seed Low Stock Alert for Mustard Oil
  await db.run(
    `INSERT INTO alerts (id, machine_id, product_id, type, message, is_read)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['alt_001', 'mach-001', 'prod_mustard_oil', 'LOW_STOCK', 'Kachi Ghani Mustard Oil stock is low (3.5 L remaining, Min: 5.0 L)', 0]
  );

  // 6. Seed Deterministic Realistic Historical Transactions over 30 Days
  const baseTimestamp = new Date('2026-08-10T10:00:00Z').getTime();

  // Explicit realistic transaction records
  const sampleTransactions = [
    { prodIndex: 0, qty: 2.5, daysAgo: 0, hour: 9, min: 15 },
    { prodIndex: 2, qty: 5.0, daysAgo: 0, hour: 10, min: 30 },
    { prodIndex: 6, qty: 1.0, daysAgo: 0, hour: 11, min: 45 },
    { prodIndex: 3, qty: 1.5, daysAgo: 0, hour: 14, min: 20 },
    { prodIndex: 1, qty: 2.0, daysAgo: 1, hour: 9, min: 10 },
    { prodIndex: 7, qty: 1.0, daysAgo: 1, hour: 11, min: 0 },
    { prodIndex: 5, qty: 2.0, daysAgo: 1, hour: 16, min: 30 },
    { prodIndex: 0, qty: 5.0, daysAgo: 2, hour: 10, min: 15 },
    { prodIndex: 4, qty: 1.0, daysAgo: 2, hour: 12, min: 40 },
    { prodIndex: 6, qty: 2.0, daysAgo: 2, hour: 17, min: 10 },
    { prodIndex: 2, qty: 3.0, daysAgo: 3, hour: 9, min: 50 },
    { prodIndex: 3, qty: 2.0, daysAgo: 3, hour: 15, min: 25 },
    { prodIndex: 8, qty: 1.5, daysAgo: 4, hour: 11, min: 10 },
    { prodIndex: 1, qty: 5.0, daysAgo: 5, hour: 14, min: 0 },
    { prodIndex: 0, qty: 1.5, daysAgo: 6, hour: 16, min: 45 },
    { prodIndex: 7, qty: 2.0, daysAgo: 7, hour: 10, min: 20 },
    { prodIndex: 5, qty: 3.0, daysAgo: 8, hour: 13, min: 15 },
    { prodIndex: 2, qty: 2.0, daysAgo: 9, hour: 17, min: 30 },
    { prodIndex: 3, qty: 1.0, daysAgo: 10, hour: 9, min: 40 },
    { prodIndex: 6, qty: 1.5, daysAgo: 12, hour: 11, min: 20 },
    { prodIndex: 0, qty: 2.0, daysAgo: 14, hour: 15, min: 50 },
    { prodIndex: 4, qty: 1.5, daysAgo: 15, hour: 18, min: 10 },
    { prodIndex: 1, qty: 3.0, daysAgo: 18, hour: 10, min: 0 },
    { prodIndex: 8, qty: 2.0, daysAgo: 20, hour: 12, min: 30 },
    { prodIndex: 5, qty: 5.0, daysAgo: 22, hour: 14, min: 15 },
    { prodIndex: 2, qty: 4.0, daysAgo: 25, hour: 16, min: 0 },
    { prodIndex: 0, qty: 2.5, daysAgo: 28, hour: 11, min: 45 }
  ];

  for (let i = 0; i < sampleTransactions.length; i++) {
    const t = sampleTransactions[i];
    const prod = products[t.prodIndex];
    const qty = t.qty;
    const revenue = parseFloat((qty * prod.selling_price).toFixed(2));
    const cost = parseFloat((qty * prod.cost_price).toFixed(2));
    const profit = parseFloat((revenue - cost).toFixed(2));

    const date = new Date(Date.now() - t.daysAgo * 86400000);
    date.setHours(t.hour, t.min, 0);
    const dateStr = date.toISOString().replace('T', ' ').substring(0, 19);

    const txCode = `TX-2026-${(1001 + i)}`;
    const stickerCode = `STK-${900100 + i}`;

    await db.run(
      `INSERT INTO transactions (
        id, code, machine_id, product_id, product_name, product_type, target_quantity,
        actual_dispensed_quantity, unit, selling_price, cost_price, total_revenue, total_cost,
        profit, status, shortfall, sticker_code, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `tx_real_${i}`,
        txCode,
        'mach-001',
        prod.id,
        prod.name,
        prod.type,
        qty,
        qty,
        prod.unit,
        prod.selling_price,
        prod.cost_price,
        revenue,
        cost,
        profit,
        'COMPLETED',
        0.0,
        stickerCode,
        dateStr
      ]
    );
  }

  console.log('Database seeded with realistic deterministic data successfully!');
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  seedDatabase().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}
