import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { transactionService } from '../services/transaction.service';
import { ApiResponse } from '../utils/ApiResponse';

const mpesaCallbackSchema = z.object({
  accountNumber: z
    .string()
    .length(10, 'Account number must be exactly 10 digits')
    .regex(/^\d+$/, 'Account number must contain only digits'),
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be positive'),
  mpesaRef: z.string().min(1, 'M-Pesa reference is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
});

export class MpesaController {
  async callback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accountNumber, amount, mpesaRef, phoneNumber } =
        mpesaCallbackSchema.parse(req.body);

      const transaction = await transactionService.mpesaCredit(
        accountNumber,
        amount,
        mpesaRef,
        phoneNumber
      );

      ApiResponse.success(res, 'M-Pesa credit processed', {
        transactionId: transaction.id,
        amount: transaction.amount.toString(),
        status: transaction.status,
        description: transaction.description,
        createdAt: transaction.createdAt,
      }, 201);
    } catch (err) {
      next(err);
    }
  }
}

export const mpesaController = new MpesaController();
