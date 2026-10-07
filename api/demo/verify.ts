import { verifyDemoVerificationToken } from '../_lib/demo-token';
import { getDemoTokenSecret } from '../_lib/mail';

const INVALID_MESSAGE = 'Cette réservation de démonstration est introuvable ou le lien n’est plus valide.';

export function GET(request: Request): Response {
  return handleVerifyDemoAppointment(request);
}

export function handleVerifyDemoAppointment(request: Request): Response {
  if (request.method !== 'GET') return json({ message: 'Méthode non autorisée.' }, 405, { allow: 'GET' });
  const token = new URL(request.url).searchParams.get('token');
  const secret = getDemoTokenSecret();
  if (!token || !secret) return json({ message: INVALID_MESSAGE }, 404);
  const appointment = verifyDemoVerificationToken(token, secret);
  if (!appointment) return json({ message: INVALID_MESSAGE }, 404);
  return json(appointment, 200);
}

function json(body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store', ...extraHeaders } });
}
