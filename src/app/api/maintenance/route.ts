import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-utils';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

function getHermesHome(): string {
  return process.env.HERMES_HOME || path.join(process.env.HOME || '/root', '.hermes');
}

function getDiskBreakdown() {
  try {
    const output = execSync("df -h --output=target,size,used,avail,pcent -x tmpfs -x devtmpfs 2>/dev/null", { encoding: 'utf8', timeout: 10000 });
    const lines = output.trim().split('\n').slice(1);
    return lines.map(line => {
      const parts = line.trim().split(/\s+/);
      return {
        mount: parts[0] || '',
        size: parts[1] || '',
        used: parts[2] || '',
        available: parts[3] || '',
        percent: parts[4] || '',
      };
    });
  } catch (e) {
    console.error('Error getting disk breakdown:', e);
    return [];
  }
}

function getMemoryBreakdown() {
  try {
    const output = execSync('free -h', { encoding: 'utf8', timeout: 10000 });
    const lines = output.trim().split('\n');
    const memParts = lines[1].split(/\s+/).filter(Boolean);
    const swapParts = lines[2] ? lines[2].split(/\s+/).filter(Boolean) : [];

    return {
      memory: {
        total: memParts[1] || '0',
        used: memParts[2] || '0',
        free: memParts[3] || '0',
        available: memParts[6] || memParts[3] || '0',
        cached: memParts[5] || '0',
      },
      swap: swapParts.length > 0 ? {
        total: swapParts[1] || '0',
        used: swapParts[2] || '0',
        free: swapParts[3] || '0',
      } : null,
    };
  } catch (e) {
    console.error('Error getting memory breakdown:', e);
    return { memory: {}, swap: null };
  }
}

