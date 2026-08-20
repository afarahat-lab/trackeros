import Fastify from 'fastify';
import { uptimeRoutes } from './modules/uptime/uptime.routes';
import { balanceRoutes } from './modules/balance/balance.routes';

const app = Fastify({ logger: true });

app.register(uptimeRoutes);
app.register(balanceRoutes);

export default app;
