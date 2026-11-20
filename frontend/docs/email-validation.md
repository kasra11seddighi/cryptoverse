# Email validation in CryptoVerse

## What the frontend does (`src/utils/email.ts`)

- **Normalization:** the address is trimmed and lowercased before it is validated and sent. The text in the input is never rewritten behind the user's back.
- **Syntax validation:** exactly one `@`, local part up to 64 characters from a safe character set (no leading, trailing or doubled dots), domain labels of at most 63 characters that do not start or end with a hyphen, at least two labels, a TLD of letters (or a punycode `xn--` TLD), and a total length of at most 254.
- **Typo suggestions (Register only):** a reviewed list of common typos of Gmail, Yahoo, Hotmail, Outlook and iCloud (for example `gmai.com`, `gmail.co`, `gmail.comm`, `gmial.com`, `yaho.com`, `yahooo.com`, `hotmial.com`, `outlook.co`, `gmai.comm`), plus a conservative rule for domains exactly one edit away from those providers. Custom and uncommon domains are far from them and are never flagged; `mail.com` is explicitly allowed.
- **User control:** a suggestion is shown as "Did you mean ...?" with **Use suggestion** and **Keep original**. Submitting is paused once until the user chooses. Keeping the original is always possible, so a legitimate address is never blocked.

## What the backend must enforce

The frontend is not a security boundary; anyone can call the API directly. The backend must:

1. Normalize the same way (trim, lowercase) before storing and before uniqueness checks, and enforce a unique index on the normalized address.
2. Re-validate syntax and length limits with the same rules. Do not rely on a single regex or a library's `.email()` helper as proof that an address is real.
3. Reject clearly invalid input with a stable error response (status 400 or 422 and a `message`).
4. Optionally check that the domain has MX or A records, treating DNS failures as "unknown" rather than "invalid".
5. Not apply the typo list as a hard rule, because it is a hint, not a verdict.

## Ownership must be verified

Neither syntax checks nor typo hints prove that an address exists or belongs to the person registering. Add an email verification step (a one-time code or a signed, expiring link) before treating the address as confirmed, and gate sensitive features on it.
