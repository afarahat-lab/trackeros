import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Get all leave requests' });
});

router.post('/', (req: Request, res: Response) => {
  res.json({ message: 'Create leave request' });
});

export default router;
