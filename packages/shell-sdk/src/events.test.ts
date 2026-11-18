import { describe, expect, it, vi } from 'vitest';
import { createEventBus, type ShellEvent } from './events';

const ruleUpdated: ShellEvent = {
  type: 'policy.rule.updated',
  version: 1,
  payload: { ruleId: 'ssn:analyst', dataElement: 'SSN', role: 'Analyst', from: 'tokenized', to: 'masked', by: 'test' },
};

describe('event bus', () => {
  it('delivers typed events to type subscribers and subscribeAll', () => {
    const bus = createEventBus();
    const typed = vi.fn();
    const all = vi.fn();
    bus.subscribe('policy.rule.updated', typed);
    bus.subscribe('ui.theme.changed', () => {
      throw new Error('should not be called');
    });
    bus.subscribeAll(all);

    expect(bus.publish(ruleUpdated)).toBe(true);
    expect(typed).toHaveBeenCalledWith(ruleUpdated);
    expect(all.mock.calls[0]?.[0].event).toEqual(ruleUpdated);
  });

  it('rejects events that fail schema validation', () => {
    const bus = createEventBus();
    const all = vi.fn();
    bus.subscribeAll(all);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const bad = { ...ruleUpdated, payload: { ...ruleUpdated.payload, to: 'plaintext' } };
    expect(bus.publish(bad as unknown as ShellEvent)).toBe(false);
    expect(all).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("isolates a throwing subscriber from the others", () => {
    const bus = createEventBus();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const healthy = vi.fn();
    bus.subscribe('policy.rule.updated', () => {
      throw new Error('buggy module');
    });
    bus.subscribe('policy.rule.updated', healthy);
    bus.publish(ruleUpdated);
    expect(healthy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it('unsubscribes and caps history', () => {
    const bus = createEventBus({ historySize: 2 });
    const fn = vi.fn();
    const off = bus.subscribe('policy.rule.updated', fn);
    off();
    bus.publish(ruleUpdated);
    bus.publish(ruleUpdated);
    bus.publish(ruleUpdated);
    expect(fn).not.toHaveBeenCalled();
    expect(bus.recent().map((r) => r.id)).toEqual([2, 3]);
  });
});
