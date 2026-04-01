import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getHermesHome } from '@/lib/api-utils';
import fs from 'fs/promises';
import path from 'path';

interface MemoryEntry {
  id: string;
  target: string;
  title: string;
  content: string;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const home = getHermesHome();

    // Hermes stores memory at these paths:
    // ~/.hermes/memories/USER.md
    // ~/.hermes/memories/MEMORY.md
    // ~/.hermes/SOUL.md
    const files: Record<string, string> = {
      user: path.join(home, 'memories', 'USER.md'),
      memory: path.join(home, 'memories', 'MEMORY.md'),
      soul: path.join(home, 'SOUL.md'),
    };

    const contents: Record<string, string> = {};
    for (const [key, filePath] of Object.entries(files)) {
      try {
        contents[key] = await fs.readFile(filePath, 'utf8');
      } catch {
        contents[key] = '';
      }
    }

    // Parse entries from markdown ## headings
    const parseEntries = (content: string, target: string): MemoryEntry[] => {
      if (!content.trim()) return [];
      const blocks = content.split(/\n(?=## )/).filter(Boolean);
      return blocks.map((block, i) => {
        const lines = block.split('\n');
        const title = lines[0].replace(/^#+\s*/, '').trim();
        const body = lines.slice(1).join('\n').trim();
        return {
          id: `${target}-${i}`,
          target,
          title,
          content: body,
        };
      });
    };

    return NextResponse.json({
      userContent: contents.user,
      memoryContent: contents.memory,
      soulContent: contents.soul,
      userEntries: parseEntries(contents.user, 'user'),
      memoryEntries: parseEntries(contents.memory, 'memory'),
      soulEntries: parseEntries(contents.soul, 'soul'),
      filePaths: files,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const { target, content } = await request.json();
    const home = getHermesHome();

    const pathMap: Record<string, string> = {
      user: path.join(home, 'memories', 'USER.md'),
      memory: path.join(home, 'memories', 'MEMORY.md'),
      soul: path.join(home, 'SOUL.md'),
    };

    const filePath = pathMap[target];
    if (!filePath) {
      return NextResponse.json({ error: 'Invalid target. Use: user, memory, or soul' }, { status: 400 });
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
