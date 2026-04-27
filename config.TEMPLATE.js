/**
 * CoPea Plus — Configuration
 * Fill in every REPLACE_WITH_ value before building.
 */

export default {

  // ─── API KEYS ─────────────────────────────────────────────────────────────
  ANTHROPIC_API_KEY:  'REPLACE_WITH_YOUR_ANTHROPIC_KEY',
  ELEVENLABS_API_KEY: 'REPLACE_WITH_YOUR_ELEVENLABS_KEY',
  GUARDIAN_API_KEY:   'REPLACE_WITH_YOUR_GUARDIAN_KEY',
  OPENAI_API_KEY:     'REPLACE_WITH_YOUR_OPENAI_KEY',

  // ─── MODELS ───────────────────────────────────────────────────────────────
  AI_MODEL:         'claude-haiku-4-5-20251001',
  ELEVENLABS_MODEL: 'eleven_turbo_v2_5',

  // ─── CHARACTER VOICES ─────────────────────────────────────────────────────
  // Create each voice in ElevenLabs Voice Design.
  // Paste the Voice ID here for each character.
  VOICES: {
    pea_male:   'REPLACE_WITH_PEA_MALE_VOICE_ID',
    pea_female: 'REPLACE_WITH_PEA_FEMALE_VOICE_ID',
    pooh:       'REPLACE_WITH_POOH_VOICE_ID',
    sasquatch:  'REPLACE_WITH_SASQUATCH_VOICE_ID',
    narrator:   'REPLACE_WITH_NARRATOR_VOICE_ID',
    godfather:  'REPLACE_WITH_GODFATHER_VOICE_ID',
    dj_sweet:   'REPLACE_WITH_DJ_SWEET_VOICE_ID',
    sensei:     'REPLACE_WITH_SENSEI_VOICE_ID',
    tinker:     'REPLACE_WITH_TINKER_VOICE_ID',
    holmes:     'REPLACE_WITH_HOLMES_VOICE_ID',
  },

  // ─── CONNECT MODE ─────────────────────────────────────────────────────────
  ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  SIGNAL_SERVER: 'wss://REPLACE_WITH_YOUR_RAILWAY_URL.up.railway.app',

  // ─── TRIO MODE ────────────────────────────────────────────────────────────
  TRIO_SILENCE_SECONDS:  8,
  TRIO_AFTER_NO_SECONDS: 12,
  TRIO_MAX_TRANSCRIPT:   20,

  // ─── SUBSCRIPTION ─────────────────────────────────────────────────────────
  TRIAL_DAYS:   3,
  WEEKLY_PRICE: '£1.99',
};
