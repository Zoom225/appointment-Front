import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

interface ConfirmationPayload {
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  publicReference: string;
  startDateTime: string;
  endDateTime: string;
  reason: string;
  status: 'CONFIRMED';
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: false;
  auth: { user: string; pass: string };
}

type TransportFactory = (config: SmtpConfig) => {
  sendMail(message: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<unknown>;
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleDemoConfirmation(req, res);
}

export async function handleDemoConfirmation(
  req: Pick<VercelRequest, 'method' | 'body'>,
  res: VercelResponse,
  createTransport: TransportFactory = nodemailer.createTransport as TransportFactory,
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ sent: false, message: 'Méthode non autorisée.' });
    return;
  }

  const body = req.body ?? {};
  if (!isConfirmationPayload(body)) {
    res.status(400).json({ sent: false, message: 'Les informations de réservation sont invalides.' });
    return;
  }

  if (process.env['DEMO_MAIL_ENABLED'] !== 'true') {
    res.status(200).json({ sent: false, reason: 'MAIL_DISABLED' });
    return;
  }

  const from = process.env['DEMO_MAIL_FROM'];
  const host = process.env['DEMO_SMTP_HOST'];
  const port = Number(process.env['DEMO_SMTP_PORT'] ?? 587);
  const username = process.env['DEMO_SMTP_USERNAME'];
  const password = process.env['DEMO_SMTP_PASSWORD'];
  if (!from || !host || !Number.isInteger(port) || port < 1 || port > 65535 || !username || !password) {
    res.status(503).json({ sent: false, message: "Le service d'email n'est pas configuré." });
    return;
  }

  const firstName = escapeHtml(body.contactFirstName.trim());
  const lastName = escapeHtml(body.contactLastName.trim());
  const reference = escapeHtml(body.publicReference.trim());
  const start = escapeHtml(body.startDateTime.trim());
  const end = escapeHtml(body.endDateTime.trim());
  const reason = escapeHtml(body.reason.trim());
  const text = [
    `Bonjour ${body.contactFirstName.trim()},`,
    '',
    'Votre rendez-vous est confirmé.',
    '',
    `Référence : ${body.publicReference.trim()}`,
    `Date : ${body.startDateTime.trim()}`,
    `Créneau : ${body.startDateTime.trim()} - ${body.endDateTime.trim()}`,
    `Motif : ${body.reason.trim()}`,
    'Statut : Confirmé',
    '',
    'Merci.',
  ].join('\n');
  const html = `<!doctype html><html lang="fr"><body style="font-family:Arial,sans-serif;color:#172033;line-height:1.5"><p>Bonjour ${firstName} ${lastName},</p><p>Votre rendez-vous est confirmé.</p><p><strong>Référence :</strong> ${reference}<br><strong>Date :</strong> ${start}<br><strong>Créneau :</strong> ${start} - ${end}<br><strong>Motif :</strong> ${reason}<br><strong>Statut :</strong> Confirmé</p><p>Merci.</p></body></html>`;

  try {
    const transporter = createTransport({
      host,
      port,
      secure: false,
      auth: { user: username, pass: password },
    });
    await transporter.sendMail({
      from,
      to: body.contactEmail.trim(),
      subject: 'Votre rendez-vous est confirmé',
      text,
      html,
    });
    res.status(200).json({ sent: true });
  } catch (error) {
    const safeError = error as { name?: unknown; code?: unknown };
    console.error('Demo confirmation email failed', {
      name: typeof safeError?.name === 'string' ? safeError.name : 'Error',
      ...(typeof safeError?.code === 'string' ? { code: safeError.code } : {}),
    });
    res.status(502).json({
      sent: false,
      message: "Le rendez-vous est confirmé mais l'email n'a pas pu être envoyé.",
    });
  }
}

function isConfirmationPayload(value: unknown): value is ConfirmationPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  return isText(payload['contactFirstName'], 80) && isText(payload['contactLastName'], 80) &&
    typeof payload['contactEmail'] === 'string' && payload['contactEmail'].length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload['contactEmail']) &&
    isText(payload['publicReference'], 100) && isDateTime(payload['startDateTime']) &&
    isDateTime(payload['endDateTime']) && new Date(payload['endDateTime']).getTime() > new Date(payload['startDateTime']).getTime() &&
    isText(payload['reason'], 255) && payload['status'] === 'CONFIRMED';
}

function isText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function isDateTime(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}
