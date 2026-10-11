import { getDb } from '../db/database.js';
import { simulatedMachine } from '../machine/SimulatedMachineController.js';

export async function createAndDispenseTransaction(req, res) {
  const db = await getDb();
  let txId = null;

  try {
    const { productId, quantity, machineId = 'mach-001' } = req.body;

    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid product or quantity specified' });
    }

    const targetQty = parseFloat(quantity);

    // 1. Server-side validation
    const product = await db.get('SELECT * FROM products WHERE id = ?', [productId]);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (!product.active) {
      return res.status(400).json({ success: false, error: 'Product is currently inactive' });
    }

    if (product.stock < targetQty) {
      return res.status(400).json({
        success: false,
        error: `Insufficient stock. Requested: ${targetQty} ${product.unit}, Available: ${product.stock} ${product.unit}`
      });
    }

    // Calculate Multi-Bag details (Max 5kg / 5L per bag)
    const MAX_BAG_CAPACITY = 5.0;
    const totalBags = Math.ceil(targetQty / MAX_BAG_CAPACITY);
    const bagsList = [];

    let remaining = targetQty;
    for (let i = 1; i <= totalBags; i++) {
      const bagWeight = parseFloat(Math.min(MAX_BAG_CAPACITY, remaining).toFixed(2));
      bagsList.push({
        bagIndex: i,
        totalBags,
        capacity: bagWeight,
        stickerCode: `STK-${Math.floor(100000 + Math.random() * 900000)}`
      });
      remaining = parseFloat((remaining - bagWeight).toFixed(2));
    }

    // 2. Server-side Financial Calculations
    const sellingPrice = product.selling_price;
    const costPrice = product.cost_price;
    const totalRevenue = parseFloat((targetQty * sellingPrice).toFixed(2));
    const totalCost = parseFloat((targetQty * costPrice).toFixed(2));
    const profit = parseFloat((totalRevenue - totalCost).toFixed(2));

    const code = `TX-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const mainStickerCode = bagsList[0].stickerCode;
    txId = `tx_${Date.now().toString(36)}`;

    // 3. Create Pending Transaction Record
    await db.run(
      `INSERT INTO transactions (
        id, code, machine_id, product_id, product_name, product_type, target_quantity,
        actual_dispensed_quantity, unit, selling_price, cost_price, total_revenue, total_cost,
        profit, status, shortfall, sticker_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        txId, code, machineId, product.id, product.name, product.type, targetQty,
        0.0, product.unit, sellingPrice, costPrice, totalRevenue, totalCost,
        profit, 'DISPENSING', 0.0, mainStickerCode
      ]
    );

    // Respond immediately so frontend enters dispensing screen & receives live WebSocket stream
    res.json({
      success: true,
      transactionId: txId,
      code,
      stickerCode: mainStickerCode,
      productName: product.name,
      targetQuantity: targetQty,
      unit: product.unit,
      totalRevenue,
      totalBags,
      bagsList,
      status: 'DISPENSING'
    });

    // 4. Execute Async Machine Dispensing Telemetry
    process.nextTick(async () => {
      try {
        const dispenseResult = await simulatedMachine.dispense(txId, product, targetQty, mainStickerCode, bagsList);

        const actualQty = dispenseResult.actualDispensedQuantity || 0;
        const shortfall = dispenseResult.shortfall || 0;
        const isSuccess = dispenseResult.success;

        if (isSuccess && actualQty > 0) {
          // Re-calculate actuals based on exact dispensed quantity
          const actualRevenue = parseFloat((actualQty * sellingPrice).toFixed(2));
          const actualCost = parseFloat((actualQty * costPrice).toFixed(2));
          const actualProfit = parseFloat((actualRevenue - actualCost).toFixed(2));
          const finalStatus = shortfall > 0.001 ? 'PARTIALLY_DISPENSED' : 'COMPLETED';

          // Transactional Stock & Machine Update
          await db.run('BEGIN TRANSACTION');
          try {
            await db.run(
              `UPDATE transactions SET
                actual_dispensed_quantity = ?,
                total_revenue = ?,
                total_cost = ?,
                profit = ?,
                shortfall = ?,
                status = ?
               WHERE id = ?`,
              [actualQty, actualRevenue, actualCost, actualProfit, shortfall, finalStatus, txId]
            );

            // Deduct stock server-side transactionally
            await db.run(
              `UPDATE products SET stock = MAX(0, stock - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [actualQty, product.id]
            );

            // Update machine stats
            await db.run(
              `UPDATE machines SET
                total_transactions = total_transactions + 1,
                total_revenue = total_revenue + ?
               WHERE id = ?`,
              [actualRevenue, machineId]
            );

            await db.run('COMMIT');

            // Fetch fresh stock to check low stock alert
            const updatedProd = await db.get('SELECT * FROM products WHERE id = ?', [product.id]);
            
            // Real-time Low Stock Check & Push Notification to Shopkeeper App
            if (updatedProd.stock <= updatedProd.minimum_stock) {
              const altId = `alt_${Date.now().toString(36)}`;
              const alertMsg = `${product.name} is running low on stock! (${updatedProd.stock} ${product.unit} remaining, Min: ${updatedProd.minimum_stock} ${product.unit})`;
              
              await db.run(
                `INSERT INTO alerts (id, machine_id, product_id, type, message) VALUES (?, ?, ?, ?, ?)`,
                [altId, machineId, product.id, 'LOW_STOCK', alertMsg]
              );

              // Broadcast Push Notification to Shopkeeper App
              if (req.io) {
                req.io.emit('low_stock_notification', {
                  alertId: altId,
                  productId: product.id,
                  productName: product.name,
                  stock: updatedProd.stock,
                  unit: product.unit,
                  message: alertMsg,
                  timestamp: new Date().toISOString()
                });
              }
            }

            if (req.io) {
              req.io.emit('transaction_updated', {
                transactionId: txId,
                status: finalStatus,
                actualQty,
                totalRevenue: actualRevenue,
                profit: actualProfit,
                newStock: updatedProd.stock
              });
            }
          } catch (dbErr) {
            await db.run('ROLLBACK');
            console.error('DB error during transaction completion:', dbErr);
          }
        } else {
          // Dispensing Failed entirely
          await db.run(
            `UPDATE transactions SET status = 'FAILED', error_reason = ? WHERE id = ?`,
            [dispenseResult.reason || 'Hardware dispensing error', txId]
          );

          if (req.io) {
            req.io.emit('transaction_updated', {
              transactionId: txId,
              status: 'FAILED',
              reason: dispenseResult.reason
            });
          }
        }
      } catch (err) {
        console.error('Dispensing process error:', err);
        await db.run(
          `UPDATE transactions SET status = 'FAILED', error_reason = ? WHERE id = ?`,
          [err.message, txId]
        );
      }
    });

  } catch (err) {
    console.error('createAndDispenseTransaction error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

export async function getTransactions(req, res) {
  try {
    const db = await getDb();
    const { search, status, product, startDate, endDate, limit = 50, offset = 0 } = req.query;

    let query = `SELECT * FROM transactions WHERE 1=1`;
    const params = [];

    if (search) {
      query += ` AND (code LIKE ? OR sticker_code LIKE ? OR product_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (product) {
      query += ` AND product_id = ?`;
      params.push(product);
    }

    if (startDate) {
      query += ` AND created_at >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND created_at <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const transactions = await db.all(query, params);
    const countRow = await db.get(`SELECT COUNT(*) as total FROM transactions`);

    return res.json({
      success: true,
      total: countRow.total,
      count: transactions.length,
      transactions
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getTransactionById(req, res) {
  try {
    const db = await getDb();
    const { id } = req.params;
    const transaction = await db.get('SELECT * FROM transactions WHERE id = ? OR code = ?', [id, id]);
    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }
    return res.json({ success: true, transaction });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
