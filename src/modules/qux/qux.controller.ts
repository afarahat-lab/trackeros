import { Request, Response } from "express";

export class QuxController {
  async getQux(req: Request, res: Response): Promise<void> {
    res.status(200).json({ message: 'qux' });
  }
}
