const SITE = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Biography Library';

function fromAddress(): string | null {
  return process.env.RESEND_FROM_EMAIL ?? null;
}

function getApiKey(): string | null {
  return process.env.RESEND_API_KEY ?? null;
}

/** Uses Resend HTTP API directly (no `resend` SDK — avoids optional peer `@react-email/render`). */
async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const key = getApiKey();
  const from = fromAddress();
  if (!key || !from) {
    console.warn('[account-emails] skip: RESEND_API_KEY or RESEND_FROM_EMAIL missing');
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API ${res.status}: ${text.slice(0, 200)}`);
  }
}

/** Best-effort transactional mail; logs and skips when Resend is not configured. */
export async function sendAccountSuspendedEmail(to: string): Promise<void> {
  await sendResendEmail({
    to,
    subject: `${SITE} — Account sospeso`,
    html: `
      <p>Gentile utente,</p>
      <p>Il tuo account è stato <strong>sospeso</strong>. Non è al momento possibile accedere alla piattaforma e i contenuti associati al tuo profilo non sono visibili pubblicamente.</p>
      <p>Per informazioni puoi rispondere a questa email.</p>
      <p>— Il team di ${SITE}</p>
    `,
  });
}

export async function sendAccountReinstatedEmail(to: string): Promise<void> {
  const base =
    typeof process.env.NEXT_PUBLIC_SITE_URL === 'string'
      ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
      : '';
  const loginLink = base ? `${base}/login` : '/login';
  await sendResendEmail({
    to,
    subject: `${SITE} — Account riattivato`,
    html: `
      <p>Gentile utente,</p>
      <p>Il tuo account è stato <strong>riattivato</strong>. Puoi nuovamente accedere alla piattaforma.</p>
      <p><a href="${loginLink}">Accedi</a></p>
      <p>— Il team di ${SITE}</p>
    `,
  });
}

export async function sendAccountDeletedEmail(to: string): Promise<void> {
  await sendResendEmail({
    to,
    subject: `${SITE} — Account cancellato`,
    html: `
      <p>Gentile utente,</p>
      <p>Il tuo account è stato <strong>cancellato</strong>. Non sarà più possibile accedere con queste credenziali.</p>
      <p>— Il team di ${SITE}</p>
    `,
  });
}
