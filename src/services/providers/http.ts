/** Fetch with timeout and simple exponential-backoff retry for 429/5xx. */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  {
    timeoutMs = 15000,
    retries = 2,
  }: { timeoutMs?: number; retries?: number } = {},
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          await sleep(500 * 2 ** attempt);
          continue;
        }
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) await sleep(500 * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Fetch JSON with retry. */
export async function fetchJson<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetchWithRetry(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

/** Fetch text with retry. */
export async function fetchText(
  url: string,
  init?: RequestInit,
  opts?: { timeoutMs?: number; retries?: number },
): Promise<string> {
  const res = await fetchWithRetry(url, init, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.text();
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
