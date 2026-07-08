import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { PublicShell } from '../components/PublicShell.jsx';
import { Select } from '../components/FormFields.jsx';
import { INDUSTRIES } from '../industries.js';

const UNSPECIFIED = 'Unspecified';

export function PublicJobs() {
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');

  useEffect(() => {
    api
      .get('/public/jobs')
      .then(setJobs)
      .catch((err) => setError(err.message || 'Failed to load open roles'));
  }, []);

  // Groups are ordered by the canonical INDUSTRIES list rather than
  // alphabetically or by first appearance, so the board's section order
  // stays stable as jobs come and go. Jobs without an industry set land
  // in an "Unspecified" group at the end instead of being dropped.
  const groups = useMemo(() => {
    if (!jobs) return [];
    const byIndustry = new Map();
    for (const job of jobs) {
      const key = job.industry || UNSPECIFIED;
      if (!byIndustry.has(key)) byIndustry.set(key, []);
      byIndustry.get(key).push(job);
    }
    const ordered = [...INDUSTRIES, UNSPECIFIED].filter((name) => byIndustry.has(name));
    return ordered.map((name) => ({ name, jobs: byIndustry.get(name) }));
  }, [jobs]);

  const visibleGroups = industryFilter ? groups.filter((g) => g.name === industryFilter) : groups;

  return (
    <PublicShell title="Open Roles" subtitle="Browse current openings. Found a fit? Apply below.">
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {jobs === null && !error && <p className="text-sm text-slate-500">Loading…</p>}

      {jobs && jobs.length === 0 && (
        <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No open roles right now — check back soon.
        </p>
      )}

      {jobs && jobs.length > 0 && (
        <>
          {groups.length > 1 && (
            <div className="mb-4">
              <Select value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value)}>
                <option value="">All industries</option>
                {groups.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.name} ({g.jobs.length})
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="space-y-6">
            {visibleGroups.map((group) => (
              <div key={group.name}>
                {groups.length > 1 && (
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    {group.name}
                  </h2>
                )}
                <div className="space-y-3">
                  {group.jobs.map((job) => (
                    <Link
                      key={job.id}
                      to={`/apply?opportunity=${job.id}`}
                      state={{ job }}
                      className="block rounded-lg border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-slate-900">{job.title}</h3>
                        <span className="shrink-0 text-xs font-medium text-indigo-600">Apply &rarr;</span>
                      </div>
                      {(job.company || job.position_type) && (
                        <p className="text-sm text-slate-500">
                          {[job.company, job.position_type].filter(Boolean).join(' — ')}
                        </p>
                      )}
                      {job.location && <p className="text-sm text-slate-500">{job.location}</p>}
                      {(job.salary_min != null || job.salary_max != null) && (
                        <p className="mt-1 text-sm text-slate-600">
                          ${Number(job.salary_min || 0).toLocaleString()} – $
                          {Number(job.salary_max || 0).toLocaleString()}
                        </p>
                      )}
                      {job.min_experience_years != null && (
                        <p className="text-sm text-slate-500">{job.min_experience_years}+ years experience</p>
                      )}
                      {job.required_skills?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {job.required_skills.map((s) => (
                            <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                      {job.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{job.notes}</p>}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-6 border-t border-slate-100 pt-4 text-center">
        <p className="text-sm text-slate-500">
          Don't see the right fit?{' '}
          <Link to="/apply" className="font-medium text-indigo-600 hover:underline">
            Submit your info anyway
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}
