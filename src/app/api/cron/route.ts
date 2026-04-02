import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getHermesHome } from '@/lib/api-utils';
import fs from 'fs';
import path from 'path';

const HISTORY_PATH = '/tmp/hermes-cron-history.json';
const MAX_HISTORY_PER_JOB = 5;

function loadHistory(): Record<string, Array<{ timestamp: string; success: boolean }>> {
  try {
    if (fs.existsSync(HISTORY_PATH)) {
      return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
    }
  } catch {}
  return {};
}

function saveHistory(history: Record<string, Array<{ timestamp: string; success: boolean }>>) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf8');
}

function addRunHistory(jobId: string, success: boolean) {
  const history = loadHistory();
  if (!history[jobId]) history[jobId] = [];
  history[jobId].unshift({ timestamp: new Date().toISOString(), success });
  history[jobId] = history[jobId].slice(0, MAX_HISTORY_PER_JOB);
  saveHistory(history);
}

function loadJobs(home: string): any[] {
  const cronDbPath = path.join(home, 'cron', 'jobs.json');
  if (fs.existsSync(cronDbPath)) {
    const content = fs.readFileSync(cronDbPath, 'utf8');
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : (Array.isArray(data?.jobs) ? data.jobs : []);
  }
  return [];
}

function saveJobs(home: string, jobs: any[]) {
  const cronDir = path.join(home, 'cron');
  if (!fs.existsSync(cronDir)) fs.mkdirSync(cronDir, { recursive: true });
  const cronDbPath = path.join(cronDir, 'jobs.json');
  fs.writeFileSync(cronDbPath, JSON.stringify({ jobs, updated_at: new Date().toISOString() }, null, 2), 'utf8');
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const home = getHermesHome();
    const jobs = loadJobs(home);
    const history = loadHistory();

    const jobsWithHistory = jobs.map((job: any) => ({
      ...job,
      history: history[job.id] || [],
    }));

    return NextResponse.json({ jobs: jobsWithHistory });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { action, jobId, job } = body;
    const home = getHermesHome();

    switch (action) {
      case 'run': {
        const jobs = loadJobs(home);
        const target = jobs.find((j: any) => j.id === jobId);
        if (!target) {
          return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        try {
          const { execSync } = require('child_process');
          execSync(`hermes cron run ${jobId}`, { timeout: 60000, encoding: 'utf8' });
          addRunHistory(jobId, true);
          try {
            const { logAudit } = await import('@/app/api/audit/route');
            logAudit('cron_action', `job:${jobId}`, `Triggered job "${target.name || jobId}"`);
          } catch {}
          return NextResponse.json({ message: `Job "${target.name || jobId}" triggered successfully` });
        } catch (runError: any) {
          addRunHistory(jobId, false);
          return NextResponse.json({ message: `Job "${target.name || jobId}" triggered (check logs for errors)`, error: runError.message });
        }
      }

      case 'create': {
        if (!job || !job.name || !job.schedule) {
          return NextResponse.json({ error: 'name and schedule are required' }, { status: 400 });
        }
        const jobs = loadJobs(home);
        const newJob = {
          id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: job.name,
          schedule: typeof job.schedule === 'string' ? job.schedule : job.schedule,
          prompt: job.prompt || '',
          deliver: job.deliver || '',
          model: job.model || '',
          provider: job.provider || '',
          skills: job.skills || [],
          enabled: true,
          state: 'scheduled',
          created_at: new Date().toISOString(),
          last_run_at: null,
          next_run_at: null,
          last_status: null,
          last_error: null,
        };
        jobs.push(newJob);
        saveJobs(home, jobs);
        try {
          const { logAudit } = await import('@/app/api/audit/route');
          logAudit('cron_action', `job:${newJob.id}`, `Created job "${newJob.name}"`);
        } catch {}
        return NextResponse.json({ message: 'Job created', job: newJob });
      }

      case 'update': {
        if (!jobId || !job) {
          return NextResponse.json({ error: 'jobId and job data are required' }, { status: 400 });
        }
        const jobs = loadJobs(home);
        const idx = jobs.findIndex((j: any) => j.id === jobId);
        if (idx === -1) {
          return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        const updates: any = {};
        if (job.name !== undefined) updates.name = job.name;
        if (job.schedule !== undefined) updates.schedule = job.schedule;
        if (job.prompt !== undefined) updates.prompt = job.prompt;
        if (job.deliver !== undefined) updates.deliver = job.deliver;
        if (job.enabled !== undefined) updates.enabled = job.enabled;
        jobs[idx] = { ...jobs[idx], ...updates };
        saveJobs(home, jobs);
        try {
          const { logAudit } = await import('@/app/api/audit/route');
          logAudit('cron_action', `job:${jobId}`, `Updated job "${jobs[idx].name}"`);
        } catch {}
        return NextResponse.json({ message: 'Job updated', job: jobs[idx] });
      }

      case 'delete': {
        const jobs = loadJobs(home);
        const filtered = jobs.filter((j: any) => j.id !== jobId);
        if (filtered.length === jobs.length) {
          return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        saveJobs(home, filtered);
        try {
          const { logAudit } = await import('@/app/api/audit/route');
          logAudit('cron_action', `job:${jobId}`, 'Deleted job');
        } catch {}
        return NextResponse.json({ message: 'Job deleted' });
      }

      case 'pause': {
        const jobs = loadJobs(home);
        const target = jobs.find((j: any) => j.id === jobId);
        if (!target) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        target.enabled = false;
        target.paused_at = new Date().toISOString();
        saveJobs(home, jobs);
        return NextResponse.json({ message: 'Job paused' });
      }

      case 'resume': {
        const jobs = loadJobs(home);
        const target = jobs.find((j: any) => j.id === jobId);
        if (!target) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        target.enabled = true;
        delete target.paused_at;
        saveJobs(home, jobs);
        return NextResponse.json({ message: 'Job resumed' });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
