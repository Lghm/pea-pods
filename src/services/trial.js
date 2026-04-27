/**
 * CoPea — Trial Service
 * 3-day free trial for Solo + Trio (paid modes).
 * Connect Mode is always free.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import CONFIG from '../../config';

const TRIAL_KEY = 'copea_trial_start';

export async function startTrialIfNew() {
  const existing = await AsyncStorage.getItem(TRIAL_KEY);
  if (!existing) await AsyncStorage.setItem(TRIAL_KEY, String(Date.now()));
}

export async function isTrialActive() {
  const start = await AsyncStorage.getItem(TRIAL_KEY);
  if (!start) return true;
  const days = (Date.now() - Number(start)) / 86400000;
  return days < CONFIG.TRIAL_DAYS;
}

export async function trialDaysRemaining() {
  const start = await AsyncStorage.getItem(TRIAL_KEY);
  if (!start) return CONFIG.TRIAL_DAYS;
  const days = (Date.now() - Number(start)) / 86400000;
  return Math.max(0, Math.ceil(CONFIG.TRIAL_DAYS - days));
}

export async function needsSubscription() {
  const active = await isTrialActive();
  return !active;
  // TODO: add RevenueCat or StoreKit subscription check here
}
