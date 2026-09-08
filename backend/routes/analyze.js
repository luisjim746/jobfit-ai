import { Router } from 'express';
import { validateAnalyzeRequest } from '../validators/analyzeRequestValidator.js';

const analyzeRouter = Router();

// Analysis contract:
// seniorityAssessment.level:
// "trainee" | "junior" | "mid" | "senior"
//
// fitAssessment.recommendation:
// "apply_now" | "apply_after_preparation" | "low_fit"

analyzeRouter.post('/', (request, response) => {
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

  // Valid requests will reach the analysis service here
  // when the Gemini integration is implemented.

  return response.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'The analysis endpoint is not implemented yet.',
    },
  });
});

export default analyzeRouter;