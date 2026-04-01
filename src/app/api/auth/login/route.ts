import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { verifyPassword, createToken, COOKIE_NAME } from '@/lib/auth';

function getAuthConfig() {
  try {
    const raw = readFileSync(join(process.cwd(), 'auth.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return { username: process.env.AUTH_USERNAME || 'admin', passwordHash: process.env.AUTH_PASSWORD_HASH || '' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const auth = getAuthConfig();
    const expectedUser = auth.username || 'admin';
    const expectedHash = auth.passwordHash || '';

    if (username !== expectedUser) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await verifyPassword(password, expectedHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await createToken(username);
    const response = NextResponse.json({ success: true, username });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: false, // Must be false when serving over HTTP (not HTTPS)
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
