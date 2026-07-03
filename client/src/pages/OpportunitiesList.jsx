import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { OPPORTUNITY_STATUSES, OPPORTUNITY_STATUS_LABELS, OPPORTUNITY_STATUS_STYLES } from '../constants.js';

export function OpportunitiesList() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    setLoading(true);
    api
      .get(`/opportunities?${params.toString()}`)
      .then(setOpportunities)
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-slate-900">Opportunities</h1>
        <Link
          to="/opportunities/new"
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Add Opportunity
        </Link>
      </div>

      <div className="mb-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="block rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All statuses</option>
          {OPPORTUNITY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {OPPORTUNITY_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : opportunities.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No opportunities yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((o) => (
            <Link
              key={o.id}
              to={`/opportunities/${o.id}`}
              className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <h2 className="font-semibold text-slate-900">{o.title}</h2>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${OPPORTUNITY_STATUS_STYLES[o.status]}`}>
                  {OPPORTUNITY_STATUS_LABELS[o.status]}
                </span>
              </div>
              {o.department && <p className="text-sm text-slate-500">{o.department}</p>}
              {o.location && <p className="text-sm text-slate-500">{o.location}</p>}
              {o.required_skills?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {o.required_skills.slice(0, 5).map((skill) => (
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
