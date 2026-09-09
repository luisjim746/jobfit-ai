/**
 * @param {{ jobDescription: string, candidateProfile: string, profile: string }} _input
 * @returns {Promise<object>} the structured analysis (see the data contract)
 */
export async function analyzeJobOffer(_input) {
  const error = new Error('The analysis service is not implemented yet.');

  error.status = 501;
  error.code = 'NOT_IMPLEMENTED';
  error.isOperational = true;

  throw error;
}