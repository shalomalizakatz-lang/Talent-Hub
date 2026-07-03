import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { ScoreRing, TierBadge, ScoreBreakdown } from '../components/ScoreRing.jsx';

export function Matches() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('jobSeekerId') ? 'candidate' : 'opportunity';
  const [mode, setMode] = useState(initialMode);

  const [opportunities, setOpportunities] = useState([]);
  const [seekers, setSeekers] = useState([]);
  const [selectedId, setSelectedId] = useState(
    searchParams.get('opportunityId') || searchParams.get('jobSeekerId') || ''
  );
  const [matches, setMatches] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    api.get('/opportunities').then(setOpportunities);
    api.get('/job-seekers').then(setSeekers);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMatches(null);
      return;
    }
    const key = mode === 'opportunity' ? 'opportunityId' : 'jobSeekerId';
    setSearchParams({ [key]: selectedId });
    api.get(`/matches?${key}=${selectedId}`).then(setMatches);
  }, [mode, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const options = mode === 'opportunity' ? opportunities : seekers;

  const grouped = useMemo(() => {
    if (!matches) return { suggested: [], approved: [], rejected: [] };
    return {
      suggested: matches.filter((m) => m.status === 'suggested'),
      approved: matches.filter((m) => m.status === 'approved'),
      rejected: matches.filter((m) => m.status === 'rejected'),
    };
  }, [matches]);

  async function decide(matchId, status) {
    setBusyId(matchId);
    try {
      await api.patch(`/matches/${matchId}`, { status });
      const key = mode === 'opportunity' ? 'opportunityId' : 'jobSeekerId';
      const refreshed = await api.get(`/matches?${key}=${selectedId}`);
      setMatches(refreshed);
    } finally {
      setBusyId(null);
    }
  }

  function switchMode(next) {
    setMode(next);
    setSelectedId('');
    setMatches(null);
    setSearchParams({});
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-slate-900">Matches</h1>

      <div className="mb-4 inline-flex rounded-md border border-slate-300 bg-white p-1 text-sm">
        <button
          className={`rounded px-3 py-1.5 font-medium ${mode === 'opportunity' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
          onClick={() => switchMode('opportunity')}
        >
          By Opportunity
        </button>
        <button
          className={`rounded px-3 py-1.5 font-medium ${mode === 'candidate' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
          onClick={() => switchMode('candidate')}
        >
          By Candidate
        </button>
      </div>

      <div className="mb-6">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="block w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">
            {mode === 'opportunity' ? 'Select an opportunity…' : 'Select a candidate…'}
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {mode === 'opportunity' ? o.title : o.name}
            </option>
          ))}
        </select>
      </div>

      {selectedId && matches === null && <p className="text-sm text-slate-500">Loading…</p>}

      {matches && (
        <div className="space-y-8">
          <MatchSection
            title="Suggested"
            items={grouped.suggested}
            mode={mode}
            busyId={busyId}
            renderActions={(m) => (
              <div className="flex gap-2">
                <button
                  disabled={busyId === m.id}
                  onClick={() => decide(m.id, 'approved')}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  disabled={busyId === m.id}
                  onClick={() => decide(m.id, 'rejected')}
                  className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}
          />

          <MatchSection
            title="Approved"
            items={grouped.approved}
            mode={mode}
            busyId={busyId}
            collapsedByDefault
            renderActions={(m) => (
              <button
                disabled={busyId === m.id}
                onClick={() => decide(m.id, 'suggested')}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Move back to suggested
              </button>
            )}
          />

          <MatchSection
            title="Rejected"
            items={grouped.rejected}
            mode={mode}
            busyId={busyId}
            collapsedByDefault
            deemphasize
            renderActions={(m) => (
              <button
                disabled={busyId === m.id}
                onClick={() => decide(m.id, 'suggested')}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Move back to suggested
              </button>
            )}
          />
        </div>
      )}
    </div>
  );
}

function MatchSection({ title, items, mode, renderActions, collapsedByDefault, deemphasize }) {
  return (
    <details open={!collapsedByDefault} className="group">
      <summary className="mb-2 cursor-pointer list-none text-sm font-semibold text-slate-700">
        <span className="inline-flex items-center gap-1">
          <svg
            className="h-3 w-3 transition-transform group-open:rotate-90"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M9 6l6 6-6 6V6z" />
          </svg>
          {title} ({items.length})
        </span>
      </summary>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">None</p>
      ) : (
        <div className="space-y-2">
          {items.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col gap-3 rounded-lg border bg-white p-3 sm:flex-row sm:items-center ${
                deemphasize ? 'border-slate-100 opacity-70' : 'border-slate-200'
              }`}
            >
              <ScoreRing score={m.score} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {mode === 'opportunity' ? (
                    <Link to={`/job-seekers/${m.job_seeker_id}`} className="font-medium text-slate-900 hover:underline">
                      {m.job_seeker_name}
                    </Link>
                  ) : (
                    <Link to={`/opportunities/${m.opportunity_id}`} className="font-medium text-slate-900 hover:underline">
                      {m.opportunity_title}
                    </Link>
                  )}
                  <TierBadge score={m.score} />
                </div>
                <ScoreBreakdown breakdown={m.score_breakdown} />
              </div>
              {renderActions(m)}
            </div>
          ))}
        </div>
      )}
    </details>
  );
}
