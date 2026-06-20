import app from './app';

const PORT = 3000;

const start = async () => {
    try {
        const address = await app.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`Server is running on ${address}`);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

start();
