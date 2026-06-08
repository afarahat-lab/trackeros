import express from 'express';
import { collectDefaultMetrics, register } from 'prom-client';

const app = express();
const PORT = process.env.PORT || 3000;

// Collect default metrics
collectDefaultMetrics();

// Define the /metrics endpoint
app.get('/api/v1/metrics', (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(register.metrics());
});

// Other existing endpoints...

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
