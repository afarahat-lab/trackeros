import { Router } from 'express';
import { LeaveService } from './leave.service';
import { CreateLeaveRequestDto } from './leave.model';

const router = Router();
const leaveService = new LeaveService(/* pass the leave repository instance here */);

// Middleware for access control
const accessControl = (roles: string[]) => {
  return (req, res, next) => {
    const userRole = req.user.role; // Assuming user role is set in req.user
    if (roles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  };
};

// Retrieve a list of leave requests
router.get('/api/v1/leaves', accessControl(['admin', 'operator']), async (req, res) => {
  try {
    const leaves = await leaveService.getAllLeaveRequests(); // Implement this method in LeaveService
    res.json({ leaves });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new leave request
router.post('/api/v1/leaves', accessControl(['admin', 'operator']), async (req, res) => {
  const dto: CreateLeaveRequestDto = req.body;
  try {
    const leave = await leaveService.createLeaveRequest(dto);
    res.status(201).json({ leave });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update an existing leave request
router.put('/api/v1/leaves/:id', accessControl(['admin', 'operator']), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const leave = await leaveService.updateLeaveRequest(id, status); // Implement this method in LeaveService
    res.json({ leave });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a leave request
router.delete('/api/v1/leaves/:id', accessControl(['admin', 'operator']), async (req, res) => {
  const { id } = req.params;
  try {
    await leaveService.deleteLeaveRequest(id); // Implement this method in LeaveService
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
