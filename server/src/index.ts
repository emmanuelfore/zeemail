import path from 'path';
import dotenv from 'dotenv';
// Load .env from the monorepo root (one level up from server/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import envGuard from './lib/envGuard';
envGuard();

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler';
import domainsRouter from './routes/domains';
import mailboxesRouter from './routes/mailboxes';
import leadsRouter from './routes/leads';
import statsRouter from './routes/stats';
import crmRouter from './routes/crm';
import registerRouter from './routes/register';
import paymentsRouter from './routes/payments';
import clientsRouter from './routes/clients';
import authRouter from './routes/auth';
import { startMxPoller } from './jobs/mxPoller';
import { startDnsHealthCheckJob } from './jobs/dnsHealthCheck';

const app = express();
const PORT = process.env.PORT ?? 3000;

// CORS — allow Vite dev server and same-origin in prod
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // for Paynow webhook form posts

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/domains', domainsRouter);
app.use('/api/mailboxes', mailboxesRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/crm', crmRouter);
app.use('/api/register', registerRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/auth', authRouter);

// Global error handler — must be last
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startMxPoller();
  startDnsHealthCheckJob();
});

export default app;

