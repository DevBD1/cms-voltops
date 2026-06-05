import express, { Request, Response } from 'express';
import './env';
import { AppService } from './app.service';
import { createAdminRouter } from './routes/admin.routes';
import { createAuthRouter } from './routes/auth';
import { createMobileRouter } from './routes/mobile.routes';
import { AuthService } from './services/auth.service';
import { CatalogService } from './services/catalog.service';
import { SessionService } from './services/session.service';
import { TicketService } from './services/ticket.service';
import { VehicleService } from './services/vehicle.service';
import { createRequestLogger, logger } from './utils/logger';

const app = express();
const port = process.env.PORT || 3000;
const appService = new AppService();
const authService = new AuthService();
const catalogService = new CatalogService();
const sessionService = new SessionService(catalogService);
const ticketService = new TicketService();
const vehicleService = new VehicleService();

app.use(createRequestLogger());
app.use(express.json());
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  );
  res.header(
    'Access-Control-Allow-Methods',
    'GET, POST, PATCH, DELETE, OPTIONS',
  );
  next();
});

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

app.get('/', (_req: Request, res: Response) => {
  res.json(appService.getHealth());
});

app.get('/health', (_req: Request, res: Response) => {
  res.json(appService.getHealth());
});

app.use('/api/auth', createAuthRouter());
app.use(
  '/api/mobile',
  createMobileRouter(
    authService,
    catalogService,
    sessionService,
    ticketService,
    vehicleService,
  ),
);
app.use(
  '/api/admin',
  createAdminRouter(authService, catalogService, sessionService, ticketService),
);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(port, () => {
  logger.info('api.started', {
    port,
    url: `http://localhost:${port}`,
    debug: process.env.API_DEBUG ?? false,
  });
});
