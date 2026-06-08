import express from 'express';
import { collectDefaultMetrics, register } from 'prom-client';

const app = express();

// Collect default metrics
collectDefaultMetrics();

// Define the /metrics endpoint
app.get('/api/v1/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

// Default export
export default app;
