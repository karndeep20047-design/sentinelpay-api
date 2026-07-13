import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate, requireRole(Role.ADMIN));

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only management endpoints
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (ADMIN only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated list of all users with wallet info
 *       403:
 *         description: Insufficient permissions
 */
router.get('/users', adminController.getAllUsers.bind(adminController));

/**
 * @swagger
 * /api/admin/transactions:
 *   get:
 *     summary: Get all transactions with filters (ADMIN only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, COMPLETED, FAILED, FLAGGED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated transaction list with sender/receiver emails
 */
router.get('/transactions', adminController.getAllTransactions.bind(adminController));

/**
 * @swagger
 * /api/admin/flags:
 *   get:
 *     summary: Get all fraud flags with AI analysis (ADMIN only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fraud flags with riskScore, reason, and Claude AI analysis
 */
router.get('/flags', adminController.getAllFlags.bind(adminController));

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get platform statistics (ADMIN only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total users, volume, flagged count, top spenders
 */
router.get('/stats', adminController.getStats.bind(adminController));

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete a user by ID (ADMIN only)
 *     tags: [Admin]
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
 *         description: User deleted
 *       404:
 *         description: User not found
 */
router.delete('/users/:id', adminController.deleteUser.bind(adminController));

export default router;
