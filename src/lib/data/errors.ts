import "server-only";

export class DataAccessError extends Error {
  constructor(message: string, public readonly code = "DATA_ACCESS_ERROR") {
    super(message);
    this.name = "DataAccessError";
  }
}

export function toDataAccessError(error: { message: string; code?: string } | null, fallback: string): DataAccessError {
  if (!error) return new DataAccessError(fallback);
  const duplicate = error.code === "23505";
  const message = duplicate ? "السجل موجود مسبقًا ولا يمكن تكراره." : error.message || fallback;
  return new DataAccessError(message, error.code ?? "SUPABASE_ERROR");
}
