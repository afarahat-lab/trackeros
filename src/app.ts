import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors);
  await app.register(sensible);

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
