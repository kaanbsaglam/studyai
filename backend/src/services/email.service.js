/**
 * Email Service (Brevo transactional API)
 *
 * Single sendEmail({ to, subject, html, text }) function. Calls Brevo's
 * /v3/smtp/email endpoint directly via fetch — no SDK dependency.
 */

const { env } = require('../config/env');
const logger = require('../config/logger');

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

async function sendEmail({ to, subject, html, text }) {
  const payload = {
    sender: { name: env.EMAIL_FROM_NAME, email: env.EMAIL_FROM_ADDRESS },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text,
  };

  const response = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    logger.error('Brevo email send failed', {
      status: response.status,
      to,
      body: body.slice(0, 500),
    });
    throw new Error(`Brevo send failed (${response.status})`);
  }

  return response.json();
}

module.exports = { sendEmail };
