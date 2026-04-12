import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getHermesHome } from '@/lib/api-utils';
import path from 'path';
import Database from 'better-sqlite3';
import fs from 'fs';

// Official Z.AI pricing (per 1M tokens) from https://docs.z.ai/guides/overview/pricing
const PRICING: Record<string, { input: number; cachedInput: number; output: number }> = {
  'glm-5-code':         { input: 1.20, cachedInput: 0.30, output: 5.00 },
  'glm-5-turbo':       { input: 1.20, cachedInput: 0.24, output: 4.00 },
  'glm-5':             { input: 1.00, cachedInput: 0.20, output: 3.20 },
  'glm-4.7-flashx':    { input: 0.07, cachedInput: 0.01, output: 0.40 },
  'glm-4.7-flash':     { input: 0,    cachedInput: 0,    output: 0 },    // Free
  'glm-4.7':           { input: 0.60, cachedInput: 0.11, output: 2.20 },
  'glm-4.6':           { input: 0.60, cachedInput: 0.11, output: 2.20 },
  'glm-4.5-x':         { input: 2.20, cachedInput: 0.45, output: 8.90 },
  'glm-4.5-airx':      { input: 1.10, cachedInput: 0.22, output: 4.50 },
  'glm-4.5-air':       { input: 0.20, cachedInput: 0.03, output: 1.10 },
  'glm-4.5-flash':     { input: 0,    cachedInput: 0,    output: 0 },    // Free
  'glm-4.5':           { input: 0.60, cachedInput: 0.11, output: 2.20 },
  'glm-4-32b':         { input: 0.10, cachedInput: 0,    output: 0.10 },
  // Vision
  'glm-4.6v-flashx':   { input: 0.04, cachedInput: 0.004, output: 0.40 },
  'glm-4.6v-flash':    { input: 0,    cachedInput: 0,    output: 0 },    // Free
  'glm-4.6v':          { input: 0.30, cachedInput: 0.05, output: 0.90 },
  'glm-4.5v':          { input: 0.60, cachedInput: 0.11, output: 1.80 },
};

const DEFAULT_PRICING = { input: 1.00, cachedInput: 0.20, output: 3.20 };

function getPricing(model: string | null) {
  if (!model) return DEFAULT_PRICING;
  const m = model.toLowerCase();
  // Try longest match first (glm-5-turbo before glm-5)
  const sorted = Object.entries(PRICING).sort((a, b) => b[0].length - a[0].length);
  for (const [key, price] of sorted) {
    if (m.includes(key)) return price;
  }
  return DEFAULT_PRICING;
}

function calcCost(inputTokens: number, outputTokens: number, model: string | null) {
  const p = getPricing(model);
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

function parseEnvFile(filePath: string): Record<string, string> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const env: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function fetchZAIAccount() {
  try {
    const home = getHermesHome();
    const env = parseEnvFile(path.join(home, '.env'));
    const apiKey = env['ZAI_API_KEY'] || env['Z_AI_API_KEY'] || '';
    if (!apiKey) return null;

    const resp = await fetch('https://api.z.ai/api/monitor/usage/quota/limit', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'hermes-agent/1.0',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.data || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { error: authError } = await requireAuth(request);
  if (authError) return authError;

  try {
    const home = getHermesHome();
    const dbPath = path.join(home, 'state.db');

    // Fetch Z.AI account info in parallel with DB queries
    const [zaiAccount] = await Promise.all([fetchZAIAccount()]);

    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({
        zai: zaiAccount,
        lifetime: { totalInputTokens: 0, totalOutputTokens: 0, totalCacheReadTokens: 0, totalCacheWriteTokens: 0, totalReasoningTokens: 0, totalSessions: 0, sessionsWithTokens: 0, estimatedCost: 0 },
        daily: [],
        providers: [],
        topSessions: [],
        pricing: PRICING,
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

    // Add calculated daily cost
    for (const d of daily) {
      const daySessions = sessionsForCost.filter(s => {
        if (!s.input_tokens && !s.output_tokens) return false;
        return true; // approximate
      });
      d.calculatedCost = calcCost(d.inputTokens, d.outputTokens, 'glm-5-turbo');
    }

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

    // Model breakdown
    const models = db.prepare(`
      SELECT
        COALESCE(model, 'unknown') as model,
        COUNT(*) as sessions,
        COALESCE(SUM(input_tokens), 0) as inputTokens,
        COALESCE(SUM(output_tokens), 0) as outputTokens
      FROM sessions
      WHERE input_tokens > 0 OR output_tokens > 0
      GROUP BY model
      ORDER BY inputTokens DESC
    `).all() as any[];

    for (const m of models) {
      const pricing = getPricing(m.model);
      m.pricingInput = pricing.input;
      m.pricingOutput = pricing.output;
      m.estimatedCost = Math.round(calcCost(m.inputTokens, m.outputTokens, m.model) * 100) / 100;
    }

    db.close();

    return NextResponse.json({
      zai: zaiAccount,
      lifetime,
      daily,
      providers,
      models,
      topSessions,
      pricing: PRICING,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