async function getLogSizes() {
  const logPaths = [
    { name: 'hermes-gateway', path: '/var/log/hermes-gateway.log' },
    { name: 'hermes-dashboard', path: '/var/log/hermes-dashboard.log' },
    { name: 'journal-hermes', path: 'journal:hermes-gateway' },
    { name: 'syslog', path: '/var/log/syslog' },
    { name: 'auth', path: '/var/log/auth.log' },
    { name: 'cloudflared', path: '/var/log/cloudflared.log' },
  ];

  const sizes = [];
  for (const entry of logPaths) {
    if (entry.path.startsWith('journal:')) {
      try {
        const output = execSync(`journalctl -u ${entry.path.split(':')[1]} --disk-usage 2>/dev/null`, { encoding: 'utf8', timeout: 10000 }).trim();
        sizes.push({ name: entry.name, size: output });
      } catch {
        sizes.push({ name: entry.name, size: '0', error: 'not found' });
      }
    } else {
      try {
        const stat = await fs.stat(entry.path);
        sizes.push({ name: entry.name, size: formatBytes(stat.size) });
      } catch {
        sizes.push({ name: entry.name, size: '0', error: 'not found' });
      }
    }
  }
  return sizes;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

async function getMaintenanceLog(): Promise<Array<{ timestamp: string; action: string; status: string; message: string }>> {
  const logPath = path.join(getHermesHome(), 'maintenance.log');
  try {
    const content = await fs.readFile(logPath, 'utf8');
    return content
      .trim()
      .split('\n')
      .filter(Boolean)
      .slice(-50)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { timestamp: '', action: 'unknown', status: 'error', message: line };
        }
      });
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    // Get last update check time
    let lastUpdateCheck = 'never';
    try {
      const updateFile = path.join(getHermesHome(), 'last-update-check');
      lastUpdateCheck = (await fs.readFile(updateFile, 'utf8')).trim();
    } catch {}

    // Get current hermes version
    let currentVersion = 'unknown';
    try {
      const hermesBin = process.env.HOME + '/.local/bin/hermes';
      currentVersion = execSync(`${hermesBin} --version 2>/dev/null | head -1`, { encoding: 'utf8', timeout: 10000 }).trim();
    } catch {}

    return NextResponse.json({
      lastUpdateCheck,
      currentVersion,
      disk: getDiskBreakdown(),
      memory: getMemoryBreakdown(),
      logSizes: await getLogSizes(),
      maintenanceLog: await getMaintenanceLog(),
    });
  } catch (error: any) {
    console.error('Error fetching maintenance status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const { action } = await request.json();
    const home = getHermesHome();
    const logPath = path.join(home, 'maintenance.log');

    const logEntry = (a: string, status: string, message: string) => ({
      timestamp: new Date().toISOString(),
      action: a,
      status,
      message,
    });

    const appendLog = async (entry: any) => {
      await fs.appendFile(logPath, JSON.stringify(entry) + '\n');
      return entry;
    };

    switch (action) {
      case 'check-update': {
        let message = '';
        try {
          const hermesBin = process.env.HOME + '/.local/bin/hermes';
          message = execSync(`${hermesBin} update --check 2>&1 || true`, { encoding: 'utf8', timeout: 10000 }).trim();
          await fs.writeFile(path.join(home, 'last-update-check'), new Date().toISOString());
        } catch (e: any) {
          message = e.message;
        }
        return NextResponse.json({ success: true, message, log: await appendLog(logEntry('check-update', 'success', message)) });
      }

      case 'update': {
        try {
          const hermesBin = process.env.HOME + '/.local/bin/hermes';
          const output = execSync(`${hermesBin} update 2>&1`, { encoding: 'utf8', timeout: 60000 });
          return NextResponse.json({ success: true, message: output.trim(), log: await appendLog(logEntry('update', 'success', 'Updated successfully')) });
        } catch (e: any) {
          await appendLog(logEntry('update', 'error', e.message));
          return NextResponse.json({ error: `Update failed: ${e.message}` }, { status: 500 });
        }
      }

      case 'cleanup': {
        const cleaned: string[] = [];
        try {
          // Clean old journal logs (>7 days)
          execSync('sudo journalctl --vacuum-time=7d 2>&1', { encoding: 'utf8', timeout: 10000 });
          cleaned.push('Journal logs vacuumed (7d retention)');
        } catch (e: any) {
          cleaned.push(`Journal cleanup: ${e.message}`);
        }

        try {
          // Clean apt cache
          execSync('sudo apt-get clean 2>&1', { encoding: 'utf8', timeout: 10000 });
          cleaned.push('APT cache cleaned');
        } catch (e: any) {
          cleaned.push(`APT cleanup: ${e.message}`);
        }

        try {
          // Clean old .tmp/.bak files in hermes home
          const tmpFiles = execSync(`find ${home} -name "*.tmp" -o -name "*.bak" -o -name "*.old" 2>/dev/null | head -50`, { encoding: 'utf8', timeout: 10000 }).trim();
          if (tmpFiles) {
            execSync(`find ${home} -name "*.tmp" -o -name "*.bak" -o -name "*.old" -delete 2>/dev/null`, { encoding: 'utf8', timeout: 10000 });
            cleaned.push(`Cleaned temp files in ${home}`);
          }
        } catch (e: any) {
          cleaned.push(`Temp file cleanup: ${e.message}`);
        }

        try {
          // Clean npm cache
          execSync('npm cache clean --force 2>&1', { encoding: 'utf8', timeout: 10000 });
          cleaned.push('npm cache cleaned');
        } catch (e: any) {
          cleaned.push(`npm cache cleanup: ${e.message}`);
        }

        return NextResponse.json({ success: true, cleaned, log: await appendLog(logEntry('cleanup', 'success', cleaned.join('; '))) });
      }

      case 'rotate-logs': {
        const rotated: string[] = [];
        try {
          // Rotate hermes logs
          const logFiles = ['/var/log/hermes-gateway.log', '/var/log/hermes-dashboard.log', '/var/log/cloudflared.log'];
          for (const logFile of logFiles) {
            try {
              execSync(`sudo truncate -s 0 ${logFile} 2>/dev/null`, { encoding: 'utf8', timeout: 5000 });
              rotated.push(logFile);
            } catch {}
          }
          // Rotate journal
          try {
            execSync('sudo systemctl rotate hermes-gateway 2>&1 || sudo journalctl --rotate 2>&1', { encoding: 'utf8', timeout: 10000 });
            rotated.push('journal rotated');
          } catch {}
        } catch (e: any) {
          rotated.push(`Error: ${e.message}`);
        }
        return NextResponse.json({ success: true, rotated, log: await appendLog(logEntry('rotate-logs', 'success', rotated.join(', '))) });
      }

      default:
        return NextResponse.json({ error: `Invalid action: ${action}. Must be: check-update, update, cleanup, rotate-logs` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in maintenance action:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
