import { Router, Request, Response } from 'express';

const router = Router();

router.get('/api/v1/alives', (req: Request, res: Response) => {
    res.status(200).json({ alive: true });
});

export default router;
