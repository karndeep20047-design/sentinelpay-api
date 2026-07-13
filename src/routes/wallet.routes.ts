import { Router } from 'express';
import { walletController } from '../controllers/wallet.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Wallet management endpoints
 */

/**
 * @swagger
 * /api/wallet/me:
 *   get:
 *     summary: Get your wallet details (balance, account number, currency)
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     accountNumber:
 *                       type: string
 *                     balance:
 *                       type: string
 *                       example: "500000.00"
 *                     currency:
 *                       type: string
 *                       example: KES
 */
router.get('/me', authenticate, walletController.getMyWallet.bind(walletController));

/**
 * @swagger
 * /api/wallet/balance:
 *   get:
 *     summary: Get just your current balance
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current balance
 */
router.get('/balance', authenticate, walletController.getBalance.bind(walletController));

export default router;
