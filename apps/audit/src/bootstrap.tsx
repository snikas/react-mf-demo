import '@demo/shell-sdk/tokens.css';
import { createShellSdk } from '@demo/shell-sdk';
import { mount } from './module';

/** Standalone harness: exercise the real mount() contract and fire a few fake events. */
const { sdk, admin } = createShellSdk();
admin.signIn('admin');
admin.setFlag('audit.showPayloads', true);

const el = document.getElementById('root')!;
el.style.cssText = 'padding:24px;background:var(--color-bg);min-height:100vh';
const button = document.createElement('button');
button.textContent = 'Publish a fake policy.rule.updated';
button.onclick = () =>
  sdk.events.publish({
    type: 'policy.rule.updated',
    version: 1,
    payload: { ruleId: 'ssn:analyst', dataElement: 'SSN', role: 'Analyst', from: 'tokenized', to: 'masked', by: 'harness' },
  });
el.append(button);
const host = document.createElement('div');
el.append(host);
mount(host, sdk);
