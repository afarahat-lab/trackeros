import { Request, Response, NextFunction } from 'express';

export const accessControl = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user.role; // Assuming user role is set in req.user
    if (roles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  };
};
