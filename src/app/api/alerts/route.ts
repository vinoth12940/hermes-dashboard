import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-utils';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const ALERTS_PATH = '/tmp/hermes-alerts.json';
const EVENTS_PATH = '/tmp/hermes-alert-events.json';
const QUEUE_PATH = '/tmp/hermes-alert-queue.json';

interface AlertRule {
  id: string;
  type: 'cpu' | 'memory' | 'gateway';
  condition: { threshold: number; operator: 'gt' | 'lt' };
  enabled: boolean;
  notifyTo: string;
  lastTriggered?: string;
}

interface AlertEvent {
  alertId: string;
  type: string;
  value: number;
  threshold: number;
  operator: string;
  triggeredAt: string;
  notifyTo: string;
}

function loadAlerts(): AlertRule[] {
  try {
    if (existsSync(ALERTS_PATH)) {
      return JSON.parse(readFileSync(ALERTS_PATH, 'utf8'));
    }
  } catch {}
  return [];
}

function saveAlerts(alerts: AlertRule[]) {
  writeFileSync(ALERTS_PATH, JSON.stringify(alerts, null, 2), 'utf8');
}

function loadEvents(): AlertEvent[] {
  try {
    if (existsSync(EVENTS_PATH)) {
      return JSON.parse(readFileSync(EVENTS_PATH, 'utf8'));
    }
  } catch {}
  return [];
}

function saveEvents(events: AlertEvent[]) {
  writeFileSync(EVENTS_PATH, JSON.stringify(events, null, 2), 'utf8');
}

function getSystemValue(type: string): number {
  try {
    if (type === 'cpu') {
      const loadAvg = execSync('cat /proc/loadavg', { encoding: 'utf8' }).trim().split(' ');
      return Math.min(100, Math.round((parseFloat(loadAvg[0]) / 2) * 100));
    }
    if (type === 'memory') {
      const memInfo = execSync('free -b', { encoding: 'utf8' });
      const memValues = memInfo.split('\n')[1].split(/\s+/).filter(Boolean);
      return Math.round((parseInt(memValues[2]) / parseInt(memValues[1])) * 100);
    }
    if (type === 'gateway') {
      const status = execSync('systemctl is-active hermes-gateway 2>/dev/null || true', { encoding: 'utf8' }).trim() || 'unknown';
      return status === 'active' ? 1 : 0;
    }
  } catch {}
  return 0;
}

function checkAlert(alert: AlertRule): AlertEvent | null {
  const value = getSystemValue(alert.type);
  const triggered = alert.condition.operator === 'gt' ? value > alert.condition.threshold : value < alert.condition.threshold;
  if (triggered) {
    const event: AlertEvent = {
      alertId: alert.id,
      type: alert.type,
      value,
      threshold: alert.condition.threshold,
      operator: alert.condition.operator,
      triggeredAt: new Date().toISOString(),
      notifyTo: alert.notifyTo,
    };
    const events = loadEvents();
    events.unshift(event);
    if (events.length > 100) events.length = 100;
    saveEvents(events);

    const queue: AlertEvent[] = existsSync(QUEUE_PATH) ? JSON.parse(readFileSync(QUEUE_PATH, 'utf8')) : [];
    queue.push(event);
    writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2), 'utf8');

    return event;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const alerts = loadAlerts();
    const events = loadEvents();
    return NextResponse.json({ alerts, events: events.slice(0, 50) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { action, alert } = body;
    const alerts = loadAlerts();

    switch (action) {
      case 'create': {
        if (!alert || !alert.type) {
          return NextResponse.json({ error: 'type is required' }, { status: 400 });
        }
        const threshold = alert.condition?.threshold ?? alert.threshold ?? 80;
        const operator = alert.condition?.operator ?? alert.operator ?? 'gt';
        const newAlert: AlertRule = {
          id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: alert.type,
          condition: { threshold, operator },
          enabled: alert.enabled !== undefined ? alert.enabled : true,
          notifyTo: alert.notifyTo || 'telegram',
        };
        alerts.push(newAlert);
        saveAlerts(alerts);
        try {
          const { logAudit } = await import('@/app/api/audit/route');
          logAudit('alert_created', newAlert.id, `Created ${newAlert.type} alert`);
        } catch {}
        return NextResponse.json({ message: 'Alert created', alert: newAlert });
      }

      case 'update': {
        if (!alert || !alert.id) {
          return NextResponse.json({ error: 'alert id is required' }, { status: 400 });
        }
        const idx = alerts.findIndex((a: AlertRule) => a.id === alert.id);
        if (idx === -1) {
          return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
        }
        alerts[idx] = { ...alerts[idx], ...alert };
        saveAlerts(alerts);
        try {
          const { logAudit } = await import('@/app/api/audit/route');
          logAudit('alert_updated', alert.id, `Updated alert`);
        } catch {}
        return NextResponse.json({ message: 'Alert updated', alert: alerts[idx] });
      }

      case 'delete': {
        if (!alert || !alert.id) {
          return NextResponse.json({ error: 'alert id is required' }, { status: 400 });
        }
        const filtered = alerts.filter((a: AlertRule) => a.id !== alert.id);
        saveAlerts(filtered);
        try {
          const { logAudit } = await import('@/app/api/audit/route');
          logAudit('alert_deleted', alert.id, 'Deleted alert');
        } catch {}
        return NextResponse.json({ message: 'Alert deleted' });
      }

      case 'test': {
        const activeAlerts = alerts.filter((a: AlertRule) => a.enabled);
        const results: Array<{ alertId: string; type: string; triggered: boolean; event?: AlertEvent }> = [];
        for (const a of activeAlerts) {
          const event = checkAlert(a);
          if (event) {
            const idx2 = alerts.findIndex((x: AlertRule) => x.id === a.id);
            if (idx2 !== -1) alerts[idx2].lastTriggered = event.triggeredAt;
            results.push({ alertId: a.id, type: a.type, triggered: true, event });
          } else {
            results.push({ alertId: a.id, type: a.type, triggered: false });
          }
        }
        saveAlerts(alerts);
        return NextResponse.json({ message: 'Test complete', results });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

let alertCheckerInterval: ReturnType<typeof setInterval> | null = null;

if (typeof globalThis !== 'undefined' && !alertCheckerInterval) {
  alertCheckerInterval = setInterval(() => {
    try {
      if (!existsSync(ALERTS_PATH)) return;
      const alerts: AlertRule[] = JSON.parse(readFileSync(ALERTS_PATH, 'utf8'));
      const active = alerts.filter((a) => a.enabled);
      if (active.length === 0) return;

      for (const a of active) {
        checkAlert(a);
      }
    } catch {}
  }, 30000);
}