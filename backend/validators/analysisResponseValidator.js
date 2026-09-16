// Validates the parsed JSON that Gemini returns against the JobFit AI
// analysis contract, before it's ever allowed to reach the frontend.
//
// This is deliberately symmetric to analyzeRequestValidator.js — same
// "return an array of {field, message}, empty means valid" style — but
// checks the AI's output instead of the user's input.

import {
  ALLOWED_SENIORITY_LEVELS,
  ALLOWED_RECOMMENDATIONS,
  ALLOWED_GAP_TYPES,
  ALLOWED_GAP_PRIORITIES,
} from '../services/promptBuilder.js';

const APPLICATION_PLAN_LIST_FIELDS = [
  'cvKeywords',
  'strengthsToHighlight',
  'projectEvidence',
  'interviewPreparation',
  'priorityLearning',
];

/**
 * @param {unknown} data - the parsed JSON Gemini returned
 * @returns {Array<{ field: string, message: string }>} validation errors.
 * An empty array means the response matches the analysis contract.
 */
export function validateAnalysisResponse(data) {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return [{ field: 'response', message: 'Analysis response must be a JSON object.' }];
  }

  return [
    ...validateNonEmptyString(data.roleSnapshot, 'roleSnapshot'),
    ...validateStringArray(data.mustHaveRequirements, 'mustHaveRequirements'),
    ...validateStringArray(data.niceToHaveRequirements, 'niceToHaveRequirements'),
    ...validateSeniorityAssessment(data.seniorityAssessment),
    ...validateFitAssessment(data.fitAssessment),
    ...validateApplicationPlan(data.applicationPlan),
  ];
}

function validateSeniorityAssessment(value) {
  if (value === null || typeof value !== 'object' ||
  Array.isArray(value)) {
    return [{ field: 'seniorityAssessment', message: 'seniorityAssessment must be an object.' }];
  }

  const errors = [];

  if (!ALLOWED_SENIORITY_LEVELS.includes(value.level)) {
    errors.push({
      field: 'seniorityAssessment.level',
      message: `seniorityAssessment.level must be one of: ${ALLOWED_SENIORITY_LEVELS.join(', ')}.`,
    });
  }

  errors.push(...validateNonEmptyString(value.reasoning, 'seniorityAssessment.reasoning'));

  return errors;
}

function validateFitAssessment(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [{ field: 'fitAssessment', message: 'fitAssessment must be an object.' }];
  }

  const errors = [];

  if (!ALLOWED_RECOMMENDATIONS.includes(value.recommendation)) {
    errors.push({
      field: 'fitAssessment.recommendation',
      message: `fitAssessment.recommendation must be one of: ${ALLOWED_RECOMMENDATIONS.join(', ')}.`,
    });
  }

  errors.push(...validateNonEmptyString(value.reasoning, 'fitAssessment.reasoning'));

  if (!Array.isArray(value.matches)) {
    errors.push({ field: 'fitAssessment.matches', message: 'fitAssessment.matches must be an array.' });
  } else {
    value.matches.forEach((match, index) => {
      errors.push(...validateMatch(match, `fitAssessment.matches[${index}]`));
    });
  }

  if (!Array.isArray(value.gaps)) {
    errors.push({ field: 'fitAssessment.gaps', message: 'fitAssessment.gaps must be an array.' });
  } else {
    value.gaps.forEach((gap, index) => {
      errors.push(...validateGap(gap, `fitAssessment.gaps[${index}]`));
    });
  }

  return errors;
}

function validateMatch(match, path) {
  if (match === null || typeof match !== 'object') {
    return [{ field: path, message: `${path} must be an object.` }];
  }

  return [
    ...validateNonEmptyString(match.requirement, `${path}.requirement`),
    ...validateNonEmptyString(match.evidence, `${path}.evidence`),
  ];
}

function validateGap(gap, path) {
  if (gap === null || typeof gap !== 'object') {
    return [{ field: path, message: `${path} must be an object.` }];
  }

  const errors = [
    ...validateNonEmptyString(gap.requirement, `${path}.requirement`),
    ...validateNonEmptyString(gap.suggestion, `${path}.suggestion`),
  ];

  if (!ALLOWED_GAP_TYPES.includes(gap.type)) {
    errors.push({
      field: `${path}.type`,
      message: `${path}.type must be one of: ${ALLOWED_GAP_TYPES.join(', ')}.`,
    });
  }

  if (!ALLOWED_GAP_PRIORITIES.includes(gap.priority)) {
    errors.push({
      field: `${path}.priority`,
      message: `${path}.priority must be one of: ${ALLOWED_GAP_PRIORITIES.join(', ')}.`,
    });
  }

  return errors;
}

function validateApplicationPlan(value) {
  if (value === null || typeof value !== 'object') {
    return [{ field: 'applicationPlan', message: 'applicationPlan must be an object.' }];
  }

  return APPLICATION_PLAN_LIST_FIELDS.flatMap((key) =>
    validateStringArray(value[key], `applicationPlan.${key}`)
  );
}

function validateNonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return [{ field, message: `${field} must be a non-empty string.` }];
  }
  return [];
}

function validateStringArray(value, field) {
  if (!Array.isArray(value)) {
    return [{ field, message: `${field} must be an array.` }];
  }
  if (value.some((item) => typeof item !== 'string')) {
    return [{ field, message: `${field} must be an array of strings.` }];
  }
  return [];
}
