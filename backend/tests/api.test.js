import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import apiRoutes from '../src/routes/api.js';
import { getDb } from '../src/db/database.js';
import { seedDatabase } from '../src/db/seed.js';

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

describe('Grain & Oil Vending Machine System Tests', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  describe('1. Authentication Tests', () => {
    it('should reject invalid login credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@vending.com', password: 'wrongpassword' });

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
    });

    it('should successfully log in admin user and return JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@vending.com', password: 'admin123' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toEqual('SHOP_OWNER');
    });
  });

  describe('2. Product & Inventory Server Rules', () => {
    it('should fetch active products for customer touchscreen', async () => {
      const res = await request(app)
        .get('/api/products?activeOnly=true');

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.products.length).toBeGreaterThan(0);

      // Check product fields
      const p = res.body.products[0];
      expect(p.name).toBeDefined();
      expect(p.selling_price).toBeGreaterThan(0);
      expect(p.type).toMatch(/SOLID|LIQUID/);
    });

    it('should reject dispensing when quantity exceeds available stock', async () => {
      const res = await request(app)
        .post('/api/transactions/dispense')
        .send({ productId: 'prod_basmati', quantity: 999.0 }); // 999kg > stock

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Insufficient stock');
    });
  });

  describe('3. Transaction & Dispensing', () => {
    it('should initiate dispensing transaction for valid request', async () => {
      const res = await request(app)
        .post('/api/transactions/dispense')
        .send({ productId: 'prod_basmati', quantity: 1.0 });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.transactionId).toBeDefined();
      expect(res.body.stickerCode).toBeDefined();
      expect(res.body.totalRevenue).toEqual(90.0); // 1kg * 90 INR
    });
  });

  describe('5. Counter Checkout & POS Integration Tests', () => {
    it('should query sticker tag details for counter scanning', async () => {
      const dispenseRes = await request(app)
        .post('/api/transactions/dispense')
        .send({ productId: 'prod_basmati', quantity: 2.0 });

      const sticker = dispenseRes.body.stickerCode;
      expect(sticker).toBeDefined();

      const lookupRes = await request(app)
        .get(`/api/transactions/stickers/${sticker}`);

      expect(lookupRes.statusCode).toEqual(200);
      expect(lookupRes.body.success).toBe(true);
    });

    it('should process counter payment and reject duplicate scanning', async () => {
      const db = await getDb();
      const testTxId = `tx_test_${Date.now()}`;
      const testBagId = `bag_test_${Date.now()}`;
      const testSticker = `STK-TEST-${Date.now()}`;

      await db.run(
        `INSERT INTO transactions (
          id, code, machine_id, product_id, product_name, product_type, target_quantity,
          unit, selling_price, cost_price, total_revenue, total_cost, profit, status, checkout_status
        ) VALUES (?, ?, 'mach-001', 'prod_basmati', 'Basmati Rice', 'SOLID', 1.0, 'kg', 90, 60, 90, 60, 30, 'COMPLETED', 'UNPAID')`,
        [testTxId, `TX-${Date.now()}`]
      );

      await db.run(
        `INSERT INTO transaction_bags (
          id, transaction_id, bag_index, total_bags, net_quantity, unit, unit_price, final_amount, sticker_code, checkout_status
        ) VALUES (?, ?, 1, 1, 1.0, 'kg', 90.0, 90.0, ?, 'UNPAID')`,
        [testBagId, testTxId, testSticker]
      );

      // First Checkout Scan
      const checkoutRes1 = await request(app)
        .post('/api/transactions/pos-checkout')
        .send({ stickerCode: testSticker, posTerminalId: 'COUNTER_POS_01' });

      expect(checkoutRes1.statusCode).toEqual(200);
      expect(checkoutRes1.body.success).toBe(true);
      expect(checkoutRes1.body.message).toContain('marked PAID');

      // Duplicate Scan Attempt -> Must be REJECTED
      const checkoutRes2 = await request(app)
        .post('/api/transactions/pos-checkout')
        .send({ stickerCode: testSticker, posTerminalId: 'COUNTER_POS_01' });

      expect(checkoutRes2.statusCode).toEqual(400);
      expect(checkoutRes2.body.success).toBe(false);
      expect(checkoutRes2.body.error).toContain('ALREADY been scanned');
    });
  });
});
