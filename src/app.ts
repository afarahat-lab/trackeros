import express from 'express';
import healthRoutes from './modules/health/health.routes';

const app = express();

// Other middleware and routes...

app.use(healthRoutes);

// Start the server...
