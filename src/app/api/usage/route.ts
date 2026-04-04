import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getHermesHome } from '@/lib/api-utils';
import path from 'path';
import Database from 'better-sqlite3';

const PRICING: Record<string, { input: number; output: number }> = {
  'glm-5-turbo': { input: 1.20, output: 0.24 },
  'glm-5': { input: 1.00, output: 0.20 },
  'glm-4.7-flashx': { input: 0.07, output: 0.01 },
};

const DEFAULT_PRICING = { input: 1.00, output: 0.20 };

function getPricing(model: string | null) {
  if (!model) return DEFAULT_PRICING;
  for (const [key, price] of Object.entries(PRICING)) {
    if (model.includes(key)) return price;
  }
  return DEFAULT_PRICING;
}

function calcCost(inputTokens: number, outputTokens: number, model: string | null) {
  const p = getPricing(model);
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const home = getHermesHome();
    const dbPath = path.join(home, 'state.db');
    const fs = require('fs');

    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({
        lifetime: { totalInputTokens: 0, totalOutputTokens: 0, totalCacheReadTokens: 0, totalCacheWriteTokens: 0, totalReasoningTokens: 0, totalSessions: 0, sessionsWithTokens: 0, estimatedCost: 0 },
        daily: [],
        providers: [],
        topSessions: [],
      });
    }

    const db = new Database(dbPath, { readonly: true });

    const lifetime = db.prepare(`
      SELECT
        COALESCE(SUM(input_tokens), 0) as totalInputTokens,
        COALESCE(SUM(output_tokens), 0) as totalOutputTokens,
        COALESCE(SUM(cache_read_tokens), 0) as totalCacheReadTokens,
        COALESCE(SUM(cache_write_tokens), 0) as totalCacheWriteTokens,
        COALESCE(SUM(reasoning_tokens), 0) as totalReasoningTokens,
        COUNT(*) as totalSessions,
        COUNT(CASE WHEN input_tokens > 0 OR output_tokens > 0 THEN 1 END) as sessionsWithTokens
      FROM sessions
    `).get() as any;

    const sessionsForCost = db.prepare(`
      SELECT input_tokens, output_tokens, model FROM sessions
    `).all() as any[];

    let estimatedCost = 0;
    for (const s of sessionsForCost) {
      estimatedCost += calcCost(s.input_tokens || 0, s.output_tokens || 0, s.model || null);
    }

    lifetime.estimatedCost = Math.round(estimatedCost * 100) / 100;

    const daily = db.prepare(`
      SELECT
        date(started_at, 'unixepoch') as day,
        COALESCE(SUM(input_tokens), 0) as inputTokens,
        COALESCE(SUM(output_tokens), 0) as outputTokens,
        COALESCE(SUM(estimated_cost_usd), 0) as estimatedCost,
        COUNT(*) as sessions
      FROM sessions
      WHERE started_at > strftime('%s', 'now', '-30 days')
      GROUP BY day
      ORDER BY day
    `).all() as any[];

    const providers = db.prepare(`
      SELECT
        COALESCE(billing_provider, 'unknown') as provider,
        COUNT(*) as sessions,
        COALESCE(SUM(input_tokens), 0) as inputTokens,
        COALESCE(SUM(output_tokens), 0) as outputTokens
      FROM sessions
      GROUP BY billing_provider
      ORDER BY sessions DESC
    `).all() as any[];

    for (const p of providers) {
      const providerSessions = db.prepare(`
        SELECT input_tokens, output_tokens, model FROM sessions WHERE billing_provider = ?
      `).all(p.provider) as any[];
      let cost = 0;
      for (const s of providerSessions) {
        cost += calcCost(s.input_tokens || 0, s.output_tokens || 0, s.model || null);
      }
      p.estimatedCost = Math.round(cost * 100) / 100;
    }

    const topSessions = db.prepare(`
      SELECT
        id, title, model, billing_provider,
        COALESCE(input_tokens, 0) as inputTokens,
        COALESCE(output_tokens, 0) as outputTokens
      FROM sessions
      ORDER BY inputTokens DESC
      LIMIT 10
    `).all() as any[];

    for (const s of topSessions) {
      s.estimatedCost = Math.round(calcCost(s.inputTokens, s.outputTokens, s.model || null) * 100) / 100;
    }

    db.close();

    return NextResponse.json({ lifetime, daily, providers, topSessions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
