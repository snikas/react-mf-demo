import { z } from 'zod';

export const ProtectionActionSchema = z.enum(['cleartext', 'masked', 'tokenized']);
export type ProtectionAction = z.infer<typeof ProtectionActionSchema>;

/**
 * Cross-module events: named `domain.entity.action`, versioned, validated at runtime.
 * A discriminated union on `type` gives handlers a fully-typed payload.
 *
 * Use events for notifications ("something happened"), not request/response and not for
 * syncing large state. To evolve a payload, add `version: 2` alongside v1 for a
 * deprecation window, never mutate v1 in place.
 */
export const ShellEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('policy.rule.updated'),
    version: z.literal(1),
    payload: z.object({
      ruleId: z.string(),
      dataElement: z.string(),
      role: z.string(),
      from: ProtectionActionSchema,
      to: ProtectionActionSchema,
      by: z.string(),
    }),
  }),
  z.object({
    type: z.literal('auth.user.changed'),
    version: z.literal(1),
    payload: z.object({ userId: z.string().nullable(), role: z.string().nullable() }),
  }),
  z.object({
    type: z.literal('ui.theme.changed'),
    version: z.literal(1),
    payload: z.object({ theme: z.enum(['light', 'dark']) }),
  }),
]);

export type ShellEvent = z.infer<typeof ShellEventSchema>;
export type ShellEventType = ShellEvent['type'];
export type EventOf<T extends ShellEventType> = Extract<ShellEvent, { type: T }>;

export interface EventRecord {
  id: number;
  at: number;
  event: ShellEvent;
}

export type Unsubscribe = () => void;

export interface EventBus {
  /** Returns false (and delivers nothing) if the event fails schema validation. */
  publish(event: ShellEvent): boolean;
  subscribe<T extends ShellEventType>(type: T, handler: (event: EventOf<T>) => void): Unsubscribe;
  subscribeAll(handler: (record: EventRecord) => void): Unsubscribe;
  /** Recent history; a new array reference after each publish (useSyncExternalStore-friendly). */
  recent(): readonly EventRecord[];
}

export function createEventBus({ historySize = 50, now = Date.now } = {}): EventBus {
  const byType = new Map<ShellEventType, Set<(e: ShellEvent) => void>>();
  const all = new Set<(r: EventRecord) => void>();
  let history: readonly EventRecord[] = [];
  let seq = 0;

  // One module's buggy handler must not break delivery to everyone else.
  const safeCall = <A>(fn: (a: A) => void, arg: A) => {
    try {
      fn(arg);
    } catch (err) {
      console.error('[event-bus] subscriber threw', err);
    }
  };

  return {
    publish(event) {
      const parsed = ShellEventSchema.safeParse(event);
      if (!parsed.success) {
        console.error('[event-bus] rejected invalid event', parsed.error.issues);
        return false;
      }
      const record: EventRecord = { id: ++seq, at: now(), event: parsed.data };
      history = [...history, record].slice(-historySize);
      [...(byType.get(record.event.type) ?? [])].forEach((fn) => safeCall(fn, record.event));
      [...all].forEach((fn) => safeCall(fn, record));
      return true;
    },
    subscribe(type, handler) {
      const set = byType.get(type) ?? new Set();
      const fn = handler as (e: ShellEvent) => void;
      set.add(fn);
      byType.set(type, set);
      return () => set.delete(fn);
    },
    subscribeAll(handler) {
      all.add(handler);
      return () => all.delete(handler);
    },
    recent: () => history,
  };
}
