import Fastify from 'fastify';
import { uptimeRoutes } from './modules/uptime/uptime.routes';
import { policyRoutes } from './modules/policy/policy.routes';

const app = Fastify({ logger: true });

app.register(uptimeRoutes);
app.register(policyRoutes);

export default app;
