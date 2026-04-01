import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getHermesHome, safePath } from '@/lib/api-utils';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const home = getHermesHome();
    const configPath = path.join(home, 'config.yaml');
    const content = await fs.readFile(configPath, 'utf8');

    let config: Record<string, any>;
    try {
      // Use dynamic import for js-yaml with JSON_SCHEMA to avoid YAML-specific type issues
      const yaml = require('js-yaml');
      config = yaml.load(content, { schema: yaml.FAILSAFE_SCHEMA });
    } catch (yamlError: any) {
      // If FAILSAFE fails too, try minimal JSON-like parse
      // Strip YAML-specific features that cause issues
      const safeContent = content
        .replace(/!![a-zA-Z]+/g, '')           // Remove YAML tags
        .replace(/&[a-zA-Z0-9]+/g, '')         // Remove anchors  
        .replace(/\*[a-zA-Z0-9]+/g, '')        // Remove aliases
        .replace(/\|$/gm, '')                  // Remove block scalar indicators
        .replace(/>$/gm, '');                  // Remove folded scalar indicators
      
      const yaml = require('js-yaml');
      config = yaml.load(safeContent, { schema: yaml.FAILSAFE_SCHEMA });
    }

    // Mask sensitive values
    const maskKeys = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(maskKeys);
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' &&
            (key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) &&
            value.length > 4) {
          result[key] = value.slice(0, 4) + '•'.repeat(Math.max(0, Math.min(value.length - 8, 20))) + (value.length > 8 ? value.slice(-4) : '');
        } else if (typeof value === 'object' && value !== null) {
          result[key] = maskKeys(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return NextResponse.json({ config: maskKeys(config), raw: content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const { raw } = await request.json();
    const home = getHermesHome();
    const configPath = path.join(home, 'config.yaml');

    await fs.writeFile(configPath, raw, 'utf8');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
