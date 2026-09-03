// Talks to our own backend only. The frontend never sees the Gemini API key
// and never calls Gemini directly — that boundary is the whole point of
// having a backend (see /backend/services/geminiService.js).

const API_BASE_URL = 'http://localhost:3000';

/**
 * Calls POST /api/analyze on our backend.
 * @param {{ jobDescription: string, candidateProfile: string, profile: string }} payload
 * @returns {Promise<object>} the structured analysis (see the data contract)
 * @throws {Error} with a user-safe message on any network/server/parse failure
 */
export async function analyzeOffer(payload) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // fetch() itself only rejects on network-level failures (offline, DNS,
    // CORS, server not running) — not on HTTP error status codes.
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // Response wasn't valid JSON at all — treat as a generic server error.
  }

  if (!response.ok) {
    const message = body?.error?.message || 'Something went wrong while analyzing the offer.';
    throw new Error(message);
  }

  if (!body) {
    throw new Error('The server returned an unexpected response.');
  }

  return body;
}