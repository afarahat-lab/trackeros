import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  dbUrl: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/leave_management',
  jwtSecret: process.env.JWT_SECRET || 'supersecretkey',
};
