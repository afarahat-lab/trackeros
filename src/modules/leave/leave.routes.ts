import { Router } from 'express';
import LeaveService from './leave.service';

const router = Router();

router.post('/leave', async (req, res) => {
    try {
        const leaveRequest = await LeaveService.submitLeaveRequest(req.body);
        res.status(201).json({
            status: 'success',
            message: 'Leave request submitted successfully',
            leaveRequestId: leaveRequest.id,
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message,
        });
    }
});

router.get('/leave', async (req, res) => {
    try {
        const leaveRequests = await LeaveService.getEmployeeLeave(req.user.id);
        res.status(200).json({
            leaveRequests,
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message,
        });
    }
});

export default router;
