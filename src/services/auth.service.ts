import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Role, User } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { tokenService } from './token.service';

const BCRYPT_SALT_ROUNDS = 12;

export interface SanitizedUser {
  id: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: SanitizedUser;
  tokens: AuthTokens;
}

export function sanitizeUser(user: User): SanitizedUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Generates a unique 10-digit account number.
 * Retries until a unique number is found.
 */
async function generateAccountNumber(): Promise<string> {
  let accountNumber: string;
  let isUnique = false;

  do {
    // Generate a random 10-digit number
    const randomNum = crypto.randomInt(1000000000, 9999999999);
    accountNumber = randomNum.toString();

    const existing = await prisma.wallet.findUnique({
      where: { accountNumber },
    });
    isUnique = !existing;
  } while (!isUnique);

  return accountNumber;
}

export class AuthService {
  async register(email: string, password: string): Promise<AuthResult> {
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new AppError(409, 'Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const accountNumber = await generateAccountNumber();

    // Create user + wallet in a single transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: Role.CUSTOMER,
        },
      });

      await tx.wallet.create({
        data: {
          userId: newUser.id,
          accountNumber,
          balance: 0,
          currency: 'KES',
        },
      });

      return newUser;
    });

    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = tokenService.generateRefreshToken();
    await tokenService.storeRefreshToken(user.id, refreshToken);

    return {
      user: sanitizeUser(user),
      tokens: { accessToken, refreshToken },
    };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new AppError(401, 'Invalid email or password');
    }

    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = tokenService.generateRefreshToken();
    await tokenService.storeRefreshToken(user.id, refreshToken);

    return {
      user: sanitizeUser(user),
      tokens: { accessToken, refreshToken },
    };
  }

  async refresh(plainRefreshToken: string): Promise<{ accessToken: string }> {
    const user = await tokenService.verifyRefreshToken(plainRefreshToken);
    const accessToken = tokenService.generateAccessToken(user);
    return { accessToken };
  }

  async logout(plainRefreshToken: string): Promise<void> {
    await tokenService.revokeRefreshToken(plainRefreshToken);
  }
}

export const authService = new AuthService();
