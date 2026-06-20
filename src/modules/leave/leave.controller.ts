import { Request, Response } from 'express';
import { ILeaveService } from './leave.service.interface';

export class LeaveController {
  constructor(private readonly leaveService: ILeaveService) {}

  createLeave = async (req: Request, res: Response) => {
    try {
      const employeeId = (req as any).userId;
      const { leaveTypeId, startDate, endDate, reason } = req.body;
      const request = await this.leaveService.createLeaveRequest(
        employeeId,
        leaveTypeId,
        new Date(startDate),
        new Date(endDate),
        reason
      );
      res.status(201).json(request);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  };

  submitLeave = async (req: Request, res: Response) => {
    try {
      const requestId = req.params.id;
      const employeeId = (req as any).userId;
      const request = await this.leaveService.submitLeaveRequest(requestId, employeeId);
      res.json(request);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  };

  approveLeave = async (req: Request, res: Response) => {
    try {
      const requestId = req.params.id;
      const approverId = (req as any).userId;
      const request = await this.leaveService.approveLeaveRequest(requestId, approverId);
      res.json(request);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  };

  rejectLeave = async (req: Request, res: Response) => {
    try {
      const requestId = req.params.id;
      const approverId = (req as any).userId;
      const { reason } = req.body;
      const request = await this.leaveService.rejectLeaveRequest(requestId, approverId, reason);
      res.json(request);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  };

  cancelLeave = async (req: Request, res: Response) => {
    try {
      const requestId = req.params.id;
      const employeeId = (req as any).userId;
      const request = await this.leaveService.cancelLeaveRequest(requestId, employeeId);
      res.json(request);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  };

  getLeave = async (req: Request, res: Response) => {
    try {
      const requestId = req.params.id;
      const request = await this.leaveService.getLeaveRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: 'Leave request not found' });
      }
      res.json(request);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  };

  getEmployeeLeaves = async (req: Request, res: Response) => {
    try {
      const employeeId = (req as any).userId;
      const status = req.query.status as string | undefined;
      const requests = await this.leaveService.getLeaveRequestsByEmployee(employeeId, status);
      res.json(requests);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  };

  getPendingLeaves = async (req: Request, res: Response) => {
    try {
      const managerId = (req as any).userId;
      const requests = await this.leaveService.getPendingRequestsForManager(managerId);
      res.json(requests);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  };
}
