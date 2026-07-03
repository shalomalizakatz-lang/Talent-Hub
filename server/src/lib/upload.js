import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { env } from '../env.js';
import { ApiError } from '../middleware/errorHandler.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]);

const ALLOWED_EXTENSIONS = /\.(pdf|doc|docx)$/i;

export const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_EXTENSIONS.test(file.originalname)) {
      return cb(new ApiError(400, 'Resume must be a PDF, DOC, or DOCX file'));
    }
    cb(null, true);
  },
});

/**
 * Sniffs the actual file content (magic bytes) so a renamed .exe can't pass
 * as a .pdf just because of its filename/extension.
 */
export async function assertValidResumeContents(buffer, originalName) {
  const detected = await fileTypeFromBuffer(buffer);

  // Legacy .doc files (OLE compound format) are sometimes not confidently
  // fingerprinted by file-type; allow through if the extension says .doc
  // and the bytes at least match the OLE compound file signature.
  const OLE_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  const isOle = buffer.subarray(0, 8).equals(OLE_SIGNATURE);

  if (detected && ALLOWED_MIME_TYPES.has(detected.mime)) {
    return;
  }
  if (!detected && /\.doc$/i.test(originalName) && isOle) {
    return;
  }
  throw new ApiError(400, 'File contents do not match a PDF, DOC, or DOCX file');
}
