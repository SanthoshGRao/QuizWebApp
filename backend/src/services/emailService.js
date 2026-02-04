import { Resend } from 'resend';
import { env } from '../config/env.js';

// Lazily configure Resend so that development can run without a real API key.
// In production, a missing key should still be considered misconfiguration.
const hasApiKey = !!env.resendApiKey;
const resend = hasApiKey ? new Resend(env.resendApiKey) : null;

export async function sendEmail({ to, subject, html }) {
  // If there is no API key configured, log and no-op in non-production.
  if (!resend) {
    if (env.nodeEnv !== 'production') {
      console.warn('[email] RESEND_API_KEY not set – skipping email send in development.', {
        to,
        subject,
      });
      return;
    }
    throw new Error('Email service is not configured: RESEND_API_KEY is missing.');
  }

  try {
    await resend.emails.send({
      from: env.emailFrom,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[email] Failed to send email via Resend', {
      to,
      subject,
      error: err?.message || err,
    });
    throw err;
  }
}

