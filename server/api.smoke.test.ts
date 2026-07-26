import { afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createApp } from './index.js';

describe('Premortem API', () => {
  let app: FastifyInstance | null = null;

  afterEach(async () => {
    await app?.close();
    app = null;
  });

  it('runs an analysis and serves generated assets', async () => {
    process.env.BASE_RPC_URL = '';
    process.env.XLAYER_RPC_URL = '';
    process.env.MORALIS_API_KEY = '';
    process.env.ANTHROPIC_API_KEY = '';
    process.env.ELEVENLABS_API_KEY = '';
    process.env.ELEVENLABS_VOICE_ID = '';

    app = await createApp();
    const address = '0x0000000000000000000000000000000000000001';

    const health = await app.inject({ method: 'GET', url: '/api/health' });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ ok: true, service: 'premortem' });

    const submitted = await app.inject({
      method: 'POST',
      url: '/api/analyse',
      payload: {
        contractAddress: address,
        chainId: 'base',
        supplyDataRaw: 'Team 18% unlocks over 6 months. Investors 24% vest over 12 months. Liquidity 8%.',
      },
    });
    expect(submitted.statusCode).toBe(200);
    const { analysisId } = submitted.json() as { analysisId: string };
    expect(analysisId).toEqual(expect.any(String));

    const stream = await app.inject({ method: 'GET', url: `/api/analyse/${analysisId}/stream` });
    expect(stream.statusCode).toBe(200);
    expect(stream.body).toContain('event: lens_complete');
    expect(stream.body).toContain('event: verdict');
    expect(stream.body).toContain('event: audio_ready');
    expect(stream.body).toContain('event: card_ready');
    expect(stream.body).toContain('event: done');

    const audio = await app.inject({ method: 'GET', url: `/api/audio/${address}/base` });
    expect([200, 204]).toContain(audio.statusCode);

    const card = await app.inject({ method: 'GET', url: `/api/card/${address}/base` });
    expect(card.statusCode).toBe(200);
    expect(card.headers['content-type']).toContain('image/png');

    const cardPage = await app.inject({ method: 'GET', url: `/share/${address}/base` });
    expect(cardPage.statusCode).toBe(200);
    expect(cardPage.headers['content-type']).toContain('text/html');
    expect(cardPage.body).toContain('DOWNLOAD PNG');

    const download = await app.inject({ method: 'GET', url: `/api/card/${address}/base/download` });
    expect(download.statusCode).toBe(200);
    expect(download.headers['content-type']).toContain('image/png');
    expect(download.headers['content-disposition']).toContain('attachment');
  }, 15000);
});
