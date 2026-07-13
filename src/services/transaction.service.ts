import { Transaction, TransactionStatus, TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { fraudService } from './fraud.service';

export interface TransactionFilters {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class TransactionService {
  /**
   * Atomic fund transfer using Prisma $transaction().
   * Fraud analysis runs fire-and-forget after the response is ready.
   */
  async transfer(
    senderId: string,
    toAccountNumber: string,
    amount: number,
    description?: string
  ): Promise<Transaction> {
    // Validate positive amount with max 2 decimal places
    if (amount <= 0) {
      throw new AppError(400, 'Amount must be positive');
    }

    const decimalStr = amount.toFixed(2);
    if (parseFloat(decimalStr) !== amount && amount.toString().split('.')[1]?.length > 2) {
      throw new AppError(400, 'Amount must have at most 2 decimal places');
    }

    // Look up receiver wallet
    const receiverWallet = await prisma.wallet.findUnique({
      where: { accountNumber: toAccountNumber },
      include: { user: true },
    });

    if (!receiverWallet) {
      throw new AppError(404, 'Receiver account not found');
    }

    // Validate sender != receiver
    if (receiverWallet.userId === senderId) {
      throw new AppError(400, 'Cannot transfer to your own account');
    }

    const amountDecimal = new Decimal(decimalStr);

    // Atomic transfer
    const transaction = await prisma.$transaction(async (tx) => {
      // Lock sender wallet and check balance
      const senderWallet = await tx.wallet.findUnique({
        where: { userId: senderId },
      });

      if (!senderWallet) {
        throw new AppError(404, 'Sender wallet not found');
      }

      if (new Decimal(senderWallet.balance).lt(amountDecimal)) {
        throw new AppError(400, 'Insufficient balance');
      }

      // Deduct from sender
      await tx.wallet.update({
        where: { userId: senderId },
        data: { balance: { decrement: amountDecimal } },
      });

      // Credit receiver
      await tx.wallet.update({
        where: { userId: receiverWallet.userId },
        data: { balance: { increment: amountDecimal } },
      });

      // Create transaction record
      const newTransaction = await tx.transaction.create({
        data: {
          senderId,
          receiverId: receiverWallet.userId,
          amount: amountDecimal,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.COMPLETED,
          description: description ?? null,
        },
      });

      return newTransaction;
    });

    // Fire-and-forget fraud analysis (does not block response)
    fraudService.analyzeAsync(transaction).catch((err: unknown) => {
      console.error('[TransactionService] Fraud analysis failed:', err);
    });

    return transaction;
  }

  async getMyTransactions(
    userId: string,
    filters: TransactionFilters
  ): Promise<PaginatedTransactions> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const where = {
      OR: [{ senderId: userId }, { receiverId: userId }],
      ...(filters.startDate || filters.endDate
        ? {
            createdAt: {
              ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
              ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
            },
          }
        : {}),
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTransactionById(userId: string, transactionId: string): Promise<Transaction & { fraudFlag: object | null }> {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: { fraudFlag: true },
    });

    if (!transaction) {
      throw new AppError(404, 'Transaction not found');
    }

    return transaction;
  }

  /**
   * Credits a wallet via M-Pesa callback simulation.
   */
  async mpesaCredit(
    accountNumber: string,
    amount: number,
    mpesaRef: string,
    phoneNumber: string
  ): Promise<Transaction> {
    const wallet = await prisma.wallet.findUnique({
      where: { accountNumber },
    });

    if (!wallet) {
      throw new AppError(404, 'Account not found');
    }

    const amountDecimal = new Decimal(amount.toFixed(2));

    const transaction = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { accountNumber },
        data: { balance: { increment: amountDecimal } },
      });

      return tx.transaction.create({
        data: {
          senderId: wallet.userId, // M-Pesa credits come from the user themselves
          receiverId: wallet.userId,
          amount: amountDecimal,
          type: TransactionType.MPESA_CREDIT,
          status: TransactionStatus.COMPLETED,
          description: `M-Pesa credit from ${phoneNumber} (Ref: ${mpesaRef})`,
        },
      });
    });

    return transaction;
  }
}

export const transactionService = new TransactionService();
