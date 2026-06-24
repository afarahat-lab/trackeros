import { Router, Request, Response } from 'express';
import { StatusService } from './status.service';

export const statusRouter = Router();
const statusService = new StatusService();

statusRouter.get('/status', (req: Request, res: Response) => {
  const status = statusService.getStatus();
  res.status(200).json(status);
});
