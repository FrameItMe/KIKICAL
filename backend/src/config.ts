import 'dotenv/config';

/**
 * Application Configuration
 * Loads environment variables and validates required settings
 */

const SECRET = process.env.JWT_SECRET || process.env.jwt_secret;

if (!SECRET) {
  throw new Error("JWT_SECRET is not set in environment variables. Please configure it in .env file.");
}

export const JWT_SECRET = SECRET as string;
