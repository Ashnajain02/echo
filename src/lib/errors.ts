/**
 * Pull a user-readable message out of a thrown value of unknown shape.
 * Handles `Error`, plain strings, and `{ message: string }` objects (the
 * shape Supabase + many third-party SDKs throw with).
 */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}
