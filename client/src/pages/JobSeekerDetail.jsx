import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { ResumeUpload } from '../components/ResumeUpload.jsx';
import { ConfirmButton } from '../components/ConfirmButton.jsx';
import { ScoreRing, TierBadge } from '../components/ScoreRing.jsx';
import { PIPELINE_STATUS_LABELS, PIPELINE_STATUS_STYLES } from '../constants.js';

export function JobSeekerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [seeker, setSeeker] = useState(null);
  const [uploading, setUploading] = useState(false);

  function load() {
    api.get(`/job-seekers/${id}`).then(setSeeker);
  }

  useEffect(load, [id]);

  async function handleUpload(file) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const updated = await api.post(`/job-seekers/${id}/resume`, formData, { isForm: true });
      setSeeker((s) => ({ ...s, ...updated }));
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveResume() {
    const updated = await api.del(`/job-seekers/${id}/resume`);
    setSeeker((s) => ({ ...s, ...updated }));
  }

  async function handleDelete() {
    await api.del(`/job-seekers/${id}`);
    navigate('/job-seekers');
  }

  if (!seeker) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl">
      {/*
        navigate(-1) instead of a fixed Link to /job-seekers: this page can
        be reached from the list, but also from a match card (Matches
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
          <h1 className="text-2xl font-bold text-slate-900">{seeker.name}</h1>
          <p className="text-slate-500">{seeker.target_role}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${PIPELINE_STATUS_STYLES[seeker.pipeline_status]}`}
          >
            {PIPELINE_STATUS_LABELS[seeker.pipeline_status]}
          </span>
          <Link
            to={`/job-seekers/${id}/edit`}
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
        <DetailItem label="Location" value={seeker.location} />
        <DetailItem
          label="Experience"
          value={seeker.experience_years != null ? `${seeker.experience_years} years` : null}
        />
        <DetailItem label="Open to relocation" value={seeker.open_to_relocation ? 'Yes' : 'No'} />
        <DetailItem
          label="Desired salary"
          value={seeker.desired_salary != null ? `$${Number(seeker.desired_salary).toLocaleString()}` : null}
        />
        <DetailItem label="Email" value={seeker.email} />
        <DetailItem label="Phone" value={seeker.phone} />
        <DetailItem label="Source" value={seeker.source} />
      </div>

      {seeker.skills?.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-medium text-slate-700">Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {seeker.skills.map((s) => (
              <span key={s} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {seeker.notes && (
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-medium text-slate-700">Notes</h3>
          <p className="whitespace-pre-wrap text-sm text-slate-600">{seeker.notes}</p>
        </div>
      )}

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-medium text-slate-700">Resume</h3>
        <ResumeUpload
          currentFileName={seeker.resume_file_name}
          currentFileUrl={seeker.resume_file_url}
          uploading={uploading}
          onUpload={handleUpload}
          onRemove={handleRemoveResume}
        />
      </div>

      <div className="mt-8">
        <h3 className="mb-2 text-sm font-medium text-slate-700">Match history</h3>
        {seeker.matches?.length ? (
          <div className="space-y-2">
            {seeker.matches.map((m) => (
              <Link
                key={m.id}
                to={`/matches?opportunityId=${m.opportunity_id}`}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-indigo-300"
              >
                <ScoreRing score={m.score} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{m.opportunity_title}</p>
                  <p className="text-xs text-slate-500">{m.opportunity_location}</p>
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
