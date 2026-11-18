/**
 * Discriminated union for async state. Impossible states (loading AND error, data with no
 * success flag) can't be represented, and TypeScript narrows `data` after checking status.
 */
export type AsyncState<T, E = string> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: E }
  | { status: 'ok'; data: T };
