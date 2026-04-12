import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getHermesHome } from '@/lib/api-utils';
import fs from 'fs';
import path from 'path';

interface PlatformStatus {
  name: string;
  enabled: boolean;
  connected: boolean;
  lastActivity?: string;
  error?: string;
}

const PLATFORM_NAMES: Record<string, { label: string; keywords: string[]; envVars: string[] }> = {
  telegram: { label: 'Telegram', keywords: ['telegram', '[Telegram]'], envVars: ['TELEGRAM_BOT_TOKEN'] },
  discord: { label: 'Discord', keywords: ['discord', '[Discord]'], envVars: ['DISCORD_BOT_TOKEN', 'DISCORD_TOKEN'] },
  slack: { label: 'Slack', keywords: ['slack', '[Slack]'], envVars: ['SLACK_BOT_TOKEN', 'SLACK_TOKEN'] },
  whatsapp: { label: 'WhatsApp', keywords: ['whatsapp', '[WhatsApp]'], envVars: ['WHATSAPP_TOKEN', 'WHATSAPP_BOT_TOKEN'] },
  signal: { label: 'Signal', keywords: ['signal', '[Signal]'], envVars: ['SIGNAL_PHONE_NUMBER', 'SIGNAL_UUID'] },
  homeassistant: { label: 'Home Assistant', keywords: ['homeassistant', 'home_assistant', '[HA]'], envVars: ['HA_TOKEN', 'HOMEASSISTANT_TOKEN'] },
};

function loadEnvFile(home: string): Record<string, string> {
  const env: Record<string, string> = {};
  const envPath = path.join(home, '.env');
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
        }
      }
    }
  } catch {}
  return env;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const home = getHermesHome();
    const configPath = path.join(home, 'config.yaml');

    let config: Record<string, any> = {};
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      const yaml = require('js-yaml');
      config = yaml.load(content, { schema: yaml.FAILSAFE_SCHEMA }) || {};
    } catch {}

    // Load env vars to detect platforms configured via environment
    const envVars = loadEnvFile(home);

    const logPath = path.join(home, 'logs', 'gateway.log');
    let logLines: string[] = [];
    try {
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf8');
        logLines = content.split('\n').slice(-500);
      }
    } catch {}

    const platforms: PlatformStatus[] = [];

    for (const [key, meta] of Object.entries(PLATFORM_NAMES)) {
      const platformConfig = config[key];
      // Platform is enabled if it has config in YAML OR has required env vars set
      const configEnabled = platformConfig !== null && platformConfig !== undefined;
      const envEnabled = meta.envVars.some(ev => {
        const val = envVars[ev] || process.env[ev];
        return val && val.length > 0;
      });
      const enabled = configEnabled || envEnabled;
      const keywords = meta.keywords;

      let connected = false;
      let lastActivity: string | undefined;
      let hasError = false;

      for (let i = logLines.length - 1; i >= 0; i--) {
        const line = logLines[i].toLowerCase();
        const matchesKeyword = keywords.some(k => line.includes(k.toLowerCase()));

        if (matchesKeyword) {
          if (!lastActivity) {
            const match = logLines[i].match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
            if (match) lastActivity = match[1];
          }

          if (line.includes('error') || line.includes('failed') || line.includes('disconnected')) {
            hasError = true;
          }
          if (line.includes('connected') || line.includes('sending') || line.includes('received') || line.includes('flush')) {
            connected = true;
          }
        }
      }

      platforms.push({
        name: meta.label,
        enabled,
        connected: enabled && connected,
        lastActivity,
        error: enabled && !connected ? (hasError ? 'Connection error' : 'No recent activity') : undefined,
      });
    }

    return NextResponse.json({ platforms });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const { action, platform } = await request.json();

    if (action === 'restart' && platform) {
      const validPlatform = Object.keys(PLATFORM_NAMES).find(
        k => k.toLowerCase() === platform.toLowerCase()
      );
      if (!validPlatform) {
        return NextResponse.json({ error: `Unknown platform: ${platform}` }, { status: 400 });
      }

      // Write a flag file that the maintenance script or gateway can pick up
      const flagDir = '/tmp/hermes-platform-restart-flags';
      if (!fs.existsSync(flagDir)) {
        fs.mkdirSync(flagDir, { recursive: true });
      }
      const flagFile = path.join(flagDir, `${validPlatform}.flag`);
      fs.writeFileSync(flagFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        requested_from: 'dashboard',
      }), 'utf8');

      // Log audit
      try {
        const { logAudit } = await import('@/app/api/audit/route');
        logAudit('platform_action', validPlatform, `Restart requested for ${PLATFORM_NAMES[validPlatform].label} via dashboard`);
      } catch {}

      return NextResponse.json({
        success: true,
        message: `Restart signal sent to ${PLATFORM_NAMES[validPlatform].label}. The gateway will reconnect this platform on next cycle.`,
      });
    }

    return NextResponse.json({ error: 'Unknown action. Supported: restart with platform name.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
