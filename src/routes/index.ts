import { Router, Request, Response } from 'express';
import employeeRoutes from '../modules/employees/routes';
import leaveRoutes from '../modules/leaves/routes';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

router.use('/employees', employeeRoutes);
router.use('/leaves', leaveRoutes);

export default router;
