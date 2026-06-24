import { Router, Request, Response } from 'express';

export const statusRouter = Router();

statusRouter.get('/status', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
