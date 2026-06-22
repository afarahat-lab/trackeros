import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Get all employees' });
});

router.get('/:id', (req: Request, res: Response) => {
  res.json({ message: `Get employee ${req.params.id}` });
});

export default router;
