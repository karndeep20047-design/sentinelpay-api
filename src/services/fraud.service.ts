import Anthropic from '@anthropic-ai/sdk';
import { Transaction, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../utils/prisma';

interface ClaudeAnalysis {
  riskScore: number;
  reason: string;
  recommendation: 'BLOCK' | 'REVIEW' | 'ALLOW';
}

const LARGE_AMOUNT_THRESHOLD = new Decimal(100000); // 100,000 KES
const HIGH_VELOCITY_COUNT = 5;        // transactions
const HIGH_VELOCITY_WINDOW_MS = 60_000; // 60 seconds
const DUPLICATE_RECEIVER_WINDOW_MS = 30_000; // 30 seconds

export class FraudService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Fire-and-forget fraud analysis. Called after a transaction completes.
   * Updates transaction status to FLAGGED and creates a FraudFlag if triggered.
   */
  async analyzeAsync(transaction: Transaction): Promise<void> {
    const { triggeredRule, recentCount } = await this.evaluateRules(transaction);

    if (!triggeredRule) {
      // No rules triggered — transaction is clean
      return;
    }

    console.log(
      `[FraudService] Transaction ${transaction.id} triggered rule: ${triggeredRule}`
    );

    // Mark transaction as FLAGGED
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: TransactionStatus.FLAGGED },
    });

    // Call Claude for AI analysis, with graceful fallback
    let riskScore = 75;
    let reason = `Rule triggered: ${triggeredRule}`;
    let aiAnalysis = `Fallback analysis: ${triggeredRule} — Claude API unavailable`;

    try {
      const claudeResult = await this.callClaude(transaction, recentCount, triggeredRule);
      riskScore = claudeResult.riskScore;
      reason = claudeResult.reason;
      aiAnalysis = JSON.stringify(claudeResult);
    } catch (err) {
      console.error('[FraudService] Claude API call failed, using fallback:', err);
    }

    // Store the FraudFlag
    await prisma.fraudFlag.create({
      data: {
        transactionId: transaction.id,
        riskScore,
        reason,
        aiAnalysis,
      },
    });

    console.log(
      `[FraudService] FraudFlag created for transaction ${transaction.id} | riskScore=${riskScore}`
    );
  }

  /**
   * Evaluate the three fraud detection rules.
   * Returns the first triggered rule name (or null) and the recent TX count.
   */
  private async evaluateRules(
    transaction: Transaction
  ): Promise<{ triggeredRule: string | null; recentCount: number }> {
    const now = new Date();
    let triggeredRule: string | null = null;
    let recentCount = 0;

    // Rule 1: Large amount threshold
    if (new Decimal(transaction.amount).gt(LARGE_AMOUNT_THRESHOLD)) {
      triggeredRule = 'LARGE_AMOUNT';
    }

    // Rule 2: High velocity — sender made > 5 transactions in last 60 seconds
    const sixtySecondsAgo = new Date(now.getTime() - HIGH_VELOCITY_WINDOW_MS);
    recentCount = await prisma.transaction.count({
      where: {
        senderId: transaction.senderId,
        createdAt: { gte: sixtySecondsAgo },
      },
    });

    if (recentCount > HIGH_VELOCITY_COUNT) {
      triggeredRule = triggeredRule ?? 'HIGH_VELOCITY';
    }

    // Rule 3: Duplicate receiver — same sender→receiver within 30 seconds
    if (!triggeredRule) {
      const thirtySecondsAgo = new Date(now.getTime() - DUPLICATE_RECEIVER_WINDOW_MS);
      const duplicateCount = await prisma.transaction.count({
        where: {
          senderId: transaction.senderId,
          receiverId: transaction.receiverId,
          createdAt: { gte: thirtySecondsAgo },
        },
      });

      if (duplicateCount >= 2) {
        triggeredRule = 'DUPLICATE_RECEIVER';
      }
    }

    return { triggeredRule, recentCount };
  }

  /**
   * Calls Claude claude-3-haiku-20240307 for AI fraud analysis.
   * Returns a structured ClaudeAnalysis object.
   */
  private async callClaude(
    transaction: Transaction,
    recentCount: number,
    triggeredRule: string
  ): Promise<ClaudeAnalysis> {
    const prompt = `You are a fraud detection AI for a fintech platform. Analyze this transaction and return a JSON object with: riskScore (0-100 integer), reason (one sentence), recommendation (one of: BLOCK, REVIEW, ALLOW). Transaction details: amount: ${transaction.amount} KES, sender history: ${recentCount} transactions in last 60 seconds, receiver: ${transaction.receiverId}, rule triggered: ${triggeredRule}. Return ONLY valid JSON, no markdown, no explanation.`;

    const message = await this.client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const rawText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse JSON — may throw, caller handles the fallback
    const parsed = JSON.parse(rawText) as ClaudeAnalysis;

    // Validate shape
    if (
      typeof parsed.riskScore !== 'number' ||
      typeof parsed.reason !== 'string' ||
      !['BLOCK', 'REVIEW', 'ALLOW'].includes(parsed.recommendation)
    ) {
      throw new Error('Claude returned invalid analysis shape');
    }

    // Clamp riskScore to 0-100
    parsed.riskScore = Math.min(100, Math.max(0, Math.round(parsed.riskScore)));

    return parsed;
  }
}

export const fraudService = new FraudService();
