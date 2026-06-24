import express from 'express';
import { statusRoutes } from './modules/status/status.routes';

const app = express();

app.use(statusRoutes);

export default app;
