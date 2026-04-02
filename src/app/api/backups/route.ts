import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getHermesHome } from '@/lib/api-utils';
import fs from 'fs/promises';
import path from 'path';

const BACKUPS_DIR_NAME = 'backups';

async function ensureBackupsDir(hermesHome: string): Promise<string> {
  const backupsDir = path.join(hermesHome, BACKUPS_DIR_NAME);
  await fs.mkdir(backupsDir, { recursive: true });
  return backupsDir;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const home = getHermesHome();
    const backupsDir = path.join(home, BACKUPS_DIR_NAME);
    let files: string[] = [];
    try {
      files = await fs.readdir(backupsDir);
    } catch {}

    const backups = await Promise.all(
      files
        .filter((f) => f.startsWith('config-') && f.endsWith('.json'))
        .map(async (f) => {
          const filePath = path.join(backupsDir, f);
          try {
            const stat = await fs.stat(filePath);
            const content = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(content);
            return {
              filename: f,
              size: stat.size,
              created_at: data.timestamp || stat.mtime.toISOString(),
            };
          } catch {
            return null;
          }
        })
    );

    const validBackups = backups.filter(Boolean).sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ backups: validBackups });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { action, filename } = body;
    const home = getHermesHome();
    const configPath = path.join(home, 'config.yaml');

    switch (action) {
      case 'create': {
        const configContent = await fs.readFile(configPath, 'utf8');
        const backupsDir = await ensureBackupsDir(home);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFilename = `config-${timestamp}.json`;
        const backupPath = path.join(backupsDir, backupFilename);
        await fs.writeFile(
          backupPath,
          JSON.stringify({ timestamp: new Date().toISOString(), config: configContent }, null, 2),
          'utf8'
        );

        try {
          const { logAudit } = await import('@/app/api/audit/route');
          logAudit('backup_created', backupFilename, 'Configuration backup created');
        } catch {}

        return NextResponse.json({ message: 'Backup created', filename: backupFilename });
      }

      case 'restore': {
        if (!filename) {
          return NextResponse.json({ error: 'filename is required' }, { status: 400 });
        }
        const backupPath = path.join(home, BACKUPS_DIR_NAME, filename);
        let backupContent: string;
        try {
          backupContent = await fs.readFile(backupPath, 'utf8');
        } catch {
          return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
        }

        const data = JSON.parse(backupContent);
        if (!data.config) {
          return NextResponse.json({ error: 'Invalid backup file' }, { status: 400 });
        }

        await fs.writeFile(configPath, data.config, 'utf8');

        try {
          const { logAudit } = await import('@/app/api/audit/route');
          logAudit('backup_restored', filename, 'Configuration restored from backup');
        } catch {}

        return NextResponse.json({ message: 'Backup restored successfully' });
      }

      case 'delete': {
        if (!filename) {
          return NextResponse.json({ error: 'filename is required' }, { status: 400 });
        }
        const backupPath = path.join(home, BACKUPS_DIR_NAME, filename);
        try {
          await fs.unlink(backupPath);
        } catch {
          return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
        }

        try {
          const { logAudit } = await import('@/app/api/audit/route');
          logAudit('backup_deleted', filename, 'Backup deleted');
        } catch {}

        return NextResponse.json({ message: 'Backup deleted' });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
