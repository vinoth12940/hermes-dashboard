import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getHermesHome } from '@/lib/api-utils';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const home = getHermesHome();
    const cronDbPath = path.join(home, 'cron', 'jobs.json');

    if (fs.existsSync(cronDbPath)) {
      const content = fs.readFileSync(cronDbPath, 'utf8');
      const data = JSON.parse(content);
      // jobs.json has structure: { "jobs": [...], "updated_at": "..." }
      const jobs = Array.isArray(data) ? data : (Array.isArray(data?.jobs) ? data.jobs : []);
      return NextResponse.json({ jobs });
    }

    return NextResponse.json({ jobs: [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
