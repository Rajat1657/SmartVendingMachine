import { getDb } from '../db/database.js';

export async function getInventory(req, res) {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT p.id, p.name, p.type, p.unit, p.selling_price, p.cost_price,
             p.stock, p.minimum_stock, p.maximum_stock, p.image,
             c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.name ASC
    `);

    const inventory = rows.map(item => {
      let status = 'IN_STOCK';
      if (item.stock <= 0) {
        status = 'OUT_OF_STOCK';
      } else if (item.stock <= item.minimum_stock) {
        status = 'LOW_STOCK';
      }

      const stockValueCost = parseFloat((item.stock * item.cost_price).toFixed(2));
      const stockValueRetail = parseFloat((item.stock * item.selling_price).toFixed(2));

      return {
        ...item,
        status,
        stockValueCost,
        stockValueRetail
      };
    });

    const totalStockValueCost = inventory.reduce((sum, item) => sum + item.stockValueCost, 0);
    const lowStockCount = inventory.filter(i => i.status === 'LOW_STOCK').length;
    const outOfStockCount = inventory.filter(i => i.status === 'OUT_OF_STOCK').length;

    return res.json({
      success: true,
      summary: {
        totalProducts: inventory.length,
        lowStockCount,
        outOfStockCount,
        totalStockValueCost: parseFloat(totalStockValueCost.toFixed(2))
      },
      inventory
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function adjustStock(req, res) {
  try {
    const db = await getDb();
    const { productId, quantityChange, reason } = req.body;

    if (!productId || quantityChange === undefined || !reason) {
      return res.status(400).json({ success: false, error: 'Missing required parameters: productId, quantityChange, reason' });
    }

    const change = parseFloat(quantityChange);
    if (isNaN(change)) {
      return res.status(400).json({ success: false, error: 'quantityChange must be a valid number' });
    }

    const product = await db.get('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const newStock = Math.max(0, parseFloat((product.stock + change).toFixed(2)));

    // Transactional database update
    await db.run('BEGIN TRANSACTION');
    try {
      await db.run('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStock, productId]);

      const adjId = `adj_${Date.now().toString(36)}`;
      await db.run(
        `INSERT INTO inventory_adjustments (id, product_id, quantity_change, reason, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [adjId, productId, change, reason, req.user ? req.user.name : 'System/Admin']
      );

      // Check for alerts
      if (newStock <= product.minimum_stock && newStock > 0) {
        const altId = `alt_${Date.now().toString(36)}`;
        await db.run(
          `INSERT INTO alerts (id, machine_id, product_id, type, message)
           VALUES (?, 'mach-001', ?, 'LOW_STOCK', ?)`,
          [altId, productId, `${product.name} stock is low (${newStock} ${product.unit} left)`]
        );
      } else if (newStock <= 0) {
        const altId = `alt_${Date.now().toString(36)}`;
        await db.run(
          `INSERT INTO alerts (id, machine_id, product_id, type, message)
           VALUES (?, 'mach-001', ?, 'OUT_OF_STOCK', ?)`,
          [altId, productId, `${product.name} is completely out of stock!` ]
        );
      }

      await db.run('COMMIT');

      const updatedProduct = await db.get('SELECT * FROM products WHERE id = ?', [productId]);
      updatedProduct.preset_quantities = JSON.parse(updatedProduct.preset_quantities || '[]');

      if (req.io) req.io.emit('inventory_updated', { productId, newStock, change, reason });

      return res.json({
        success: true,
        product: updatedProduct,
        newStock,
        adjustment: { id: adjId, productId, quantityChange: change, reason }
      });
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('adjustStock error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getAdjustmentsHistory(req, res) {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT a.*, p.name as product_name, p.unit
      FROM inventory_adjustments a
      JOIN products p ON a.product_id = p.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);
    return res.json({ success: true, history: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
