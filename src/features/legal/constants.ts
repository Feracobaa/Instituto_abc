export const CURRENT_POLICY_VERSION = '1.0.0';
export const CURRENT_TERMS_VERSION = '1.0.0';

/**
 * Calculates a SHA-256 hash of a given text.
 * Used to cryptographically bind a user's consent to the exact text they agreed to.
 */
export async function computeLegalTextHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
