import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter;

export function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, html }) {
  const tx = getTransporter();
  try {
    await tx.sendMail({
      from: env.smtpFrom,
      to,
      subject,
      html,
    });
  } catch (err) {
    // Centralized logging for email issues. Callers can decide whether to swallow or surface.
    console.error('[email] Failed to send email', {
      to,
      subject,
      error: err?.message || err,
    });
    throw err;
  }
}

