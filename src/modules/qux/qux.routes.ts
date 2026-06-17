import { Router, Request, Response } from "express";
import { QuxController } from "./qux.controller";

const router = Router();
const controller = new QuxController();

router.get("/qux", async (req: Request, res: Response) => {
  await controller.getQux(req, res);
});

export default router;
