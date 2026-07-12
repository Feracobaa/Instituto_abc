export const GUARDIAN_AUTH_DOMAIN = "familias.iabc.local";

const SPANISH_CONNECTORS = new Set([
  "de",
  "del",
  "la",
  "las",
  "los",
  "san",
  "santa",
  "y",
]);

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getUsefulTokens(fullName: string) {
  return normalizeText(fullName)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .filter((token) => !SPANISH_CONNECTORS.has(token.toLowerCase()));
}

export function buildGuardianUsernameBase(fullName: string) {
  const tokens = getUsefulTokens(fullName);

  if (tokens.length === 0) {
    return "familia";
  }

  const firstName = tokens[0];
  const secondName = tokens[1] ?? "";
  const surname = tokens[2] ?? tokens[1] ?? tokens[0];

  const prefix = `${firstName[0]?.toUpperCase() ?? "F"}${secondName[0]?.toLowerCase() ?? ""}`;
  const base = `${prefix}${surname.toLowerCase()}`.replace(/[^a-z0-9]/g, "");

  return base || "familia";
}

export function buildGuardianAuthEmail(username: string) {
  return `${username.trim().toLowerCase()}@${GUARDIAN_AUTH_DOMAIN}`;
}

export function buildInitialGuardianPassword(_gradeName: string) {
  // Generate a secure random password instead of deriving from grade name.
  // Pattern: Adjective + Noun + 2-digit number + symbol (e.g., "CoralEagle42#")
  const adj = ["Coral","Amber","Storm","Swift","Lunar","Solar","Cedar","Delta","Brave","Noble"];
  const noun = ["Eagle","River","Flame","Stone","Atlas","Titan","Blaze","Arrow","Pearl","Crest"];
  const sym = ["#","@","!","$","&"];
  const a = adj[Math.floor(Math.random() * adj.length)];
  const n = noun[Math.floor(Math.random() * noun.length)];
  const s = sym[Math.floor(Math.random() * sym.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${a}${n}${num}${s}`;
}
