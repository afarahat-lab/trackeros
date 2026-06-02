import { createServer } from './api';

const startServer = async () => {
  const server = await createServer();
  server.listen(3000, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Server listening at ${address}`);
  });
};

startServer();