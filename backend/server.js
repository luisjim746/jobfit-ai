import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import analyzeRouter from './routes/analyze.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.use('/api/analyze', analyzeRouter);

app.use((error, request, response, next) => {
  if (
    error instanceof SyntaxError &&
    error.status === 400 &&
    'body' in error
  ) {
    return response.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Request body must be valid JSON.',
      },
    });
  }

  const isControlledError =
  error.isOperational === true &&
  Number.isInteger(error.status) &&
  error.status >= 400 &&
  error.status < 600;

  if (isControlledError) {
    if (error.status >= 500) console.error(error);
    return response.status(error.status).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message,
      },
    });
  }

  console.error(error);

  return response.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong on our end.',
    },
  });
});

app.listen(PORT, () => {
  console.log(`JobFit AI backend running on http://localhost:${PORT}`);
});