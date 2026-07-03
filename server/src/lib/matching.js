import { distanceMiles } from './geocode.js';

function normalizedSet(arr) {
  return new Set((arr || []).map((s) => String(s).trim().toLowerCase()).filter(Boolean));
}

function round(n) {
  return Math.round(n * 100) / 100;
}

// Locations within this radius count as "the same area" — e.g. Marine Park
// and Brooklyn are ~7 miles apart, well inside this, so a candidate in one
// scores as local to an opportunity in the other instead of needing an
// exact string match.
const LOCAL_RADIUS_MILES = 20;

/**
 * Scores a job seeker against an opportunity, 0-100.
 * Mirrors the spec's fixed weightings: skills 50, experience 20, location 15, salary 15.
 */
export function scoreMatch(seeker, opportunity) {
  const requiredSkills = normalizedSet(opportunity.required_skills);
  const seekerSkills = normalizedSet(seeker.skills);

  let skills;
  if (requiredSkills.size === 0) {
    skills = 50;
  } else {
    let matched = 0;
    for (const skill of requiredSkills) {
      if (seekerSkills.has(skill)) matched += 1;
    }
    skills = round((matched / requiredSkills.size) * 50);
  }

  let experience;
  const minExp = opportunity.min_experience_years;
  if (minExp == null || Number(minExp) <= 0) {
    experience = 20;
  } else {
    const ratio = Math.min((Number(seeker.experience_years) || 0) / Number(minExp), 1);
    experience = round(ratio * 20);
  }

  let location = 0;
  const seekerCoords =
    seeker.latitude != null && seeker.longitude != null
      ? { latitude: Number(seeker.latitude), longitude: Number(seeker.longitude) }
      : null;
  const oppCoords =
    opportunity.latitude != null && opportunity.longitude != null
      ? { latitude: Number(opportunity.latitude), longitude: Number(opportunity.longitude) }
      : null;

  let isLocal;
  if (seekerCoords && oppCoords) {
    isLocal = distanceMiles(seekerCoords, oppCoords) <= LOCAL_RADIUS_MILES;
  } else {
    // Fallback for when either location couldn't be geocoded (e.g. the
    // geocoding service was unreachable when the record was saved).
    const seekerLoc = (seeker.location || '').trim().toLowerCase();
    const oppLoc = (opportunity.location || '').trim().toLowerCase();
    isLocal = Boolean(seekerLoc && oppLoc && seekerLoc === oppLoc);
  }

  let locationBasis = 'none';
  if (isLocal) {
    location = 15;
    locationBasis = 'local';
  } else if (seeker.open_to_relocation) {
    location = 8;
    locationBasis = 'relocation';
  }

  let salary = 15;
  const desired = seeker.desired_salary;
  const max = opportunity.salary_max;
  if (desired != null && max != null && Number(desired) > Number(max)) {
    const overage = Number(desired) - Number(max);
    salary = Math.max(0, round(15 - (overage / 1000) * 2));
  }

  const total = Math.round(skills + experience + location + salary);

  return {
    score: total,
    breakdown: { skills, experience, location, salary, locationBasis },
  };
}

export function matchTier(score) {
  if (score >= 75) return 'strong';
  if (score >= 45) return 'moderate';
  return 'weak';
}
