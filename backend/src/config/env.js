import dotenv from 'dotenv';

dotenv.config();

// CLIENT_URL can be a single origin or comma-separated list for production (e.g. https://app.com,https://www.app.com)
const clientUrlRaw = process.env.CLIENT_URL || 'http://localhost:5173';
const clientUrls = clientUrlRaw.split(',').map((u) => u.trim()).filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  clientUrl: clientUrls[0] || 'http://localhost:5173',
  clientUrls: clientUrls.length > 0 ? clientUrls : ['http://localhost:5173'],
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  answerEncryptionKey: process.env.ANSWER_ENCRYPTION_KEY,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'question-images',
  // Email (Resend)
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM || 'QuizApp <no-reply@quizapp.com>',
};

const isProduction = env.nodeEnv === 'production';

if (!env.jwtSecret) {
  const message = 'JWT_SECRET is required';
  if (isProduction) {
    throw new Error(message);
  } else {
    console.warn(`[env] ${message} – using insecure fallback for non-production environment.`);
    env.jwtSecret = env.jwtSecret || 'insecure-development-secret-change-me';
  }
}

if (!env.answerEncryptionKey || env.answerEncryptionKey.length < 32) {
  const message = 'ANSWER_ENCRYPTION_KEY must be at least 32 characters';
  if (isProduction) {
    throw new Error(message);
  } else {
    console.warn(`[env] ${message} – using insecure fallback for non-production environment.`);
    env.answerEncryptionKey =
      env.answerEncryptionKey || 'development-answer-encryption-key-must-be-32-chars!';
  }
}

if (!env.supabaseUrl || !env.supabaseServiceKey) {
  const message = 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required';
  if (isProduction) {
    throw new Error(message);
  } else {
    console.warn(`[env] ${message} – Supabase is not fully configured; some features may not work.`);
  }
}

