import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { ScoreRing, TierBadge, ScoreBreakdown } from '../components/ScoreRing.jsx';
import {
  PIPELINE_STATUS_LABELS,
  PIPELINE_STATUS_STYLES,
  OPPORTUNITY_STATUS_LABELS,
  OPPORTUNITY_STATUS_STYLES,
} from '../constants.js';

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
  const [inboxMatches, setInboxMatches] = useState(null);
  const [allMatches, setAllMatches] = useState(null); // unfiltered — used by the grouped views
  const [busyId, setBusyId] = useState(null);
  const [expandedId, setExpandedId] = useState(
    searchParams.get('opportunityId') || searchParams.get('jobSeekerId') || null
  );

  useEffect(() => {
    api.get('/opportunities').then(setOpportunities);
    api.get('/job-seekers').then(setSeekers);
  }, []);

  useEffect(() => {
    if (mode === 'inbox') {
      setInboxMatches(null);
      api.get('/matches?status=suggested').then(setInboxMatches);
    } else {
      setAllMatches(null);
      api.get('/matches').then(setAllMatches);
    }
  }, [mode]);

  async function refresh() {
    if (mode === 'inbox') {
      setInboxMatches(await api.get('/matches?status=suggested'));
    } else {
      setAllMatches(await api.get('/matches'));
    }
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
    setExpandedId(null);
    setSearchParams({});
  }

  function toggleExpanded(id, key) {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    setSearchParams(next ? { [key]: next } : {});
  }

  const groupedByOpportunity = useMemo(() => {
    const map = new Map();
    for (const m of allMatches || []) {
      if (!map.has(m.opportunity_id)) map.set(m.opportunity_id, []);
      map.get(m.opportunity_id).push(m);
    }
    return map;
  }, [allMatches]);

  const groupedBySeeker = useMemo(() => {
    const map = new Map();
    for (const m of allMatches || []) {
      if (!map.has(m.job_seeker_id)) map.set(m.job_seeker_id, []);
      map.get(m.job_seeker_id).push(m);
    }
    return map;
  }, [allMatches]);

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
          {inboxMatches === null ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : inboxMatches.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Nothing waiting on a decision right now.
            </p>
          ) : (
            <div className="space-y-2">
              {inboxMatches.map((m) => (
                <MatchRow key={m.id} match={m} renderActions={suggestedActions} />
              ))}
            </div>
          )}
        </>
      )}

      {mode === 'opportunity' && (
        <>
          <p className="mb-4 text-sm text-slate-500">
            Every opportunity, with its candidate matches — tap one to expand.
          </p>
          {allMatches === null ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : opportunities.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              No opportunities yet.
            </p>
          ) : (
            <div className="space-y-2">
              {opportunities.map((o) => (
                <EntityAccordion
                  key={o.id}
                  title={o.title}
                  subtitle={o.location}
                  badge={
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${OPPORTUNITY_STATUS_STYLES[o.status]}`}
                    >
                      {OPPORTUNITY_STATUS_LABELS[o.status]}
                    </span>
                  }
                  profileHref={`/opportunities/${o.id}`}
                  matches={groupedByOpportunity.get(o.id) || []}
                  expanded={expandedId === o.id}
                  onToggle={() => toggleExpanded(o.id, 'opportunityId')}
                  otherPartyLink={(m) => `/job-seekers/${m.job_seeker_id}`}
                  otherPartyName={(m) => m.job_seeker_name}
                  suggestedActions={suggestedActions}
                  decidedActions={decidedActions}
                />
              ))}
            </div>
          )}
        </>
      )}

      {mode === 'candidate' && (
        <>
          <p className="mb-4 text-sm text-slate-500">
            Every candidate, with their opportunity matches — tap one to expand.
          </p>
          {allMatches === null ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : seekers.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              No job seekers yet.
            </p>
          ) : (
            <div className="space-y-2">
              {seekers.map((s) => (
                <EntityAccordion
                  key={s.id}
                  title={s.name}
                  subtitle={s.target_role}
                  badge={
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${PIPELINE_STATUS_STYLES[s.pipeline_status]}`}
                    >
                      {PIPELINE_STATUS_LABELS[s.pipeline_status]}
                    </span>
                  }
                  profileHref={`/job-seekers/${s.id}`}
                  matches={groupedBySeeker.get(s.id) || []}
                  expanded={expandedId === s.id}
                  onToggle={() => toggleExpanded(s.id, 'jobSeekerId')}
                  otherPartyLink={(m) => `/opportunities/${m.opportunity_id}`}
                  otherPartyName={(m) => m.opportunity_title}
                  suggestedActions={suggestedActions}
                  decidedActions={decidedActions}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// One entity (an opportunity or a candidate) as an expandable row. Clicking
// the row toggles expand/collapse; the title is a separate link so jumping
// straight to the full profile doesn't fight with that toggle.
function EntityAccordion({
  title,
  subtitle,
  badge,
  profileHref,
  matches,
  expanded,
  onToggle,
  otherPartyLink,
  otherPartyName,
  suggestedActions,
  decidedActions,
}) {
  const suggested = matches.filter((m) => m.status === 'suggested');
  const approved = matches.filter((m) => m.status === 'approved');
  const rejected = matches.filter((m) => m.status === 'rejected');

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {/*
        A <button> can't legally contain an <a> (what <Link> renders) —
        nesting interactive content like that makes the browser silently
        restructure the DOM, breaking click handling in confusing ways
        (the same class of bug hit earlier with <label>-wrapped inputs).
        Using a div with role="button" here instead keeps the whole row
        clickable to expand/collapse while the title stays a real,
        independently-clickable link via stopPropagation.
      */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left"
      >
        <svg
          className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M9 6l6 6-6 6V6z" />
        </svg>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={profileHref}
              onClick={(e) => e.stopPropagation()}
              className="font-medium text-slate-900 hover:underline"
            >
              {title}
            </Link>
            {badge}
          </div>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-slate-500">
          {suggested.length > 0 && <span className="font-medium text-indigo-600">{suggested.length} suggested</span>}
          {approved.length > 0 && <span>{approved.length} approved</span>}
          {matches.length === 0 && <span className="text-slate-400">No matches</span>}
        </div>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-slate-100 px-4 py-3">
          <MatchGroup
            title="Suggested"
            items={suggested}
            otherPartyLink={otherPartyLink}
            otherPartyName={otherPartyName}
            renderActions={suggestedActions}
          />
          <MatchGroup
            title="Approved"
            items={approved}
            collapsedByDefault
            otherPartyLink={otherPartyLink}
            otherPartyName={otherPartyName}
            renderActions={decidedActions}
          />
          <MatchGroup
            title="Rejected"
            items={rejected}
            collapsedByDefault
            deemphasize
            otherPartyLink={otherPartyLink}
            otherPartyName={otherPartyName}
            renderActions={decidedActions}
          />
        </div>
      )}
    </div>
  );
}

function MatchGroup({ title, items, otherPartyLink, otherPartyName, renderActions, collapsedByDefault, deemphasize }) {
  return (
    <details open={!collapsedByDefault} className="group">
      <summary className="mb-2 cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className="inline-flex items-center gap-1">
          <svg
            className="h-2.5 w-2.5 transition-transform group-open:rotate-90"
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
                  <Link to={otherPartyLink(m)} className="font-medium text-slate-900 hover:underline">
                    {otherPartyName(m)}
                  </Link>
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

// Flat row used by the Inbox view — neither party is "the one you're
// already looking at", so both show as links.
function MatchRow({ match, renderActions }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
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
