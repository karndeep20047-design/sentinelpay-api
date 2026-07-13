import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { auditService } from '../services/audit.service';
import { ApiResponse } from '../utils/ApiResponse';
import { AuthRequest } from '../middleware/auth.middleware';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export class AuthController {
  async register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = registerSchema.parse(req.body);
      const result = await authService.register(email, password);

      await auditService.log(result.user.id, 'USER_REGISTERED', { email }, req.ip ?? 'unknown');

      ApiResponse.success(res, 'Registration successful', result, 201);
    } catch (err) {
      next(err);
    }
  }

  async login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = loginSchema.parse(req.body);

      try {
        const result = await authService.login(email, password);
        await auditService.log(result.user.id, 'USER_LOGIN_SUCCESS', { email }, req.ip ?? 'unknown');
        ApiResponse.success(res, 'Login successful', result);
      } catch (loginErr) {
        await auditService.log(null, 'USER_LOGIN_FAILED', { email }, req.ip ?? 'unknown');
        throw loginErr;
      }
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);
      const result = await authService.refresh(refreshToken);
      ApiResponse.success(res, 'Token refreshed', result);
    } catch (err) {
      next(err);
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = logoutSchema.parse(req.body);
      await authService.logout(refreshToken);

      if (req.user) {
        await auditService.log(req.user.id, 'USER_LOGOUT', {}, req.ip ?? 'unknown');
      }

      ApiResponse.success(res, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
