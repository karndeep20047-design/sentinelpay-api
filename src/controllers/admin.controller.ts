import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth.middleware';

const adminPaginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'FLAGGED']).optional(),
});

export class AdminController {
  async getAllUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page: p, limit: l } = adminPaginationSchema.parse(req.query);
      const page = Math.max(1, p ?? 1);
      const limit = Math.min(100, Math.max(1, l ?? 20));
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            wallet: {
              select: {
                accountNumber: true,
                balance: true,
                currency: true,
              },
            },
          },
        }),
        prisma.user.count(),
      ]);

      ApiResponse.success(res, 'Users retrieved', {
        users: users.map((u) => ({
          ...u,
          wallet: u.wallet
            ? { ...u.wallet, balance: u.wallet.balance.toString() }
            : null,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  }

  async getAllTransactions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page: p, limit: l, status } = adminPaginationSchema.parse(req.query);
      const page = Math.max(1, p ?? 1);
      const limit = Math.min(100, Math.max(1, l ?? 20));
      const skip = (page - 1) * limit;

      const where = status ? { status } : {};

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { email: true } },
            receiver: { select: { email: true } },
            fraudFlag: true,
          },
        }),
        prisma.transaction.count({ where }),
      ]);

      ApiResponse.success(res, 'Transactions retrieved', {
        transactions: transactions.map((t) => ({
          ...t,
          amount: t.amount.toString(),
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  }

  async getAllFlags(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page: p, limit: l } = adminPaginationSchema.parse(req.query);
      const page = Math.max(1, p ?? 1);
      const limit = Math.min(100, Math.max(1, l ?? 20));
      const skip = (page - 1) * limit;

      const [flags, total] = await Promise.all([
        prisma.fraudFlag.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            transaction: {
              include: {
                sender: { select: { email: true } },
                receiver: { select: { email: true } },
              },
            },
          },
        }),
        prisma.fraudFlag.count(),
      ]);

      ApiResponse.success(res, 'Fraud flags retrieved', {
        flags: flags.map((f) => ({
          ...f,
          transaction: {
            ...f.transaction,
            amount: f.transaction.amount.toString(),
          },
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  }

  async getStats(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const [
        totalUsers,
        totalTransactions,
        flaggedCount,
        volumeResult,
        topSpenders,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.transaction.count(),
        prisma.fraudFlag.count(),
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { status: 'COMPLETED' },
        }),
        prisma.transaction.groupBy({
          by: ['senderId'],
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
          take: 5,
          where: { status: { in: ['COMPLETED', 'FLAGGED'] } },
        }),
      ]);

      // Enrich top spenders with email
      const topSpendersEnriched = await Promise.all(
        topSpenders.map(async (s) => {
          const user = await prisma.user.findUnique({
            where: { id: s.senderId },
            select: { email: true },
          });
          return {
            userId: s.senderId,
            email: user?.email ?? 'unknown',
            totalSent: s._sum.amount?.toString() ?? '0',
          };
        })
      );

      ApiResponse.success(res, 'Stats retrieved', {
        totalUsers,
        totalTransactions,
        flaggedCount,
        totalVolume: volumeResult._sum.amount?.toString() ?? '0',
        topSpenders: topSpendersEnriched,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');

      const id = String(req.params.id);

      // Prevent admin from deleting themselves
      if (id === req.user.id) {
        throw new AppError(400, 'Cannot delete your own account');
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new AppError(404, 'User not found');
      }

      await prisma.user.delete({ where: { id } });

      ApiResponse.success(res, 'User deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
