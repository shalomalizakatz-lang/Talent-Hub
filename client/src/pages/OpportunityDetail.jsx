import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { ConfirmButton } from '../components/ConfirmButton.jsx';
import { ScoreRing, TierBadge } from '../components/ScoreRing.jsx';
import { OPPORTUNITY_STATUS_LABELS, OPPORTUNITY_STATUS_STYLES } from '../constants.js';

export function OpportunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState(null);

  useEffect(() => {
    api.get(`/opportunities/${id}`).then(setOpportunity);
  }, [id]);

  async function handleDelete() {
    await api.del(`/opportunities/${id}`);
    navigate('/opportunities');
  }

  if (!opportunity) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl">
      {/*
        navigate(-1) instead of a fixed Link to /opportunities: this page
        can be reached from the list, but also from a match card (Matches
        inbox, by-opportunity, by-candidate) — a hardcoded destination
        would always dump you back on the list even if you came from
        Matches. Actual browser back-navigation goes wherever you
        actually came from.
      */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-sm text-slate-500 hover:underline"
      >
        &larr; Back
      </button>

      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{opportunity.title}</h1>
          {opportunity.position_type && <p className="text-slate-500">{opportunity.position_type}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${OPPORTUNITY_STATUS_STYLES[opportunity.status]}`}
          >
            {OPPORTUNITY_STATUS_LABELS[opportunity.status]}
          </span>
          <Link
            to={`/opportunities/${id}/edit`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Edit
          </Link>
          <ConfirmButton
            onConfirm={handleDelete}
            className="rounded-md border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            Delete
          </ConfirmButton>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DetailItem label="Industry" value={opportunity.industry} />
        <DetailItem label="Location" value={opportunity.location} />
        <DetailItem
          label="Minimum experience"
          value={opportunity.min_experience_years != null ? `${opportunity.min_experience_years} years` : null}
        />
        <DetailItem
          label="Salary range"
          value={
            opportunity.salary_min != null || opportunity.salary_max != null
              ? `$${Number(opportunity.salary_min || 0).toLocaleString()} – $${Number(
                  opportunity.salary_max || 0
                ).toLocaleString()}`
              : null
          }
        />
      </div>

      {(opportunity.contact_name || opportunity.contact_email || opportunity.contact_phone) && (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
          <h3 className="mb-1 text-sm font-medium text-slate-700">Employer contact</h3>
          <div className="grid grid-cols-1 gap-1 text-sm text-slate-600 sm:grid-cols-3">
            {opportunity.contact_name && <span>{opportunity.contact_name}</span>}
            {opportunity.contact_email && (
              <a href={`mailto:${opportunity.contact_email}`} className="text-indigo-600 hover:underline">
                {opportunity.contact_email}
              </a>
            )}
            {opportunity.contact_phone && <span>{opportunity.contact_phone}</span>}
          </div>
        </div>
      )}

      {opportunity.required_skills?.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-medium text-slate-700">Required skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {opportunity.required_skills.map((s) => (
              <span key={s} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {opportunity.notes && (
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-medium text-slate-700">Notes</h3>
          <p className="whitespace-pre-wrap text-sm text-slate-600">{opportunity.notes}</p>
        </div>
      )}

      <div className="mt-8">
        <h3 className="mb-2 text-sm font-medium text-slate-700">Match history</h3>
        {opportunity.matches?.length ? (
          <div className="space-y-2">
            {opportunity.matches.map((m) => (
              <Link
                key={m.id}
                to={`/matches?jobSeekerId=${m.job_seeker_id}`}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-indigo-300"
              >
                <ScoreRing score={m.score} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{m.job_seeker_name}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <TierBadge score={m.score} />
                  <span className="text-xs capitalize text-slate-400">{m.status}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No matches yet.</p>
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  );
}
