import { useState } from 'react';
import { api } from '../api/client.js';
import { Field, TextInput, NumberInput, TextArea } from '../components/FormFields.jsx';
import { TagInput } from '../components/TagInput.jsx';
import { getSuggestedSkills } from '../skillSuggestions.js';
import { PublicShell } from '../components/PublicShell.jsx';

const EMPTY = {
  title: '',
  company: '',
  position_type: '',
  required_skills: [],
  min_experience_years: '',
  location: '',
  salary_min: '',
  salary_max: '',
  notes: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
};

export function PublicPostOpportunity() {
  const [form, setForm] = useState(EMPTY);
  const [website, setWebsite] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        min_experience_years: form.min_experience_years === '' ? null : Number(form.min_experience_years),
        salary_min: form.salary_min === '' ? null : Number(form.salary_min),
        salary_max: form.salary_max === '' ? null : Number(form.salary_max),
        website,
      };
      await api.post('/public/opportunities', payload);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <PublicShell title="Post an Opportunity">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="text-lg font-semibold text-emerald-800">Thanks — your role was submitted!</p>
          <p className="mt-1 text-sm text-emerald-700">
            We'll start matching it against candidates in our pipeline right away.
          </p>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell
      title="Post an Opportunity"
      subtitle="Describe the role and what you're looking for — we'll match it to candidates."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Job title" required>
          <TextInput value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Company">
            <TextInput
              value={form.company}
              onChange={(e) => set('company', e.target.value)}
              placeholder="e.g. Healthcare Group"
            />
          </Field>
          <Field label="Position type">
            <TextInput
              value={form.position_type}
              onChange={(e) => set('position_type', e.target.value)}
              placeholder="e.g. Nursing Home Administrator"
            />
          </Field>
        </div>

        <Field label="Minimum experience (years)">
          <NumberInput
            value={form.min_experience_years}
            onChange={(e) => set('min_experience_years', e.target.value)}
          />
        </Field>

        <TagInput
          label="Required skills"
          value={form.required_skills}
          onChange={(v) => set('required_skills', v)}
          placeholder="Type a skill, press Enter"
          suggestions={getSuggestedSkills(form.title, form.required_skills)}
        />

        <Field label="Location">
          <TextInput value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="City, State" />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Minimum salary">
            <NumberInput value={form.salary_min} onChange={(e) => set('salary_min', e.target.value)} />
          </Field>
          <Field label="Maximum salary">
            <NumberInput value={form.salary_max} onChange={(e) => set('salary_max', e.target.value)} />
          </Field>
        </div>

        <Field label="Tell us more about the role">
          <TextArea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>

        <div className="border-t border-slate-100 pt-4">
          <p className="mb-3 text-sm font-medium text-slate-700">Your contact info</p>
          <p className="mb-3 text-xs text-slate-500">
            So we can reach out when we find a strong candidate. Never shown publicly.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Your name">
              <TextInput value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} />
            </Field>
            <Field label="Phone">
              <TextInput value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Email" required>
              <TextInput
                type="email"
                value={form.contact_email}
                onChange={(e) => set('contact_email', e.target.value)}
                required
              />
            </Field>
          </div>
        </div>

        {/* Honeypot — hidden from real users, catches simple bots */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit opportunity'}
        </button>
      </form>
    </PublicShell>
  );
}
