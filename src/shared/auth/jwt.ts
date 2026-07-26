
import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  role: string;
}

export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const decoded = jwt.verify(token, secret) as jwt.JwtPayload;

  if (!decoded.userId || !decoded.role) {
    throw new Error('Token payload missing required fields: userId or role');
  }

  return {
    userId: decoded.userId,
    role: decoded.role,
  };
}
