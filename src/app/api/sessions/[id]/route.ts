import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getHermesHome } from '@/lib/api-utils';
import { execSync } from 'child_process';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const home = getHermesHome();
    const dbPath = path.join(home, 'sessions.db');
    const safeId = id.replace(/'/g, "''");

    if (!require('fs').existsSync(dbPath)) {
      return NextResponse.json({ messages: [] });
    }

    const messages = JSON.parse(
      execSync(`sqlite3 -json "${dbPath}" "SELECT role, content, tool_calls, timestamp FROM messages WHERE session_id='${safeId}' ORDER BY timestamp"`, 
        { encoding: 'utf8' }
      ).trim() || '[]'
    );

    return NextResponse.json({ messages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
