import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import path from 'path';
import fs from 'fs/promises';
import { execSync } from 'child_process';

export function getHermesHome(): string {
  return process.env.HERMES_HOME || path.join(process.env.HOME || '/root', '.hermes');
}

export async function requireAuth(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const { verifyToken: vt } = await import('@/lib/auth');
  const payload = await vt(token);
  if (!payload) {
    return { error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) };
  }
  return { payload };
}

// Blocklist of dangerous system directories that should never be accessed
const BLOCKED_PREFIXES = ['/proc', '/sys', '/dev'];

export function safePath(basePath: string, requestedPath: string): string {
  const resolved = path.resolve(basePath || '/', requestedPath || '.');
  if (!resolved.startsWith(basePath || '/')) {
    throw new Error('Path traversal blocked');
  }
  // Block dangerous system dirs
  for (const blocked of BLOCKED_PREFIXES) {
    if (resolved === blocked || resolved.startsWith(blocked + '/')) {
      throw new Error('Access to system directory blocked');
    }
  }
  return resolved;
}

// Strict path — must stay within hermesHome (for write operations)
export function strictPath(hermesHome: string, requestedPath: string): string {
  const resolved = path.resolve(hermesHome, requestedPath || '.');
  if (!resolved.startsWith(hermesHome)) {
    throw new Error('Path traversal blocked');
  }
  return resolved;
}

export function getSystemStats() {
  try {
    const memInfo = execSync('free -b', { encoding: 'utf8' });
    const memLines = memInfo.split('\n');
    const memValues = memLines[1].split(/\s+/).filter(Boolean);
    const memTotal = parseInt(memValues[1]);
    const memUsed = parseInt(memValues[2]);
    const memPercent = Math.round((memUsed / memTotal) * 100);

    const diskInfo = execSync("df -B1 / | tail -1", { encoding: 'utf8' });
    const diskValues = diskInfo.split(/\s+/).filter(Boolean);
    const diskTotal = parseInt(diskValues[1]);
    const diskUsed = parseInt(diskValues[2]);
    const diskPercent = Math.round((diskUsed / diskTotal) * 100);

    const uptime = execSync('cat /proc/uptime', { encoding: 'utf8' }).trim().split(' ')[0];
    const uptimeDays = Math.floor(parseFloat(uptime) / 86400);
    const uptimeHours = Math.floor((parseFloat(uptime) % 86400) / 3600);

    const loadAvg = execSync('cat /proc/loadavg', { encoding: 'utf8' }).trim().split(' ');
    const cpuPercent = Math.min(100, Math.round((parseFloat(loadAvg[0]) / 2) * 100));

    let gatewayStatus = 'unknown';
    try {
      gatewayStatus = execSync('systemctl is-active hermes-gateway 2>/dev/null', { encoding: 'utf8' }).trim();
    } catch {}

    let hermesVersion = 'unknown';
    try {
      const hermesBin = process.env.HOME + '/.local/bin/hermes';
      hermesVersion = execSync(`${hermesBin} --version 2>/dev/null | head -1`, { encoding: 'utf8' }).trim();
    } catch {}

    const hostname = require('os').hostname();
    const cpus = require('os').cpus().length;

    return {
      cpu: { percent: cpuPercent, cores: cpus, loadAvg: parseFloat(loadAvg[0]) },
      memory: { total: memTotal, used: memUsed, percent: memPercent },
      disk: { total: diskTotal, used: diskUsed, percent: diskPercent },
      uptime: { days: uptimeDays, hours: uptimeHours, raw: parseFloat(uptime) },
      gateway: { status: gatewayStatus },
      hermes: { version: hermesVersion },
      hostname,
    };
  } catch (error) {
    console.error('Error getting system stats:', error);
    throw error;
  }
}
