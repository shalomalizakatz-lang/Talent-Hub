import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { PublicShell } from '../components/PublicShell.jsx';

export function PublicJobs() {
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/public/jobs')
      .then(setJobs)
      .catch((err) => setError(err.message || 'Failed to load open roles'));
  }, []);

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
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              to={`/apply?opportunity=${job.id}`}
              state={{ job }}
              className="block rounded-lg border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-slate-900">{job.title}</h2>
                <span className="shrink-0 text-xs font-medium text-indigo-600">Apply &rarr;</span>
              </div>
              {job.department && <p className="text-sm text-slate-500">{job.department}</p>}
              {job.location && <p className="text-sm text-slate-500">{job.location}</p>}
              {(job.salary_min != null || job.salary_max != null) && (
                <p className="mt-1 text-sm text-slate-600">
                  ${Number(job.salary_min || 0).toLocaleString()} – ${Number(job.salary_max || 0).toLocaleString()}
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
