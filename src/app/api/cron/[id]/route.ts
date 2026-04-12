import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-utils';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const CRON_STATE_FILE = '/tmp/hermes-cron-state.json';

interface CronJob {
  id: string;
  expression: string;
  command: string;
  description?: string;
  enabled: boolean;
  createdAt: string;
  lastRun?: string;
  lastStatus?: string;
}

interface CronRunResult {
  timestamp: string;
  exitCode: number;
  output: string;
  duration: number;
}

async function readCronState(): Promise<Record<string, CronJob & { runHistory: CronRunResult[] }>> {
  try {
    const content = await fs.readFile(CRON_STATE_FILE, 'utf8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function writeCronState(state: Record<string, CronJob & { runHistory: CronRunResult[] }>): Promise<void> {
  await fs.writeFile(CRON_STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function getCurrentCrontab(): string {
  try {
    return execSync('crontab -l 2>/dev/null', { encoding: 'utf8', timeout: 10000 });
  } catch {
    return '';
  }
}

function setCrontab(content: string): void {
  execSync(`echo '${content.replace(/'/g, "'\\''")}' | crontab -`, { encoding: 'utf8', timeout: 10000 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const state = await readCronState();
    const job = state[id];

    if (!job) {
      return NextResponse.json({ error: `Cron job ${id} not found` }, { status: 404 });
    }

    // Get last 5 run results
    const runHistory = (job.runHistory || []).slice(-5);

    // Check if job exists in actual crontab
    const crontab = getCurrentCrontab();
    const inCrontab = crontab.includes(job.command);

    return NextResponse.json({
      ...job,
      inCrontab,
      runHistory,
    });
  } catch (error: any) {
    console.error('Error fetching cron job:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const { action } = await request.json();
    const state = await readCronState();
    const job = state[id];

    if (!job) {
      return NextResponse.json({ error: `Cron job ${id} not found` }, { status: 404 });
    }

    switch (action) {
      case 'run': {
        // Execute the job command immediately
        const startTime = Date.now();
        let output = '';
        let exitCode = 0;
        try {
          output = execSync(job.command, { encoding: 'utf8', timeout: 30000 });
        } catch (e: any) {
          output = e.stdout || e.message || '';
          exitCode = e.status || 1;
        }
        const duration = Date.now() - startTime;

        // Record run result
        const runResult: CronRunResult = {
          timestamp: new Date().toISOString(),
          exitCode,
          output: output.substring(0, 10000), // Truncate large output
          duration,
        };

        job.lastRun = runResult.timestamp;
        job.lastStatus = exitCode === 0 ? 'success' : 'failed';
        job.runHistory = [...(job.runHistory || []), runResult].slice(-20); // Keep last 20
        state[id] = job;
        await writeCronState(state);

        return NextResponse.json({
          success: true,
          exitCode,
          duration,
          output: output.substring(0, 2000),
        });
      }

      case 'pause': {
        if (!job.enabled) {
          return NextResponse.json({ error: 'Job is already paused' }, { status: 400 });
        }
        // Remove from crontab
        try {
          const crontab = getCurrentCrontab();
          const lines = crontab.split('\n').filter(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('#') || !trimmed) return true;
            return !trimmed.includes(job.command);
          });
          setCrontab(lines.join('\n'));
        } catch (e: any) {
          console.error('Failed to remove from crontab:', e);
        }

        job.enabled = false;
        state[id] = job;
        await writeCronState(state);

        return NextResponse.json({ success: true, message: `Job ${id} paused` });
      }

      case 'resume': {
        if (job.enabled) {
          return NextResponse.json({ error: 'Job is already running' }, { status: 400 });
        }
        // Add back to crontab
        try {
          const crontab = getCurrentCrontab();
          const newLine = `${job.expression} ${job.command} # hermes-cron:${id}`;
          setCrontab(crontab.trimEnd() + '\n' + newLine + '\n');
        } catch (e: any) {
          console.error('Failed to add to crontab:', e);
        }

        job.enabled = true;
        state[id] = job;
        await writeCronState(state);

        return NextResponse.json({ success: true, message: `Job ${id} resumed` });
      }

      case 'delete': {
        // Remove from crontab if present
        try {
          const crontab = getCurrentCrontab();
          const lines = crontab.split('\n').filter(line => !line.includes(job.command));
          setCrontab(lines.join('\n'));
        } catch (e: any) {
          console.error('Failed to remove from crontab:', e);
        }

        delete state[id];
        await writeCronState(state);

        return NextResponse.json({ success: true, message: `Job ${id} deleted` });
      }

      default:
        return NextResponse.json({ error: `Invalid action: ${action}. Must be: run, pause, resume, delete` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in cron job action:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const updates = await request.json();
    const state = await readCronState();
    const job = state[id];

    if (!job) {
      return NextResponse.json({ error: `Cron job ${id} not found` }, { status: 404 });
    }

    // Update allowed fields
    const allowedFields = ['expression', 'command', 'description'];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        (job as any)[field] = updates[field];
      }
    }

    // Validate expression format (basic check: 5 fields)
    if (updates.expression) {
      const parts = updates.expression.trim().split(/\s+/);
      if (parts.length < 5) {
        return NextResponse.json({ error: 'Invalid cron expression. Must have at least 5 fields.' }, { status: 400 });
      }
    }

    // Update crontab if job is enabled
    if (job.enabled && (updates.expression || updates.command)) {
      try {
        const crontab = getCurrentCrontab();
        // Remove old entry
        const lines = crontab.split('\n').filter(line => !line.includes(state[id].command) && !line.includes(`hermes-cron:${id}`));
        // Add updated entry
        const newLine = `${job.expression} ${job.command} # hermes-cron:${id}`;
        setCrontab(lines.join('\n').trimEnd() + '\n' + newLine + '\n');
      } catch (e: any) {
        console.error('Failed to update crontab:', e);
      }
    }

    state[id] = job;
    await writeCronState(state);

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    console.error('Error updating cron job:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
