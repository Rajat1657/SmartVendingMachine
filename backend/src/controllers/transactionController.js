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

          // Transactional Stock, Bags & Machine Update
          await db.run('BEGIN TRANSACTION');
          try {
            await db.run(
              `UPDATE transactions SET
                actual_dispensed_quantity = ?,
                total_revenue = ?,
                total_cost = ?,
                profit = ?,
                shortfall = ?,
                status = ?,
                checkout_status = 'UNPAID'
               WHERE id = ?`,
              [actualQty, actualRevenue, actualCost, actualProfit, shortfall, finalStatus, txId]
            );

            // Create individual bag records in transaction_bags table
            for (let bIdx = 0; bIdx < bagsList.length; bIdx++) {
              const bg = bagsList[bIdx];
              const bagQty = bg.capacity;
              const bagAmount = parseFloat((bagQty * sellingPrice).toFixed(2));
              const bagId = `bag_${Date.now().toString(36)}_${bIdx + 1}`;

              await db.run(
                `INSERT INTO transaction_bags (
                  id, transaction_id, bag_index, total_bags, net_quantity, unit,
                  unit_price, final_amount, sticker_code, label_printed, printed_at, checkout_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, 'UNPAID')`,
                [
                  bagId, txId, bg.bagIndex, bg.totalBags, bagQty, product.unit,
                  sellingPrice, bagAmount, bg.stickerCode
                ]
              );
            }

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
    const bags = await db.all('SELECT * FROM transaction_bags WHERE transaction_id = ? ORDER BY bag_index ASC', [transaction.id]);
    return res.json({ success: true, transaction, bags });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getStickerDetails(req, res) {
  try {
    const db = await getDb();
    const { stickerCode } = req.params;

    // Check bag table first
    const bag = await db.get('SELECT b.*, t.product_name, t.product_type FROM transaction_bags b JOIN transactions t ON b.transaction_id = t.id WHERE b.sticker_code = ?', [stickerCode]);
    if (bag) {
      return res.json({ success: true, type: 'BAG', bag });
    }

    const tx = await db.get('SELECT * FROM transactions WHERE sticker_code = ?', [stickerCode]);
    if (tx) {
      return res.json({ success: true, type: 'TRANSACTION', transaction: tx });
    }

    return res.status(404).json({ success: false, error: 'Sticker code not found in database' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function processPosCheckout(req, res) {
  try {
    const db = await getDb();
    const { stickerCode, posTerminalId = 'COUNTER_POS_01' } = req.body;

    if (!stickerCode) {
      return res.status(400).json({ success: false, error: 'Sticker code is required' });
    }

    const bag = await db.get('SELECT * FROM transaction_bags WHERE sticker_code = ?', [stickerCode]);

    if (!bag) {
      return res.status(404).json({ success: false, error: 'Sticker tag not found' });
    }

    if (bag.checkout_status === 'PAID') {
      return res.status(400).json({
        success: false,
        error: `Sticker ${stickerCode} has ALREADY been scanned and paid at checkout! Prevented duplicate checkout.`
      });
    }

    await db.run('BEGIN TRANSACTION');
    try {
      await db.run(
        `UPDATE transaction_bags SET checkout_status = 'PAID', paid_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [bag.id]
      );

      // Check if all bags for this transaction are paid
      const unpaidBags = await db.get(
        `SELECT COUNT(*) as count FROM transaction_bags WHERE transaction_id = ? AND checkout_status != 'PAID'`,
        [bag.transaction_id]
      );

      if (unpaidBags.count === 0) {
        await db.run(
          `UPDATE transactions SET checkout_status = 'PAID' WHERE id = ?`,
          [bag.transaction_id]
        );
      } else {
        await db.run(
          `UPDATE transactions SET checkout_status = 'CHECKOUT_SCANNED' WHERE id = ?`,
          [bag.transaction_id]
        );
      }

      await db.run('COMMIT');

      if (req.io) {
        req.io.emit('checkout_payment_updated', {
          stickerCode,
          transactionId: bag.transaction_id,
          posTerminalId,
          status: 'PAID'
        });
      }

      return res.json({
        success: true,
        message: `Sticker ${stickerCode} checkout marked PAID successfully at counter`,
        bagId: bag.id,
        amountCollected: bag.final_amount
      });
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
