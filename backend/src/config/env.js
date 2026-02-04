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
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM || 'no-reply@quizapp.com',
};

if (!env.jwtSecret) {
  throw new Error('JWT_SECRET is required');
}

if (!env.answerEncryptionKey || env.answerEncryptionKey.length < 32) {
  throw new Error('ANSWER_ENCRYPTION_KEY must be at least 32 characters');
}

if (!env.supabaseUrl || !env.supabaseServiceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

