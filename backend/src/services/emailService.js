import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html }) {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM,
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

