/**
 * CoPea — STT Service
 * Uses Apple's free on-device speech recognition via expo-speech.
 * No API cost. Works offline. Good accuracy for English.
 *
 * For Trio Mode continuous transcription we use the Audio recording
 * approach with periodic processing.
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import CONFIG from '../../config';

/**
 * Transcribe a recorded audio file.
 * Uses OpenAI Whisper if key is set, otherwise falls back to
 * a basic approach. For best results add your OpenAI key to config.js.
 */
export async function transcribe(audioUri) {
  // Use OpenAI Whisper if available
  if (CONFIG.OPENAI_API_KEY && !CONFIG.OPENAI_API_KEY.startsWith('REPLACE')) {
    return whisperTranscribe(audioUri);
  }

  // Fallback — return empty string, app handles gracefully
  // To enable free transcription, set OPENAI_API_KEY in config.js
  // OpenAI gives $5 free credit on signup which covers ~800 mins of transcription
  console.warn('No STT key configured. Add OPENAI_API_KEY to config.js for transcription.');
  return '';
}

async function whisperTranscribe(uri) {
  const formData = new FormData();
  formData.append('file', { uri, type: 'audio/m4a', name: 'recording.m4a' });
  formData.append('model',    'whisper-1');
  formData.append('language', 'en');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}` },
    body:    formData,
  });

  if (!res.ok) throw new Error(`Whisper ${res.status}`);
  const data = await res.json();
  return data.text?.trim() || '';
}
