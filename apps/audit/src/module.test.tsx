import { createShellSdk, ModuleManifestSchema, satisfies, SDK_VERSION } from '@demo/shell-sdk';
import { act, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { manifest, mount } from './module';

describe('audit module contract', () => {
  it('exposes a valid mount-style manifest compatible with the shell SDK', () => {
    expect(ModuleManifestSchema.parse(manifest)).toEqual(manifest);
    expect(manifest.entry).toBe('mount');
    expect(satisfies(SDK_VERSION, manifest.sdkVersionRange)).toBe(true);
  });

  it('mount() renders into the element, receives bus events, and unmount() cleans up', async () => {
    const { sdk, admin } = createShellSdk();
    admin.signIn('admin');
    const el = document.createElement('div');
    document.body.append(el);

    let unmount!: () => void;
    act(() => {
      unmount = mount(el, sdk);
    });
    expect(await screen.findByText(/Signed in as admin/)).toBeInTheDocument();

    act(() => {
      sdk.events.publish({
        type: 'policy.rule.updated',
        version: 1,
        payload: { ruleId: 'r', dataElement: 'Email', role: 'Support', from: 'masked', to: 'cleartext', by: 'Ada' },
      });
    });
    expect(await screen.findByText(/Ada changed Email for Support/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();

    unmount();
    await waitFor(() => expect(el).toBeEmptyDOMElement());
    el.remove();
  });
});
