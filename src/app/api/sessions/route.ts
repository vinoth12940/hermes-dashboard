import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getHermesHome } from '@/lib/api-utils';
import path from 'path';
import Database from 'better-sqlite3';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const home = getHermesHome();
    const dbPath = path.join(home, 'state.db');
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '50'));
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0'));

    const fs = require('fs');
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ sessions: [], total: 0 });
    }

    const db = new Database(dbPath, { readonly: true });

    let query = 'SELECT id, title, source, model, started_at, message_count, input_tokens, output_tokens FROM sessions';
    let countQuery = 'SELECT COUNT(*) as total FROM sessions';

    if (search) {
      const safeSearch = search.replace(/'/g, "''");
      query += ` WHERE title LIKE '%${safeSearch}%' OR source LIKE '%${safeSearch}%' OR model LIKE '%${safeSearch}%'`;
      countQuery += ` WHERE title LIKE '%${safeSearch}%' OR source LIKE '%${safeSearch}%' OR model LIKE '%${safeSearch}%'`;
    }

    query += ` ORDER BY started_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const sessions = db.prepare(query).all();
    const countResult = db.prepare(countQuery).get() as { total: number };
    db.close();

    // Transform to frontend-friendly format
    const transformed = (sessions as any[]).map(s => ({
      id: s.id,
      title: s.title || `Session ${s.id.slice(-8)}`,
      source: s.source,
      model: s.model,
      started_at: s.started_at ? new Date(s.started_at * 1000).toISOString() : null,
      message_count: s.message_count || 0,
      input_tokens: s.input_tokens || 0,
      output_tokens: s.output_tokens || 0,
    }));

    return NextResponse.json({ sessions: transformed, total: countResult?.total || 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
