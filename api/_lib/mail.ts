import nodemailer, { type Transporter } from 'nodemailer';
import type { DemoVerificationData } from './demo-token.js';

export interface DemoMailConfig {
  from: string;
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface DemoMailAppointment extends DemoVerificationData {
  contactEmail: string;
}

export type DemoMailConfigResult =
  | { kind: 'disabled' }
  | { kind: 'invalid' }
  | { kind: 'ready'; config: DemoMailConfig };

export function getDemoMailConfig(env: NodeJS.ProcessEnv = process.env): DemoMailConfigResult {
  if (env['DEMO_MAIL_ENABLED'] !== 'true') return { kind: 'disabled' };

  const from = env['DEMO_MAIL_FROM']?.trim();
  const host = env['DEMO_SMTP_HOST']?.trim();
  const portValue = env['DEMO_SMTP_PORT']?.trim();
  const username = env['DEMO_SMTP_USERNAME']?.trim();
  const password = env['DEMO_SMTP_PASSWORD'];
  const port = Number(portValue);
  if (!from || !host || !portValue || !Number.isInteger(port) || port < 1 || port > 65535 || !username || !password?.trim() ||
      !isEmail(from) || !isEmail(username)) return { kind: 'invalid' };

  return { kind: 'ready', config: { from, host, port, username, password } };
}

export function getDemoTokenSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = env['DEMO_TOKEN_SECRET'];
  return secret && Buffer.byteLength(secret, 'utf8') >= 32 ? secret : null;
}

export function getPublicAppUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const value = env['APP_PUBLIC_URL']?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if ((url.protocol !== 'https:' && url.hostname !== 'localhost') || url.username || url.password || url.search || url.hash) return null;
    return url.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

export async function sendDemoConfirmationEmail(
  config: DemoMailConfig,
  appointment: DemoMailAppointment,
  verificationUrl: string,
  qrBuffer: Buffer,
  createTransport = nodemailer.createTransport,
): Promise<void> {
  const transporter: Transporter = createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.username, pass: config.password },
  });

  const date = formatDate(appointment.startDateTime);
  const startTime = formatTime(appointment.startDateTime);
  const endTime = formatTime(appointment.endDateTime);
  const safe = {
    firstName: escapeHtml(appointment.contactFirstName),
    lastName: escapeHtml(appointment.contactLastName),
    reference: escapeHtml(appointment.publicReference),
    reason: escapeHtml(appointment.reason),
    date: escapeHtml(date),
    startTime: escapeHtml(startTime),
    endTime: escapeHtml(endTime),
    verificationUrl: escapeHtml(verificationUrl),
  };

  await transporter.sendMail({
    from: config.from,
    to: appointment.contactEmail,
    subject: 'Votre rendez-vous démo est confirmé',
    text: [
      `Bonjour ${appointment.contactFirstName} ${appointment.contactLastName},`,
      '',
      'Votre rendez-vous est confirmé.',
      `Référence : ${appointment.publicReference}`,
      `Date : ${date}`,
      `Créneau : ${startTime} - ${endTime}`,
      `Motif : ${appointment.reason}`,
      'Statut : Confirmé',
      '',
      'Scannez le QR code joint ou consultez votre réservation ici :',
      verificationUrl,
    ].join('\n'),
    html: `<main style="font-family:Arial,sans-serif;color:#172033;max-width:600px;margin:auto;line-height:1.6"><p>Bonjour ${safe.firstName} ${safe.lastName},</p><p>Votre rendez-vous est confirmé.</p><dl><dt><strong>Référence</strong></dt><dd>${safe.reference}</dd><dt><strong>Date</strong></dt><dd>${safe.date}</dd><dt><strong>Créneau</strong></dt><dd>${safe.startTime} - ${safe.endTime}</dd><dt><strong>Motif</strong></dt><dd>${safe.reason}</dd><dt><strong>Statut</strong></dt><dd>Confirmé</dd></dl><p>Scannez le QR code ci-dessous pour consulter votre réservation.</p><p><img src="cid:demoQrCode" width="320" height="320" alt="QR code de vérification de démonstration"></p><p><a href="${safe.verificationUrl}">Ouvrir la vérification de démonstration</a></p></main>`,
    attachments: [{ filename: 'reservation-qr.png', content: qrBuffer, cid: 'demoQrCode', contentType: 'image/png' }],
  });
}

function isEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(year, month - 1, day));
}

function formatTime(value: string): string {
  return value.slice(11, 16);
}
