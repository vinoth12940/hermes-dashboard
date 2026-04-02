import { NextRequest } from 'next/server';
import { requireAuth, getHermesHome } from '@/lib/api-utils';
import fs from 'fs';
import path from 'path';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const cookieToken = request.cookies.get(COOKIE_NAME)?.value;
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');
  const token = cookieToken || queryToken;

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const payload = await verifyToken(token);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }

  const home = getHermesHome();
  const logsDir = path.join(home, 'logs');
  const file = url.searchParams.get('file') || 'maintenance.log';
  const filePath = path.join(logsDir, file);

  let fd: number;
  try {
    fd = fs.openSync(filePath, 'r');
  } catch {
    return new Response(JSON.stringify({ error: 'Log file not found' }), { status: 404 });
  }

  const stat = fs.statSync(filePath);
  let lastSize = stat.size;
  let lastPosition = Math.max(0, stat.size);

  let initialBuffer: string[] = [];
  if (lastSize > 0) {
    const readSize = Math.min(lastSize, 1024 * 50);
    const buf = Buffer.alloc(readSize);
    fs.readSync(fd, buf, 0, readSize, lastSize - readSize);
    initialBuffer = buf.toString('utf8').split('\n').slice(-10);
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      if (initialBuffer.length > 0) {
        controller.enqueue(
          encoder.encode(`event: init\ndata: ${JSON.stringify(initialBuffer)}\n\n`)
        );
      }

      const interval = setInterval(() => {
        try {
          const currentStat = fs.statSync(filePath);
          const currentSize = currentStat.size;

          if (currentSize > lastSize) {
            const bytesToRead = currentSize - lastSize;
            const buf = Buffer.alloc(bytesToRead);
            fs.readSync(fd, buf, 0, bytesToRead, lastSize);

            const newContent = buf.toString('utf8');
            const newLines = newContent.split('\n');

            for (const line of newLines) {
              if (line.length > 0) {
                try {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(line)}\n\n`)
                  );
                } catch {
                  clearInterval(interval);
                  try { fs.closeSync(fd); } catch {}
                  return;
                }
              }
            }

            lastSize = currentSize;
            lastPosition = currentSize;
          }
        } catch {
          clearInterval(interval);
          try { fs.closeSync(fd); } catch {}
          try { controller.close(); } catch {}
        }
      }, 1000);

      const cleanup = () => {
        clearInterval(interval);
        try { fs.closeSync(fd); } catch {}
      };

      request.signal.addEventListener('abort', () => {
        cleanup();
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      try { fs.closeSync(fd); } catch {}
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
