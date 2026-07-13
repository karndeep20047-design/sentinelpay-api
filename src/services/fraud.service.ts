import { Transaction, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../utils/prisma';

interface AiAnalysis {
  riskScore: number;
  reason: string;
  recommendation: 'BLOCK' | 'REVIEW' | 'ALLOW';
}

const LARGE_AMOUNT_THRESHOLD = new Decimal(100000); // 100,000 KES
const HIGH_VELOCITY_COUNT = 5;        // transactions
const HIGH_VELOCITY_WINDOW_MS = 60_000; // 60 seconds
const DUPLICATE_RECEIVER_WINDOW_MS = 30_000; // 30 seconds

export class FraudService {
  constructor() {}

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

    // Call Gemini for AI analysis, with graceful fallback
    let riskScore = 75;
    let reason = `Rule triggered: ${triggeredRule}`;
    let aiAnalysis = `Fallback analysis: ${triggeredRule} — Gemini API unavailable`;

    try {
      const geminiResult = await this.callGemini(transaction, recentCount, triggeredRule);
      riskScore = geminiResult.riskScore;
      reason = geminiResult.reason;
      aiAnalysis = JSON.stringify(geminiResult);
    } catch (err) {
      console.error('[FraudService] Gemini API call failed, using fallback:', err);
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
   * Calls Gemini gemini-1.5-flash for AI fraud analysis.
   * Returns a structured AiAnalysis object.
   */
  private async callGemini(
    transaction: Transaction,
    recentCount: number,
    triggeredRule: string
  ): Promise<AiAnalysis> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`;

    const prompt = `You are a fraud detection AI for a fintech platform. Analyze this transaction and return a JSON object with: riskScore (0-100 integer), reason (one sentence), recommendation (one of: BLOCK, REVIEW, ALLOW). Transaction details: amount: ${transaction.amount} KES, sender history: ${recentCount} transactions in last 60 seconds, receiver: ${transaction.receiverId}, rule triggered: ${triggeredRule}. Return ONLY valid JSON, no markdown, no explanation.`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API returned error status ${response.status}: ${errorText}`);
    }

    const result = (await response.json()) as any;
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Gemini returned an empty or invalid response structure');
    }

    // Parse JSON — may throw, caller handles the fallback
    const parsed = JSON.parse(rawText.trim()) as AiAnalysis;

    // Validate shape
    if (
      typeof parsed.riskScore !== 'number' ||
      typeof parsed.reason !== 'string' ||
      !['BLOCK', 'REVIEW', 'ALLOW'].includes(parsed.recommendation)
    ) {
      throw new Error('Gemini returned invalid analysis shape');
    }

    // Clamp riskScore to 0-100
    parsed.riskScore = Math.min(100, Math.max(0, Math.round(parsed.riskScore)));

    return parsed;
  }
}

export const fraudService = new FraudService();
