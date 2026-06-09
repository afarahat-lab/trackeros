import { Router, Request, Response, NextFunction } from 'express';
import { LeaveService } from './leave.service';
import { LeaveRequest } from './leave.model';

const router = Router();
const leaveService = new LeaveService();

router.get('/api/v1/leave-requests', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const leaveRequests: LeaveRequest[] = await leaveService.getAllLeaveRequests(req.user.id);
        res.json({ leaveRequests });
    } catch (error: unknown) {
        next(error);
    }
});

router.post('/api/v1/leave-requests', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const leaveRequest = await leaveService.createLeaveRequest(req.body);
        res.status(201).json({ leaveRequest });
    } catch (error: unknown) {
        next(error);
    }
});

export default router;
