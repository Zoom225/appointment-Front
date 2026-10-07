// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMail = vi.hoisted(() => vi.fn());

import { createDemoVerificationToken, verifyDemoVerificationToken } from '../../../../api/_lib/demo-token';
import { sendDemoConfirmationEmail } from '../../../../api/_lib/mail';
import { handleSendConfirmation, isSendPayload } from '../../../../api/demo/send-confirmation';
import { handleVerifyDemoAppointment } from '../../../../api/demo/verify';

const secret = 'unit-test-secret-that-is-at-least-32-bytes-long';
const appointment = {
  contactFirstName: 'Alice', contactLastName: 'Martin', contactEmail: 'alice@example.test',
  publicReference: 'DEMO-RDV-123456', startDateTime: '2030-01-08T09:00:00',
  endDateTime: '2030-01-08T09:30:00', reason: 'Entretien', status: 'CONFIRMED' as const,
};
const fakeQr = async () => Buffer.alloc(256, 1);
const dependencies = { qrToBuffer: fakeQr, sendEmail: sendMail };

describe('Vercel demo email and verification functions', () => {
  const priorEnv = { ...process.env };
  let requestNumber = 0;

  beforeEach(() => {
    sendMail.mockReset();
    sendMail.mockResolvedValue(undefined);
    requestNumber++;
    Object.assign(process.env, {
      DEMO_MAIL_ENABLED: 'true', DEMO_MAIL_FROM: 'sender@example.test',
      DEMO_SMTP_HOST: 'smtp.example.test', DEMO_SMTP_PORT: '587',
      DEMO_SMTP_USERNAME: 'sender@example.test', DEMO_SMTP_PASSWORD: 'test-only-password',
      DEMO_TOKEN_SECRET: secret, APP_PUBLIC_URL: 'https://demo.example.test/',
    });
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) if (!(key in priorEnv)) delete process.env[key];
    Object.assign(process.env, priorEnv);
  });

  function post(body: unknown, method = 'POST'): Request {
    return new Request('https://demo.example.test/api/demo/send-confirmation', {
      method, headers: { 'content-type': 'application/json', 'x-vercel-forwarded-for': `test-${requestNumber}` },
      body: method === 'POST' ? JSON.stringify(body) : undefined,
    });
  }

  it('creates a stateless HMAC token and rejects altered or expired tokens', () => {
    const { contactEmail: _private, ...safeData } = appointment;
    const token = createDemoVerificationToken(safeData, secret, 100);
    expect(verifyDemoVerificationToken(token, secret, 101)).toEqual(safeData);
    expect(verifyDemoVerificationToken(`${token.slice(0, -1)}x`, secret, 101)).toBeNull();
    const [payload, signature] = token.split('.');
    const changedPayload = Buffer.from(JSON.stringify({ ...safeData, reason: 'Changed', iat: 100, exp: 100 + 30 * 86400 })).toString('base64url');
    expect(verifyDemoVerificationToken(`${changedPayload}.${signature}`, secret, 101)).toBeNull();
    expect(verifyDemoVerificationToken(token, secret, 100 + 30 * 86400)).toBeNull();
    expect(payload).toBeTruthy();
  });

  it('sends one confirmation and generates an inline QR for only the submitted address', async () => {
    expect(isSendPayload(appointment)).toBe(true);
    const response = await handleSendConfirmation(post(appointment), dependencies);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sent: true });
    expect(sendMail).toHaveBeenCalledOnce();
    const args = sendMail.mock.calls[0] as unknown as [unknown, { contactEmail: string }, string, Buffer];
    expect(args[1].contactEmail).toBe('alice@example.test');
    expect(args[2]).toMatch(/^https:\/\/demo\.example\.test\/verify-demo\?token=/);
    expect(args[3]).toBeInstanceOf(Buffer);
    expect(args[3].length).toBeGreaterThan(100);
  });

  it('builds a text and escaped HTML email addressed to the entered contact with an inline QR', async () => {
    const sendMessage = vi.fn().mockResolvedValue({});
    const createTransport = vi.fn(() => ({ sendMail: sendMessage })) as never;
    const { contactEmail: _email, ...safeData } = appointment;
    await sendDemoConfirmationEmail({
      from: 'sender@example.test', host: 'smtp.example.test', port: 587,
      username: 'sender@example.test', password: 'test-only-password',
    }, { ...safeData, contactFirstName: '<Alice>', reason: '<script>alert(1)</script>', contactEmail: 'alice@example.test' },
    'https://demo.example.test/verify-demo?token=signed', Buffer.alloc(32), createTransport);

    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.test', port: 587, secure: false,
      auth: { user: 'sender@example.test', pass: 'test-only-password' },
    });
    const message = sendMessage.mock.calls[0][0];
    expect(message.to).toBe('alice@example.test');
    expect(message.from).toBe('sender@example.test');
    expect(message.subject).toBe('Votre rendez-vous démo est confirmé');
    expect(message.text).toContain('DEMO-RDV-123456');
    expect(message.text).toContain('https://demo.example.test/verify-demo?token=signed');
    expect(message.html).toContain('&lt;Alice&gt;');
    expect(message.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(message.html).not.toContain('<script>');
    expect(message.html).toContain('cid:demoQrCode');
    expect(message.attachments[0]).toMatchObject({ filename: 'reservation-qr.png', cid: 'demoQrCode', contentType: 'image/png' });
  });

  it.each([
    ['invalid email', { ...appointment, contactEmail: 'bad' }],
    ['unconfirmed status', { ...appointment, status: 'PENDING' }],
    ['invalid date', { ...appointment, startDateTime: 'not-a-date' }],
    ['reversed date range', { ...appointment, endDateTime: '2030-01-08T08:30:00' }],
    ['unexpected private field', { ...appointment, userId: 10 }],
  ])('rejects %s with no email', async (_label, body) => {
    const response = await handleSendConfirmation(post(body));
    expect(response.status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('supports disabled mail without SMTP and refuses non-POST methods', async () => {
    process.env['DEMO_MAIL_ENABLED'] = 'false';
    const disabled = await handleSendConfirmation(post(appointment));
    expect(disabled.status).toBe(200);
    expect(await disabled.json()).toEqual({ sent: false, reason: 'MAIL_DISABLED' });
    expect(sendMail).not.toHaveBeenCalled();
    const method = await handleSendConfirmation(post(null, 'GET'));
    expect(method.status).toBe(405);
  });

  it('returns a controlled SMTP failure and verifies only public token fields', async () => {
    sendMail.mockRejectedValueOnce(Object.assign(new Error('private transport failure'), { code: 'E_TEST' }));
    const failed = await handleSendConfirmation(post(appointment), dependencies);
    expect(failed.status).toBe(502);
    expect(await failed.json()).toEqual({ sent: false, message: "Votre rendez-vous est confirmé, mais l'email de confirmation n'a pas pu être envoyé." });

    const { contactEmail: _private, ...safeData } = appointment;
    const token = createDemoVerificationToken(safeData, secret);
    const verified = await handleVerifyDemoAppointment(new Request(`https://demo.example.test/api/demo/verify?token=${encodeURIComponent(token)}`));
    expect(verified.status).toBe(200);
    const value = await verified.json();
    expect(value).toEqual(safeData);
    expect(value).not.toHaveProperty('contactEmail');
    expect(value).not.toHaveProperty('token');
    expect(value).not.toHaveProperty('userId');
    const invalid = await handleVerifyDemoAppointment(new Request('https://demo.example.test/api/demo/verify?token=bad'));
    expect(invalid.status).toBe(404);
    const expiredToken = createDemoVerificationToken(safeData, secret, Math.floor(Date.now() / 1000) - 30 * 86400 - 1);
    const expired = await handleVerifyDemoAppointment(new Request(`https://demo.example.test/api/demo/verify?token=${encodeURIComponent(expiredToken)}`));
    expect(expired.status).toBe(404);
    expect((await handleVerifyDemoAppointment(new Request('https://demo.example.test/api/demo/verify', { method: 'POST' }))).status).toBe(405);
  });
});
