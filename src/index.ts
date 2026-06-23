import { buildApp } from './app';

const start = async () => {
  const app = await buildApp();
  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Server running on port ${port}`);
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
