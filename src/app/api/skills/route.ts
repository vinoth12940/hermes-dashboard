import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getHermesHome, safePath } from '@/lib/api-utils';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const home = getHermesHome();
    const skillsDir = path.join(home, 'skills');
    const url = new URL(request.url);
    const skillPath = url.searchParams.get('path');

    if (skillPath) {
      const targetPath = safePath(skillsDir, skillPath);
      const content = await fs.readFile(targetPath, 'utf8');
      return NextResponse.json({ path: skillPath, content });
    }

    const categories = await fs.readdir(skillsDir);
    const skills: Array<{
      category: string;
      skills: Array<{ name: string; path: string; hasSkillMd: boolean }>;
    }> = [];

    for (const cat of categories) {
      const catPath = path.join(skillsDir, cat);
      const stat = await fs.stat(catPath).catch(() => null);
      if (!stat?.isDirectory()) continue;

      const entries = await fs.readdir(catPath).catch(() => []);
      const catSkills = entries
        .filter(e => !e.startsWith('.'))
        .map(e => ({
          name: e,
          path: `${cat}/${e}`,
          hasSkillMd: false,
        }));

      // Check for SKILL.md
      for (const skill of catSkills) {
        const skillMdPath = path.join(skillsDir, skill.path, 'SKILL.md');
        const exists = await fs.access(skillMdPath).then(() => true).catch(() => false);
        skill.hasSkillMd = exists;
      }

      skills.push({ category: cat, skills: catSkills });
    }

    return NextResponse.json({ skills });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
