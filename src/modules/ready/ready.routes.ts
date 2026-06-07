import { Router, Request, Response } from 'express';

const router = Router();

router.get('/api/v1/ready', (req: Request, res: Response) => {
    res.status(200).json({ ready: true });
});

export default router;
