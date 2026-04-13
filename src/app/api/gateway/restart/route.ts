import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-utils';
import { execSync } from 'child_process';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    execSync('sudo systemctl restart hermes-gateway', { encoding: 'utf8' });
    return NextResponse.json({ success: true, message: 'Gateway restarted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to restart gateway: ' + error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const status = execSync('systemctl is-active hermes-gateway 2>/dev/null || true', { encoding: 'utf8' }).trim() || 'unknown';
    const uptime = execSync('systemctl show hermes-gateway --property=ActiveEnterTimestamp --value 2>/dev/null || true', { encoding: 'utf8' }).trim();
    return NextResponse.json({ status, since: uptime });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
