import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getHermesHome } from '@/lib/api-utils';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const home = getHermesHome();
    const logsDir = path.join(home, 'logs');
    const url = new URL(request.url);
    const file = url.searchParams.get('file') || 'maintenance.log';
    const lines = parseInt(url.searchParams.get('lines') || '200');
    const search = url.searchParams.get('search') || '';
    const level = url.searchParams.get('level') || '';

    // List available log files
    const files = await fs.readdir(logsDir).catch(() => []);
    const logFiles = files.filter(f => f.endsWith('.log'));

    // Read requested file
    const filePath = path.join(logsDir, file);
    let content = '';
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch {
      content = 'Log file not found';
    }

    // Parse lines
    let logLines = content.split('\n').filter(Boolean);

    // Filter by level
    if (level) {
      const upperLevel = level.toUpperCase();
      logLines = logLines.filter((line: string) => line.toUpperCase().includes(upperLevel));
    }

    // Filter by search
    if (search) {
      const lowerSearch = search.toLowerCase();
      logLines = logLines.filter((line: string) => line.toLowerCase().includes(lowerSearch));
    }

    // Return last N lines
    const trimmed = logLines.slice(-lines);

    return NextResponse.json({ 
      files: logFiles,
      currentFile: file,
      lines: trimmed,
      totalLines: logLines.length,
      search,
      level,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const home = getHermesHome();
    const logsDir = path.join(home, 'logs');

    const files = await fs.readdir(logsDir).catch(() => []);
    const logFiles = files.filter(f => f.endsWith('.log'));

    let cleared = 0;
    let totalFreed = 0;

    for (const file of logFiles) {
      const filePath = path.join(logsDir, file);
      try {
        const stat = await fs.stat(filePath);
        totalFreed += stat.size;
        await fs.writeFile(filePath, `# Log cleared at ${new Date().toISOString()}\n`, 'utf8');
        cleared++;
      } catch {}
    }

    try {
      const { logAudit } = await import('@/app/api/audit/route');
      logAudit('logs_cleared', `freed_${totalFreed}`, `Cleared ${cleared} log files (${(totalFreed / 1024).toFixed(1)} KB freed)`);
    } catch {}

    return NextResponse.json({
      message: `Cleared ${cleared} log files`,
      freed: totalFreed,
      freedHuman: totalFreed > 1024 * 1024
        ? `${(totalFreed / (1024 * 1024)).toFixed(1)} MB`
        : `${(totalFreed / 1024).toFixed(1)} KB`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
