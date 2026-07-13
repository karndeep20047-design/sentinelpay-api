import { Wallet } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/AppError';

export class WalletService {
  async getMyWallet(userId: string): Promise<Wallet> {
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new AppError(404, 'Wallet not found');
    }

    return wallet;
  }

  async getBalance(userId: string): Promise<{ balance: string; currency: string }> {
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      select: { balance: true, currency: true },
    });

    if (!wallet) {
      throw new AppError(404, 'Wallet not found');
    }

    return {
      balance: wallet.balance.toString(),
      currency: wallet.currency,
    };
  }
}

export const walletService = new WalletService();
