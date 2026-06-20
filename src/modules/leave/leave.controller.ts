import { Request, Response } from 'express';
import { LeaveService } from './leave.service';

export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  // Controller methods will be implemented here
}
