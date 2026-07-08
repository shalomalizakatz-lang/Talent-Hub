import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Field, TextInput, NumberInput, TextArea, Select } from '../components/FormFields.jsx';
import { TagInput } from '../components/TagInput.jsx';
import { getSuggestedSkills } from '../skillSuggestions.js';
import { OPPORTUNITY_STATUSES, OPPORTUNITY_STATUS_LABELS } from '../constants.js';
import { INDUSTRIES } from '../industries.js';

const EMPTY = {
  title: '',
  company: '',
  position_type: '',
  industry: '',
  required_skills: [],
  min_experience_years: '',
  location: '',
  salary_min: '',
  salary_max: '',
  status: 'open',
  notes: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
};

export function OpportunityForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/opportunities/${id}`).then((data) => {
      setForm({
        ...EMPTY,
        ...data,
        min_experience_years: data.min_experience_years ?? '',
        salary_min: data.salary_min ?? '',
        salary_max: data.salary_max ?? '',
      });
      setLoading(false);
    });
  }, [id, isEdit]);

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
      };
      const saved = isEdit
        ? await api.put(`/opportunities/${id}`, payload)
        : await api.post('/opportunities', payload);
      navigate(`/opportunities/${saved.id}`);
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold text-slate-900">{isEdit ? 'Edit Opportunity' : 'Add Opportunity'}</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <Field label="Title" required>
          <TextInput value={form.title} onChange={(e) => set('title', e.target.value)} required />
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Company">
            <TextInput
              value={form.company || ''}
              onChange={(e) => set('company', e.target.value)}
              placeholder="e.g. Healthcare Group"
            />
          </Field>
          <Field label="Position type">
            <TextInput
              value={form.position_type || ''}
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
          <TextInput value={form.location || ''} onChange={(e) => set('location', e.target.value)} placeholder="City, State" />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Minimum salary">
            <NumberInput value={form.salary_min} onChange={(e) => set('salary_min', e.target.value)} />
          </Field>
          <Field label="Maximum salary">
            <NumberInput value={form.salary_max} onChange={(e) => set('salary_max', e.target.value)} />
          </Field>
        </div>

        <Field label="Status">
          <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
            {OPPORTUNITY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {OPPORTUNITY_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>

        <div className="border-t border-slate-100 pt-4">
          <p className="mb-3 text-sm font-medium text-slate-700">Employer contact</p>
          <p className="mb-3 text-xs text-slate-500">
            Used internally to reach out about candidates — never shown on the public jobs board.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Contact name">
              <TextInput value={form.contact_name || ''} onChange={(e) => set('contact_name', e.target.value)} />
            </Field>
            <Field label="Contact phone">
              <TextInput value={form.contact_phone || ''} onChange={(e) => set('contact_phone', e.target.value)} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Contact email" required>
              <TextInput
                type="email"
                value={form.contact_email || ''}
                onChange={(e) => set('contact_email', e.target.value)}
                required
              />
            </Field>
          </div>
        </div>

        <Field label="Notes">
          <TextArea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
          <Link to={isEdit ? `/opportunities/${id}` : '/opportunities'} className="text-sm text-slate-500 hover:underline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
