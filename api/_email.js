// Email for Cadence Pro: the purchase email and "send my key again".
//
// One small sender with two adapters, picked by whichever env vars are set:
//   Resend:   RESEND_API_KEY
//   Mailgun:  MAILGUN_API_KEY + MAILGUN_DOMAIN   (MAILGUN_REGION=eu for the EU host)
// From address: CADENCE_EMAIL_FROM (default "Cadence <support@cadencevoice.ai>").
// With neither set, send() logs and reports { sent: false }; it never throws.

const SITE = 'https://www.cadencevoice.ai';
const SUPPORT = 'support@cadencevoice.ai';
// Stripe's sign-in page for the billing portal (the same link /pricing uses).
const BILLING_LOGIN = 'https://billing.stripe.com/p/login/3cI3cufpn5ZHes46OwenS00';

function provider() {
    if (process.env.RESEND_API_KEY) return 'resend';
    if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) return 'mailgun';
    return null;
}

const from = () => process.env.CADENCE_EMAIL_FROM || `Cadence <${SUPPORT}>`;

async function viaResend(msg) {
    const headers = { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' };
    // Resend drops a repeat of the same key for 24 hours.
    if (msg.idempotencyKey) headers['Idempotency-Key'] = msg.idempotencyKey;
    const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            from: from(),
            to: [msg.to],
            subject: msg.subject,
            text: msg.text,
            html: msg.html,
            reply_to: SUPPORT,
        }),
        signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`resend ${r.status}`);
}

async function viaMailgun(msg) {
    const host = process.env.MAILGUN_REGION === 'eu' ? 'api.eu.mailgun.net' : 'api.mailgun.net';
    const body = new URLSearchParams({
        from: from(),
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        'h:Reply-To': SUPPORT,
    });
    const r = await fetch(`https://${host}/v3/${encodeURIComponent(process.env.MAILGUN_DOMAIN)}/messages`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
        signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`mailgun ${r.status}`);
}

// { to, subject, text, html, idempotencyKey? }  ->  { sent, provider?, reason? }
async function send(msg) {
    const p = provider();
    if (!p) {
        console.log('[email] no provider configured; not sent:', msg.subject);
        return { sent: false, reason: 'not_configured' };
    }
    try {
        if (p === 'resend') await viaResend(msg);
        else await viaMailgun(msg);
        return { sent: true, provider: p };
    } catch (e) {
        console.error('[email]', p, e.message);
        return { sent: false, provider: p, reason: 'failed' };
    }
}

// ---------------------------------------------------------------------------
// The messages
// ---------------------------------------------------------------------------

const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const PLAN_NAMES = {
    monthly: 'Cadence Pro, monthly',
    yearly: 'Cadence Pro, yearly',
    lifetime: 'Cadence Pro, founding member (lifetime)',
    comp: 'Cadence Pro',
};

