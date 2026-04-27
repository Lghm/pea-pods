/**
 * CoPea — AI Service v2
 * Solo Mode: one-on-one AI conversation
 * Trio Mode: AI observes two people, speaks after silence
 */

import CONFIG from '../../config';

const URL = 'https://api.anthropic.com/v1/messages';

// ─── SOLO MODE ────────────────────────────────────────────────────────────────

export async function selectBestStory(character, candidates) {
  const list = candidates.map((s, i) => `${i + 1}. ${s.headline}`).join('\n');
  try {
    const text = await call(
      'Reply with a single digit only.',
      [{ role: 'user', content: `You are ${character.name}. Which headline gives the most logical contradictions to follow?\n\n${list}\n\nReply with ONE number only.` }],
      5
    );
    const idx = parseInt(text.trim()) - 1;
    if (idx >= 0 && idx < candidates.length) return candidates[idx];
  } catch {}
  return candidates[0];
}

export async function generateOpening(character, story) {
  return call(character.systemPrompt, [{
    role: 'user',
    content: `Today's news:\nHeadline: ${story.headline}\nSummary: ${story.summary}\n\nOpen the conversation in your own voice. Wonder about it. Follow the logic one step further. Just begin. 4 sentences maximum.`,
  }]);
}

export async function generateResponse(character, history) {
  return call(character.systemPrompt, history);
}

export async function generateSilencePrompt(character) {
  return call(character.systemPrompt, [{
    role: 'user',
    content: `The person has gone quiet. Notice the silence briefly. Say you are still here. 2 sentences maximum.`,
  }]);
}

export async function generateClose(character, history) {
  return call(character.systemPrompt, [
    ...history,
    { role: 'user', content: `Close the conversation. One genuine thing that came out of it. Use "bye for now" somewhere. 2 sentences.` },
  ]);
}

export async function generateWakeResponse(character) {
  return call(character.systemPrompt, [{
    role: 'user',
    content: `The person said "CoPea" to wake you. You just looked up. Ask what they want to talk about. 2 sentences.`,
  }]);
}

// ─── TRIO MODE ────────────────────────────────────────────────────────────────

/**
 * Generate an observation after both users have been silent.
 * Returns the observation plus a natural permission request.
 */
export async function generateTrioObservation(character, transcript) {
  const recent = transcript.slice(-CONFIG.TRIO_MAX_TRANSCRIPT);
  const convo  = recent.map(t => `${t.speaker}: ${t.text}`).join('\n');

  return call(character.systemPrompt, [{
    role: 'user',
    content:
      `You are listening to a conversation between two people.\n\n` +
      `Recent conversation:\n${convo}\n\n` +
      `Both people have gone quiet. Make ONE observation about what was just said — ` +
      `the thing neither of them noticed or followed. Then ask simply if they want to hear more. ` +
      `Stay completely in character. 3 sentences maximum total.`,
  }]);
}

/**
 * Continue the observation after the user said yes.
 */
export async function generateTrioContinuation(character, transcript, previousObservation) {
  const recent = transcript.slice(-10);
  const convo  = recent.map(t => `${t.speaker}: ${t.text}`).join('\n');

  return call(character.systemPrompt, [{
    role: 'user',
    content:
      `You are in a three-way conversation. You just said:\n"${previousObservation}"\n\n` +
      `The people asked you to continue.\n\n` +
      `Recent conversation:\n${convo}\n\n` +
      `Go one step deeper on the same thread. Then ask if they want more. 3 sentences maximum.`,
  }]);
}

/**
 * Respond to a direct question from one of the users in Trio Mode.
 */
export async function generateTrioDirectResponse(character, transcript, question) {
  const recent = transcript.slice(-8);
  const convo  = recent.map(t => `${t.speaker}: ${t.text}`).join('\n');

  return call(character.systemPrompt, [{
    role: 'user',
    content:
      `You are in a three-way conversation.\n\nRecent conversation:\n${convo}\n\n` +
      `One of the people just asked you directly: "${question}"\n\n` +
      `Answer directly and in character. 3 sentences maximum.`,
  }]);
}

/**
 * Classify the user's response after the AI asked permission.
 * Returns: 'yes' | 'no' | 'question' | 'resume'
 */
export async function classifyTrioResponse(text, characterName) {
  try {
    const result = await call(
      'You classify user responses. Reply with exactly one word: yes, no, question, or resume.',
      [{
        role: 'user',
        content:
          `The AI character ${characterName} asked if the users want to hear more.\n` +
          `A user said: "${text}"\n\n` +
          `Classify this response:\n` +
          `- "yes" if they want to continue (yes, yeah, go on, sure, tell us, please, continue, of course)\n` +
          `- "no" if they want to stop (no, nope, stop, that's fine, we're good, enough, thanks)\n` +
          `- "question" if they are asking the character something directly\n` +
          `- "resume" if they are just talking to each other\n\n` +
          `Reply with ONE word only.`,
      }],
      10
    );
    const word = result.trim().toLowerCase();
    if (['yes', 'no', 'question', 'resume'].includes(word)) return word;
    return 'resume';
  } catch { return 'resume'; }
}

// ─── INTERNAL ─────────────────────────────────────────────────────────────────

async function call(system, messages, maxTokens = 300) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         CONFIG.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: CONFIG.AI_MODEL, max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}`);
  const data = await res.json();
  const text = data.content?.[0]?.text?.trim();
  if (!text) throw new Error('Empty response');
  return text;
}
