export async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      headers: {
        "user-agent": "rssai/0.1 (+https://example.local/rssai)",
        ...init.headers
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}
