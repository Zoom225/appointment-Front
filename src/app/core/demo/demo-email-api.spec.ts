// @vitest-environment node
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler, { handleDemoConfirmation } from '../../../../api/demo/send-confirmation';

const appointment = {
  contactFirstName: 'Alice',
  contactLastName: 'Martin',
  contactEmail: 'alice@example.test',
  publicReference: 'DEMO-RDV-123456',
  startDateTime: '2030-01-08T09:00:00',
  endDateTime: '2030-01-08T09:30:00',
  reason: 'Entretien',
  status: 'CONFIRMED',
};

describe('Vercel demo confirmation email function', () => {
  const priorEnv = { ...process.env };
  const sendMail = vi.fn();
  const createTransport = vi.fn(() => ({ sendMail }));

  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue(undefined);
    createTransport.mockClear();
    Object.assign(process.env, {
      DEMO_MAIL_ENABLED: 'true',
      DEMO_MAIL_FROM: 'sender@example.test',
      DEMO_SMTP_HOST: 'smtp.example.test',
      DEMO_SMTP_PORT: '587',
      DEMO_SMTP_USERNAME: 'sender@example.test',
      DEMO_SMTP_PASSWORD: 'test-only-password',
    });
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) if (!(key in priorEnv)) delete process.env[key];
    Object.assign(process.env, priorEnv);
  });

  function request(method: string, body: unknown = appointment): VercelRequest {
    return { method, body } as VercelRequest;
  }

  function response() {
    let statusCode = 200;
    let body: unknown;
    const res = {
      status: vi.fn((status: number) => {
        statusCode = status;
        return res;
      }),
      json: vi.fn((value: unknown) => {
        body = value;
        return res;
      }),
    } as unknown as VercelResponse;
    return { res, get statusCode() { return statusCode; }, get body() { return body; } };
  }

  it('accepts a valid POST and sends a plain confirmation to the submitted contact', async () => {
    const result = response();
    await handleDemoConfirmation(request('POST'), result.res, createTransport);

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ sent: true });
    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.test', port: 587, secure: false,
      auth: { user: 'sender@example.test', pass: 'test-only-password' },
    });
    expect(sendMail).toHaveBeenCalledOnce();
    const message = sendMail.mock.calls[0][0];
    expect(message).toMatchObject({
      from: 'sender@example.test', to: 'alice@example.test',
      subject: 'Votre rendez-vous est confirmé',
    });
    expect(message.text).toContain('DEMO-RDV-123456');
    expect(message.text).toContain('Créneau : 2030-01-08T09:00:00 - 2030-01-08T09:30:00');
    expect(message.text).toContain('Motif : Entretien');
    expect(message.html).toContain('Alice Martin');
    expect(message).not.toHaveProperty('attachments');
  });

  it('rejects any method other than POST', async () => {
    const result = response();
    await handleDemoConfirmation(request('GET'), result.res, createTransport);
    expect(result.statusCode).toBe(405);
    expect(result.body).toEqual({ sent: false, message: 'Méthode non autorisée.' });
    expect(createTransport).not.toHaveBeenCalled();
  });

  it.each([
    ['missing required fields', {}],
    ['invalid email', { ...appointment, contactEmail: 'not-an-email' }],
    ['non-confirmed status', { ...appointment, status: 'PENDING' }],
    ['invalid date', { ...appointment, startDateTime: 'not-a-date' }],
    ['reversed dates', { ...appointment, endDateTime: '2030-01-08T08:30:00' }],
  ])('returns a controlled validation error for %s', async (_case, body) => {
    const result = response();
    await handleDemoConfirmation(request('POST', body), result.res, createTransport);
    expect(result.statusCode).toBe(400);
    expect(result.body).toMatchObject({ sent: false });
    expect(createTransport).not.toHaveBeenCalled();
  });

  it('returns MAIL_DISABLED without creating an SMTP transport', async () => {
    process.env['DEMO_MAIL_ENABLED'] = 'false';
    const result = response();
    await handleDemoConfirmation(request('POST'), result.res, createTransport);
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ sent: false, reason: 'MAIL_DISABLED' });
    expect(createTransport).not.toHaveBeenCalled();
  });

  it('exports a classic VercelRequest/VercelResponse handler', async () => {
    process.env['DEMO_MAIL_ENABLED'] = 'false';
    const result = response();
    await handler(request('POST'), result.res);
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ sent: false, reason: 'MAIL_DISABLED' });
  });

  it('returns a controlled SMTP error and logs only the error name and code', async () => {
    const error = Object.assign(new Error('private transport detail'), { code: 'E_TEST' });
    sendMail.mockRejectedValueOnce(error);
    const logger = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const result = response();

    await handleDemoConfirmation(request('POST'), result.res, createTransport);

    expect(result.statusCode).toBe(502);
    expect(result.body).toEqual({
      sent: false,
      message: "Le rendez-vous est confirmé mais l'email n'a pas pu être envoyé.",
    });
    expect(logger).toHaveBeenCalledWith('Demo confirmation email failed', { name: 'Error', code: 'E_TEST' });
    expect(JSON.stringify(logger.mock.calls)).not.toContain('private transport detail');
    logger.mockRestore();
  });

  it('returns a controlled configuration error when SMTP settings are missing', async () => {
    delete process.env['DEMO_SMTP_PASSWORD'];
    const result = response();
    await handleDemoConfirmation(request('POST'), result.res, createTransport);
    expect(result.statusCode).toBe(503);
    expect(createTransport).not.toHaveBeenCalled();
  });
});
