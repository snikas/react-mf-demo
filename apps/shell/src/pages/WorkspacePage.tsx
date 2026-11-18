import { RemoteSlot } from '../federation/RemoteSlot';
import { useShell } from '../ShellContext';

/**
 * On-page composition: two teams' modules in one React tree (well, Audit renders into its
 * own root via mount()), sharing one React and one event bus. Compare with route-split
 * SPAs, where moving between apps is a full page load and state crosses via URL/cookies.
 */
export function WorkspacePage() {
  const { registry } = useShell();
  const policies = registry.remotes.find((r) => r.name === 'policies');
  const audit = registry.remotes.find((r) => r.name === 'audit');
  return (
    <>
      <h1>Workspace</h1>
      <p className="shell-muted">
        Edit a rule on the left. The Policies module publishes <code>policy.rule.updated</code> on
        the shell bus; the Audit module (a different build, deployed separately) receives it.
      </p>
      <div className="shell-grid-2">
        {policies && <RemoteSlot entry={policies} />}
        {audit && <RemoteSlot entry={audit} />}
      </div>
    </>
  );
}
