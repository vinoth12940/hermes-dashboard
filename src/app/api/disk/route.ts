import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-utils';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

interface DirEntry {
  path: string;
  size: number;
  sizeFormatted: string;
}

function getTopDirectories(): DirEntry[] {
  try {
    // Get top 20 largest directories under /
    const output = execSync(
      'sudo du -sh /* 2>/dev/null | sort -rh | head -20',
      { encoding: 'utf8', timeout: 10000 }
    );
    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const match = line.trim().match(/^([\d.]+[KMGT]?B?)\s+(.+)$/);
        if (match) {
          return { path: match[2], size: 0, sizeFormatted: match[1] };
        }
        return null;
      })
      .filter(Boolean) as DirEntry[];
  } catch (e) {
    console.error('Error getting top directories:', e);
    return [];
  }
}

function getDiskUsageByType() {
  const types: Array<{ type: string; description: string; size?: string }> = [];

  // Docker images & containers
  try {
    const output = execSync('docker system df 2>/dev/null | head -5', { encoding: 'utf8', timeout: 10000 }).trim();
    if (output) {
      types.push({ type: 'docker', description: 'Docker (images, containers, volumes)', size: output.split('\n')[1]?.trim()?.split(/\s+/)[2] || 'unknown' });
    }
  } catch {}

  // Node modules
  try {
    const output = execSync("find /home -name 'node_modules' -type d -prune 2>/dev/null | head -20 | while read d; do du -sh \"$d\" 2>/dev/null; done | awk '{sum+=$1} END {print sum}'", { encoding: 'utf8', timeout: 10000 }).trim();
    if (output && !isNaN(parseFloat(output))) {
      types.push({ type: 'node_modules', description: 'Node.js node_modules directories', size: formatBytes(parseFloat(output) * 1024 * 1024) });
    }
  } catch {}

  // Log files
  try {
    const output = execSync("find /var/log -type f -exec du -b {} + 2>/dev/null | awk '{sum+=$1} END {print sum}'", { encoding: 'utf8', timeout: 10000 }).trim();
    if (output) {
      types.push({ type: 'logs', description: 'Log files in /var/log', size: formatBytes(parseInt(output) || 0) });
    }
  } catch {}

  // APT cache
  try {
    const output = execSync("du -sb /var/cache/apt 2>/dev/null | awk '{print $1}'", { encoding: 'utf8', timeout: 10000 }).trim();
    if (output) {
      types.push({ type: 'apt_cache', description: 'APT package cache', size: formatBytes(parseInt(output) || 0) });
    }
  } catch {}

  // Journal logs
  try {
    const output = execSync('journalctl --disk-usage 2>/dev/null', { encoding: 'utf8', timeout: 10000 }).trim();
    if (output) {
      types.push({ type: 'journal', description: 'Systemd journal logs', size: output });
    }
  } catch {}

  // Hermes home
  try {
    const hermesHome = process.env.HERMES_HOME || path.join(process.env.HOME || '/root', '.hermes');
    const output = execSync(`du -sb ${hermesHome} 2>/dev/null | awk '{print $1}'`, { encoding: 'utf8', timeout: 10000 }).trim();
    if (output) {
      types.push({ type: 'hermes', description: 'Hermes configuration & data', size: formatBytes(parseInt(output) || 0) });
    }
  } catch {}

  // Temp files
  try {
    const output = execSync("find /tmp -type f -exec du -b {} + 2>/dev/null | awk '{sum+=$1} END {print sum}'", { encoding: 'utf8', timeout: 10000 }).trim();
    if (output && parseInt(output) > 0) {
      types.push({ type: 'temp', description: 'Temporary files in /tmp', size: formatBytes(parseInt(output) || 0) });
    }
  } catch {}

  return types;
}

function getOverallDiskUsage() {
  try {
    const output = execSync("df -h --output=target,size,used,avail,pcent 2>/dev/null", { encoding: 'utf8', timeout: 10000 });
    const lines = output.trim().split('\n').slice(1);
    return lines.map(line => {
      const parts = line.trim().split(/\s+/);
      return {
        mount: parts[0],
        size: parts[1],
        used: parts[2],
        available: parts[3],
        percent: parts[4],
      };
    });
  } catch (e) {
    console.error('Error getting disk usage:', e);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    return NextResponse.json({
      overall: getOverallDiskUsage(),
      topDirectories: getTopDirectories(),
      usageByType: getDiskUsageByType(),
    });
  } catch (error: any) {
    console.error('Error fetching disk info:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const { action } = await request.json();

    if (action !== 'cleanup') {
      return NextResponse.json({ error: 'Invalid action. Must be: cleanup' }, { status: 400 });
    }

    const results: string[] = [];

    // Clean old journal logs
    try {
      const output = execSync('sudo journalctl --vacuum-time=3d 2>&1', { encoding: 'utf8', timeout: 10000 });
      results.push(`Journal: ${output.trim()}`);
    } catch (e: any) {
      results.push(`Journal: failed - ${e.message}`);
    }

    // Clean /tmp files older than 3 days
    try {
      execSync('sudo find /tmp -type f -atime +3 -delete 2>/dev/null', { encoding: 'utf8', timeout: 10000 });
      results.push('Temp files older than 3 days deleted');
    } catch (e: any) {
      results.push(`Temp cleanup: failed - ${e.message}`);
    }

    // Clean apt cache
    try {
      execSync('sudo apt-get clean 2>&1', { encoding: 'utf8', timeout: 10000 });
      results.push('APT cache cleaned');
    } catch (e: any) {
      results.push(`APT cleanup: failed - ${e.message}`);
    }

    // Clean old .log files > 10MB in /var/log
    try {
      const oldLogs = execSync("sudo find /var/log -name '*.log' -size +10M -exec truncate -s 0 {} \\; 2>/dev/null; echo 'done'", { encoding: 'utf8', timeout: 10000 }).trim();
      results.push(`Large log files truncated: ${oldLogs}`);
    } catch (e: any) {
      results.push(`Log truncation: failed - ${e.message}`);
    }

    // Clean old hermes temp files
    try {
      const hermesHome = process.env.HERMES_HOME || path.join(process.env.HOME || '/root', '.hermes');
      const tmpCount = execSync(`find ${hermesHome} -name "*.tmp" -o -name "*.bak" -o -name "*.old" 2>/dev/null | wc -l`, { encoding: 'utf8', timeout: 10000 }).trim();
      if (parseInt(tmpCount) > 0) {
        execSync(`find ${hermesHome} -name "*.tmp" -o -name "*.bak" -o -name "*.old" -delete 2>/dev/null`, { encoding: 'utf8', timeout: 10000 });
        results.push(`Hermes temp files cleaned: ${tmpCount} files`);
      }
    } catch (e: any) {
      results.push(`Hermes temp cleanup: failed - ${e.message}`);
    }

    // Clean docker if available
    try {
      const dockerOutput = execSync('docker system prune -af --volumes 2>&1', { encoding: 'utf8', timeout: 30000 });
      results.push(`Docker prune: completed`);
    } catch {
      results.push('Docker prune: not available');
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Error in disk cleanup:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
