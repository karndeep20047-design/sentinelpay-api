import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/AppError';

const BCRYPT_SALT_ROUNDS = 12;

function getRefreshExpiresInMs(): number {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
  const match = expiresIn.match(/^(\d+)([dhms])$/);

  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    case 's':
      return value * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

export class TokenService {
  generateAccessToken(user: User): string {
    const secret = process.env.JWT_ACCESS_SECRET;
    const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';

    if (!secret) {
      throw new AppError(500, 'JWT access secret is not configured');
    }

    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      secret,
      { expiresIn } as jwt.SignOptions
    );
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  async storeRefreshToken(userId: string, plainToken: string): Promise<void> {
    const tokenHash = await bcrypt.hash(plainToken, BCRYPT_SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + getRefreshExpiresInMs());

    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    });
  }

  async verifyRefreshToken(plainToken: string): Promise<User> {
    const now = new Date();
    const tokens = await prisma.refreshToken.findMany({
      where: {
        expiresAt: { gt: now },
      },
      include: { user: true },
    });

    for (const stored of tokens) {
      const isMatch = await bcrypt.compare(plainToken, stored.tokenHash);
      if (isMatch) {
        return stored.user;
      }
    }

    throw new AppError(401, 'Invalid or expired refresh token');
  }

  async revokeRefreshToken(plainToken: string): Promise<void> {
    const now = new Date();
    const tokens = await prisma.refreshToken.findMany({
      where: {
        expiresAt: { gt: now },
      },
    });

    for (const stored of tokens) {
      const isMatch = await bcrypt.compare(plainToken, stored.tokenHash);
      if (isMatch) {
        await prisma.refreshToken.delete({ where: { id: stored.id } });
        return;
      }
    }

    throw new AppError(401, 'Invalid or expired refresh token');
  }
}

export const tokenService = new TokenService();
