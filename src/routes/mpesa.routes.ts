import { Router } from 'express';
import { mpesaController } from '../controllers/mpesa.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: M-Pesa
 *   description: M-Pesa simulation webhook endpoints
 */

/**
 * @swagger
 * /api/mpesa/callback:
 *   post:
 *     summary: Simulate M-Pesa STK push callback (credits wallet)
 *     tags: [M-Pesa]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [accountNumber, amount, mpesaRef, phoneNumber]
 *             properties:
 *               accountNumber:
 *                 type: string
 *                 example: "1000000003"
 *               amount:
 *                 type: number
 *                 example: 5000
 *               mpesaRef:
 *                 type: string
 *                 example: "QJK2LS9KDF"
 *               phoneNumber:
 *                 type: string
 *                 example: "254712345678"
 *     responses:
 *       201:
 *         description: M-Pesa credit processed successfully
 *       404:
 *         description: Account not found
 */
router.post('/callback', mpesaController.callback.bind(mpesaController));

export default router;
