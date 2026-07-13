import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { transactionService } from '../services/transaction.service';
import { auditService } from '../services/audit.service';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth.middleware';

const transferSchema = z.object({
  toAccountNumber: z
    .string()
    .length(10, 'Account number must be exactly 10 digits')
    .regex(/^\d+$/, 'Account number must contain only digits'),
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be positive')
    .refine(
      (v) => Number.isFinite(v) && /^\d+(\.\d{1,2})?$/.test(v.toString()),
      'Amount must have at most 2 decimal places'
    ),
  description: z.string().max(255).optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export class TransactionController {
  async transfer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');

      const { toAccountNumber, amount, description } = transferSchema.parse(req.body);

      const transaction = await transactionService.transfer(
        req.user.id,
        toAccountNumber,
        amount,
        description
      );

      await auditService.log(
        req.user.id,
        'TRANSFER_INITIATED',
        { transactionId: transaction.id, amount, toAccountNumber },
        req.ip ?? 'unknown'
      );

      const message =
        transaction.status === 'FLAGGED'
          ? 'Transaction flagged for review'
          : 'Transfer successful';

      ApiResponse.success(res, message, {
        id: transaction.id,
        amount: transaction.amount.toString(),
        status: transaction.status,
        type: transaction.type,
        description: transaction.description,
        createdAt: transaction.createdAt,
      }, 201);
    } catch (err) {
      next(err);
    }
  }

  async getMyTransactions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');

      const filters = paginationSchema.parse(req.query);
      const result = await transactionService.getMyTransactions(req.user.id, filters);

      ApiResponse.success(res, 'Transactions retrieved', {
        ...result,
        transactions: result.transactions.map((t) => ({
          ...t,
          amount: t.amount.toString(),
        })),
      });
    } catch (err) {
      next(err);
    }
  }

  async getTransactionById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');

      const id = String(req.params.id);
      const transaction = await transactionService.getTransactionById(req.user.id, id);

      ApiResponse.success(res, 'Transaction retrieved', {
        ...transaction,
        amount: transaction.amount.toString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

export const transactionController = new TransactionController();
