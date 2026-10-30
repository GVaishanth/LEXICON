import { getItem, putItem, getAllEntries } from './store.js';
import { isAdultWord } from './adult-words.js';

const API = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const LIST_URL = './data/dictionary.txt';
const VERSION_URL = './data/dictionary-version.txt';
const LIST_KEY = 'dictionary';
const LEGACY_PREFIX = 'lexicon.v1.dict.';
const FETCH_TIMEOUT = 8000;

const entries = new Map();
const inflight = new Map();
let listPromise = null;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function timedFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function fetchTextWithRetry(url, attempts = 3, options = {}) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await timedFetch(url, options);
      if (response.ok) return await response.text();
      if (response.status < 500 && response.status !== 429) return null;
    } catch { }
    if (i < attempts - 1) await sleep(300 * (i + 1));
  }
  return null;
}

export function loadWordList() {
  if (!listPromise) {
    listPromise = (async () => {
      const saved = await getItem('lists', LIST_KEY).catch(() => null);
      if (saved?.text) {
        refreshWordList(saved).catch(() => {});
        return parseWords(saved.text);
      }
      const record = await downloadList(null);
      return parseWords(record.text);
    })().catch(error => {
      listPromise = null;
      throw error;
    });
  }
  return listPromise;
}

function parseWords(text) {
  return text.split('\n').filter(Boolean);
}

async function downloadList(saved) {
  const version = (await fetchTextWithRetry(VERSION_URL, 3, { cache: 'no-cache' }) || '').trim();
  if (saved && version && saved.version === version) return saved;
  const text = await fetchTextWithRetry(LIST_URL, 3, { cache: 'no-cache' });
  if (!text) {
    if (saved) return saved;
    throw new Error('unavailable');
  }
  const record = { version: version || 'unknown', text };
  await putItem('lists', LIST_KEY, record).catch(() => {});
  return record;
}

async function refreshWordList(saved) {
  await downloadList(saved);
}

