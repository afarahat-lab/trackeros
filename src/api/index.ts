import fastify from 'fastify';
import { rbacMiddleware } from '../shared/auth/rbac-middleware';

const app = fastify();

// Register routes from modules
// Example: app.register(require('../modules/example/routes/example-routes'));

app.addHook('preHandler', rbacMiddleware(['admin', 'user']));

export default app;