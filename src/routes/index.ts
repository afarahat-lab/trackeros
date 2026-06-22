import { Router } from 'express';
import employeeRoutes from '../modules/employees/routes';
import leaveRoutes from '../modules/leaves/routes';

const router = Router();

router.use('/employees', employeeRoutes);
router.use('/leaves', leaveRoutes);

export default router;
