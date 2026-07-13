import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';

export class AuditService {
  async log(
    userId: string | null,
    action: string,
    metadata: Record<string, unknown>,
    ipAddress: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          metadata: metadata as Prisma.InputJsonValue,
          ipAddress,
        },
      });
    } catch (err) {
      // Audit logging should never crash the main request
      console.error('[AuditService] Failed to write audit log:', err);
    }
  }
}

export const auditService = new AuditService();
