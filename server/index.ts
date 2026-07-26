import 'dotenv/config';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { isAddress } from 'ethers';
import { contractLens, marketLens, supplyLens, ensureCacheDirs, cachePath } from './lenses.js';
import { reason } from './reasoning.js';
import { generateAudio } from './audio.js';
import { renderShareCard } from './shareCard.js';
import type { LensName } from '../src/types.js';
import type { AnalysisJob, AnalysisRequest, JobEvent, LensOutput } from './types.js';

function emit(job: AnalysisJob, event: JobEvent) {
  job.events.push(event);
  job.listeners.forEach((listener) => listener(event));
}

function validRequest(body: unknown): AnalysisRequest {
  if (!body || typeof body !== 'object') throw new Error('A contract address and chain are required.');
  const value = body as Partial<AnalysisRequest>;
  if (!value.contractAddress || !isAddress(value.contractAddress)) throw new Error('Enter a valid EVM contract address.');
  if (value.chainId !== 'xlayer' && value.chainId !== 'base') throw new Error('Select X Layer or Base.');
  return { contractAddress: value.contractAddress, chainId: value.chainId, supplyDataRaw: value.supplyDataRaw, supplyImageBase64: value.supplyImageBase64 };
}

function shareCardHtml(address: string, chain: string) {
  const safeAddress = encodeURIComponent(address);
  const safeChain = encodeURIComponent(chain);
  const imageUrl = `/api/card/${safeAddress}/${safeChain}?v=${Date.now()}`;
  const downloadUrl = `/api/card/${safeAddress}/${safeChain}/download`;
  return `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>premortem share card</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #090b0f; color: #dde3ec; font-family: Arial, sans-serif; }
      main { width: min(94vw, 1280px); display: grid; gap: 18px; padding: 28px 0; }
      .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
      .wordmark { font-family: Georgia, serif; font-size: 18px; color: #dde3ec; }
      .actions { display: flex; gap: 10px; }
      .download, .back { display: inline-flex; align-items: center; justify-content: center; min-height: 40px; padding: 0 18px; border: 1px solid rgba(74,111,165,0.55); color: #dde3ec; background: #10131a; text-decoration: none; font: 700 12px/1 monospace; letter-spacing: 0.12em; }
      .card-frame { border: 1px solid rgba(74,111,165,0.32); background: #05070a; padding: 10px; }
      img { display: block; width: 100%; height: auto; image-rendering: auto; }
      .hint { color: #7a8499; font: 11px/1.4 monospace; letter-spacing: 0.08em; }
    </style>
  </head>
  <body>
    <main>
      <div class="toolbar">
        <div class="wordmark">premortem</div>
        <div class="actions"><a class="back" href="/">BACK TO SCAN</a><a class="download" href="${downloadUrl}">DOWNLOAD PNG</a></div>
      </div>
      <div class="card-frame"><img src="${imageUrl}" alt="Premortem verdict share card" /></div>
      <div class="hint">This page previews the generated card. The download button saves only the PNG card.</div>
    </main>
  </body>
</html>`;
}

