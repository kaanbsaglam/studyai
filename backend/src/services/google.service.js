/**
 * Google Identity Services — ID token verification
 *
 * The frontend obtains an ID token from Google's Identity Services and posts
 * it to /auth/google. We verify the token here and return the trusted claims.
 */

const { OAuth2Client } = require('google-auth-library');
const { env } = require('../config/env');

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

async function verifyGoogleIdToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  return {
    googleId: payload.sub,
    email: payload.email ? payload.email.toLowerCase() : null,
    emailVerified: payload.email_verified === true,
    name: payload.name || null,
  };
}

module.exports = { verifyGoogleIdToken };
