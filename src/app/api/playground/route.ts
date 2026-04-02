import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getHermesHome } from '@/lib/api-utils';
import fs from 'fs/promises';
import path from 'path';

function maskKey(value: string): string {
  if (value.length <= 8) return '••••••••';
  return value.slice(0, 4) + '••••••••' + value.slice(-4);
}

function parseEnvVars(content: string): Record<string, string> {
  const vars: Record<string, string> = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    // Strip quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      vars[key] = value.slice(1, -1);
    } else {
      vars[key] = value;
    }
  });
  return vars;
}

function findApiKey(providerName: string, envVars: Record<string, string>): string {
  const p = providerName.toLowerCase();
  // Direct name patterns
  const patterns = [
    `${p.toUpperCase()}_API_KEY`,
    `${p.toUpperCase()}_KEY`,
    `${p.replace(/[^a-z0-9]/g, '_').toUpperCase()}_API_KEY`,
    `${p.replace(/[^a-z0-9]/g, '_').toUpperCase()}_KEY`,
  ];
  for (const pattern of patterns) {
    if (envVars[pattern]) return envVars[pattern];
  }
  // Known provider aliases
  if (p === 'openai') return envVars['OPENAI_API_KEY'] || '';
  if (p === 'anthropic') return envVars['ANTHROPIC_API_KEY'] || '';
  if (p === 'google' || p === 'gemini') return envVars['GOOGLE_API_KEY'] || envVars['GEMINI_API_KEY'] || '';
  if (p === 'zai' || p === 'z_ai') return envVars['ZAI_API_KEY'] || envVars['Z_AI_API_KEY'] || '';
  if (p === 'glm') return envVars['GLM_API_KEY'] || '';
  if (p === 'groq') return envVars['GROQ_API_KEY'] || '';
  if (p === 'deepseek') return envVars['DEEPSEEK_API_KEY'] || '';
  if (p === 'openrouter') return envVars['OPENROUTER_API_KEY'] || '';
  if (p === 'fireworks') return envVars['FIREWORKS_API_KEY'] || '';
  if (p === 'together') return envVars['TOGETHER_API_KEY'] || '';
  return '';
}

interface ProviderInfo {
  name: string;
  models: string[];
  base_url: string;
  api_key_masked: string;
  is_main: boolean;
  role?: string;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const home = getHermesHome();
    const configPath = path.join(home, 'config.yaml');
    const envPath = path.join(home, '.env');

    let config: Record<string, any> = {};
    try {
      const content = await fs.readFile(configPath, 'utf8');
      const yaml = require('js-yaml');
      config = yaml.load(content, { schema: yaml.FAILSAFE_SCHEMA }) || {};
    } catch {}

    let envVars: Record<string, string> = {};
    try {
      const envContent = await fs.readFile(envPath, 'utf8');
      envVars = parseEnvVars(envContent);
    } catch {}

    const providersMap = new Map<string, ProviderInfo>();

    // 1. Main model from config.model
    const modelConfig = config.model;
    if (modelConfig && typeof modelConfig === 'object') {
      const mainProvider = modelConfig.provider || '';
      const mainModel = modelConfig.default || modelConfig.model || '';
      const mainBaseUrl = modelConfig.base_url || '';
      if (mainProvider && mainModel) {
        const apiKey = findApiKey(mainProvider, envVars);
        providersMap.set(mainProvider, {
          name: mainProvider,
          models: [mainModel],
          base_url: mainBaseUrl,
          api_key_masked: apiKey ? maskKey(apiKey) : '',
          is_main: true,
          role: 'Main Model',
        });
      }
    } else if (typeof modelConfig === 'string' && modelConfig) {
      // Fallback: config.model is a plain string
      const mainProvider = config.provider || '';
      if (mainProvider) {
        const apiKey = findApiKey(mainProvider, envVars);
        providersMap.set(mainProvider, {
          name: mainProvider,
          models: [modelConfig],
          base_url: '',
          api_key_masked: apiKey ? maskKey(apiKey) : '',
          is_main: true,
          role: 'Main Model',
        });
      }
    }

