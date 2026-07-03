import { env } from '../env.js';

// If RESEND_API_KEY isn't configured, notifications are skipped (logged,
// not thrown) — this lets the app run fine before an email provider is
// wired up, same fallback philosophy as local-disk resume storage.
const isEmailConfigured = Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL);

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

export async function sendMatchApprovedEmail({
  to,
  contactName,
  opportunityTitle,
  seekerName,
  seekerTargetRole,
  seekerSkills,
  seekerExperienceYears,
  score,
  resumeUrl,
}) {
  if (!isEmailConfigured) {
    console.log(`[email] RESEND_API_KEY/RESEND_FROM_EMAIL not set — skipping approval notification to ${to}`);
    return;
  }

  const greeting = contactName ? `Hi ${escapeHtml(contactName)},` : 'Hi,';
  const skillsLine = seekerSkills?.length ? escapeHtml(seekerSkills.join(', ')) : 'Not specified';
  const resumeLine = resumeUrl
    ? `<p><a href="${escapeHtml(resumeUrl)}">View resume</a></p>`
    : '<p>No resume on file yet.</p>';

  const html = `
    <div style="font-family: sans-serif; color: #1e293b; line-height: 1.5;">
      <p>${greeting}</p>
      <p>We've approved a strong candidate match for <strong>${escapeHtml(opportunityTitle)}</strong> (fit score ${score}/100):</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Candidate</td><td>${escapeHtml(seekerName)}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Target role</td><td>${escapeHtml(seekerTargetRole || 'Not specified')}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Experience</td><td>${seekerExperienceYears != null ? `${seekerExperienceYears} years` : 'Not specified'}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Skills</td><td>${skillsLine}</td></tr>
      </table>
      ${resumeLine}
      <p>Reply to this email and we'll help coordinate next steps.</p>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [to],
      subject: `Strong candidate match for ${opportunityTitle}`,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[email] failed to send match-approved notification', res.status, text);
  }
}
