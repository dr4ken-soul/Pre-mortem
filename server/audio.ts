import { writeFile } from 'node:fs/promises';
import fetch from 'node-fetch';

export async function generateAudio(script: string, destination: string) {
  if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID) {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`, {
        method: 'POST',
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text: script, model_id: 'eleven_flash_v2_5', output_format: 'mp3_44100_128' }),
      });
      if (response.ok) { await writeFile(destination, Buffer.from(await response.arrayBuffer())); return 'audio/mpeg'; }
    } catch { }
  }
  return 'audio/browser';
}
