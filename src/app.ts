import Fastify from 'fastify';
import { uptimeRoutes } from './modules/uptime/uptime.routes';

const app = Fastify({ logger: true });

app.register(uptimeRoutes);

export default app;
