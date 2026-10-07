import QRCode from 'qrcode';
import { createDemoVerificationToken, type DemoVerificationData } from '../_lib/demo-token';
import {
  getDemoMailConfig, getDemoTokenSecret, getPublicAppUrl, sendDemoConfirmationEmail,
  type DemoMailAppointment,
} from '../_lib/mail';

const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export interface DemoConfirmationDependencies {
  qrToBuffer?: typeof QRCode.toBuffer;
  sendEmail?: typeof sendDemoConfirmationEmail;
}

interface SendConfirmationPayload extends DemoVerificationData {
  contactEmail: string;
}

export default function handler(request: Request): Promise<Response> {
  return handleSendConfirmation(request);
}

export async function handleSendConfirmation(request: Request, dependencies: DemoConfirmationDependencies = {}): Promise<Response> {
  if (request.method !== 'POST') return json({ sent: false, message: 'Méthode non autorisée.' }, 405, { allow: 'POST' });

  const rateKey = (request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown').slice(0, 128);
  if (isRateLimited(rateKey)) return json({ sent: false, message: 'Trop de demandes. Réessayez plus tard.' }, 429);

  const body = await readJsonBody(request);
  if (body.kind !== 'valid' || !isSendPayload(body.value)) return json({ sent: false, message: 'Les informations de réservation sont invalides.' }, 400);

  const mail = getDemoMailConfig();
  if (mail.kind === 'disabled') return json({ sent: false, reason: 'MAIL_DISABLED' }, 200);
  if (mail.kind === 'invalid') return json({ sent: false, message: 'La configuration du service email est incomplète ou invalide.' }, 503);

  const secret = getDemoTokenSecret();
  const appUrl = getPublicAppUrl();
  if (!secret || !appUrl) return json({ sent: false, message: 'La configuration de vérification est incomplète ou invalide.' }, 503);

  const { contactEmail, ...verificationData } = body.value;
  try {
    const token = createDemoVerificationToken(verificationData, secret);
    const verificationUrl = `${appUrl}/verify-demo?token=${encodeURIComponent(token)}`;
    const qrBuffer = await (dependencies.qrToBuffer ?? QRCode.toBuffer)(verificationUrl, { type: 'png', width: 320, margin: 2 });
    await (dependencies.sendEmail ?? sendDemoConfirmationEmail)(mail.config, { ...verificationData, contactEmail } as DemoMailAppointment, verificationUrl, qrBuffer);
    return json({ sent: true }, 200);
  } catch (error) {
    const safeError = error as { name?: unknown; code?: unknown };
    console.error('Demo confirmation email failed', {
      name: typeof safeError?.name === 'string' ? safeError.name : 'Error',
      ...(typeof safeError?.code === 'string' ? { code: safeError.code } : {}),
    });
    return json({ sent: false, message: "Votre rendez-vous est confirmé, mais l'email de confirmation n'a pas pu être envoyé." }, 502);
  }
}

async function readJsonBody(request: Request): Promise<{ kind: 'valid'; value: unknown } | { kind: 'invalid' }> {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json') || !request.body) return { kind: 'invalid' };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) {
        await reader.cancel();
        return { kind: 'invalid' };
      }
      chunks.push(value);
    }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
    return { kind: 'valid', value: JSON.parse(text) as unknown };
  } catch {
    return { kind: 'invalid' };
  }
}

export function isSendPayload(value: unknown): value is SendConfirmationPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  const keys = ['contactFirstName', 'contactLastName', 'contactEmail', 'publicReference', 'startDateTime', 'endDateTime', 'reason', 'status'];
  if (Object.keys(payload).length !== keys.length || keys.some((key) => !(key in payload))) return false;
  return isBoundedText(payload['contactFirstName'], 80) && isBoundedText(payload['contactLastName'], 80) &&
    typeof payload['contactEmail'] === 'string' && payload['contactEmail'].length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload['contactEmail']) &&
    isBoundedText(payload['publicReference'], 100) && isLocalDateTime(payload['startDateTime']) &&
    isLocalDateTime(payload['endDateTime']) && payload['endDateTime'] > payload['startDateTime'] &&
    isBoundedText(payload['reason'], 255) && payload['status'] === 'CONFIRMED';
}

function isBoundedText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function isLocalDateTime(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return false;
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second = 0] = timePart.split(':').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day &&
    date.getUTCHours() === hour && date.getUTCMinutes() === minute && date.getUTCSeconds() === second;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const current = requestCounts.get(key);
  if (!current || current.resetAt <= now) {
    if (requestCounts.size >= 1000) {
      for (const [client, limit] of requestCounts) if (limit.resetAt <= now) requestCounts.delete(client);
      if (requestCounts.size >= 1000) return true;
    }
    requestCounts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count++;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

function json(body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store', ...extraHeaders } });
}
