import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env, isObjectStorageConfigured } from '../env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

let s3Client = null;
function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT || undefined,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

function makeKey(originalName) {
  const ext = path.extname(originalName || '').slice(0, 10);
  return `resumes/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${ext}`;
}

/**
 * Uploads a resume buffer to object storage (S3-compatible) if configured,
 * otherwise falls back to local disk under server/uploads for dev/testing.
 * Returns { url, key } — url is what gets stored/served, key is what's
 * needed to delete the object later.
 */
export async function uploadResume(buffer, originalName, mimeType) {
  const key = makeKey(originalName);

  if (isObjectStorageConfigured) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );
    const url = env.S3_PUBLIC_BASE_URL
      ? `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`
      : `${env.S3_ENDPOINT.replace(/\/$/, '')}/${env.S3_BUCKET}/${key}`;
    return { url, key };
  }

  // Local disk fallback (dev only)
  const destDir = path.join(LOCAL_UPLOAD_DIR, path.dirname(key));
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(path.join(LOCAL_UPLOAD_DIR, key), buffer);
  return { url: `/uploads/${key}`, key };
}

export async function deleteResume(key) {
  if (!key) return;
  if (isObjectStorageConfigured) {
    await getS3Client().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    return;
  }
  const filePath = path.join(LOCAL_UPLOAD_DIR, key);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

export { LOCAL_UPLOAD_DIR };
