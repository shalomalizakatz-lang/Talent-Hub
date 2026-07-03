import { ApiError } from '../middleware/errorHandler.js';

export function requireString(value, fieldName, { maxLength = 500 } = {}) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, `${fieldName} is required`);
  }
  if (value.length > maxLength) {
    throw new ApiError(400, `${fieldName} must be ${maxLength} characters or fewer`);
  }
  return value.trim();
}

export function optionalString(value, fieldName, { maxLength = 5000 } = {}) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') {
    throw new ApiError(400, `${fieldName} must be a string`);
  }
  if (value.length > maxLength) {
    throw new ApiError(400, `${fieldName} must be ${maxLength} characters or fewer`);
  }
  return value.trim();
}

export function optionalNonNegativeNumber(value, fieldName) {
  if (value == null || value === '') return null;
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new ApiError(400, `${fieldName} must be a number`);
  }
  if (num < 0) {
    throw new ApiError(400, `${fieldName} cannot be negative`);
  }
  return num;
}

export function optionalBoolean(value, fallback = false) {
  if (value == null) return fallback;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new ApiError(400, 'Expected a boolean value');
}

export function stringArray(value, fieldName) {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new ApiError(400, `${fieldName} must be an array of strings`);
  }
  return value
    .map((v) => String(v).trim())
    .filter(Boolean)
    .slice(0, 50);
}

export function enumValue(value, fieldName, allowed, fallback) {
  if (value == null || value === '') return fallback;
  if (!allowed.includes(value)) {
    throw new ApiError(400, `${fieldName} must be one of: ${allowed.join(', ')}`);
  }
  return value;
}
