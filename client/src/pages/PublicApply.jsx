import { useRef, useState } from 'react';
import { api } from '../api/client.js';
import { Field, TextInput, NumberInput, TextArea, Checkbox } from '../components/FormFields.jsx';
import { TagInput } from '../components/TagInput.jsx';
import { PublicShell } from '../components/PublicShell.jsx';
import { getSuggestedSkills } from '../skillSuggestions.js';

const EMPTY = {
  name: '',
  target_role: '',
  skills: [],
  experience_years: '',
  location: '',
  open_to_relocation: false,
  desired_salary: '',
  email: '',
  phone: '',
  source: '',
  notes: '',
};

const MAX_BYTES = 10 * 1024 * 1024;

export function PublicApply() {
  const [form, setForm] = useState(EMPTY);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeError, setResumeError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleFile(file) {
    setResumeError('');
    if (!file) return;
    if (!/\.(pdf|doc|docx)$/i.test(file.name)) {
      setResumeError('File must be a PDF, DOC, or DOCX');
      return;
    }
    if (file.size > MAX_BYTES) {
      setResumeError('File must be 10MB or smaller');
      return;
    }
    setResumeFile(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('target_role', form.target_role);
      formData.append('skills', form.skills.join(','));
      if (form.experience_years !== '') formData.append('experience_years', form.experience_years);
      formData.append('location', form.location);
      formData.append('open_to_relocation', form.open_to_relocation ? 'true' : 'false');
      if (form.desired_salary !== '') formData.append('desired_salary', form.desired_salary);
      formData.append('email', form.email);
      formData.append('phone', form.phone);
      formData.append('source', form.source);
      formData.append('notes', form.notes);
      formData.append('website', form.website || '');
      if (resumeFile) formData.append('resume', resumeFile);

      await api.post('/public/job-seekers', formData, { isForm: true });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <PublicShell title="Job Seeker Application">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="text-lg font-semibold text-emerald-800">Thanks — your application was received!</p>
          <p className="mt-1 text-sm text-emerald-700">A recruiter will follow up if there's a fit.</p>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell title="Job Seeker Application" subtitle="Tell us about yourself and we'll match you to open roles.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name" required>
          <TextInput value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Role you're looking for">
            <TextInput
              value={form.target_role}
              onChange={(e) => set('target_role', e.target.value)}
              placeholder="e.g. RN, LPN, Charge Nurse"
            />
          </Field>
          <Field label="Years of experience">
            <NumberInput value={form.experience_years} onChange={(e) => set('experience_years', e.target.value)} />
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
            <TextInput value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="City, State" />
          </Field>
          <Field label="Desired salary">
            <NumberInput value={form.desired_salary} onChange={(e) => set('desired_salary', e.target.value)} />
          </Field>
        </div>

        <Checkbox
          label="I'm open to relocating"
          checked={form.open_to_relocation}
          onChange={(e) => set('open_to_relocation', e.target.checked)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email">
            <TextInput type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Phone">
            <TextInput value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
        </div>

        <Field label="How did you hear about us?">
          <TextInput value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="Referral, job board, etc." />
        </Field>

        <Field label="Anything else you'd like us to know?">
          <TextArea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>

        {/*
          Deliberately not using <Field>, which renders a <label>: a <label>
          wrapping a file input makes the browser natively try to open the
          picker on any click inside it, competing with our own onClick
          handler below. On mobile Safari that race silently drops the
          file selection instead of erroring, which is exactly the bug
          this avoids.
        */}
        <div className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Resume</span>
          {resumeFile ? (
            <div className="flex items-center justify-between rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2">
              <span className="flex min-w-0 items-center gap-2 text-sm text-emerald-800">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
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
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 hover:border-indigo-300"
            >
              Drag & drop your resume, or click to choose a file
              <span className="mt-1 text-xs text-slate-400">PDF, DOC, or DOCX — up to 10MB</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {resumeError && <p className="mt-1 text-xs text-rose-600">{resumeError}</p>}
        </div>

        {/* Honeypot — hidden from real users, catches simple bots */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
          onChange={(e) => set('website', e.target.value)}
        />

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit application'}
        </button>
      </form>
    </PublicShell>
  );
}
