import { getDb } from '../db/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export async function uploadImage(req, res) {
  try {
    const { imageData, fileName } = req.body;
    if (!imageData) {
      return res.status(400).json({ success: false, error: 'No image data provided' });
    }

    // Extract base64 format data
    const matches = imageData.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ success: false, error: 'Invalid base64 image data format' });
    }

    const ext = matches[1] || 'png';
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const uniqueFileName = `prod_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}.${ext}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    await fs.promises.writeFile(filePath, buffer);

    const imageUrl = `/uploads/${uniqueFileName}`;
    return res.json({ success: true, url: imageUrl });
  } catch (err) {
    console.error('uploadImage error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getProducts(req, res) {
  try {
    const db = await getDb();
    const { category, activeOnly, search } = req.query;

    let query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (activeOnly === 'true' || activeOnly === true) {
      query += ` AND p.active = 1`;
    }

    if (category) {
      query += ` AND (p.category_id = ? OR c.slug = ?)`;
      params.push(category, category);
    }

    if (search) {
      query += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY c.name ASC, p.name ASC`;

    const rows = await db.all(query, params);
    const products = rows.map(r => ({
      ...r,
      preset_quantities: JSON.parse(r.preset_quantities || '[]'),
      active: Boolean(r.active)
    }));

    return res.json({ success: true, count: products.length, products });
  } catch (err) {
    console.error('getProducts error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getProductById(req, res) {
  try {
    const db = await getDb();
    const { id } = req.params;
    const row = await db.get(
      `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`,
      [id]
    );
    if (!row) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    row.preset_quantities = JSON.parse(row.preset_quantities || '[]');
    row.active = Boolean(row.active);
    return res.json({ success: true, product: row });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function createProduct(req, res) {
  try {
    const db = await getDb();
    const {
      name, description, category_id, type, unit, selling_price,
      cost_price, stock, minimum_stock, maximum_stock, preset_quantities, image
    } = req.body;

    if (!name || !category_id || !type || !unit || selling_price === undefined || cost_price === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required product fields' });
    }

    const id = `prod_${Date.now().toString(36)}`;
    const presetsJson = JSON.stringify(Array.isArray(preset_quantities) ? preset_quantities : [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 5]);

    await db.run(
      `INSERT INTO products (
        id, name, description, category_id, type, unit, selling_price, cost_price,
        stock, minimum_stock, maximum_stock, preset_quantities, image, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id, name, description || '', category_id, type, unit,
        parseFloat(selling_price), parseFloat(cost_price),
        parseFloat(stock || 0), parseFloat(minimum_stock || 5), parseFloat(maximum_stock || 50),
        presetsJson, image || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500'
      ]
    );

    const created = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    created.preset_quantities = JSON.parse(created.preset_quantities);
    created.active = true;

    if (req.io) req.io.emit('product_updated', { type: 'CREATE', product: created });

    return res.status(201).json({ success: true, product: created });
  } catch (err) {
    console.error('createProduct error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function updateProduct(req, res) {
  try {
    const db = await getDb();
    const { id } = req.params;

    const existing = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const {
      name, description, category_id, type, unit, selling_price,
      cost_price, stock, minimum_stock, maximum_stock, preset_quantities, image, active
    } = req.body;

    const updatedPresets = preset_quantities !== undefined
      ? JSON.stringify(preset_quantities)
      : existing.preset_quantities;

    await db.run(
      `UPDATE products SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        category_id = COALESCE(?, category_id),
        type = COALESCE(?, type),
        unit = COALESCE(?, unit),
        selling_price = COALESCE(?, selling_price),
        cost_price = COALESCE(?, cost_price),
        stock = COALESCE(?, stock),
        minimum_stock = COALESCE(?, minimum_stock),
        maximum_stock = COALESCE(?, maximum_stock),
        preset_quantities = ?,
        image = COALESCE(?, image),
        active = COALESCE(?, active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        name, description, category_id, type, unit,
        selling_price !== undefined ? parseFloat(selling_price) : null,
        cost_price !== undefined ? parseFloat(cost_price) : null,
        stock !== undefined ? parseFloat(stock) : null,
        minimum_stock !== undefined ? parseFloat(minimum_stock) : null,
        maximum_stock !== undefined ? parseFloat(maximum_stock) : null,
        updatedPresets,
        image,
        active !== undefined ? (active ? 1 : 0) : null,
        id
      ]
    );

    const updated = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    updated.preset_quantities = JSON.parse(updated.preset_quantities);
    updated.active = Boolean(updated.active);

    if (req.io) req.io.emit('product_updated', { type: 'UPDATE', product: updated });

    return res.json({ success: true, product: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function deleteProduct(req, res) {
  try {
    const db = await getDb();
    const { id } = req.params;
    await db.run('UPDATE products SET active = 0 WHERE id = ?', [id]);
    if (req.io) req.io.emit('product_updated', { type: 'DELETE', id });
    return res.json({ success: true, message: 'Product deactivated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getCategories(req, res) {
  try {
    const db = await getDb();
    const categories = await db.all('SELECT * FROM categories ORDER BY name ASC');
    return res.json({ success: true, categories });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function createCategory(req, res) {
  try {
    const db = await getDb();
    const { name, icon, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }
    const id = `cat_${Date.now().toString(36)}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await db.run(
      'INSERT INTO categories (id, name, slug, icon, description) VALUES (?, ?, ?, ?, ?)',
      [id, name, slug, icon || 'Boxes', description || '']
    );
    const category = await db.get('SELECT * FROM categories WHERE id = ?', [id]);
    return res.status(201).json({ success: true, category });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
