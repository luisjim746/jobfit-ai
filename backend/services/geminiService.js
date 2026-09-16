// Calls the Gemini API to run the analysis. All provider-specific details
// (SDK, model name, request/response shape) live here and nowhere else —
// routes/analyze.js only knows this module exports an async function that
// resolves with the analysis or throws a controlled error.

import { GoogleGenAI } from '@google/genai';
import { buildAnalysisPrompt } from './promptBuilder.js';
import { validateAnalysisResponse } from '../validators/analysisResponseValidator.js';

const DEFAULT_MODEL = 'gemini-3.6-flash';
const MODEL_NAME = process.env.GEMINI_MODEL || DEFAULT_MODEL;

// Created lazily (on first real call) rather than at module load, so that
// importing this file never fails just because the environment isn't
// configured yet — server.js can start, and /api/health works, even
// before a GEMINI_API_KEY is set. The missing-key case becomes a normal
// per-request controlled error instead of a crash at startup.
let cachedClient = null;

function getClient() {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw operationalError({
      status: 500,
      code: 'PROVIDER_NOT_CONFIGURED',
      message: 'The analysis service is not configured yet.',
    });
  }

  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

/**
 * @param {{ jobDescription: string, candidateProfile: string, profile: string }} input
 *   Already validated and trimmed by routes/analyze.js.
 * @returns {Promise<object>} an analysis object that has been checked
 *   against the JobFit AI contract (required fields present, enum values
 *   valid). This is what "made available to the next processing step" in
 *   the previous ticket has become: this step is the validation itself —
 *   only a validated analysis is ever returned.
 */
export async function analyzeJobOffer({ jobDescription, candidateProfile, profile }) {
  const client = getClient();
  const { systemInstruction, userContent } = buildAnalysisPrompt({
    jobDescription,
    candidateProfile,
    profile,
  });

  let response;

  try {
    response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: userContent,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });
  } catch (cause) {
    throw operationalError({
      status: 502,
      code: 'PROVIDER_REQUEST_FAILED',
      message: 'The analysis provider is currently unavailable. Please try again.',
      cause,
    });
  }

  return parseAndValidateAnalysis(response.text);

}

/**
 * Parses raw text as JSON and checks it against the analysis contract.
 * Split out from analyzeJobOffer so it can be unit-tested with crafted
 * strings, without needing a real (or mocked) network call.
 *
 * @param {string} rawText
 * @returns {object} a contract-valid analysis
 * @throws {Error} a controlled PROVIDER_INVALID_RESPONSE error if the text
 *   isn't valid JSON, or is valid JSON that doesn't match the contract.
 *   The specific reason (parse error, or which field failed) is attached
 *   as .cause for server logs only — never sent to the client, since it
 *   describes our own contract/prompt, not something the user can act on.
 */
export function parseAndValidateAnalysis(rawText) {
  let analysis;

  try {
    analysis = JSON.parse(rawText);
  } catch (cause) {
    throw operationalError({
      status: 502,
      code: 'PROVIDER_INVALID_RESPONSE',
      message: 'The analysis provider returned an unexpected response.',
      cause,
    });
  }

  const validationErrors = validateAnalysisResponse(analysis);

  if (validationErrors.length > 0) {
    throw operationalError({
      status: 502,
      code: 'PROVIDER_INVALID_RESPONSE',
      message: 'The analysis provider returned an unexpected response.',
      cause: new Error(`Analysis response failed contract validation: ${JSON.stringify(validationErrors)}`),
    });
  }

  return analysis;
}

// Builds an error the same way geminiService always has (status/code/
// isOperational), so server.js's existing centralized handler processes
// provider failures through the exact same path as any other controlled
// error — no Gemini-specific branch needed there.
function operationalError({ status, code, message, cause }) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.isOperational = true;
  if (cause) error.cause = cause; // server-side logging only, never serialized to the client
  return error;
}