import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { AppService } from './app.service';
import { queryClient } from './db';
import authRoutes from './routes/auth';
import stationsRoutes from './routes/stations';
import plugsRoutes from './routes/plugs';
import sessionsRoutes from './routes/sessions';
import usersRoutes from './routes/users';
import maintenanceRoutes from './routes/maintenance';
import ticketsRoutes from './routes/tickets';
import receiptsRoutes from './routes/receipts';

dotenv.config();

const app = express();
const port = process.env.PORT ?? 3000;
const appService = new AppService();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({ message: appService.getHello(), version: appService.getVersion() });
});

app.use('/api/auth', authRoutes);
app.use('/api/stations', stationsRoutes);
app.use('/api/plugs', plugsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/receipts', receiptsRoutes);

// ─── 404 catch-all ────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı.' });
});

// ─── Start server ─────────────────────────────────────────────────────────────

const server = app.listen(port, () => {
  console.log(`VoltOps API running at http://localhost:${port}`);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────

const shutdown = async (signal: string) => {
  console.log(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    await queryClient.end();
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