function iphoneUrl() {
    const u = String(process.env.CADENCE_TESTFLIGHT_URL || '').trim();
    return /^https:\/\/[^\s"'<>]+$/.test(u) ? u : null;
}

const billingLogin = () => process.env.CADENCE_BILLING_LOGIN_URL || BILLING_LOGIN;

// Sections are [heading, [lines]]; a line is text or { text, href }.
function render(intro, sections) {
    const text = [intro, '']
        .concat(
            sections.flatMap(([h, lines]) => [
                h.toUpperCase(),
                ...lines.map((l) => (typeof l === 'string' ? l : `${l.text}: ${l.href}`)),
                '',
            ]),
        )
        .concat([`Questions? Reply to this email or write to ${SUPPORT}.`, '', 'Cadence Labs', SITE])
        .join('\n');
    const p = 'margin:0 0 8px;font-size:15px;line-height:1.5;color:#2b2b2a';
    const html =
        `<div style="font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#2b2b2a">` +
        `<p style="${p}">${esc(intro)}</p>` +
        sections
            .map(
                ([h, lines]) =>
                    `<h2 style="font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#77756f;margin:24px 0 8px">${esc(h)}</h2>` +
                    lines
                        .map((l) =>
                            typeof l === 'string'
                                ? /^CAD-/.test(l)
                                    ? `<p style="font-family:ui-monospace,Menlo,monospace;font-size:19px;margin:0 0 8px;padding:12px 14px;background:#f5f5f2;border-radius:8px">${esc(l)}</p>`
                                    : `<p style="${p}">${esc(l)}</p>`
                                : `<p style="${p}"><a href="${esc(l.href)}" style="color:#2b2b2a">${esc(l.text)}</a></p>`,
                        )
                        .join(''),
            )
            .join('') +
        `<p style="${p};margin-top:24px;color:#77756f">Questions? Reply to this email or write to ${SUPPORT}.</p>` +
        `<p style="${p};color:#77756f">Cadence Labs · <a href="${SITE}" style="color:#77756f">cadencevoice.ai</a></p>` +
        `</div>`;
    return { text, html };
}

function howToSections(plan) {
    const sections = [
        [
            'Turn Pro on',
            [
                'Bought from inside Cadence? Pro is already on: look at Settings → Pro.',
                'Otherwise open Cadence on your Mac, go to Settings → Pro, choose "I have a license key" and paste the key.',
                { text: 'Download Cadence for Mac', href: `${SITE}/download` },
            ],
        ],
    ];
    const iphone = iphoneUrl();
    if (iphone) {
        sections.push([
            'iPhone app',
            [
                'Pro includes the Cadence iPhone app, in beta on TestFlight. Open this link on your iPhone to install it, then pair it with your Mac by scanning the QR code Cadence shows.',
                { text: 'Get the iPhone app', href: iphone },
                { text: 'How pairing works', href: `${SITE}/docs/iphone` },
            ],
        ]);
    }
    sections.push([
        'Billing',
        [
            plan === 'lifetime'
                ? 'Your founding license is paid once and never renews. Your receipt is in the billing portal.'
                : 'Change your card, switch between monthly and yearly, download invoices or cancel in the billing portal.',
            'In Cadence: Settings → Pro → Manage billing. Or sign in with this email address:',
            { text: 'Open the billing portal', href: billingLogin() },
        ],
    ]);
    return sections;
}

// The one email a buyer gets when their license is created.
function purchaseEmail(key, lic) {
    const body = render(
        lic.plan === 'lifetime'
            ? "Thank you for becoming a founding member of Cadence Pro. Here's your license key. Keep this email: the key is how you turn Pro on."
            : "Thank you for buying Cadence Pro. Here's your license key. Keep this email: the key is how you turn Pro on.",
        [['Your license key', [key, PLAN_NAMES[lic.plan] || 'Cadence Pro']], ...howToSections(lic.plan)],
    );
    return { to: lic.email, subject: 'Your Cadence Pro license key', ...body, idempotencyKey: `cadence-purchase-${key}` };
}

const STATE_WORDS = { revoked: 'no longer active', canceled: 'ended', unpaid: 'ended', incomplete_expired: 'ended' };

// "Send my key again": every key bought with that address.
function resendEmail(email, found) {
    const lines = found.flatMap(({ key, lic }) => {
        const ended = STATE_WORDS[lic.status];
        return [key, (PLAN_NAMES[lic.plan] || 'Cadence Pro') + (ended ? ` (${ended})` : '')];
    });
    const body = render(
        found.length === 1
            ? "You asked for your Cadence Pro license key. Here it is."
            : "You asked for your Cadence Pro license keys. Here they are.",
        [[found.length === 1 ? 'Your license key' : 'Your license keys', lines], ...howToSections(found[0].lic.plan)],
    );
    return { to: email, subject: 'Your Cadence Pro license key', ...body };
}

module.exports = { provider, send, purchaseEmail, resendEmail, iphoneUrl };
