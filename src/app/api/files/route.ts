import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getHermesHome, safePath, strictPath } from '@/lib/api-utils';
import fs from 'fs/promises';
import path from 'path';

// Expand ~ and ~/ to actual home directory
function resolveHome(filePath: string): string {
  const home = process.env.HOME || '/root';
  if (filePath === '~') return home;
  if (filePath.startsWith('~/')) return path.join(home, filePath.slice(2));
  return filePath;
}

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const rawPath = url.searchParams.get('path') || '';
    const filePath = resolveHome(rawPath);
    const listDir = url.searchParams.get('list') === 'true';
    // Read (browse) from root filesystem
    const basePath = '/';

    if (listDir) {
      const targetPath = safePath(basePath, filePath || '/');
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      const items = await Promise.all(entries
        .filter(e => !e.name.startsWith('.') || e.name === '.env' || e.name === '.hermes')
        .sort((a, b) => {
          if (a.isDirectory() && !b.isDirectory()) return -1;
          if (!a.isDirectory() && b.isDirectory()) return 1;
          return a.name.localeCompare(b.name);
        })
        .map(async (e) => {
          const fullPath = path.join(targetPath, e.name);
          let size = 0;
          try { size = e.isFile() ? (await fs.stat(fullPath)).size : 0; } catch {}
          return {
            name: e.name,
            path: '/' + path.relative('/', fullPath),
            type: e.isDirectory() ? 'directory' : 'file',
            size,
          };
        })
      );
      return NextResponse.json({ items, currentPath: filePath || '/' });
    }

    if (filePath) {
      const targetPath = safePath(basePath, filePath);
      const content = await fs.readFile(targetPath, 'utf8');
      return NextResponse.json({ path: filePath, content });
    }

    return NextResponse.json({ error: 'Provide path or list=true' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const { path: filePath, content } = await request.json();
    const home = getHermesHome();
    // Writes are restricted to Hermes home only for safety
    const targetPath = strictPath(home, filePath);

    await fs.writeFile(targetPath, content, 'utf8');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
