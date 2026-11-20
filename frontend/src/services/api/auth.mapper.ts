import type { AuthUser } from "@/types/auth";

/**
 * The only place that knows what the backend auth payloads look like.
 *
 * Confirmed login response (after Axios has already taken `response.data`):
 *   { success: true, message: "...", data: { accessToken, user: { id, name, email, role, createdAt } } }
 *
 * Every function here receives that whole envelope and unwraps `data` exactly once.
 * The refresh and /users/me responses are ASSUMED to use the same envelope (their exact
 * bodies were not provided): refresh -> data.accessToken, me -> data is the user or { user }.
 * If either differs, the mapper returns null and the caller raises a clear error, so only
 * this file needs to change.
 */
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickString(source: UnknownRecord, key: string): string | null {
  const value = source[key];
  return typeof value === "string" && value !== "" ? value : null;
}

/** Returns the envelope's `data` object, or null when the payload is not an envelope. */
function unwrapEnvelope(payload: unknown): UnknownRecord | null {
  if (!isRecord(payload) || typeof payload.success !== "boolean") return null;
  return isRecord(payload.data) ? payload.data : null;
}

function toUser(source: unknown): AuthUser | null {
  if (!isRecord(source)) return null;
  const id = pickString(source, "id") ?? pickString(source, "_id");
  const email = pickString(source, "email");
  if (!id || !email) return null;

  return {
    id,
    email,
    name: pickString(source, "name"),
    role: pickString(source, "role"),
    createdAt: pickString(source, "createdAt"),
  };
}

/** Maps a login or refresh response. */
export function mapAuthResponse(payload: unknown): {
  accessToken: string | null;
  user: AuthUser | null;
} {
  const body = unwrapEnvelope(payload);
  if (!body) return { accessToken: null, user: null };
  return { accessToken: pickString(body, "accessToken"), user: toUser(body.user) };
}

/** Maps a /users/me response. */
export function mapUser(payload: unknown): AuthUser | null {
  const body = unwrapEnvelope(payload);
  if (!body) return null;
  return toUser(isRecord(body.user) ? body.user : body);
}
