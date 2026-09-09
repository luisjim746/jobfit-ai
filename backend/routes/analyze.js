import { Router } from 'express';
import { validateAnalyzeRequest } from '../validators/analyzeRequestValidator.js';
import { analyzeJobOffer } from '../services/geminiService.js';

const analyzeRouter = Router();

// Analysis contract:
// seniorityAssessment.level:
// "trainee" | "junior" | "mid" | "senior"
//
// fitAssessment.recommendation:
// "apply_now" | "apply_after_preparation" | "low_fit"

analyzeRouter.post('/', async (request, response, next) => {
  const validationErrors = validateAnalyzeRequest(request.body);

  if (validationErrors.length > 0) {
    return response.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Invalid analysis request.',
        details: validationErrors,
      },
    });
  }

  // Re-trim here rather than trusting the validator to have mutated the
  // body: validateAnalyzeRequest only *checks* trimmed length, it never
  // changes request.body. Only the three validated fields are forwarded —
  // never the raw body — even though the validator already whitelists them.
  const jobDescription = request.body.jobDescription.trim();
  const candidateProfile = request.body.candidateProfile.trim();
  const profile = request.body.profile;

  try {
    // When the real Gemini integration is implemented in Phase 7,
    // this route should not need to change.
    const analysis = await analyzeJobOffer({ jobDescription, candidateProfile, profile });
    return response.status(200).json(analysis);
  } catch (error) {
    // No provider-specific handling here: whatever geminiService throws
    // (today: "not implemented"; from Phase 7: real Gemini/network
    // failures) is handed to the centralized error handler in server.js.
    return next(error);
  }
});

export default analyzeRouter;