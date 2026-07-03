import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Field, TextInput, NumberInput, TextArea, Select, Checkbox } from '../components/FormFields.jsx';
import { TagInput } from '../components/TagInput.jsx';
import { getSuggestedSkills } from '../skillSuggestions.js';
import { PIPELINE_STATUSES, PIPELINE_STATUS_LABELS } from '../constants.js';

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
  pipeline_status: 'new',
  notes: '',
};

export function JobSeekerForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
