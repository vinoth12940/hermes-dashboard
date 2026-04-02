import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getHermesHome } from '@/lib/api-utils';
import path from 'path';
import Database from 'better-sqlite3';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const home = getHermesHome();
    const dbPath = path.join(home, 'state.db');
    const fs = require('fs');

    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ messages: [] });
    }

    const db = new Database(dbPath, { readonly: true });
    const safeId = id.replace(/'/g, "''");

    const rows = db.prepare(
      `SELECT role, content, tool_calls, tool_name, timestamp, reasoning
       FROM messages
       WHERE session_id = ?
       ORDER BY timestamp ASC`
    ).all(safeId) as any[];

    db.close();

    const messages = rows.map(row => ({
      role: row.role,
      content: row.content || '',
      tool_calls: row.tool_calls || null,
      tool_name: row.tool_name || null,
      timestamp: row.timestamp ? new Date(row.timestamp * 1000).toISOString() : null,
      reasoning: row.reasoning || null,
    }));

    return NextResponse.json({ messages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
