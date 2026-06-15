import express from 'express';
import { PingController } from './modules/ping/ping.controller';
import { PingServiceImpl } from './modules/ping/ping.service';

const app = express();

// Existing routes and middleware...

app.get('/api/v1/ping', (req, res) => {
    res.json({ pong: true });
});

// Ping endpoint using Express
const pingController = new PingController(new PingServiceImpl());
app.get('/ping', async (req, res) => {
    const result = await pingController.getPing();
    res.json(result);
});

// Existing export statement...
export default app;