export async function createApp() {
  const app = Fastify({ logger: true });
  const jobs = new Map<string, AnalysisJob>();
  const audioTypes = new Map<string, string>();

  async function runLens(job: AnalysisJob, lens: LensName, task: Promise<LensOutput>) {
    try {
      const output = await task;
      emit(job, { event: 'lens_complete', data: output });
      return output;
    } catch (error) {
      const output: LensOutput = { lens, score: null, findings: [], summary: 'This lens returned partial data.', error: error instanceof Error ? error.message : 'Lens unavailable.' };
      emit(job, { event: 'lens_complete', data: output });
      return output;
    }
  }

  async function runJob(job: AnalysisJob) {
    const { request } = job;
    const resolved = await Promise.all([
      runLens(job, 'contract', contractLens(request)),
      runLens(job, 'market', marketLens(request)),
      runLens(job, 'supply', supplyLens(request)),
    ]);
    const reasoning = await reason(request, resolved);
    emit(job, { event: 'verdict', data: { ...reasoning, audioUrl: null, shareCardUrl: null } });

    const safeAddress = request.contractAddress.toLowerCase();
    const audioFile = cachePath('audio', safeAddress, request.chainId, 'mp3');
    const wavFile = cachePath('audio', safeAddress, request.chainId, 'wav');
    const audioMetaFile = cachePath('audio', safeAddress, request.chainId, 'txt');
    const scriptHash = createHash('sha256').update(reasoning.audioScript).digest('hex');
    const cachedScriptHash = await readFile(audioMetaFile, 'utf8').catch(() => '');
    let audioFormat: 'mp3' | 'browser' = 'browser';
    if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID) {
      if (cachedScriptHash === scriptHash && existsSync(audioFile)) { audioTypes.set(`${safeAddress}:${request.chainId}`, 'audio/mpeg'); audioFormat = 'mp3'; }
      else {
        const mime = await generateAudio(reasoning.audioScript, audioFile);
        if (mime !== 'audio/mpeg') throw new Error('ElevenLabs did not return an MP3 audio brief.');
        await writeFile(audioMetaFile, scriptHash);
        audioTypes.set(`${safeAddress}:${request.chainId}`, mime);
        audioFormat = 'mp3';
      }
    } else {
      await generateAudio(reasoning.audioScript, audioFile);
      await writeFile(audioMetaFile, scriptHash);
      audioTypes.set(`${safeAddress}:${request.chainId}`, 'audio/browser');
      audioFormat = 'browser';
    }
    const audioUrl = `/api/audio/${safeAddress}/${request.chainId}?format=${audioFormat}`;
    emit(job, { event: 'audio_ready', data: { url: audioUrl } });

    const cardFile = cachePath('cards', safeAddress, request.chainId, 'png');
    try {
      const card = await renderShareCard({ request, reasoning, lenses: resolved, timestamp: new Date() });
      await writeFile(cardFile, card);
    } catch (error) {
      app.log.error(error, 'Share card rendering failed.');
    }
    emit(job, { event: 'card_ready', data: { url: `/share/${safeAddress}/${request.chainId}` } });
    job.done = true;
    emit(job, { event: 'done' });
  }

  await ensureCacheDirs();
  await app.register(cors, { origin: process.env.FRONTEND_ORIGIN || true });

  const distRoot = path.resolve(process.cwd(), 'dist');
  if (existsSync(distRoot)) {
    await app.register(fastifyStatic, { root: distRoot, wildcard: false });
  }

  app.get('/api/health', async () => ({ ok: true, status: 'ok', service: 'premortem' }));

  app.post('/api/analyse', async (request, reply) => {
    try {
      const analysisRequest = validRequest(request.body);
      const id = randomUUID();
      const job: AnalysisJob = { id, request: analysisRequest, events: [], listeners: new Set(), done: false };
      jobs.set(id, job);

      // Vercel can route the POST and a later SSE request to different
      // serverless instances. Complete the request in one invocation there,
      // so the deployed app does not depend on an in-memory job map.
      if (process.env.VERCEL) {
        await runJob(job);
        return reply.send({ analysisId: id, events: job.events });
      }

      void runJob(job).catch((error) => {
        app.log.error(error, 'Analysis failed.');
        emit(job, { event: 'error', data: { message: 'The analysis could not be completed.' } });
        job.done = true;
        emit(job, { event: 'done' });
      });
      return reply.send({ analysisId: id });
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : 'The request was invalid.' });
    }
  });

  app.get('/api/analyse/:id/stream', async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = jobs.get(id);
    if (!job) return reply.code(404).send({ error: 'Analysis not found.' });
    reply.hijack();
    reply.raw.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    const send = (event: JobEvent) => { reply.raw.write(`event: ${event.event}\ndata: ${JSON.stringify(event.data ?? {})}\n\n`); };
    job.events.forEach(send);
    if (job.done) { reply.raw.end(); return; }
    const listener = (event: JobEvent) => { send(event); if (event.event === 'done') { job.listeners.delete(listener); reply.raw.end(); } };
    job.listeners.add(listener);
    request.raw.on('close', () => job.listeners.delete(listener));
  });

  app.get('/api/audio/:address/:chain', async (request, reply) => {
    const { address, chain } = request.params as { address: string; chain: string };
    const key = `${address.toLowerCase()}:${chain}`;
    const mime = audioTypes.get(key) || (existsSync(cachePath('audio', address, chain, 'mp3')) ? 'audio/mpeg' : 'audio/browser');
    if (mime === 'audio/browser') return reply.code(204).send();
    const file = mime === 'audio/mpeg' ? cachePath('audio', address, chain, 'mp3') : cachePath('audio', address, chain, 'wav');
    const data = await readFile(file).catch(() => null);
    if (!data) return reply.code(404).send({ error: 'Audio brief not found.' });
    return reply.type(mime).send(data);
  });

  app.get('/api/card/:address/:chain', async (request, reply) => {
    const { address, chain } = request.params as { address: string; chain: string };
    const data = await readFile(cachePath('cards', address, chain, 'png')).catch(() => null);
    if (!data) return reply.code(404).send({ error: 'Share card not found.' });
    return reply.header('Cache-Control', 'no-store').type('image/png').send(data);
  });

  app.get('/api/card/:address/:chain/download', async (request, reply) => {
    const { address, chain } = request.params as { address: string; chain: string };
    const data = await readFile(cachePath('cards', address, chain, 'png')).catch(() => null);
    if (!data) return reply.code(404).send({ error: 'Share card not found.' });
    return reply.header('Cache-Control', 'no-store').header('Content-Disposition', `attachment; filename="premortem-${address.slice(0, 10)}-${chain}.png"`).type('image/png').send(data);
  });

  app.get('/share/:address/:chain', async (request, reply) => {
    const { address, chain } = request.params as { address: string; chain: string };
    if (!existsSync(cachePath('cards', address, chain, 'png'))) return reply.code(404).send({ error: 'Share card not found.' });
    return reply.header('Cache-Control', 'no-store').type('text/html').send(shareCardHtml(address, chain));
  });

  app.get('/*', async (_, reply) => {
    const indexFile = path.resolve(process.cwd(), 'dist', 'index.html');
    if (existsSync(indexFile)) return reply.type('text/html').send(await readFile(indexFile));
    return reply.code(404).send({ error: 'Premortem frontend is not built.' });
  });

  return app;
}

export async function startServer() {
  const app = await createApp();
  const port = Number(process.env.PORT || 3001);
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info(`Premortem server listening on ${port}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
