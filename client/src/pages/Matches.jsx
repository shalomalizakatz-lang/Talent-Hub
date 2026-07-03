import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { ScoreRing, TierBadge, ScoreBreakdown } from '../components/ScoreRing.jsx';

export function Matches() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('jobSeekerId')
    ? 'candidate'
    : searchParams.get('opportunityId')
      ? 'opportunity'
      : 'inbox';
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
    if (mode === 'inbox') {
      setMatches(null);
      api.get('/matches?status=suggested').then(setMatches);
      return;
    }
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

  async function refresh() {
    if (mode === 'inbox') {
      const refreshed = await api.get('/matches?status=suggested');
      setMatches(refreshed);
      return;
    }
    const key = mode === 'opportunity' ? 'opportunityId' : 'jobSeekerId';
    const refreshed = await api.get(`/matches?${key}=${selectedId}`);
    setMatches(refreshed);
  }

  async function decide(matchId, status) {
    setBusyId(matchId);
    try {
      await api.patch(`/matches/${matchId}`, { status });
      await refresh();
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

  function suggestedActions(m) {
    return (
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
    );
  }

  function decidedActions(m) {
    return (
      <button
        disabled={busyId === m.id}
        onClick={() => decide(m.id, 'suggested')}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        Move back to suggested
      </button>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-slate-900">Matches</h1>

      <div className="mb-4 inline-flex flex-wrap rounded-md border border-slate-300 bg-white p-1 text-sm">
        <button
          className={`rounded px-3 py-1.5 font-medium ${mode === 'inbox' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
          onClick={() => switchMode('inbox')}
        >
          Inbox
        </button>
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

      {mode === 'inbox' && (
        <>
          <p className="mb-4 text-sm text-slate-500">
            Every suggested match across all candidates and roles, ranked by score — approve or reject to clear
            your queue.
          </p>
          {matches === null ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : matches.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Nothing waiting on a decision right now.
            </p>
          ) : (
            <div className="space-y-2">
              {matches.map((m) => (
                <MatchRow key={m.id} match={m} renderActions={suggestedActions} />
              ))}
            </div>
          )}
        </>
      )}

      {mode !== 'inbox' && (
        <>
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
              <MatchSection title="Suggested" items={grouped.suggested} renderActions={suggestedActions} />
              <MatchSection
                title="Approved"
                items={grouped.approved}
                renderActions={decidedActions}
                collapsedByDefault
              />
              <MatchSection
                title="Rejected"
                items={grouped.rejected}
                renderActions={decidedActions}
                collapsedByDefault
                deemphasize
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Shows both the candidate and the opportunity as separate links so either
// profile is one tap away directly from the match card, regardless of
// which view you're in.
function MatchRow({ match, renderActions, dimmed }) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border bg-white p-3 sm:flex-row sm:items-center ${
        dimmed ? 'border-slate-100 opacity-70' : 'border-slate-200'
      }`}
    >
      <ScoreRing score={match.score} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/job-seekers/${match.job_seeker_id}`} className="font-medium text-slate-900 hover:underline">
            {match.job_seeker_name}
          </Link>
          <span className="text-slate-400">&rarr;</span>
          <Link
            to={`/opportunities/${match.opportunity_id}`}
            className="font-medium text-slate-900 hover:underline"
          >
            {match.opportunity_title}
          </Link>
          <TierBadge score={match.score} />
        </div>
        <ScoreBreakdown breakdown={match.score_breakdown} />
      </div>
      {renderActions(match)}
    </div>
  );
}

function MatchSection({ title, items, renderActions, collapsedByDefault, deemphasize }) {
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
            <MatchRow key={m.id} match={m} renderActions={renderActions} dimmed={deemphasize} />
          ))}
        </div>
      )}
    </details>
  );
}
