import { supabase } from '@/integrations/supabase/client';

/**
 * Client-side timeout for Supabase edge function calls.
 *
 * The installed @supabase/supabase-js (functions-js) has no way to pass an
 * AbortSignal into `.functions.invoke()` — `FunctionInvokeOptions` only
 * accepts headers/method/region/body. So this can't actually cancel the
 * underlying request; the fetch keeps running in the background until it
 * resolves on its own. What it *does* fix: without it, a hung edge function
 * (a slow/stuck upstream call — generate-reflection calls out to an LLM)
 * leaves the caller's `isLoading` stuck `true` forever, with a spinner that
 * never resolves and no way out except reloading the page. Racing a timeout
 * against it means the UI always eventually gets an answer either way.
 */
const DEFAULT_TIMEOUT_MS = 25_000;

export class FunctionTimeoutError extends Error {
  constructor(public readonly functionName: string) {
    super('This is taking longer than expected. Please try again.');
    this.name = 'FunctionTimeoutError';
  }
}

export async function invokeFunctionWithTimeout<T = unknown>(
  functionName: string,
  options?: Parameters<typeof supabase.functions.invoke>[1],
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<{ data: T | null; error: unknown }> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new FunctionTimeoutError(functionName)), timeoutMs);
  });

  try {
    return await Promise.race([supabase.functions.invoke<T>(functionName, options), timeout]);
  } finally {
    clearTimeout(timer!);
  }
}
