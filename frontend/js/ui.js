// Renders states and results into the DOM.
// Rule we agreed on: content coming from the AI (or from anything the user
// pasted) is only ever inserted with textContent or by building elements —
// never innerHTML. That's what keeps an offer full of malicious text from
// ever being able to inject markup/scripts into this page.

const stateElements = {
  empty: document.getElementById('empty-state'),
  loading: document.getElementById('loading-state'),
  error: document.getElementById('error-state'),
  result: document.getElementById('result-state'),
};

const errorMessageEl = document.getElementById('analysis-error-message');
const analyzeButton = document.getElementById('analyze-button');

const recommendationBadge = document.getElementById('recommendation-badge');
const seniorityBadge = document.getElementById('seniority-level-badge');
const recommendationReasoning = document.getElementById('recommendation-reasoning');
const roleSnapshotEl = document.getElementById('role-snapshot');
const mustHaveListEl = document.getElementById('must-have-requirements');
const niceToHaveListEl = document.getElementById('nice-to-have-requirements');
const seniorityReasoningEl = document.getElementById('seniority-reasoning');
const matchesListEl = document.getElementById('candidate-matches');
const gapsListEl = document.getElementById('candidate-gaps');
const cvKeywordsListEl = document.getElementById('cv-keywords');
const strengthsListEl = document.getElementById('strengths-to-highlight');
const projectEvidenceListEl = document.getElementById('project-evidence');
const interviewPrepListEl = document.getElementById('interview-preparation');
const priorityLearningListEl = document.getElementById('priority-learning');

const RECOMMENDATION_LABELS = {
  apply_now: 'Apply now',
  apply_after_preparation: 'Apply after preparation',
  low_fit: 'Low fit',
};

const RECOMMENDATION_CLASSES = {
  apply_now: 'recommendation-badge--apply-now',
  apply_after_preparation: 'recommendation-badge--prepare',
  low_fit: 'recommendation-badge--low-fit',
};

const GAP_TYPE_LABELS = {
  missing: 'missing',
  not_demonstrated: 'not demonstrated',
};

const GAP_TYPE_CLASSES = {
  missing: 'gap-type--missing',
  not_demonstrated: 'gap-type--not-demonstrated',
};

const GAP_PRIORITY_CLASSES = {
  high: 'gap-priority--high',
  medium: 'gap-priority--medium',
  low: 'gap-priority--low',
};

/**
 * Shows exactly one of the four states and hides the other three via the
 * `hidden` attribute (never inline display, so the CSS [hidden] rule keeps
 * working as the single source of truth).
 * @param {'empty'|'loading'|'error'|'result'} name
 */
export function showState(name) {
  for (const [key, el] of Object.entries(stateElements)) {
    if (!el) continue;
    el.hidden = key !== name;
  }
}

/**
 * @param {boolean} isLoading
 */
export function setAnalyzing(isLoading) {
  analyzeButton.disabled = isLoading;
}

/**
 * @param {string} message user-safe error text (never a raw stack trace)
 */
export function showErrorState(message) {
  errorMessageEl.textContent = message;
  showState('error');
}

/**
 * @param {'job-description'|'candidate-profile'} fieldId
 * @param {string} message
 */
export function setFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}-error`);
  field.setAttribute('aria-invalid', 'true');
  errorEl.textContent = message;
  errorEl.hidden = false;
}

/**
 * @param {'job-description'|'candidate-profile'} fieldId
 */
export function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}-error`);
  field.removeAttribute('aria-invalid');
  errorEl.textContent = '';
  errorEl.hidden = true;
}

/**
 * Renders a full analysis (the structured contract) into the result panel.
 * Does not show the result state itself — call showState('result') after.
 * @param {object} data
 */
export function renderResult(data) {
  renderRecommendation(data.fitAssessment);
  renderSeniority(data.seniorityAssessment);

  roleSnapshotEl.textContent = data.roleSnapshot;

  fillTagList(mustHaveListEl, data.mustHaveRequirements);
  fillTagList(niceToHaveListEl, data.niceToHaveRequirements);

  fillMatches(matchesListEl, data.fitAssessment.matches);
  fillGaps(gapsListEl, data.fitAssessment.gaps);

  fillTagList(cvKeywordsListEl, data.applicationPlan.cvKeywords);
  fillPlainList(strengthsListEl, data.applicationPlan.strengthsToHighlight);
  fillPlainList(projectEvidenceListEl, data.applicationPlan.projectEvidence);
  fillPlainList(interviewPrepListEl, data.applicationPlan.interviewPreparation);
  fillPlainList(priorityLearningListEl, data.applicationPlan.priorityLearning);
}

