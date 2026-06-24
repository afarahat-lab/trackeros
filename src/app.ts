import express from 'express';
import { statusRoutes } from './modules/status';

const app = express();

app.use(express.json());
app.use(statusRoutes);

export default app;
