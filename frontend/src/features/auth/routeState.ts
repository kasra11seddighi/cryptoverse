function readRecord(state: unknown): Record<string, unknown> | null {
  return typeof state === "object" && state !== null ? (state as Record<string, unknown>) : null;
}

/** Path the user originally wanted before being redirected to the login page. */
export function readFromPath(state: unknown): string | undefined {
  const from = readRecord(state)?.from;
  return typeof from === "string" && from.startsWith("/") ? from : undefined;
}

export function readRegisteredEmail(state: unknown): string | undefined {
  const email = readRecord(state)?.registeredEmail;
  return typeof email === "string" ? email : undefined;
}
