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
  await tx.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    html,
  });
}

