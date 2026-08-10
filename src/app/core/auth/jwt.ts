interface JwtPayload {
  exp?: number;
}

export function isJwtExpired(token: string | null): boolean {
  if (!token) {
    return true;
  }

  const payload = decodeJwtPayload(token);

  if (!payload?.exp) {
    return false;
  }

  return payload.exp * 1000 <= Date.now();
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const [, payload] = token.split('.');

  if (!payload) {
    return null;
  }

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = atob(normalizedPayload);

    return JSON.parse(decodedPayload) as JwtPayload;
  } catch {
    return null;
  }
}
