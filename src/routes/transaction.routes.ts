import { Router } from 'express';
import { transactionController } from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth.middleware';
import { transactionRateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Payment transaction endpoints
 */

/**
 * @swagger
 * /api/transactions/transfer:
 *   post:
 *     summary: Transfer funds to another account
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [toAccountNumber, amount]
 *             properties:
 *               toAccountNumber:
 *                 type: string
 *                 example: "1000000004"
 *               amount:
 *                 type: number
 *                 example: 150000
 *               description:
 *                 type: string
 *                 example: "Rent payment"
 *     responses:
 *       201:
 *         description: Transfer successful (status may be COMPLETED or FLAGGED)
 *       400:
 *         description: Insufficient balance or validation error
 *       404:
 *         description: Receiver account not found
 */
router.post(
  '/transfer',
  authenticate,
  transactionRateLimiter,
  transactionController.transfer.bind(transactionController)
);

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get your transaction history (paginated)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Paginated transaction list
 */
router.get('/', authenticate, transactionController.getMyTransactions.bind(transactionController));

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: Get a single transaction by ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction details including fraud flag if flagged
 *       404:
 *         description: Transaction not found
 */
router.get('/:id', authenticate, transactionController.getTransactionById.bind(transactionController));

export default router;
