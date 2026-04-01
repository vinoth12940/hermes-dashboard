import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getHermesHome } from '@/lib/api-utils';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const home = getHermesHome();
    const filePath = path.join(home, 'SOUL.md');
    const content = await fs.readFile(filePath, 'utf8');
    return NextResponse.json({ content, path: filePath });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const { content } = await request.json();
    const home = getHermesHome();
    const filePath = path.join(home, 'SOUL.md');
    await fs.writeFile(filePath, content, 'utf8');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
