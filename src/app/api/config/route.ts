import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getHermesHome, safePath } from '@/lib/api-utils';
import fs from 'fs/promises';
import path from 'path';

const KNOWN_MODEL_PATTERNS: RegExp[] = [
  /^gpt-4o(-mini)?$/i,
  /^gpt-4(-turbo)?$/i,
  /^gpt-3\.5-turbo$/i,
  /^o[134](-mini)?$/i,
  /^claude-3(\.\d)?-(opus|sonnet|haiku)$/i,
  /^claude-3-5-sonnet(-\d{4})?$/i,
  /^claude-4(-\w+)?$/i,
  /^glm-[34]\.\d/,
  /^glm-5-turbo$/i,
  /^deepseek-(chat|reasoner|coder)$/i,
  /^gemini-\d+(\.\d)?-(flash|pro)$/i,
  /^llama-3(\.\d)?-(8b|70b|405b)$/i,
  /^mistral-(large|medium|small|tiny)$/i,
  /^mixtral-\d+x\d+b$/i,
  /^qwen[\d.]*-$/i,
  /^yi-(large|medium|small)$/i,
  /^phi-\d$/i,
  /^command-r(\+)?$/i,
];

function isLikelyValidModel(model: string): boolean {
  if (!model || typeof model !== 'string' || model.trim() === '') return false;
  return KNOWN_MODEL_PATTERNS.some(p => p.test(model.trim()));
}

function collectWarnings(obj: any, warnings: string[], prefix: string = '') {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      if (typeof item === 'object' && item !== null) {
        collectWarnings(item, warnings, `${prefix}[${i}]`);
      }
    });
    return;
  }
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    // CRITICAL: api_key set to empty string '' overrides env vars
    if (key === 'api_key' && typeof value === 'string') {
      if (value === '' || value === '""' || value === "''") {
        warnings.push(`⚠️ CRITICAL: Empty api_key at "${fullKey}" — this OVERRIDES environment variables and causes silent auth failures!`);
      } else if (value.length < 8 && value.length > 0) {
        warnings.push(`⚠️ Suspiciously short api_key at "${fullKey}" (${value.length} chars) — verify it's correct`);
      }
    }

    // Model validation
    if (key === 'model' && typeof value === 'string') {
      if (value.trim() === '') {
        warnings.push(`Empty model field at "${fullKey}" — must specify a model`);
      } else if (!isLikelyValidModel(value)) {
        warnings.push(`Unrecognized model "${value}" at "${fullKey}" — verify spelling (known: gpt-4o, claude-3.5-sonnet, glm-5-turbo, deepseek-chat, gemini-2.0-flash, etc.)`);
      }
    }

    // base_url validation for providers
    if (key === 'base_url') {
      if (value === undefined || value === null || value === '') {
        if (prefix.toLowerCase().includes('provider')) {
          warnings.push(`Missing base_url for provider at "${prefix}" — required for most API providers`);
        }
      } else if (typeof value === 'string' && !value.startsWith('http')) {
        warnings.push(`Invalid base_url at "${fullKey}" — must start with http:// or https://`);
      }
    }

    // Check for duplicate provider keys
    if (key === 'providers' && typeof value === 'object' && !Array.isArray(value)) {
      const providerKeys = Object.keys(value);
      const seen = new Set<string>();
      for (const pk of providerKeys) {
        const normalized = pk.toLowerCase();
        if (seen.has(normalized)) {
          warnings.push(`Duplicate provider "${pk}" detected — only one entry per provider name is used`);
        }
        seen.add(normalized);
      }
    }

    // Validate schedule expressions
    if (key === 'schedule' && typeof value === 'string') {
      const validPatterns = [
        /^every \d+ (min|minute|hour|hr|day)s?$/i,
        /^\d+min$/i,
        /^\d+h$/i,
        /^(\*|\d+|\d+\/\d+)\s+(\*|\d+|\d+\/\d+)\s+(\*|\d+|\d+\/\d+)\s+(\*|\d+|\d+\/\d+)\s+(\*|\d+|\d+\/\d+)$/,
        /^@(hourly|daily|weekly|monthly|yearly|midnight|reboot)$/i,
      ];
      const isValid = validPatterns.some(p => p.test(value.trim()));
      if (!isValid) {
        warnings.push(`Potentially invalid schedule "${value}" at "${fullKey}" — should be cron format (e.g. "0 9 * * *"), human format (e.g. "every 30 min"), or interval (e.g. "30m")`);
      }
    }

    if (typeof value === 'object' && value !== null) {
      collectWarnings(value, warnings, fullKey);
    }
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const home = getHermesHome();
    const configPath = path.join(home, 'config.yaml');
    const content = await fs.readFile(configPath, 'utf8');

    let config: Record<string, any>;
    try {
      const yaml = require('js-yaml');
      config = yaml.load(content, { schema: yaml.FAILSAFE_SCHEMA });
    } catch (yamlError: any) {
      const safeContent = content
        .replace(/!![a-zA-Z]+/g, '')
        .replace(/&[a-zA-Z0-9]+/g, '')
        .replace(/\*[a-zA-Z0-9]+/g, '')
        .replace(/\|$/gm, '')
        .replace(/>$/gm, '');

      const yaml = require('js-yaml');
      config = yaml.load(safeContent, { schema: yaml.FAILSAFE_SCHEMA });
    }

    const maskKeys = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(maskKeys);
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' &&
            (key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) &&
            value.length > 4) {
          result[key] = value.slice(0, 4) + '•'.repeat(Math.max(0, Math.min(value.length - 8, 20))) + (value.length > 8 ? value.slice(-4) : '');
        } else if (typeof value === 'object' && value !== null) {
          result[key] = maskKeys(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return NextResponse.json({ config: maskKeys(config), raw: content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const { raw, validateOnly } = await request.json();
    const home = getHermesHome();
    const configPath = path.join(home, 'config.yaml');

    if (validateOnly) {
      try {
        const yaml = require('js-yaml');
        const parsed = yaml.load(raw);
        const warnings: string[] = [];
        const errors: string[] = [];

        if (parsed && typeof parsed === 'object') {
          collectWarnings(parsed, warnings);
        }

        // Check for critical warnings separately
        const criticalWarnings = warnings.filter(w => w.includes('CRITICAL'));
        const regularWarnings = warnings.filter(w => !w.includes('CRITICAL'));

        return NextResponse.json({
          valid: criticalWarnings.length === 0,
          errors: criticalWarnings,
          warnings: regularWarnings,
          error: criticalWarnings.length > 0 ? criticalWarnings.join('\n') : undefined,
        });
      } catch (yamlError: any) {
        return NextResponse.json({ valid: false, error: `YAML parse error: ${yamlError.message}` });
      }
    }

    await fs.writeFile(configPath, raw, 'utf8');

    try {
      const { logAudit } = await import('@/app/api/audit/route');
      logAudit('config_updated', 'config.yaml', 'Configuration updated via dashboard');
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
