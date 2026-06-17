import { Router, Request, Response } from 'express';
import { ZonkController } from './zonk.controller';

export function registerZonkRoutes(router: Router): void {
  const controller = new ZonkController();
  router.get('/zonk', async (req: Request, res: Response) => {
    const result = await controller.getZonk();
    res.status(200).json(result);
  });
}
