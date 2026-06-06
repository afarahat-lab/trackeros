import express from 'express';

const router = express.Router();

router.get('/api/v1/health-check', (req, res) => {
    res.status(200).json({ status: 'OK' });
});

export default router;
