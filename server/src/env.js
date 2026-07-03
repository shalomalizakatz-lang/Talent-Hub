import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 4000),
  DATABASE_URL: required('DATABASE_URL'),
  SESSION_SECRET: required('SESSION_SECRET'),
  SHARED_PASSWORD: required('SHARED_PASSWORD'),

  // Object storage (S3-compatible). If not set, falls back to local disk
  // storage under server/uploads — fine for local dev, NOT for production.
  S3_BUCKET: process.env.S3_BUCKET || '',
  S3_REGION: process.env.S3_REGION || 'auto',
  S3_ENDPOINT: process.env.S3_ENDPOINT || '',
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || '',
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || '',
  S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL || '',
  S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE === 'true',

  MAX_UPLOAD_BYTES: Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024),
  CLIENT_DIST_DIR: process.env.CLIENT_DIST_DIR || '',
};

export const isObjectStorageConfigured = Boolean(
  env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
);
