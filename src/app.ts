import express from 'express';
import { collectDefaultMetrics, register } from 'prom-client';

const app = express();
const port = process.env.PORT || 3000;

// Collect default metrics
collectDefaultMetrics();

// Define the /metrics endpoint
app.get('/api/v1/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        res.status(500).send('Error retrieving metrics');
    }
});

// Other existing routes and middleware...

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
