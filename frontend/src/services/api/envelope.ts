import { ApiError } from "@/lib/apiError";

export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Returns the `data` of a `{ success, data }` response, or throws when the body is not that envelope. */
export function unwrapData(body: unknown, what: string): unknown {
  if (!isRecord(body) || body.success !== true || !("data" in body)) {
    throw new ApiError(`Unexpected response from the ${what} service.`);
  }
  return body.data;
}

export function readNumber(source: UnknownRecord, key: string, what: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new ApiError(`The ${what} response is missing "${key}".`);
  return value;
}

export function readString(source: UnknownRecord, key: string, what: string): string {
  const value = source[key];
  if (typeof value !== "string") throw new ApiError(`The ${what} response is missing "${key}".`);
  return value;
}

export function readArray(source: UnknownRecord, key: string, what: string): unknown[] {
  const value = source[key];
  if (!Array.isArray(value)) throw new ApiError(`The ${what} response is missing "${key}".`);
  return value;
}
