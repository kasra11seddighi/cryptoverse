import axios from "axios";

export class ApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;

  constructor(
    message: string,
    options: { status?: number | null; code?: string | null } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status ?? null;
    this.code = options.code ?? null;
  }
}

function readMessage(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;
  for (const key of ["message", "error"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return null;
}

/** Converts any thrown value into an ApiError with a user-presentable message. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return new ApiError("Unable to reach the server. Check your connection and try again.", {
        code: "NETWORK_ERROR",
      });
    }
    const { status, data } = error.response;
    return new ApiError(readMessage(data) ?? "Something went wrong. Please try again.", {
      status,
    });
  }

  if (error instanceof Error) return new ApiError(error.message);
  return new ApiError("An unexpected error occurred.");
}
