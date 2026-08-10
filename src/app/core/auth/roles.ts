export type AppRole = 'ADMIN' | 'STAFF' | 'USER';

export function normalizeRole(role: string): AppRole | null {
  const normalizedRole = role.replace(/^ROLE_/i, '').trim().toUpperCase();

  if (normalizedRole === 'ADMIN' || normalizedRole === 'STAFF' || normalizedRole === 'USER') {
    return normalizedRole;
  }

  return null;
}

export function hasAnyRole(userRoles: string[], allowedRoles: AppRole[]): boolean {
  const normalizedUserRoles = userRoles
    .map((role) => normalizeRole(role))
    .filter((role): role is AppRole => Boolean(role));

  return allowedRoles.some((role) => normalizedUserRoles.includes(role));
}
