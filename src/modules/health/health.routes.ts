import { Router, Request, Response } from 'express';

const router = Router();

router.get('/api/v1/health-check', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK' });
});

export default router;
