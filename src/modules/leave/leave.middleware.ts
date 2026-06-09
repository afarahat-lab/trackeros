import { Request, Response, NextFunction } from 'express';

interface User {
    id: string;
    // other user properties
}

declare global {
    namespace Express {
        interface Request {
            user?: User; // Add user property to Request
        }
    }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Middleware logic to authenticate user
    next();
};
