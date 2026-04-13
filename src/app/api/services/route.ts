import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-utils';
import { execSync } from 'child_process';

const SERVICES = ['hermes-gateway', 'hermes-dashboard', 'cloudflared-tunnel'];

function getServiceInfo(service: string) {
  try {
    const status = execSync(`systemctl is-active ${service} 2>/dev/null || true`, { encoding: 'utf8', timeout: 10000 }).trim() || 'unknown';
    const uptimeRaw = execSync(`systemctl show ${service} --property=ActiveEnterTimestamp --value 2>/dev/null || true`, { encoding: 'utf8', timeout: 10000 }).trim();

    // Get memory usage via cgroup or PID RSS
    let memoryBytes = 0;
    try {
      const pidOutput = execSync(`systemctl show ${service} --property=MainPID --value 2>/dev/null`, { encoding: 'utf8', timeout: 10000 }).trim();
      const pid = parseInt(pidOutput);
      if (pid > 0) {
        const rss = execSync(`cat /proc/${pid}/status 2>/dev/null | grep VmRSS`, { encoding: 'utf8', timeout: 10000 }).trim();
        const match = rss.match(/(\d+)\s*kB/);
        if (match) memoryBytes = parseInt(match[1]) * 1024;
      }
    } catch (e) {
      console.error(`Could not get memory for ${service}:`, e);
    }

    // Calculate uptime seconds from ActiveEnterTimestamp
    let uptimeSeconds = 0;
    try {
      const now = Date.now();
      const startTime = new Date(uptimeRaw).getTime();
      uptimeSeconds = Math.floor((now - startTime) / 1000);
    } catch (e) {
      console.error(`Could not parse uptime for ${service}:`, e);
    }

    const cpuPercent = execSync(`systemctl show ${service} --property=CPUUsageNSec --value 2>/dev/null || true`, { encoding: 'utf8', timeout: 10000 }).trim();

    return {
      service,
      status,
      uptime: uptimeRaw,
      uptimeSeconds,
      memoryBytes,
      cpuUsageNsec: cpuPercent ? parseInt(cpuPercent) : 0,
    };
  } catch (e) {
    console.error(`Error getting service info for ${service}:`, e);
    return {
      service,
      status: 'unknown',
      uptime: null,
      uptimeSeconds: 0,
      memoryBytes: 0,
      cpuUsageNsec: 0,
      error: 'Failed to retrieve service info',
    };
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const services = SERVICES.map(getServiceInfo);
    return NextResponse.json({ services });
  } catch (error: any) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const { action, service } = await request.json();

    if (!SERVICES.includes(service)) {
      return NextResponse.json({ error: `Invalid service. Must be one of: ${SERVICES.join(', ')}` }, { status: 400 });
    }

    if (!['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be: start, stop, restart' }, { status: 400 });
    }

    try {
      execSync(`sudo systemctl ${action} ${service}`, { encoding: 'utf8', timeout: 30000 });
    } catch (e: any) {
      console.error(`Failed to ${action} ${service}:`, e);
      return NextResponse.json({ error: `Failed to ${action} ${service}: ${e.message}` }, { status: 500 });
    }

    // Return updated status
    const updatedInfo = getServiceInfo(service);
    return NextResponse.json({ success: true, message: `${service} ${action}ed successfully`, service: updatedInfo });
  } catch (error: any) {
    console.error('Error in service action:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
