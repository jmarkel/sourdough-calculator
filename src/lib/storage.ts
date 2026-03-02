export function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null;

  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}
