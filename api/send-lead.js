// Универсальный serverless-обработчик для заявок.
// Работает на Vercel/Netlify/Cloudflare (Node 18+ с global fetch).
// Требуемые переменные окружения:
// TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
// RESEND_API_KEY (опционально для email). FROM_EMAIL, TO_EMAIL (если используете Resend).

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@advokat-zaitsev.ru';
const TO_EMAIL = process.env.TO_EMAIL || 'info@advokat-zaitsev.ru';

const jsonResponse = (status, body) => ({
  status,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

async function sendToTelegram(payload) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { ok: false, error: 'Telegram not configured' };
  }
  const text = [
    'Новая заявка с сайта',
    `Имя: ${payload.name || '—'}`,
    `Телефон: ${payload.phone || '—'}`,
    `Email: ${payload.email || '—'}`,
    `Тип: ${payload.type || '—'}`,
    `Способ связи: ${payload.contactMethod || '—'}`,
    `Удобное время: ${payload.contactTime || '—'}`,
    'Детали дела не собирались в онлайн-форме.',
    `Источник: ${payload.source || '—'}`,
  ].join('\n');

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram error: ${err}`);
  }
  return { ok: true };
}

async function sendEmail(payload) {
  if (!RESEND_API_KEY) {
    return { ok: false, error: 'Resend not configured' };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      subject: 'Новая заявка с сайта advokat-zaitsev.ru',
      text: `
Имя: ${payload.name || '—'}
Телефон: ${payload.phone || '—'}
Email: ${payload.email || '—'}
Тип: ${payload.type || '—'}
Способ связи: ${payload.contactMethod || '—'}
Удобное время: ${payload.contactTime || '—'}
Детали дела не собирались в онлайн-форме.
Источник: ${payload.source || '—'}
`,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Email error: ${err}`);
  }
  return { ok: true };
}

async function handleRequest(req) {
  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { name, phone, email, type, contactMethod, contactTime, source, honeypot } = body || {};

  // Простая валидация
  if (honeypot) return jsonResponse(400, { ok: false, error: 'Spam detected' });
  if (!name || !phone) return jsonResponse(400, { ok: false, error: 'Name and phone are required' });
  if (!contactMethod || !contactTime) return jsonResponse(400, { ok: false, error: 'Contact method and time are required' });

  const payload = { name, phone, email, type, contactMethod, contactTime, source };

  try {
    const results = await Promise.allSettled([sendToTelegram(payload), sendEmail(payload)]);
    const success = results.some(r => r.status === 'fulfilled' && r.value.ok);
    if (!success) {
      const errors = results.map(r => (r.status === 'rejected' ? r.reason?.message : r.value?.error)).filter(Boolean);
      return jsonResponse(502, { ok: false, error: errors.join('; ') || 'Delivery failed' });
    }
    return jsonResponse(200, { ok: true });
  } catch (err) {
    return jsonResponse(500, { ok: false, error: err.message || 'Internal error' });
  }
}

// Vercel / Netlify style exports
export default async function handler(req, res) {
  const result = await handleRequest(req);
  res.status(result.status).set(result.headers).send(result.body);
}

// Cloudflare Pages Functions style
export async function onRequest(context) {
  const req = context.request;
  const body = await req.json().catch(() => ({}));
  const result = await handleRequest({ method: req.method, body });
  return new Response(result.body, { status: result.status, headers: result.headers });
}
