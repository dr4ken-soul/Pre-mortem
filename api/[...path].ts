import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../server/index';

let appPromise: ReturnType<typeof createApp> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  let app;
  try {
    app = await (appPromise ??= createApp());
    await app.ready();
  } catch (error) {
    appPromise = undefined;
    const detail = error instanceof Error ? error.message : 'Unknown API startup error.';
    console.error('Premortem API startup failed:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Premortem API startup failed.', detail }));
    return;
  }

  // Vercel rewrites share pages through this catch-all function. Restore the
  // original Fastify route before handing the request to Fastify.
  if (req.url?.startsWith('/api/share')) req.url = req.url.replace(/^\/api\/share/, '/share');

  app.server.emit('request', req, res);
}