function renderRecommendation(fitAssessment) {
  recommendationBadge.textContent = RECOMMENDATION_LABELS[fitAssessment.recommendation] || fitAssessment.recommendation;
  recommendationBadge.className = 'recommendation-badge';
  const modifierClass = RECOMMENDATION_CLASSES[fitAssessment.recommendation];
  if (modifierClass) recommendationBadge.classList.add(modifierClass);

  recommendationReasoning.textContent = fitAssessment.reasoning;
}

/**
 * @param {{
 *   level: 'trainee' | 'junior' | 'mid' | 'senior',
 *   reasoning: string
 * }} seniorityAssessment
 */
function renderSeniority(seniorityAssessment) {
  seniorityBadge.textContent = capitalize(seniorityAssessment.level);
  seniorityReasoningEl.textContent = seniorityAssessment.reasoning;
}

function fillTagList(listEl, items) {
  clearChildren(listEl);
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    listEl.appendChild(li);
  }
}

function fillPlainList(listEl, items) {
  clearChildren(listEl);
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    listEl.appendChild(li);
  }
}

function fillMatches(listEl, matches) {
  clearChildren(listEl);
  for (const match of matches) {
    const li = document.createElement('li');

    const requirementEl = document.createElement('span');
    requirementEl.className = 'match-requirement';
    requirementEl.textContent = match.requirement;

    const evidenceEl = document.createElement('span');
    evidenceEl.className = 'match-evidence';
    evidenceEl.textContent = match.evidence;

    li.appendChild(requirementEl);
    li.appendChild(evidenceEl);
    listEl.appendChild(li);
  }
}

function fillGaps(listEl, gaps) {
  clearChildren(listEl);
  for (const gap of gaps) {
    const li = document.createElement('li');

    const requirementEl = document.createElement('span');
    requirementEl.className = 'gap-requirement';
    requirementEl.textContent = gap.requirement;

    const metaEl = document.createElement('div');
    metaEl.className = 'gap-meta';

    const typeEl = document.createElement('span');
    typeEl.className = `gap-type ${GAP_TYPE_CLASSES[gap.type] || ''}`.trim();
    typeEl.textContent = GAP_TYPE_LABELS[gap.type] || gap.type;

    const priorityEl = document.createElement('span');
    priorityEl.className = `gap-priority ${GAP_PRIORITY_CLASSES[gap.priority] || ''}`.trim();
    priorityEl.textContent = `${gap.priority} priority`;

    metaEl.appendChild(typeEl);
    metaEl.appendChild(priorityEl);

    const suggestionEl = document.createElement('p');
    suggestionEl.className = 'gap-suggestion';
    suggestionEl.textContent = gap.suggestion;

    li.appendChild(requirementEl);
    li.appendChild(metaEl);
    li.appendChild(suggestionEl);
    listEl.appendChild(li);
  }
}

/**
 * Renders the history strip. `onSelect(entry)` is called with the full
 * stored entry when the user clicks one — no network request involved.
 * @param {Array<object>} entries
 * @param {(entry: object) => void} onSelect
 */
export function renderHistory(entries, onSelect) {
  const listEl = document.getElementById('history-list');
  clearChildren(listEl);

  if (entries.length === 0) {
    const li = document.createElement('li');
    li.className = 'history-empty';
    li.textContent = 'No analyses yet.';
    listEl.appendChild(li);
    return;
  }

  for (const entry of entries) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';

    const previewEl = document.createElement('span');
    previewEl.textContent = entry.offerPreview;

    const dateEl = document.createElement('span');
    dateEl.className = 'mono';
    dateEl.textContent = formatDate(entry.date);

    button.appendChild(previewEl);
    button.appendChild(dateEl);
    button.addEventListener('click', () => onSelect(entry));

    li.appendChild(button);
    listEl.appendChild(li);
  }
}

/**
 * Briefly changes the copy button's label to confirm the copy worked,
 * then restores it.
 */
export function showCopyFeedback() {
  const copyButton = document.getElementById('copy-button');
  const originalText = copyButton.textContent;
  copyButton.textContent = 'Copied!';
  copyButton.disabled = true;
  setTimeout(() => {
    copyButton.textContent = originalText;
    copyButton.disabled = false;
  }, 1800);
}

function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function capitalize(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}