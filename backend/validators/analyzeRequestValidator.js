// Validates the incoming POST /api/analyze body before it is allowed
// to continue to the analysis service.

const ALLOWED_PROFILES = [
  'frontend',
  'javascript',
  'react',
  'fullstack',
  'other',
];

const JOB_DESCRIPTION_MIN_LENGTH = 50;
const JOB_DESCRIPTION_MAX_LENGTH = 12000;

const CANDIDATE_PROFILE_MIN_LENGTH = 30;
const CANDIDATE_PROFILE_MAX_LENGTH = 6000;

/**
 * @param {unknown} body
 * @returns {Array<{ field: string, message: string }>}
 */
export function validateAnalyzeRequest(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return [
      {
        field: 'body',
        message: 'Request body must be a JSON object.',
      },
    ];
  }

  const errors = [];

  errors.push(
    ...validateRequiredString(
      body.jobDescription,
      'jobDescription',
      JOB_DESCRIPTION_MIN_LENGTH,
      JOB_DESCRIPTION_MAX_LENGTH
    )
  );

  errors.push(
    ...validateRequiredString(
      body.candidateProfile,
      'candidateProfile',
      CANDIDATE_PROFILE_MIN_LENGTH,
      CANDIDATE_PROFILE_MAX_LENGTH
    )
  );

  if (
    typeof body.profile !== 'string' ||
    !ALLOWED_PROFILES.includes(body.profile)
  ) {
    errors.push({
      field: 'profile',
      message: `profile must be one of: ${ALLOWED_PROFILES.join(', ')}.`,
    });
  }

  return errors;
}

function validateRequiredString(value, field, minLength, maxLength) {
  if (typeof value !== 'string') {
    return [
      {
        field,
        message: `${field} must be a string.`,
      },
    ];
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return [
      {
        field,
        message: `${field} cannot be empty.`,
      },
    ];
  }

  const errors = [];

  if (trimmed.length < minLength) {
    errors.push({
      field,
      message: `${field} must be at least ${minLength} characters long.`,
    });
  }

  if (trimmed.length > maxLength) {
    errors.push({
      field,
      message: `${field} must be at most ${maxLength} characters long.`,
    });
  }

  return errors;
}

export {
  ALLOWED_PROFILES,
  JOB_DESCRIPTION_MIN_LENGTH,
  JOB_DESCRIPTION_MAX_LENGTH,
  CANDIDATE_PROFILE_MIN_LENGTH,
  CANDIDATE_PROFILE_MAX_LENGTH,
};