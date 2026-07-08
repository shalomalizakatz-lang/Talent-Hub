import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Field, TextInput, NumberInput, TextArea, Select, Checkbox } from '../components/FormFields.jsx';
import { TagInput } from '../components/TagInput.jsx';
import { ResumeUpload } from '../components/ResumeUpload.jsx';
import { getSuggestedSkills } from '../skillSuggestions.js';
import { PIPELINE_STATUSES, PIPELINE_STATUS_LABELS } from '../constants.js';
import { INDUSTRIES } from '../industries.js';

const EMPTY = {
  name: '',
  target_role: '',
  skills: [],
  experience_years: '',
  location: '',
  open_to_relocation: false,
  industry: '',
  open_to_other_industries: false,
  desired_salary: '',
  email: '',
  phone: '',
  source: '',
  pipeline_status: 'new',
  notes: '',
};

const MAX_RESUME_BYTES = 10 * 1024 * 1024;

export function JobSeekerForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Create mode only: a resume picked before the record exists yet, staged
  // locally and uploaded right after the create call succeeds. Edit mode
  // instead uses <ResumeUpload>, which uploads immediately against the
  // already-existing record — same as the detail page.
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeError, setResumeError] = useState('');
  const [resumeUploading, setResumeUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/job-seekers/${id}`).then((data) => {
      setForm({
        ...EMPTY,
        ...data,
        experience_years: data.experience_years ?? '',
        desired_salary: data.desired_salary ?? '',
      });
      setLoading(false);
    });
  }, [id, isEdit]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handlePickResume(file) {
    setResumeError('');
    if (!file) return;
    if (!/\.(pdf|doc|docx)$/i.test(file.name)) {
      setResumeError('File must be a PDF, DOC, or DOCX');
      return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      setResumeError('File must be 10MB or smaller');
      return;
    }
    setResumeFile(file);
  }

  async function handleUploadExisting(file) {
    setResumeUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const updated = await api.post(`/job-seekers/${id}/resume`, formData, { isForm: true });
      setForm((f) => ({ ...f, ...updated }));
    } finally {
      setResumeUploading(false);
    }
  }

  async function handleRemoveExisting() {
    const updated = await api.del(`/job-seekers/${id}/resume`);
    setForm((f) => ({ ...f, ...updated }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        experience_years: form.experience_years === '' ? null : Number(form.experience_years),
        desired_salary: form.desired_salary === '' ? null : Number(form.desired_salary),
      };
      const saved = isEdit ? await api.put(`/job-seekers/${id}`, payload) : await api.post('/job-seekers', payload);

      if (!isEdit && resumeFile) {
        const formData = new FormData();
        formData.append('resume', resumeFile);
        await api.post(`/job-seekers/${saved.id}/resume`, formData, { isForm: true });
      }

      navigate(`/job-seekers/${saved.id}`);
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold text-slate-900">{isEdit ? 'Edit Job Seeker' : 'Add Job Seeker'}</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <Field label="Name" required>
          <TextInput value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </Field>

        <Field label="Industry">
          <Select value={form.industry || ''} onChange={(e) => set('industry', e.target.value)}>
            <option value="">Select an industry…</option>
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </Select>
        </Field>

        <Checkbox
          label="Not tied to this industry — open to other industries too"
          checked={form.open_to_other_industries}
          onChange={(e) => set('open_to_other_industries', e.target.checked)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Target role">
            <TextInput
              value={form.target_role || ''}
              onChange={(e) => set('target_role', e.target.value)}
              placeholder="e.g. RN, LPN, Charge Nurse"
            />
          </Field>
          <Field label="Experience (years)">
            <NumberInput
              value={form.experience_years}
              onChange={(e) => set('experience_years', e.target.value)}
            />
          </Field>
        </div>

        <TagInput
          label="Skills"
          value={form.skills}
          onChange={(v) => set('skills', v)}
          placeholder="Type a skill, press Enter"
          suggestions={getSuggestedSkills(form.target_role, form.skills)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Location">
            <TextInput
              value={form.location || ''}
              onChange={(e) => set('location', e.target.value)}
              placeholder="City, State"
            />
          </Field>
          <Field label="Desired salary">
            <NumberInput value={form.desired_salary} onChange={(e) => set('desired_salary', e.target.value)} />
          </Field>
        </div>

        <Checkbox
          label="Open to relocation"
          checked={form.open_to_relocation}
          onChange={(e) => set('open_to_relocation', e.target.checked)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email">
            <TextInput type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Phone">
            <TextInput value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Source">
            <TextInput
              value={form.source || ''}
              onChange={(e) => set('source', e.target.value)}
              placeholder="Referral, job board, agency…"
            />
          </Field>
          <Field label="Pipeline status">
            <Select value={form.pipeline_status} onChange={(e) => set('pipeline_status', e.target.value)}>
              {PIPELINE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PIPELINE_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Notes">
          <TextArea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>

        {isEdit ? (
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">Resume</span>
            <ResumeUpload
              currentFileName={form.resume_file_name}
              currentFileUrl={form.resume_file_url}
              uploading={resumeUploading}
              onUpload={handleUploadExisting}
              onRemove={handleRemoveExisting}
            />
          </div>
        ) : (
          /*
            Deliberately not using <Field>, which renders a <label>: a
            <label> wrapping a file input makes the browser natively try to
            open the picker on any click inside it, competing with our own
            onClick handler below. On mobile Safari that race silently
            drops the file selection instead of erroring, which is exactly
            the bug this avoids (same fix as the public apply form).
          */
          <div className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Resume</span>
            {resumeFile ? (
              <div className="flex items-center justify-between rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-sm text-emerald-800">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="shrink-0"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                  </svg>
                  <span className="truncate">{resumeFile.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setResumeFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="shrink-0 text-xs font-medium text-slate-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handlePickResume(e.dataTransfer.files?.[0]);
                }}
                className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 hover:border-indigo-300"
              >
                Drag & drop a resume here, or click to choose a file
                <span className="mt-1 text-xs text-slate-400">PDF, DOC, or DOCX — up to 10MB</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => handlePickResume(e.target.files?.[0])}
            />
            {resumeError && <p className="mt-1 text-xs text-rose-600">{resumeError}</p>}
          </div>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
          <Link to={isEdit ? `/job-seekers/${id}` : '/job-seekers'} className="text-sm text-slate-500 hover:underline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
