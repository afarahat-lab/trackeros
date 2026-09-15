import Fastify from 'fastify';
import { uptimeRoutes } from './modules/uptime/uptime.routes';
import { leaveRoutes } from './modules/leave';
import { balanceRoutes } from './modules/balance';
import { authRoutes } from './modules/auth';
import { employeeRoutes } from './modules/employee';
import { registerAuth } from './shared/auth';
import { AppError } from './shared/errors';

const app = Fastify({ logger: true });

// Finding 2 — authentication populates `request.user`, which every route already reads.
// Registered BEFORE the routes so the preHandler hook applies to them.
registerAuth(app);

// Finding 3 — `leaveRoutes` was exported and imported by nothing, so every endpoint the
// leave features built was unreachable. Mounting it is what makes the feature exist at
// runtime rather than only in the module.
app.register(uptimeRoutes);
app.register(leaveRoutes);
app.register(balanceRoutes);
app.register(authRoutes);
app.register(employeeRoutes);

// A thrown AppError from a hook (e.g. UnauthorizedError from auth) must become its own
// status code, not a bare 500.
app.setErrorHandler((error, _request, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ error: error.message, code: error.code });
  }
  return reply.status(500).send({ error: 'Internal Server Error' });
});

export default app;
