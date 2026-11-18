import { createShellSdk, ModuleManifestSchema, satisfies, SDK_VERSION } from '@demo/shell-sdk';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as mod from './module';

describe('policies module contract', () => {
  // Contract test: this runs in the remote's own CI and fails the build before a
  // release could break the shell.
  it('exposes a valid manifest compatible with the current shell SDK', () => {
    expect(ModuleManifestSchema.parse(mod.manifest)).toEqual(mod.manifest);
    expect(satisfies(SDK_VERSION, mod.manifest.sdkVersionRange)).toBe(true);
    expect(typeof mod.default).toBe('function');
  });
});

describe('PoliciesApp', () => {
  it('is read-only for viewers', async () => {
    const { sdk, admin } = createShellSdk();
    admin.signIn('viewer');
    const Policies = mod.default;
    render(<Policies sdk={sdk} />);
    const ssn = await screen.findByLabelText('SSN for Analyst');
    expect(ssn).toBeDisabled();
    expect(screen.getByText('read only')).toBeInTheDocument();
  });

  it('publishes policy.rule.updated and notifies when an editor changes a rule', async () => {
    const notify = vi.fn();
    const { sdk, admin } = createShellSdk({ notify });
    admin.signIn('editor');
    const events = vi.fn();
    sdk.events.subscribe('policy.rule.updated', events);

    const Policies = mod.default;
    render(<Policies sdk={sdk} />);
    await userEvent.selectOptions(await screen.findByLabelText('SSN for Analyst'), 'cleartext');

    expect(events).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'policy.rule.updated',
        payload: expect.objectContaining({ dataElement: 'SSN', from: 'tokenized', to: 'cleartext', by: 'Eddie Editor' }),
      }),
    );
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
  });
});
