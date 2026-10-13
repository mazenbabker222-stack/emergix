/** Consistent error shape for the API: { error: { code, message, details } } (see ErrorResponse in openapi.yaml). */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, "invalid_request", message, details);
export const forbidden = (message = "You are not allowed to do that", code = "forbidden") => new HttpError(403, code, message);
export const notFound = (message = "Not found", code = "not_found") => new HttpError(404, code, message);
export const conflict = (message: string, code = "conflict") => new HttpError(409, code, message);

type SafeParser<T> = {
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: { issues: unknown } };
};

/** Validate input with a generated Zod schema from @workspace/api-zod. */
export function parse<T>(schema: SafeParser<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw badRequest("Invalid request", result.error.issues);
  return result.data;
}
