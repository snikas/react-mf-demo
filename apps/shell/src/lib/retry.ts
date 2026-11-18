export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Retry an async operation with exponential backoff. */
export async function retry<T>(fn: () => Promise<T>, retries = 1, delayMs = 300): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries) throw err;
      await sleep(delayMs * 2 ** attempt);
    }
  }
}

/** webpack throws `ChunkLoadError` when a hashed chunk 404s, e.g. after a redeploy. */
export function isChunkLoadError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === 'ChunkLoadError' || /Loading (CSS )?chunk [\w-]+ failed/i.test(err.message);
}
