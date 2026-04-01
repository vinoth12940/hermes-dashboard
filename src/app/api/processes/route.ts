import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-utils';
import { execSync } from 'child_process';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const output = execSync('ps aux --no-headers', { encoding: 'utf8' });
    const lines = output.split('\n').filter(l => l.trim());
    const hermesLines = lines.filter(l =>
      l.includes('hermes') ||
      l.includes('gateway') ||
      l.includes('next-server') ||
      l.includes('caddy')
    );

    const processes = hermesLines.map(line => {
      const parts = line.trim().split(/\s+/);
      return {
        user: parts[0],
        pid: parseInt(parts[1]),
        cpu: parseFloat(parts[2]),
        mem: parseFloat(parts[3]),
        vsz: parseInt(parts[4]),
        rss: parseInt(parts[5]),
        stat: parts[7] || '?',
        start: parts[8] || '?',
        time: parts[9] || '?',
        command: parts.slice(10).join(' '),
      };
    });

    return NextResponse.json({ processes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const { action, pid } = await request.json();
    if (action === 'kill' && pid) {
      execSync(`kill ${pid}`, { encoding: 'utf8' });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
