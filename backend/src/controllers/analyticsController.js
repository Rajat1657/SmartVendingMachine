import { getDb } from '../db/database.js';

export async function getSalesAnalytics(req, res) {
  try {
    const db = await getDb();
    const { range = '30d' } = req.query; // '7d', '30d', '90d', '1y'

    let days = 30;
    if (range === '7d') days = 7;
    if (range === '90d') days = 90;
    if (range === '1y') days = 365;

    // KPI 1: Today's Metrics
    const todayRow = await db.get(`
      SELECT
        COUNT(*) as totalTransactions,
        COALESCE(SUM(total_revenue), 0) as todayRevenue,
        COALESCE(SUM(total_cost), 0) as todayCost,
        COALESCE(SUM(profit), 0) as todayProfit
      FROM transactions
      WHERE DATE(created_at) = DATE('now', 'localtime')
        AND status IN ('COMPLETED', 'PARTIALLY_DISPENSED')
    `);

    // KPI 2: Yesterday's Metrics
    const yesterdayRow = await db.get(`
      SELECT
        COALESCE(SUM(total_revenue), 0) as yesterdayRevenue
      FROM transactions
      WHERE DATE(created_at) = DATE('now', '-1 day', 'localtime')
        AND status IN ('COMPLETED', 'PARTIALLY_DISPENSED')
    `);

    // KPI 3: Period Total Metrics (e.g. last 30d)
    const periodRow = await db.get(`
      SELECT
        COUNT(*) as totalTransactions,
        COALESCE(SUM(total_revenue), 0) as totalRevenue,
        COALESCE(SUM(total_cost), 0) as totalCost,
        COALESCE(SUM(profit), 0) as totalProfit,
        COALESCE(SUM(actual_dispensed_quantity), 0) as totalUnitsSold
      FROM transactions
      WHERE created_at >= DATETIME('now', '-${days} days')
        AND status IN ('COMPLETED', 'PARTIALLY_DISPENSED')
    `);

    const totalRevenue = periodRow.totalRevenue;
    const totalCost = periodRow.totalCost;
    const totalProfit = periodRow.totalProfit;
    const profitMargin = totalRevenue > 0 ? parseFloat(((totalProfit / totalRevenue) * 100).toFixed(1)) : 0;

    // KPI 4: Low stock items count
    const lowStockRow = await db.get(`
      SELECT COUNT(*) as lowStockCount FROM products WHERE stock <= minimum_stock AND active = 1
    `);

    // Chart 1: Daily Revenue & Profit Trend
    const dailyTrend = await db.all(`
      SELECT
        DATE(created_at) as date,
        COALESCE(SUM(total_revenue), 0) as revenue,
        COALESCE(SUM(total_cost), 0) as cost,
        COALESCE(SUM(profit), 0) as profit,
        COUNT(*) as count
      FROM transactions
      WHERE created_at >= DATETIME('now', '-${days} days')
        AND status IN ('COMPLETED', 'PARTIALLY_DISPENSED')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Chart 2: Top Selling Products
    const topProducts = await db.all(`
      SELECT
        product_name,
        unit,
        COALESCE(SUM(actual_dispensed_quantity), 0) as totalQuantity,
        COALESCE(SUM(total_revenue), 0) as totalRevenue,
        COALESCE(SUM(profit), 0) as totalProfit
      FROM transactions
      WHERE created_at >= DATETIME('now', '-${days} days')
        AND status IN ('COMPLETED', 'PARTIALLY_DISPENSED')
      GROUP BY product_id
      ORDER BY totalRevenue DESC
      LIMIT 6
    `);

    // Chart 3: Category Performance Share
    const categoryShare = await db.all(`
      SELECT
        c.name as categoryName,
        COALESCE(SUM(t.total_revenue), 0) as revenue,
        COALESCE(SUM(t.profit), 0) as profit
      FROM transactions t
      JOIN products p ON t.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE t.created_at >= DATETIME('now', '-${days} days')
        AND t.status IN ('COMPLETED', 'PARTIALLY_DISPENSED')
      GROUP BY c.id
      ORDER BY revenue DESC
    `);

    return res.json({
      success: true,
      range,
      kpis: {
        todayRevenue: todayRow.todayRevenue,
        todayTransactions: todayRow.totalTransactions,
        todayProfit: todayRow.todayProfit,
        yesterdayRevenue: yesterdayRow.yesterdayRevenue,
        periodRevenue: totalRevenue,
        periodCost: totalCost,
        periodProfit: totalProfit,
        profitMargin,
        periodTransactions: periodRow.totalTransactions,
        periodUnitsSold: periodRow.totalUnitsSold,
        lowStockItems: lowStockRow.lowStockCount
      },
      charts: {
        dailyTrend,
        topProducts,
        categoryShare
      }
    });
  } catch (err) {
    console.error('getSalesAnalytics error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
