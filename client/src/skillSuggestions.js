// Always-shown, cross-industry skill suggestions.
export const GENERAL_SKILLS = [
  'Communication',
  'Leadership',
  'Teamwork',
  'Problem Solving',
  'Time Management',
  'Customer Service',
  'Organizational Skills',
  'Adaptability',
  'Attention to Detail',
  'Multitasking',
  'Critical Thinking',
  'Bilingual',
  'Microsoft Office',
  'Project Management',
];

// Extra suggestions unlocked when the role/title text matches a keyword.
// Matching is a simple case-insensitive substring test, first match wins
// per group (a role can match multiple groups, all their skills are pooled).
const ROLE_SKILL_GROUPS = [
  {
    keywords: ['rn', 'nurse', 'lpn', 'nursing', 'charge nurse', 'cna', 'clinical', 'healthcare', 'hospital', 'medical'],
    skills: ['ICU', 'BLS', 'ACLS', 'PALS', 'Med-Surg', 'Patient Care', 'EMR/EHR', 'Triage', 'IV Therapy', 'Wound Care', 'Phlebotomy'],
  },
  {
    keywords: ['developer', 'engineer', 'software', 'programmer', 'coding', 'devops'],
    skills: ['JavaScript', 'Python', 'React', 'SQL', 'Git', 'AWS', 'Docker', 'API Design', 'Node.js', 'Java', 'Cloud Computing'],
  },
  {
    keywords: ['sales', 'account executive', 'business development'],
    skills: ['CRM', 'Cold Calling', 'Negotiation', 'Lead Generation', 'Salesforce', 'Closing', 'B2B Sales'],
  },
  {
    keywords: ['admin', 'administrator', 'office', 'receptionist', 'clerical', 'assistant'],
    skills: ['Scheduling', 'Data Entry', 'Microsoft Office', 'Filing', 'Calendar Management', 'Customer Service'],
  },
  {
    keywords: ['accountant', 'accounting', 'finance', 'bookkeeper', 'financial analyst'],
    skills: ['QuickBooks', 'Excel', 'Financial Reporting', 'Bookkeeping', 'GAAP', 'Accounts Payable', 'Payroll'],
  },
  {
    keywords: ['teacher', 'educator', 'instructor', 'professor', 'education'],
    skills: ['Curriculum Development', 'Classroom Management', 'Lesson Planning', 'Special Education', 'Tutoring'],
  },
  {
    keywords: ['driver', 'warehouse', 'logistics', 'forklift', 'supply chain', 'delivery'],
    skills: ['Forklift Certified', 'CDL', 'Inventory Management', 'Supply Chain', 'Route Planning', 'Order Fulfillment'],
  },
  {
    keywords: ['marketing', 'social media', 'content', 'seo', 'brand'],
    skills: ['SEO', 'Content Marketing', 'Social Media', 'Google Analytics', 'Copywriting', 'Email Marketing'],
  },
  {
    keywords: ['support', 'call center', 'help desk'],
    skills: ['Zendesk', 'Conflict Resolution', 'Call Center', 'Live Chat Support', 'Ticketing Systems'],
  },
  {
    keywords: ['paralegal', 'attorney', 'legal', 'lawyer'],
    skills: ['Legal Research', 'Contract Review', 'Litigation Support', 'Case Management', 'Westlaw'],
  },
  {
    keywords: ['chef', 'cook', 'server', 'restaurant', 'hospitality', 'bartender'],
    skills: ['Food Safety', 'POS Systems', 'Menu Planning', 'ServSafe', 'Customer Service'],
  },
  {
    keywords: ['electrician', 'plumber', 'construction', 'carpenter', 'hvac'],
    skills: ['Blueprint Reading', 'OSHA Certified', 'Power Tools', 'Project Estimation', 'Safety Compliance'],
  },
  {
    keywords: ['retail', 'cashier', 'store manager', 'merchandising'],
    skills: ['POS Systems', 'Inventory Management', 'Visual Merchandising', 'Loss Prevention', 'Upselling'],
  },
  {
    keywords: ['hr', 'human resources', 'recruiter', 'talent acquisition'],
    skills: ['Onboarding', 'ATS Software', 'Employee Relations', 'Benefits Administration', 'Recruiting'],
  },
];

/**
 * Returns a deduped list of suggested skills: general skills first, then
 * any role-specific skills unlocked by keyword matches against roleText,
 * excluding skills already present in existingSkills.
 */
export function getSuggestedSkills(roleText, existingSkills = []) {
  const existing = new Set(existingSkills.map((s) => s.toLowerCase()));
  const text = (roleText || '').toLowerCase();

  const roleSkills = [];
  for (const group of ROLE_SKILL_GROUPS) {
    if (group.keywords.some((kw) => text.includes(kw))) {
      roleSkills.push(...group.skills);
    }
  }

  const combined = [...roleSkills, ...GENERAL_SKILLS];
  const seen = new Set();
  const result = [];
  for (const skill of combined) {
    const key = skill.toLowerCase();
    if (seen.has(key) || existing.has(key)) continue;
    seen.add(key);
    result.push(skill);
  }
  return result;
}
