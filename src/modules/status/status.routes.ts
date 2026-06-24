import { Router, Request, Response } from 'express';
import { StatusService } from './status.service';
import { IStatusService } from './status.service.interface';
import { SystemStatus } from './status.model';

const router = Router();

router.get('/status', async (req: Request, res: Response) => {
  try {
    const statusService: IStatusService = new StatusService();
    const status: SystemStatus = statusService.getStatus();
    return res.status(200).send(status);
  } catch (error) {
    return res.status(500).send({ up: false, version: '1' });
  }
});

export { router as statusRoutes };
