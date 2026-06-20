import { Request, Response, NextFunction } from 'express';
import { LeaveService } from './leave.service';

export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  createLeaveRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeId, leaveTypeId, startDate, endDate, reason } = req.body;
      const request = await this.leaveService.createLeaveRequest(
        employeeId,
        leaveTypeId,
        new Date(startDate),
        new Date(endDate),
        reason
      );
      res.status(201).json(request);
    } catch (error) {
      next(error);
    }
  };

  submitLeaveRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { employeeId } = req.body;
      const request = await this.leaveService.submitLeaveRequest(id, employeeId);
      res.status(200).json(request);
    } catch (error) {
      next(error);
    }
  };

  approveLeaveRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { approverId } = req.body;
      const request = await this.leaveService.approveLeaveRequest(id, approverId);
      res.status(200).json(request);
    } catch (error) {
      next(error);
    }
  };

  rejectLeaveRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { approverId, reason } = req.body;
      const request = await this.leaveService.rejectLeaveRequest(id, approverId, reason);
      res.status(200).json(request);
    } catch (error) {
      next(error);
    }
  };

  cancelLeaveRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { employeeId } = req.body;
      const request = await this.leaveService.cancelLeaveRequest(id, employeeId);
      res.status(200).json(request);
    } catch (error) {
      next(error);
    }
  };

  getLeaveRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const request = await this.leaveService.getLeaveRequest(id);
      if (!request) {
        return res.status(404).json({ message: 'Leave request not found' });
      }
      res.status(200).json(request);
    } catch (error) {
      next(error);
    }
  };

  getLeaveRequestsByEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeId } = req.params;
      const status = req.query.status as string | undefined;
      const requests = await this.leaveService.getLeaveRequestsByEmployee(employeeId, status);
      res.status(200).json(requests);
    } catch (error) {
      next(error);
    }
  };

  getPendingRequestsForManager = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { managerId } = req.params;
      const requests = await this.leaveService.getPendingRequestsForManager(managerId);
      res.status(200).json(requests);
    } catch (error) {
      next(error);
    }
  };
}
