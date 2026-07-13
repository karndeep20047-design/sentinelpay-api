import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const BCRYPT_SALT_ROUNDS = 12;

interface SeedUser {
  email: string;
  password: string;
  role: Role;
  walletBalance?: number;
  accountNumber?: string;
}

const users: SeedUser[] = [
  {
    email: 'admin@sentinelpay.com',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    role: Role.ADMIN,
    accountNumber: '1000000001',
  },
  {
    email: 'employee@sentinelpay.com',
    password: 'Employee123!',
    role: Role.EMPLOYEE,
    accountNumber: '1000000002',
  },
  {
    email: 'alice@example.com',
    password: 'User123!',
    role: Role.CUSTOMER,
    walletBalance: 500000,
    accountNumber: '1000000003',
  },
  {
    email: 'bob@example.com',
    password: 'User123!',
    role: Role.CUSTOMER,
    walletBalance: 250000,
    accountNumber: '1000000004',
  },
];

async function main(): Promise<void> {
  console.log('🌱 Starting SentinelPay database seed...');

  for (const seedUser of users) {
    const hashedPassword = await bcrypt.hash(seedUser.password, BCRYPT_SALT_ROUNDS);

    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {
        password: hashedPassword,
        role: seedUser.role,
      },
      create: {
        email: seedUser.email,
        password: hashedPassword,
        role: seedUser.role,
      },
    });

    if (seedUser.accountNumber) {
      await prisma.wallet.upsert({
        where: { userId: user.id },
        update: {
          balance: seedUser.walletBalance ?? 0,
          accountNumber: seedUser.accountNumber,
        },
        create: {
          userId: user.id,
          balance: seedUser.walletBalance ?? 0,
          accountNumber: seedUser.accountNumber,
          currency: 'KES',
        },
      });
    }

    console.log(`  ✅ Seeded: ${seedUser.email} (${seedUser.role})`);
  }

  console.log('✨ Seed complete!');
}

main()
  .catch((error: unknown) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
