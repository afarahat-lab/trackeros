import Fastify from 'fastify';
import { uptimeRoutes } from './modules/uptime/uptime.routes';
import { leaveRoutes } from './modules/leave';

const app = Fastify({ logger: true });

app.register(uptimeRoutes);
app.register(leaveRoutes);

export default app;
