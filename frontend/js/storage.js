// Handles reading/writing the analysis history in localStorage.
// Keeps only the last 3 analyses: date, profile, a short preview of the
// offer, and the full structured result — never the full offer/candidate
// text, per the Phase 4 decision.

const STORAGE_KEY = 'jobfit-ai:history';
const MAX_ENTRIES = 3;
const PREVIEW_LENGTH = 90;

/**
 * @returns {Array<object>} stored entries, newest first.
 * Never throws: missing, corrupted or structurally invalid storage data
 * is treated safely.
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

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isValidHistoryEntry)
      .slice(0, MAX_ENTRIES);
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
 * Checks only the persisted structure needed by the frontend.
 * This is intentionally lighter than the backend AI-response validator:
 * storage.js only needs to prevent malformed local data from reaching
 * renderHistory() / renderResult().
 */
function isValidHistoryEntry(entry) {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    return false;
  }

  if (typeof entry.id !== 'string' || entry.id.trim() === '') {
    return false;
  }

  if (
    typeof entry.date !== 'string' ||
    Number.isNaN(Date.parse(entry.date))
  ) {
    return false;
  }

  if (
    typeof entry.offerPreview !== 'string' ||
    entry.offerPreview.trim() === ''
  ) {
    return false;
  }

  if (!isUiSafeAnalysisResult(entry.result)) {
    return false;
  }

  return true;
}

/**
 * Performs a shallow structural check of the analysis fields that ui.js
 * reads directly. It does not duplicate the exhaustive Gemini contract
 * validation performed by the backend.
 */
function isUiSafeAnalysisResult(result) {
  if (
    result === null ||
    typeof result !== 'object' ||
    Array.isArray(result)
  ) {
    return false;
  }

  if (typeof result.roleSnapshot !== 'string') {
    return false;
  }

  if (!Array.isArray(result.mustHaveRequirements)) {
    return false;
  }

  if (!Array.isArray(result.niceToHaveRequirements)) {
    return false;
  }

  if (
    result.seniorityAssessment === null ||
    typeof result.seniorityAssessment !== 'object' ||
    typeof result.seniorityAssessment.level !== 'string' ||
    typeof result.seniorityAssessment.reasoning !== 'string'
  ) {
    return false;
  }

  if (
    result.fitAssessment === null ||
    typeof result.fitAssessment !== 'object' ||
    typeof result.fitAssessment.recommendation !== 'string' ||
    typeof result.fitAssessment.reasoning !== 'string' ||
    !Array.isArray(result.fitAssessment.matches) ||
    !Array.isArray(result.fitAssessment.gaps)
  ) {
    return false;
  }

  if (
    result.applicationPlan === null ||
    typeof result.applicationPlan !== 'object' ||
    !Array.isArray(result.applicationPlan.cvKeywords) ||
    !Array.isArray(result.applicationPlan.strengthsToHighlight) ||
    !Array.isArray(result.applicationPlan.projectEvidence) ||
    !Array.isArray(result.applicationPlan.interviewPreparation) ||
    !Array.isArray(result.applicationPlan.priorityLearning)
  ) {
    return false;
  }

  return true;
}

function buildPreview(text) {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (normalized.length <= PREVIEW_LENGTH) return normalized;
  return `${normalized.slice(0, PREVIEW_LENGTH).trim()}…`;
}