import { Response, NextFunction } from 'express';
import { walletService } from '../services/wallet.service';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth.middleware';

export class WalletController {
  async getMyWallet(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');

      const wallet = await walletService.getMyWallet(req.user.id);

      ApiResponse.success(res, 'Wallet retrieved', {
        id: wallet.id,
        accountNumber: wallet.accountNumber,
        balance: wallet.balance.toString(),
        currency: wallet.currency,
        createdAt: wallet.createdAt,
      });
    } catch (err) {
      next(err);
    }
  }

  async getBalance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError(401, 'Authentication required');

      const balance = await walletService.getBalance(req.user.id);
      ApiResponse.success(res, 'Balance retrieved', balance);
    } catch (err) {
      next(err);
    }
  }
}

export const walletController = new WalletController();
