/**
 * API client with retry logic, timeout, and error classification.
 * Wraps fetch() with exponential backoff for transient failures.
 */

interface RetryOptions {
  retries?: number;
  backoffMs?: number;
  retryOn?: number[];
  timeoutMs?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  retries: 2,
  backoffMs: 1000,
  retryOn: [429, 502, 503],
  timeoutMs: 30000,
};

/**
 * Fetch with retry, exponential backoff, and timeout.
 * Only retries on specified status codes (server errors, rate limits).
 * Never retries 4xx client errors (except 429).
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOpts: RetryOptions = {}
): Promise<Response> {
  const { retries, backoffMs, retryOn, timeoutMs } = {
    ...DEFAULT_OPTIONS,
    ...retryOpts,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // If response is OK or a non-retryable error, return it
      if (response.ok || !retryOn.includes(response.status)) {
        return response;
      }

      // Retryable status code — wait and try again
      if (attempt < retries) {
        const delay = backoffMs * Math.pow(2, attempt);
        console.warn(
          `[apiClient] Retry ${attempt + 1}/${retries} for ${url} (status ${response.status}), waiting ${delay}ms`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // Out of retries, return the last response
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // AbortError = timeout
      if (lastError.name === "AbortError") {
        lastError = new Error(`Request timed out after ${timeoutMs}ms`);
      }

      if (attempt < retries) {
        const delay = backoffMs * Math.pow(2, attempt);
        console.warn(
          `[apiClient] Retry ${attempt + 1}/${retries} for ${url} (${lastError.message}), waiting ${delay}ms`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }
  }

  throw lastError || new Error(`Request failed after ${retries + 1} attempts`);
}

/** Shorthand for AI endpoints (longer timeout) */
export function fetchAI(url: string, options: RequestInit = {}): Promise<Response> {
  return fetchWithRetry(url, options, { timeoutMs: 60000 });
}

/** Shorthand for data endpoints (shorter timeout) */
export function fetchData(url: string, options: RequestInit = {}): Promise<Response> {
  return fetchWithRetry(url, options, { timeoutMs: 10000, retries: 1 });
}
