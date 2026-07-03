import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { PIPELINE_STATUSES, PIPELINE_STATUS_LABELS, PIPELINE_STATUS_STYLES } from '../constants.js';

export function JobSeekersList() {
  const [seekers, setSeekers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('pipelineStatus', status);
    setLoading(true);
    const timeout = setTimeout(() => {
      api
        .get(`/job-seekers?${params.toString()}`)
        .then(setSeekers)
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(timeout);
  }, [search, status]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-slate-900">Job Seekers</h1>
        <Link
          to="/job-seekers/new"
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Add Job Seeker
        </Link>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or skill…"
          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="block rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All statuses</option>
          {PIPELINE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PIPELINE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : seekers.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No job seekers yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {seekers.map((s) => (
            <Link
              key={s.id}
              to={`/job-seekers/${s.id}`}
              className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <h2 className="font-semibold text-slate-900">{s.name}</h2>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PIPELINE_STATUS_STYLES[s.pipeline_status]}`}
                >
                  {PIPELINE_STATUS_LABELS[s.pipeline_status]}
                </span>
              </div>
              {s.target_role && <p className="text-sm text-slate-500">{s.target_role}</p>}
              {s.location && <p className="text-sm text-slate-500">{s.location}</p>}
              {s.skills?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.skills.slice(0, 5).map((skill) => (
                    <span key={skill} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
