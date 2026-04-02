import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-utils';
import fs from 'fs';

const AUDIT_PATH = '/tmp/hermes-audit.json';
const MAX_ENTRIES = 1000;

function loadEntries(): any[] {
  try {
    if (fs.existsSync(AUDIT_PATH)) {
      return JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    }
  } catch {}
  return [];
}

function saveEntries(entries: any[]) {
  const dir = '/tmp';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(AUDIT_PATH, JSON.stringify(entries.slice(-MAX_ENTRIES), null, 2), 'utf8');
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const actionFilter = url.searchParams.get('action') || '';
    const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '100'));

    let entries = loadEntries();

    if (actionFilter) {
      entries = entries.filter((e: any) => e.action === actionFilter);
    }

    entries = entries.slice(-limit).reverse();

    return NextResponse.json({ entries });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { action, target, details } = body;

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    const entry = {
      timestamp: new Date().toISOString(),
      action,
      target: target || '',
      details: details || '',
      user: auth.payload?.username || 'unknown',
    };

    const entries = loadEntries();
    entries.push(entry);
    saveEntries(entries);

    return NextResponse.json({ success: true, entry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export function logAudit(action: string, target: string, details: string) {
  try {
    const entries = loadEntries();
    entries.push({
      timestamp: new Date().toISOString(),
      action,
      target,
      details,
      user: 'system',
    });
    saveEntries(entries);
  } catch {}
}
