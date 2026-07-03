export function matchTier(score) {
  if (score >= 75) return 'strong';
  if (score >= 45) return 'moderate';
  return 'weak';
}

const TIER_STYLES = {
  strong: { ring: '#059669', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Strong fit' },
  moderate: { ring: '#d97706', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Moderate fit' },
  weak: { ring: '#dc2626', bg: 'bg-rose-50', text: 'text-rose-700', label: 'Weak fit' },
};

export function ScoreRing({ score, size = 56 }) {
  const tier = matchTier(score);
  const style = TIER_STYLES[tier];
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e2e8f0" strokeWidth="6" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={style.ring}
          strokeWidth="6"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-700">
        {score}
      </div>
    </div>
  );
}

export function TierBadge({ score }) {
  const tier = matchTier(score);
  const style = TIER_STYLES[tier];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

export function ScoreBreakdown({ breakdown }) {
  const rows = [
    ['Skills', breakdown.skills, 50, null],
    ['Experience', breakdown.experience, 20, null],
    ['Location', breakdown.location, 15, breakdown.locationBasis],
    ['Salary', breakdown.salary, 15, null],
  ];
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 sm:grid-cols-4">
      {rows.map(([label, val, max, basis]) => (
        <div key={label}>
          {label}: <span className="font-medium text-slate-700">{val}</span>/{max}
          {basis === 'relocation' && <span className="ml-1 text-indigo-500">(open to relocation)</span>}
          {basis === 'nearby' && <span className="ml-1 text-indigo-500">(nearby)</span>}
        </div>
      ))}
    </div>
  );
}
