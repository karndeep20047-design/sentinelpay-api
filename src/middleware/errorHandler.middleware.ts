import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import { ApiResponse } from '../utils/ApiResponse';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response {
  if (err instanceof AppError) {
    return ApiResponse.error(res, err.message, err.statusCode, err.error);
  }

  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(', ');
    return ApiResponse.error(res, 'Validation failed', 400, message);
  }

  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002'
  ) {
    return ApiResponse.error(res, 'Resource already exists', 409);
  }

  if (err instanceof TokenExpiredError) {
    return ApiResponse.error(res, 'Token expired', 401);
  }

  if (err instanceof JsonWebTokenError) {
    return ApiResponse.error(res, 'Invalid token', 401);
  }

  console.error('Unhandled error:', err);

  const errorDetail =
    process.env.NODE_ENV === 'development' && err instanceof Error
      ? err.message
      : undefined;

  return ApiResponse.error(res, 'Internal server error', 500, errorDetail);
}
