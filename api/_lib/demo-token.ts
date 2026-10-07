import { createHmac, timingSafeEqual } from 'node:crypto';

export const DEMO_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface DemoVerificationData {
  publicReference: string;
  contactFirstName: string;
  contactLastName: string;
  startDateTime: string;
  endDateTime: string;
  reason: string;
  status: 'CONFIRMED';
}

export interface DemoVerificationPayload extends DemoVerificationData {
  iat: number;
  exp: number;
}

export function createDemoVerificationToken(
  data: DemoVerificationData,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  assertTokenSecret(secret);
  const payload: DemoVerificationPayload = {
    publicReference: data.publicReference,
    contactFirstName: data.contactFirstName,
    contactLastName: data.contactLastName,
    startDateTime: data.startDateTime,
    endDateTime: data.endDateTime,
    reason: data.reason,
    status: 'CONFIRMED',
    iat: nowSeconds,
    exp: nowSeconds + DEMO_TOKEN_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = sign(encodedPayload, secret).toString('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifyDemoVerificationToken(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): DemoVerificationData | null {
  if (!isValidSecret(secret) || token.length > 4096) return null;
  const [encodedPayload, encodedSignature, extra] = token.split('.');
  if (!encodedPayload || !encodedSignature || extra !== undefined ||
      !/^[A-Za-z0-9_-]+$/.test(encodedPayload) || !/^[A-Za-z0-9_-]+$/.test(encodedSignature)) return null;

  const actualSignature = Buffer.from(encodedSignature, 'base64url');
  const expectedSignature = sign(encodedPayload, secret);
  if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) return null;

  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as unknown;
  } catch {
    return null;
  }

  if (!isPayload(value) || value.exp <= nowSeconds || value.iat > nowSeconds + 60 ||
      value.exp <= value.iat || value.exp - value.iat > DEMO_TOKEN_TTL_SECONDS) return null;

  return {
    publicReference: value.publicReference,
    contactFirstName: value.contactFirstName,
    contactLastName: value.contactLastName,
    startDateTime: value.startDateTime,
    endDateTime: value.endDateTime,
    reason: value.reason,
    status: 'CONFIRMED',
  };
}

function sign(value: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(value).digest();
}

function assertTokenSecret(secret: string): void {
  if (!isValidSecret(secret)) throw new Error('Demo verification signing key is not configured.');
}

function isValidSecret(secret: string): boolean {
  return typeof secret === 'string' && Buffer.byteLength(secret, 'utf8') >= 32;
}

function isPayload(value: unknown): value is DemoVerificationPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  const keys = ['publicReference', 'contactFirstName', 'contactLastName', 'startDateTime', 'endDateTime', 'reason', 'status', 'iat', 'exp'];
  if (Object.keys(payload).length !== keys.length || keys.some((key) => !(key in payload))) return false;
  return typeof payload['publicReference'] === 'string' && payload['publicReference'].length > 0 && payload['publicReference'].length <= 100 &&
    typeof payload['contactFirstName'] === 'string' && payload['contactFirstName'].length > 0 && payload['contactFirstName'].length <= 80 &&
    typeof payload['contactLastName'] === 'string' && payload['contactLastName'].length > 0 && payload['contactLastName'].length <= 80 &&
    isLocalDateTime(payload['startDateTime']) && isLocalDateTime(payload['endDateTime']) &&
    (payload['endDateTime'] as string) > (payload['startDateTime'] as string) &&
    typeof payload['reason'] === 'string' && payload['reason'].length > 0 && payload['reason'].length <= 255 &&
    payload['status'] === 'CONFIRMED' && Number.isSafeInteger(payload['iat']) && Number.isSafeInteger(payload['exp']);
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
