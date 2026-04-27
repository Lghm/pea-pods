/**
 * CoPea — Settings Service
 * All user preferences stored and retrieved from AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOPICS:          'copea_topics',
  NOISE_CANCEL:    'copea_noise_cancel',
  ECHO_CANCEL:     'copea_echo_cancel',
  TRIO_CHARACTER:  'copea_trio_character',
  TRIO_ENABLED:    'copea_trio_enabled',
  TRIO_SILENCE:    'copea_trio_silence',
  SOLO_CHARACTER:  'copea_solo_character',
};

// ─── DEFAULTS ─────────────────────────────────────────────────────────────────

export const DEFAULTS = {
  topics:         ['world', 'science', 'society', 'environment'],
  noiseCancel:    true,
  echoCancel:     true,
  trioCharacter:  'pea',
  trioEnabled:    false,
  trioSilence:    8,      // seconds
  soloCharacter:  'pooh',
};

// ─── GETTERS ──────────────────────────────────────────────────────────────────

export async function getAllSettings() {
  try {
    const [
      topics, noise, echo, trioChar, trioOn, trioSil, soloChar
    ] = await Promise.all([
      AsyncStorage.getItem(KEYS.TOPICS),
      AsyncStorage.getItem(KEYS.NOISE_CANCEL),
      AsyncStorage.getItem(KEYS.ECHO_CANCEL),
      AsyncStorage.getItem(KEYS.TRIO_CHARACTER),
      AsyncStorage.getItem(KEYS.TRIO_ENABLED),
      AsyncStorage.getItem(KEYS.TRIO_SILENCE),
      AsyncStorage.getItem(KEYS.SOLO_CHARACTER),
    ]);

    return {
      topics:        topics        ? JSON.parse(topics)        : DEFAULTS.topics,
      noiseCancel:   noise         ? JSON.parse(noise)         : DEFAULTS.noiseCancel,
      echoCancel:    echo          ? JSON.parse(echo)          : DEFAULTS.echoCancel,
      trioCharacter: trioChar      ? trioChar                  : DEFAULTS.trioCharacter,
      trioEnabled:   trioOn        ? JSON.parse(trioOn)        : DEFAULTS.trioEnabled,
      trioSilence:   trioSil       ? Number(trioSil)           : DEFAULTS.trioSilence,
      soloCharacter: soloChar      ? soloChar                  : DEFAULTS.soloCharacter,
    };
  } catch {
    return DEFAULTS;
  }
}

// ─── SETTERS ──────────────────────────────────────────────────────────────────

export async function saveSetting(key, value) {
  const map = {
    topics:        KEYS.TOPICS,
    noiseCancel:   KEYS.NOISE_CANCEL,
    echoCancel:    KEYS.ECHO_CANCEL,
    trioCharacter: KEYS.TRIO_CHARACTER,
    trioEnabled:   KEYS.TRIO_ENABLED,
    trioSilence:   KEYS.TRIO_SILENCE,
    soloCharacter: KEYS.SOLO_CHARACTER,
  };
  const storageKey = map[key];
  if (!storageKey) return;
  const stored = typeof value === 'string' ? value : JSON.stringify(value);
  await AsyncStorage.setItem(storageKey, stored);
}
