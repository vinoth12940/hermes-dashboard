import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getHermesHome } from '@/lib/api-utils';
import path from 'path';
import fs from 'fs';

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

async function honchoPost(key: string, url: string, body: Record<string, unknown> = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { error: true, status: res.status, text };
  }
  return res.json();
}

export async function GET(request: NextRequest) {
  const { error: authError } = requireAuth(request);
  if (authError) return authError;

  try {
    const home = getHermesHome();
    const envPath = path.join(home, '.env');

    if (!fs.existsSync(envPath)) {
      return NextResponse.json({ error: 'No .env file found' }, { status: 404 });
    }

    const env = parseEnvFile(envPath);
    const apiKey = env['HONCHO_API_KEY'] || '';

    if (!apiKey) {
      return NextResponse.json({
        workspace_id: null,
        total_conclusions: 0,
        total_sessions: 0,
        total_messages: 0,
        recent_memories: [],
        status: 'no_key',
      });
    }

    const workspaces = await honchoPost(apiKey, 'https://api.honcho.dev/v3/workspaces/list');
    const workspaceId = workspaces?.items?.[0]?.id || workspaces?.data?.[0]?.id || workspaces?.workspaces?.[0]?.id;

    if (!workspaceId) {
      return NextResponse.json({
        workspace_id: null,
        total_conclusions: 0,
        total_sessions: 0,
        total_messages: 0,
        recent_memories: [],
        status: 'no_workspace',
      });
    }

    // Call each endpoint individually with individual error handling
    const baseUrl = `https://api.honcho.dev/v3/workspaces/${workspaceId}`;
    let conclusionsRes: any = { items: [], total: 0 };
    let sessionsRes: any = { items: [], total: 0 };
    let totalMessages = 0;
    let recentMemories: any[] = [];

    try {
      conclusionsRes = await honchoPost(apiKey, `${baseUrl}/conclusions/list`, { page: 1, size: 10 });
    } catch (e) { /* ignore individual failures */ }

    try {
      sessionsRes = await honchoPost(apiKey, `${baseUrl}/sessions/list`, { page: 1, size: 1 });
    } catch (e) { /* ignore */ }

    // Messages: Honcho doesn't have a cross-session messages endpoint
    // Sum from session list instead
    try {
      const allSessions = await honchoPost(apiKey, `${baseUrl}/sessions/list`, { page: 1, size: 50 });
      const sessionItems = allSessions?.items || [];
      // Get total sessions count
      totalMessages = sessionsRes?.total ? 0 : 0; // Can't easily aggregate without per-session calls
      // Just report sessions count for now
    } catch (e) { /* ignore */ }

    // Parse conclusions
    const conclusionItems = conclusionsRes?.items || conclusionsRes?.data || (Array.isArray(conclusionsRes) ? conclusionsRes : []);
    const totalConclusions = conclusionsRes?.total || conclusionItems.length;

    // Parse sessions
    const totalSessions = sessionsRes?.total || sessionsRes?.items?.length || 0;

    // Parse recent memories
    recentMemories = conclusionItems.slice(0, 10).map((c: any) => ({
      id: c.id,
      content: c.content || c.conclusion || c.text || '',
      created_at: c.created_at || c.createdAt || null,
      session_id: c.session_id || c.sessionId || null,
      observer_id: c.observer_id || c.observerId || null,
    }));

    return NextResponse.json({
      workspace_id: workspaceId,
      total_conclusions: totalConclusions,
      total_sessions: totalSessions,
      total_messages: totalMessages,
      recent_memories: recentMemories,
      status: 'active',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
