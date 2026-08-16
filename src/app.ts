import Fastify from 'fastify';
import { uptimeRoutes } from './modules/uptime/uptime.routes';
import { leaveRequestRoutes } from './modules/leave-request/leave-request.routes';

const app = Fastify({ logger: true });

app.register(uptimeRoutes);
app.register(leaveRequestRoutes);

export default app;
