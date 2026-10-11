import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import apiRoutes from './routes/api.js';
import { getDb } from './db/database.js';
import { seedDatabase } from './db/seed.js';
import { simulatedMachine } from './machine/SimulatedMachineController.js';
import { enforceHttps } from './middleware/httpsMiddleware.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Enforce HTTPS in production
app.use(enforceHttps);

// Attach socket.io to simulated machine controller & express requests
simulatedMachine.setSocketIo(io);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Mount REST API
app.use('/api', apiRoutes);

// Serve static image uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve static frontend production build
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), machine: simulatedMachine.status });
});

// SPA fallback handler: serve index.html for all non-API GET requests
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(500).send('Frontend build index.html not found. Please run npm run build in frontend directory.');
    }
  });
});

// Socket.io connection handling
io.on('connection', async (socket) => {
  console.log(`[WebSocket] Client connected: ${socket.id}`);

  const status = await simulatedMachine.getStatus();
  socket.emit('machine_status_update', status);

  socket.on('disconnect', () => {
    console.log(`[WebSocket] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const db = await getDb();

    const prodCount = await db.get('SELECT COUNT(*) as count FROM products');
    if (prodCount.count === 0) {
      console.log('No products found in DB. Auto-seeding initial demo data...');
      await seedDatabase();
    }

    await simulatedMachine.connect();

    server.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`  Nourish Smart Grain & Oil Vending Machine Server Running!`);
      console.log(`  Port: ${PORT}`);
      console.log(`  API Endpoint: http://localhost:${PORT}/api`);
      console.log(`  WebSocket Server: Ready`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
