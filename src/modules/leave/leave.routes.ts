import { Router } from 'express';
import LeaveService from './leave.service';

const router = Router();

router.post('/leave', LeaveService.submitLeaveRequest);
router.get('/leave', LeaveService.getEmployeeLeave);

export default router;
