// Handles reading/writing the analysis history in localStorage.
// Keeps only the last 3 analyses: date, profile, a short preview of the
// offer, and the full structured result — never the full offer/candidate
// text, per the Phase 4 decision.

const STORAGE_KEY = 'jobfit-ai:history';
const MAX_ENTRIES = 3;
const PREVIEW_LENGTH = 90;

/**
 * @returns {Array<object>} stored entries, newest first. Never throws:
 * a corrupted or missing value in localStorage is treated as "no history".
 */
export function getHistory() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage can throw in private-browsing modes or when disabled.
    return [];
  }

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Saves one analysis at the front of the history, trimmed to MAX_ENTRIES.
 * @param {object} params
 * @param {string} params.profile - selected radio value (e.g. "frontend")
 * @param {string} params.jobDescription - full offer text, only used to build a preview
 * @param {object} params.result - the structured analysis returned by the backend
 * @returns {object} the entry that was saved (useful to select it right away)
 */
export function saveToHistory({ profile, jobDescription, result }) {
  const entry = {
    id: `${Date.now()}`,
    date: new Date().toISOString(),
    profile,
    offerPreview: buildPreview(jobDescription),
    result,
  };

  const current = getHistory();
  const next = [entry, ...current].slice(0, MAX_ENTRIES);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or unavailable: the analysis still rendered on screen,
    // we just won't be able to bring it back from history later.
  }

  return entry;
}

/**
 * @param {string} id
 * @returns {object|undefined}
 */

function buildPreview(text) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (normalized.length <= PREVIEW_LENGTH) return normalized;
  return `${normalized.slice(0, PREVIEW_LENGTH).trim()}…`;
}