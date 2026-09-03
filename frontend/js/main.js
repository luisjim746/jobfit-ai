// Entry point of the frontend: wires the form, runs validation, calls the
// backend through api.js, and hands the result to ui.js / storage.js.
// This is the only file that knows the full order of operations — api.js,
// ui.js and storage.js never call each other directly.

import { analyzeOffer } from './api.js';
import {
    showState,
    setAnalyzing,
    showErrorState,
    setFieldError,
    clearFieldError,
    renderResult,
    renderHistory,
    showCopyFeedback,
} from './ui.js';
import { getHistory, saveToHistory } from './storage.js';

const form = document.getElementById('analyze-form');
const jobDescriptionField = document.getElementById('job-description');
const candidateProfileField = document.getElementById('candidate-profile');
const retryButton = document.getElementById('retry-button');
const copyButton = document.getElementById('copy-button');

const VALIDATION_RULES = {
    jobDescription: { min: 50, max: 12000, label: 'the job offer' },
    candidateProfile: { min: 30, max: 6000, label: 'your profile' },
};

const ALLOWED_PROFILES = ['frontend', 'javascript', 'react', 'fullstack', 'other',];

// Holds the inputs and the result of the last successful/attempted request,
// so Retry can re-run it and Copy can format the current result — without
// main.js reaching back into the DOM for things ui.js already owns.
let lastRequest = null;
let lastResult = null;

init();

function init() {
    form.addEventListener('submit', handleSubmit);
    retryButton.addEventListener('click', handleRetry);
    copyButton.addEventListener('click', handleCopy);

    renderHistory(getHistory(), handleHistorySelect);
}

async function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(form);
    const payload = {
        jobDescription: String(formData.get('jobDescription') ?? '').trim(),
        candidateProfile: String(formData.get('candidateProfile') ?? '').trim(),
        profile: String(formData.get('profile') ?? ''),
    };

    if (!validate(payload)) return;

    lastRequest = payload;
    await runAnalysis(payload);
}

async function handleRetry() {
    if (!lastRequest) return;
    await runAnalysis(lastRequest);
}

async function runAnalysis(payload) {
    setAnalyzing(true);
    showState('loading');

    try {
        const result = await analyzeOffer(payload);
        lastResult = result;
        renderResult(result);
        showState('result');

        saveToHistory({
            profile: payload.profile,
            jobDescription: payload.jobDescription,
            result,
        });
        renderHistory(getHistory(), handleHistorySelect);
    } catch (error) {
        showErrorState(error.message);
    } finally {
        setAnalyzing(false);
    }
}

function handleHistorySelect(entry) {
    lastResult = entry.result;
    renderResult(entry.result);
    showState('result');
}

async function handleCopy() {
    if (!lastResult) return;

    try {
        await navigator.clipboard.writeText(formatResultAsText(lastResult));
        showCopyFeedback();
    } catch {
        // Clipboard API can fail (permissions, insecure context). Nothing
        // destructive happened, so we just skip the success feedback.
    }
}

/**
 * @param {{jobDescription: string, candidateProfile: string, profile: string}} payload
 * @returns {boolean} true if valid; false and renders field errors if not
 */
function validate(payload) {
  const jobDescriptionIsValid = validateField(
    'job-description',
    payload.jobDescription,
    VALIDATION_RULES.jobDescription
  );

  const candidateProfileIsValid = validateField(
    'candidate-profile',
    payload.candidateProfile,
    VALIDATION_RULES.candidateProfile
  );

  const profileIsValid = ALLOWED_PROFILES.includes(payload.profile);

  return (
    jobDescriptionIsValid &&
    candidateProfileIsValid &&
    profileIsValid
  );
}

function validateField(fieldId, value, rule) {
    if (value.length === 0) {
        setFieldError(fieldId, `Please add ${rule.label} — this field can't be empty.`);
        return false;
    }

    if (value.length < rule.min) {
        setFieldError(fieldId, `That looks too short. Add a bit more detail about ${rule.label} (at least ${rule.min} characters).`);
        return false;
    }

    if (value.length > rule.max) {
        setFieldError(fieldId, `That's too long (max ${rule.max} characters). Try trimming ${rule.label}.`);
        return false;
    }

    clearFieldError(fieldId);
    return true;
}

function formatResultAsText(data) {
    const lines = [];
    lines.push(`Recommendation: ${data.fitAssessment.recommendation} — ${data.fitAssessment.reasoning}`);
    lines.push(`Seniority: ${data.seniorityAssessment.level} — ${data.seniorityAssessment.reasoning}`);
    lines.push('');
    lines.push('Role snapshot:');
    lines.push(data.roleSnapshot);
    lines.push('');
    lines.push(`Must-have requirements: ${data.mustHaveRequirements.join(', ')}`);
    lines.push(`Nice-to-have requirements: ${data.niceToHaveRequirements.join(', ')}`);
    lines.push('');
    lines.push('Matches:');
    for (const match of data.fitAssessment.matches) {
        lines.push(`- ${match.requirement}: ${match.evidence}`);
    }
    lines.push('');
    lines.push('Gaps:');
    for (const gap of data.fitAssessment.gaps) {
        lines.push(`- ${gap.requirement} (${gap.type}, ${gap.priority} priority): ${gap.suggestion}`);
    }
    lines.push('');
    lines.push(`CV keywords: ${data.applicationPlan.cvKeywords.join(', ')}`);
    lines.push(`Strengths to highlight: ${data.applicationPlan.strengthsToHighlight.join(', ')}`);
    lines.push(`Project evidence: ${data.applicationPlan.projectEvidence.join(', ')}`);
    lines.push(`Interview preparation: ${data.applicationPlan.interviewPreparation.join(', ')}`);
    lines.push(`Priority learning: ${data.applicationPlan.priorityLearning.join(', ')}`);

    return lines.join('\n');
}