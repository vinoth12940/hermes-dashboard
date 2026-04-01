import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getHermesHome, safePath } from '@/lib/api-utils';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const home = getHermesHome();
    const url = new URL(request.url);
    const filePath = url.searchParams.get('path') || '';
    const listDir = url.searchParams.get('list') === 'true';

    if (listDir) {
      const targetPath = safePath(home, filePath || '.');
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      const items = await Promise.all(entries
        .filter(e => !e.name.startsWith('.') || e.name === '.env')
        .sort((a, b) => {
          if (a.isDirectory() && !b.isDirectory()) return -1;
          if (!a.isDirectory() && b.isDirectory()) return 1;
          return a.name.localeCompare(b.name);
        })
        .map(async (e) => ({
          name: e.name,
          path: path.posix.join(filePath || '', e.name),
          type: e.isDirectory() ? 'directory' : 'file',
          size: e.isFile() ? (await fs.stat(path.join(targetPath, e.name))).size : 0,
        }))
      );
      return NextResponse.json({ items, currentPath: filePath || '/' });
    }

    if (filePath) {
      const targetPath = safePath(home, filePath);
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
    const targetPath = safePath(home, filePath);

    await fs.writeFile(targetPath, content, 'utf8');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
