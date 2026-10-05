import app from './app';
import { PortResolver } from './shared/config';

const portResolver = new PortResolver();

const start = async (): Promise<void> => {
  const { port } = portResolver.resolvePort(process.env.PORT);

  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Server is running on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}
