import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import checkRoutes from './routes/checkRoutes.js';
import { setupSocketHandlers } from './routes/socketHandlers.js';
import Check from './models/Check.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// API routes
app.use('/api/checks', checkRoutes);

// Socket.io setup
setupSocketHandlers(io);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});

// Cleanup expired checks every hour
setInterval(() => {
  const deleted = Check.cleanupExpired();
  if (deleted > 0) {
    console.log(`Cleaned up ${deleted} expired checks`);
  }
}, 60 * 60 * 1000);

export { app, httpServer, io };
