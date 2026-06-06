import express from 'express';
import healthRoutes from './modules/health/health.routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(healthRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
