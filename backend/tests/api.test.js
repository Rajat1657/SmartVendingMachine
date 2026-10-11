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

  describe('4. Machine Hardware & Emergency Stop', () => {
    it('should execute emergency stop signal', async () => {
      const res = await request(app)
        .post('/api/machines/emergency-stop');

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.result.reason).toContain('EMERGENCY STOP');
    });
  });
});