    // 2. Auxiliary entries (object format with named roles)
    const auxiliary = config.auxiliary;
    if (auxiliary && typeof auxiliary === 'object' && !Array.isArray(auxiliary)) {
      for (const [role, entry] of Object.entries(auxiliary)) {
        if (!entry || typeof entry !== 'object') continue;
        const e = entry as any;
        const name = e.provider || '';
        const mdl = e.model || '';
        const baseUrl = e.base_url || '';
        if (!name || !mdl) continue;

        const existing = providersMap.get(name);
        if (existing) {
          if (!existing.models.includes(mdl)) existing.models.push(mdl);
          if (baseUrl && !existing.base_url) existing.base_url = baseUrl;
          // Append role
          if (role) {
            existing.role = existing.role ? `${existing.role}, ${role}` : role;
          }
        } else {
          const apiKey = findApiKey(name, envVars);
          providersMap.set(name, {
            name,
            models: [mdl],
            base_url: baseUrl,
            api_key_masked: apiKey ? maskKey(apiKey) : '',
            is_main: false,
            role,
          });
        }
      }
    } else if (Array.isArray(auxiliary)) {
      // Array format (older config style)
      for (const entry of auxiliary) {
        if (!entry || typeof entry !== 'object') continue;
        const name = (entry as any).provider || (entry as any).name || '';
        const models = (entry as any).models || ((entry as any).model ? [(entry as any).model] : []);
        const baseUrl = (entry as any).base_url || (entry as any).baseUrl || '';
        if (!name) continue;

        const apiKey = findApiKey(name, envVars);
        const existing = providersMap.get(name);
        if (existing) {
          for (const m of (Array.isArray(models) ? models : [String(models)])) {
            if (!existing.models.includes(m)) existing.models.push(m);
          }
          if (baseUrl && !existing.base_url) existing.base_url = baseUrl;
          if (apiKey && !existing.api_key_masked) existing.api_key_masked = maskKey(apiKey);
        } else {
          providersMap.set(name, {
            name,
            models: Array.isArray(models) ? models : [String(models)],
            base_url: baseUrl,
            api_key_masked: apiKey ? maskKey(apiKey) : '',
            is_main: false,
          });
        }
      }
    }

    // 3. Scan .env for any additional API keys not yet covered
    const envProviderPatterns: Record<string, string[]> = {
      'OpenAI': ['OPENAI_API_KEY'],
      'Anthropic': ['ANTHROPIC_API_KEY'],
      'Google': ['GOOGLE_API_KEY', 'GEMINI_API_KEY'],
      'ZAI': ['ZAI_API_KEY', 'Z_AI_API_KEY', 'GLM_API_KEY'],
      'Groq': ['GROQ_API_KEY'],
      'DeepSeek': ['DEEPSEEK_API_KEY'],
      'OpenRouter': ['OPENROUTER_API_KEY'],
      'Fireworks': ['FIREWORKS_API_KEY'],
      'Together': ['TOGETHER_API_KEY'],
    };
    for (const [providerName, keys] of Object.entries(envProviderPatterns)) {
      const hasKey = keys.some(k => envVars[k] && envVars[k].length > 0);
      if (!hasKey) continue;
      // Check if already added via config
      const existing = Array.from(providersMap.values()).find(
        p => p.name.toLowerCase() === providerName.toLowerCase()
      );
      if (existing) {
        if (!existing.api_key_masked) {
          const key = keys.find(k => envVars[k]);
          if (key) existing.api_key_masked = maskKey(envVars[key]);
        }
      } else {
        // Provider has an API key but no config entry - add it as available
        const key = keys.find(k => envVars[k]);
        if (key) {
          providersMap.set(providerName.toLowerCase(), {
            name: providerName.toLowerCase(),
            models: [],
            base_url: providerName === 'Anthropic' ? 'https://api.anthropic.com'
              : providerName === 'Google' ? 'https://generativelanguage.googleapis.com'
              : providerName === 'Groq' ? 'https://api.groq.com/openai/v1'
              : providerName === 'DeepSeek' ? 'https://api.deepseek.com'
              : providerName === 'OpenRouter' ? 'https://openrouter.ai/api'
              : '',
            api_key_masked: maskKey(envVars[key]),
            is_main: false,
            role: 'Available (no config)',
          });
        }
      }
    }

    const providers = Array.from(providersMap.values());
    return NextResponse.json({ providers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { provider, model, base_url, api_key, message } = body;

    if (!provider || !model || !message) {
      return NextResponse.json({ error: 'Missing required fields: provider, model, message' }, { status: 400 });
    }

    const start = performance.now();
    const p = provider.toLowerCase();

    let url: string;
    let headers: Record<string, string>;
    let requestBody: Record<string, any>;

    if (p === 'anthropic') {
      const baseUrl = (base_url || 'https://api.anthropic.com').replace(/\/+$/, '');
      url = `${baseUrl}/v1/messages`;
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': api_key,
        'anthropic-version': '2023-06-01',
      };
      requestBody = {
        model,
        messages: [{ role: 'user', content: message }],
        max_tokens: 100,
      };
    } else {
      // OpenAI-compatible format (works for ZAI, Groq, DeepSeek, OpenRouter, etc.)
      const baseUrl = (base_url || (p === 'openai' ? 'https://api.openai.com' : '')).replace(/\/+$/, '');
      url = `${baseUrl}/v1/chat/completions`;
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api_key}`,
      };
      requestBody = {
        model,
        messages: [{ role: 'user', content: message }],
        max_tokens: 100,
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    const latency = performance.now() - start;

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {}
      return NextResponse.json({
        success: false,
        response: '',
        latency_ms: Math.round(latency),
        error: errorMessage,
      });
    }

    const data = await response.json();

    let responseText = '';
    if (p === 'anthropic') {
      if (data.content && Array.isArray(data.content)) {
        responseText = data.content.map((c: any) => c.text || '').join('');
      } else {
        responseText = JSON.stringify(data);
      }
    } else {
      responseText = data.choices?.[0]?.message?.content || JSON.stringify(data);
    }

    return NextResponse.json({
      success: true,
      response: responseText,
      latency_ms: Math.round(latency),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      response: '',
      latency_ms: 0,
      error: error.message,
    });
  }
}
