import {
  requireString,
  optionalString,
  optionalNonNegativeNumber,
  optionalBoolean,
  stringArray,
  enumValue,
} from './validate.js';
import { ApiError } from '../middleware/errorHandler.js';

const PIPELINE_STATUSES = ['new', 'screening', 'interviewing', 'offered', 'placed', 'archived'];
const OPPORTUNITY_STATUSES = ['open', 'filled', 'closed'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseJobSeekerPayload(body, { allowPipelineStatus = true } = {}) {
  const payload = {
    name: requireString(body.name, 'Name', { maxLength: 200 }),
    target_role: optionalString(body.target_role, 'Target role', { maxLength: 200 }),
    skills: stringArray(body.skills, 'Skills'),
    experience_years: optionalNonNegativeNumber(body.experience_years, 'Experience years'),
    location: optionalString(body.location, 'Location', { maxLength: 200 }),
    open_to_relocation: optionalBoolean(body.open_to_relocation, false),
    industry: optionalString(body.industry, 'Industry', { maxLength: 200 }),
    open_to_other_industries: optionalBoolean(body.open_to_other_industries, false),
    desired_salary: optionalNonNegativeNumber(body.desired_salary, 'Desired salary'),
    email: optionalString(body.email, 'Email', { maxLength: 320 }),
    phone: optionalString(body.phone, 'Phone', { maxLength: 50 }),
    source: optionalString(body.source, 'Source', { maxLength: 200 }),
    notes: optionalString(body.notes, 'Notes', { maxLength: 10000 }),
  };
  if (payload.email && !EMAIL_RE.test(payload.email)) {
    throw new ApiError(400, 'Email must be a valid email address');
  }
  if (allowPipelineStatus) {
    payload.pipeline_status = enumValue(
      body.pipeline_status,
      'Pipeline status',
      PIPELINE_STATUSES,
      'new'
    );
  } else {
    payload.pipeline_status = 'new';
  }
  return payload;
}

export function parseOpportunityPayload(body, { allowStatus = true } = {}) {
  const payload = {
    title: requireString(body.title, 'Title', { maxLength: 200 }),
    company: optionalString(body.company, 'Company', { maxLength: 200 }),
    position_type: optionalString(body.position_type, 'Position type', { maxLength: 200 }),
    required_skills: stringArray(body.required_skills, 'Required skills'),
    min_experience_years: optionalNonNegativeNumber(
      body.min_experience_years,
      'Minimum experience years'
    ),
    location: optionalString(body.location, 'Location', { maxLength: 200 }),
    salary_min: optionalNonNegativeNumber(body.salary_min, 'Minimum salary'),
    salary_max: optionalNonNegativeNumber(body.salary_max, 'Maximum salary'),
    notes: optionalString(body.notes, 'Notes', { maxLength: 10000 }),
    contact_name: optionalString(body.contact_name, 'Contact name', { maxLength: 200 }),
    contact_email: requireString(body.contact_email, 'Contact email', { maxLength: 320 }),
    contact_phone: optionalString(body.contact_phone, 'Contact phone', { maxLength: 50 }),
  };
  if (!EMAIL_RE.test(payload.contact_email)) {
    throw new ApiError(400, 'Contact email must be a valid email address');
  }
  if (
    payload.salary_min != null &&
    payload.salary_max != null &&
    payload.salary_min > payload.salary_max
  ) {
    throw new ApiError(400, 'Minimum salary cannot be greater than maximum salary');
  }
  if (allowStatus) {
    payload.status = enumValue(body.status, 'Status', OPPORTUNITY_STATUSES, 'open');
  } else {
    payload.status = 'open';
  }
  return payload;
}

export { PIPELINE_STATUSES, OPPORTUNITY_STATUSES };