function lowerBound(words, target) {
  let lo = 0;
  let hi = words.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (words[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

const blobs = new WeakMap();
function blobOf(words) {
  let blob = blobs.get(words);
  if (blob === undefined) {
    blob = `\n${words.join('\n')}\n`;
    blobs.set(words, blob);
  }
  return blob;
}

function hasWordIn(words, q) {
  return words[lowerBound(words, q)] === q;
}

export function hasWord(words, query) {
  const q = query.trim().toLowerCase();
  return !!q && words[lowerBound(words, q)] === q;
}

const TIER = { exact: 4000, prefix: 3000, typo: 2000, contains: 1000 };
const REASON = { exact: 'Exact word', prefix: 'Starts with', typo: 'Close spelling', contains: 'Contains' };
const WEEK = 7 * 24 * 60 * 60 * 1000;
const HISTORY_STORE = 'history';
const usage = new Map();

export async function loadUsage() {
  try {
    const pairs = await getAllEntries(HISTORY_STORE);
    usage.clear();
    for (const [word, record] of pairs) usage.set(word, record);
  } catch { }
  return usage;
}

export async function recordLookup(word) {
  const key = word.trim().toLowerCase();
  if (!key) return;
  const previous = usage.get(key) || { count: 0, last: 0 };
  const record = { count: previous.count + 1, last: Date.now() };
  usage.set(key, record);
  await putItem(HISTORY_STORE, key, record).catch(() => {});
}

function withinOneEditPrefix(q, w) {
  const n = Math.min(w.length, q.length);
  if (Math.abs(q.length - n) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < q.length && j < n) {
    if (q.charCodeAt(i) === w.charCodeAt(j)) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (q.length > n) i++;
    else if (q.length < n) j++;
    else { i++; j++; }
  }
  return edits + (q.length - i) + (n - j) <= 1;
}

function withinOneEdit(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function scoreCandidate(kind, query, word) {
  let score = TIER[kind] + Math.round(500 * query.length / word.length);
  const record = usage.get(word);
  if (record) {
    score += Math.min(record.count, 3) * 80;
    if (Date.now() - record.last < WEEK) score += 40;
  }
  return score;
}

export function rankSuggestions(query, words, limit = 6, allowAdult = false) {
  const q = query.trim().toLowerCase();
  if (!q || !words.length) return [];
  const found = new Map();
  const add = (word, kind) => {
    if (found.has(word)) return;
    if (!allowAdult && isAdultWord(word)) return;
    found.set(word, { word, kind, score: scoreCandidate(kind, q, word), reason: REASON[kind], uses: usage.get(word)?.count || 0 });
  };

  if (hasWordIn(words, q)) add(q, 'exact');
  for (let i = lowerBound(words, q), taken = 0; i < words.length && words[i].startsWith(q) && taken < 400; i++, taken++) {
    add(words[i], 'prefix');
  }
  if (q.length >= 4 && found.size < limit) {
    const start = lowerBound(words, q[0]);
    const end = lowerBound(words, String.fromCharCode(q.charCodeAt(0) + 1));
    for (let i = start; i < end; i++) {
      const w = words[i];
      if (!w.startsWith(q) && withinOneEditPrefix(q, w)) add(w, 'typo');
    }
  }
  if (found.size < limit) {
    const blob = blobOf(words);
    let taken = 0;
    for (let pos = blob.indexOf(q); pos !== -1 && taken < 60;) {
      const lineStart = blob.lastIndexOf('\n', pos) + 1;
      const lineEnd = blob.indexOf('\n', pos);
      const w = blob.slice(lineStart, lineEnd);
      if (!w.startsWith(q)) { add(w, 'contains'); taken++; }
      pos = blob.indexOf(q, lineEnd + 1);
    }
  }
  return [...found.values()]
    .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))
    .slice(0, limit);
}

export function suggest(query, words, limit = 8, allowAdult = false) {
  return rankSuggestions(query, words, limit, allowAdult).map(r => r.word);
}

export async function lookupWord(word) {
  const key = word.trim().toLowerCase();
  if (entries.has(key)) return entries.get(key);
  const stored = await readStoredEntry(key);
  if (stored) { entries.set(key, stored); return stored; }
  if (inflight.has(key)) return inflight.get(key);
  const request = fetchEntry(key).finally(() => inflight.delete(key));
  inflight.set(key, request);
  return request;
}

async function readStoredEntry(key) {
  const hit = await getItem('entries', key).catch(() => null);
  if (hit) return hit;
  try {
    const legacy = localStorage.getItem(LEGACY_PREFIX + key);
    if (!legacy) return null;
    const entry = JSON.parse(legacy);
    await putItem('entries', key, entry);
    localStorage.removeItem(LEGACY_PREFIX + key);
    return entry;
  } catch {
    return null;
  }
}

async function fetchEntry(key) {
  const delays = [0, 700, 1600];
  let lastError = new Error('unavailable');
  for (const wait of delays) {
    if (wait) await sleep(wait);
    let response;
    try {
      response = await timedFetch(API + encodeURIComponent(key));
    } catch {
      lastError = new Error('unavailable');
      continue;
    }
    if (response.status === 404) throw new Error('not-found');
    if (response.status === 429 || response.status >= 500) { lastError = new Error('unavailable'); continue; }
    if (!response.ok) throw new Error('unavailable');
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) throw new Error('not-found');
    const entry = normalise(data[0]);
    entries.set(key, entry);
    await putItem('entries', key, entry).catch(() => {});
    return entry;
  }
  throw lastError;
}

function normalise(data) {
  const phonetics = data.phonetics || [];
  const phonetic = data.phonetic || (phonetics.find(p => p.text) || {}).text || '';
  const audio = (phonetics.find(p => p.audio) || {}).audio || '';
  return {
    word: data.word,
    phonetic,
    audio,
    meanings: (data.meanings || []).slice(0, 3).map(m => ({
      pos: m.partOfSpeech,
      defs: (m.definitions || []).slice(0, 3).map(d => ({ def: d.definition, example: d.example || '' })),
    })),
  };
}
