import { Router } from 'express';
import LeaveService from './leave.service';

const router = Router();

router.post('/leave', async (req, res) => {
    try {
        const leaveRequest = await LeaveService.submitLeaveRequest(req.body);
        res.status(201).json(leaveRequest);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/leave', async (req, res) => {
    try {
        const leaves = await LeaveService.getEmployeeLeave(req.user.id);
        res.status(200).json(leaves);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export default router;
