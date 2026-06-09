import { Request, Response, NextFunction } from 'express';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                // other user properties can be added here
            };
        }
    }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Middleware logic to authenticate user
    next();
};
