/**
 * Email helpers for the UI.
 *
 * IMPORTANT: this is user-experience validation, not a security boundary. A syntactically
 * valid address is not proof that the mailbox exists or belongs to the user. The backend must
 * re-validate (see docs/email-validation.md) and ownership must be verified by sending a
 * verification code or link.
 */

const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_LENGTH = 64;

const LOCAL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const LABEL_PATTERN = /^[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?$/u;
const TLD_PATTERN = /^(?:\p{L}{2,}|xn--[a-z0-9-]+)$/u;

/** Trims whitespace and lowercases. Applied to what is sent, never written back into the input. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function splitEmail(email: string): { local: string; domain: string } | null {
  const parts = email.split("@");
  const [local, domain] = parts;
  if (parts.length !== 2 || !local || !domain) return null;
  return { local, domain };
}

/** Syntax check on the normalized address. Quoted local parts and IP-literal domains are not supported. */
export function isValidEmailSyntax(raw: string): boolean {
  const email = normalizeEmail(raw);
  if (email.length > MAX_EMAIL_LENGTH) return false;

  const parts = splitEmail(email);
  if (!parts) return false;
  const { local, domain } = parts;

  if (local.length > MAX_LOCAL_LENGTH || !LOCAL_PATTERN.test(local)) return false;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;

  const labels = domain.split(".");
  if (labels.length < 2) return false;
  const tld = labels[labels.length - 1] ?? "";
  return labels.every((label) => label.length <= 63 && LABEL_PATTERN.test(label)) && TLD_PATTERN.test(tld);
}

/** Domains of the largest mailbox providers, used as the reference for typo detection. */
const POPULAR_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"] as const;

/** Explicit, reviewed typos. Anything not listed here only matches the conservative fuzzy rule. */
const KNOWN_TYPOS: Readonly<Record<string, string>> = {
  "gmai.com": "gmail.com",
  "gmai.comm": "gmail.com",
  "gmial.com": "gmail.com",
  "gmial.comm": "gmail.com",
  "gmal.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.comm": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahoo.comm": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.comm": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.co": "outlook.com",
  "outlook.comm": "outlook.com",
  "iclould.com": "icloud.com",
  "icloud.co": "icloud.com",
};

/** Real providers that sit one edit away from a popular domain; never flag these. */
const LEGITIMATE_LOOKALIKES: ReadonlySet<string> = new Set(["mail.com"]);

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, (previous[j - 1] ?? 0) + cost);
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

function suggestDomain(domain: string): string | null {
  if ((POPULAR_DOMAINS as readonly string[]).includes(domain) || LEGITIMATE_LOOKALIKES.has(domain)) {
    return null;
  }

  const known = KNOWN_TYPOS[domain];
  if (known) return known;

  // Conservative fallback: a single edit away from a popular provider. Custom company
  // domains are far from these and are never matched.
  return POPULAR_DOMAINS.find((candidate) => editDistance(domain, candidate) === 1) ?? null;
}

/**
 * Returns a corrected address when the domain looks like a typo of a popular provider,
 * otherwise null. The suggestion is only ever shown to the user; it is never applied silently.
 */
export function suggestEmailCorrection(raw: string): string | null {
  const email = normalizeEmail(raw);
  if (!isValidEmailSyntax(email)) return null;

  const parts = splitEmail(email);
  if (!parts) return null;

  const corrected = suggestDomain(parts.domain);
  return corrected ? `${parts.local}@${corrected}` : null;
}
