export const GUARDIAN_AUTH_DOMAIN = "familias.iabc.local";

export function buildGuardianAuthEmail(username: string) {
  const normalized = username.trim().toLowerCase();
  return `${normalized}@${GUARDIAN_AUTH_DOMAIN}`;
}

export function isLikelyEmailLogin(identifier: string) {
  return identifier.includes("@");
}
