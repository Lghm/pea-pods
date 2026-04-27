/**
 * CoPea — TTS Service
 * ElevenLabs Turbo v2.5 — fastest and cheapest model.
 */

import * as FileSystem from 'expo-file-system';
import CONFIG from '../../config';

export async function textToSpeech(text, voiceKey) {
  const voiceId = CONFIG.VOICES[voiceKey];
  if (!voiceId || voiceId.startsWith('REPLACE')) {
    throw new Error(`Voice not configured for "${voiceKey}". Add voice ID to config.js.`);
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key':   CONFIG.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      'Accept':       'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: CONFIG.ELEVENLABS_MODEL,
      voice_settings: {
        stability:         0.5,
        similarity_boost:  0.8,
        style:             0.2,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);

  const buffer  = await res.arrayBuffer();
  const base64  = bufferToBase64(buffer);
  const uri     = FileSystem.cacheDirectory + `tts_${Date.now()}.mp3`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return uri;
}

export async function clearTTSCache() {
  try {
    const files = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
    await Promise.all(
      files.filter(f => f.startsWith('tts_'))
           .map(f => FileSystem.deleteAsync(FileSystem.cacheDirectory + f, { idempotent: true }))
    );
  } catch {}
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let b = '';
  for (let i = 0; i < bytes.byteLength; i++) b += String.fromCharCode(bytes[i]);
  return btoa(b);
}
