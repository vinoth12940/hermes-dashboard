import { NextResponse } from 'next/server';
import { requireAuth, getSystemStats } from '@/lib/api-utils';
import { NextRequest } from 'next/server';
import fs from 'fs';

declare global {
  // eslint-disable-next-line no-var
  var __hermesMetricsInterval: ReturnType<typeof setInterval> | undefined;
}

const METRICS_FILE = '/tmp/hermes-metrics.json';
const MAX_ENTRIES = 60;

interface MetricsEntry {
  time: string;
  cpu: number;
  memory: number;
  disk: number;
}

function readHistory(): MetricsEntry[] {
  try {
    const raw = fs.readFileSync(METRICS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeHistory(entries: MetricsEntry[]) {
  fs.writeFileSync(METRICS_FILE, JSON.stringify(entries, null, 2));
}

function collectMetrics() {
  try {
    const stats = getSystemStats();
    const entry: MetricsEntry = {
      time: new Date().toISOString(),
      cpu: stats.cpu.percent,
      memory: stats.memory.percent,
      disk: stats.disk.percent,
    };
    const history = [...readHistory(), entry].slice(-MAX_ENTRIES);
    writeHistory(history);
  } catch (err) {
    console.error('Metrics collection error:', err);
  }
}

if (typeof globalThis.__hermesMetricsInterval === 'undefined') {
  collectMetrics();
  globalThis.__hermesMetricsInterval = setInterval(collectMetrics, 5000);
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const stats = getSystemStats();
    const history = readHistory();
    return NextResponse.json({ ...stats, history });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
