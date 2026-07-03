export const PIPELINE_STATUSES = ['new', 'screening', 'interviewing', 'offered', 'placed', 'archived'];

export const PIPELINE_STATUS_LABELS = {
  new: 'New',
  screening: 'Screening',
  interviewing: 'Interviewing',
  offered: 'Offered',
  placed: 'Placed',
  archived: 'Archived',
};

export const PIPELINE_STATUS_STYLES = {
  new: 'bg-slate-100 text-slate-700',
  screening: 'bg-sky-100 text-sky-700',
  interviewing: 'bg-amber-100 text-amber-700',
  offered: 'bg-violet-100 text-violet-700',
  placed: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-slate-100 text-slate-400',
};

export const OPPORTUNITY_STATUSES = ['open', 'filled', 'closed'];

export const OPPORTUNITY_STATUS_LABELS = {
  open: 'Open',
  filled: 'Filled',
  closed: 'Closed',
};

export const OPPORTUNITY_STATUS_STYLES = {
  open: 'bg-emerald-100 text-emerald-700',
  filled: 'bg-sky-100 text-sky-700',
  closed: 'bg-slate-100 text-slate-500',
};
