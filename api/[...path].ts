import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../server/index.js';

let appPromise: ReturnType<typeof createApp> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await (appPromise ??= createApp());
  await app.ready();

  // Vercel rewrites share pages through this catch-all function. Restore the
  // original Fastify route before handing the request to Fastify.
  if (req.url?.startsWith('/api/share')) req.url = req.url.replace(/^\/api\/share/, '/share');

  app.server.emit('request', req, res);
}
