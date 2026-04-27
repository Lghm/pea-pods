/**
 * CoPea — News Service
 * Guardian API. User topic preferences. 7-day deduplication.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import CONFIG from '../../config';

const BASE    = 'https://content.guardianapis.com/search';
const SEEN    = 'copea_seen';
const TTL     = 7 * 86400000;

export const ALL_TOPICS = [
  { id: 'world',              label: 'World Affairs'      },
  { id: 'science',            label: 'Science'            },
  { id: 'technology',         label: 'Technology'         },
  { id: 'society',            label: 'Society'            },
  { id: 'environment',        label: 'Environment'        },
  { id: 'business',           label: 'Business'           },
  { id: 'education',          label: 'Education'          },
  { id: 'global-development', label: 'Global Development' },
  { id: 'politics',           label: 'Politics'           },
  { id: 'law',                label: 'Law & Justice'      },
];

async function getSeenLog() {
  try {
    const raw = await AsyncStorage.getItem(SEEN);
    const log = raw ? JSON.parse(raw) : {};
    const cut = Date.now() - TTL;
    return Object.fromEntries(Object.entries(log).filter(([, t]) => t > cut));
  } catch { return {}; }
}

export async function markStoryUsed(id) {
  try {
    const log = await getSeenLog();
    log[id] = Date.now();
    await AsyncStorage.setItem(SEEN, JSON.stringify(log));
  } catch {}
}

function sid(h) { return h.toLowerCase().replace(/\s+/g, '-').slice(0, 80); }

export async function fetchStoryCandidates(topics) {
  const seen  = await getSeenLog();
  const today = new Date().toISOString().split('T')[0];

  try {
    const url = `${BASE}?api-key=${CONFIG.GUARDIAN_API_KEY}` +
      `&section=${topics.join('|')}` +
      `&from-date=${today}` +
      `&show-fields=headline,trailText` +
      `&order-by=relevance&page-size=20`;

    const res  = await fetch(url);
    const data = await res.json();
    if (!data.response?.results?.length) return fallbacks();

    const out = data.response.results
      .filter(r => r.fields?.headline && !seen[sid(r.fields.headline)])
      .map(r => ({
        id:       sid(r.fields.headline),
        headline: r.fields.headline,
        summary:  r.fields.trailText || r.fields.headline,
        section:  r.sectionName || '',
      }));

    if (!out.length) { await AsyncStorage.removeItem(SEEN); return fetchStoryCandidates(topics); }
    return out.slice(0, 10);
  } catch { return fallbacks(); }
}

function fallbacks() {
  return [
    { id: 'fb1', headline: 'Loneliness now affects one in three adults globally', summary: 'Despite unprecedented connectivity, close relationships are declining.', section: 'Society' },
    { id: 'fb2', headline: 'Record food production fails to reduce global hunger', summary: 'Distribution failures mean surplus does not reach those in need.', section: 'Environment' },
    { id: 'fb3', headline: 'Children today have significantly fewer close friendships', summary: 'The number of close childhood friendships has halved in one generation.', section: 'Society' },
  ];
}
