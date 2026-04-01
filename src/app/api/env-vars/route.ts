import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getHermesHome } from '@/lib/api-utils';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const home = getHermesHome();
    const envPath = path.join(home, '.env');
    let content = '';
    try {
      content = await fs.readFile(envPath, 'utf8');
    } catch {
      // .env doesn't exist yet
    }

    const vars: Array<{ key: string; value: string; category: string }> = [];
    const comments: Array<string> = [];
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.startsWith('#')) {
        comments.push(trimmed);
        return;
      }
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) return;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      let category = 'other';
      const k = key.toUpperCase();
      if (k.includes('ANTHROPIC') || k.includes('OPENAI') || k.includes('GOOGLE') || k.includes('GEMINI') || k.includes('ZAI') || k.includes('Z_AI') || k.includes('GLM')) category = 'provider';
      else if (k.includes('TELEGRAM') || k.includes('DISCORD') || k.includes('SLACK') || k.includes('WHATSAPP') || k.includes('SIGNAL')) category = 'messaging';
      else if (k.includes('FIRECRAWL') || k.includes('BROWSER') || k.includes('PARALLEL') || k.includes('BROWSERBASE')) category = 'tools';
      else if (k.includes('SMTP') || k.includes('EMAIL') || k.includes('IMAP') || k.includes('HIMALAYA')) category = 'email';
      else if (k.includes('STT') || k.includes('TTS') || k.includes('VOICE') || k.includes('WHISPER') || k.includes('EDGE')) category = 'voice';
      vars.push({ key, value, category });
    });

    return NextResponse.json({ vars, raw: content, comments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const { raw } = await request.json();
    const home = getHermesHome();
    const envPath = path.join(home, '.env');
    await fs.writeFile(envPath, raw, 'utf8');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
