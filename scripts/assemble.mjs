/**
 * Assemble the deployable site in ./dist, mimicking a real MF release layout:
 *
 *   dist/                      <- shell
 *   dist/remotes/policies/1.4.2/remoteEntry.js   (immutable, versioned path)
 *   dist/remotes/audit/2.0.1/remoteEntry.js
 *   dist/remotes.json          <- the runtime manifest (the only mutable "pointer")
 *
 * In a real platform each remote's own pipeline uploads its versioned folder to a CDN and
 * a release just edits remotes.json for that environment. Rollback = point back.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

const REMOTES = [
  { name: 'policies', title: 'Policies', description: 'React entry. Edits data-protection rules and publishes policy.rule.updated.' },
  { name: 'audit', title: 'Audit log', description: 'mount(el, sdk) entry. Subscribes to every event on the shell bus.' },
];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const shellDist = join(root, 'apps/shell/dist');
if (!existsSync(shellDist)) throw new Error('apps/shell/dist missing: run the app builds first');
cpSync(shellDist, out, { recursive: true });

const manifest = { environment: 'github-pages', remotes: [] };
for (const r of REMOTES) {
  const appDir = join(root, 'apps', r.name);
  const { version } = readJson(join(appDir, 'package.json'));
  const target = join(out, 'remotes', r.name, version);
  cpSync(join(appDir, 'dist'), target, { recursive: true });
  manifest.remotes.push({ ...r, url: `./remotes/${r.name}/${version}/remoteEntry.js` });
  console.log(`  ${r.name}@${version} -> remotes/${r.name}/${version}/`);
}

// Deliberately broken entry, to demonstrate error isolation in production too.
manifest.remotes.push({
  name: 'reports',
  title: 'Reports (broken)',
  url: './remotes/reports/0.1.0/remoteEntry.js',
  description: 'Deliberately points at nothing, to show a failing remote isolated by its error boundary.',
});

writeFileSync(join(out, 'remotes.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(join(out, '.nojekyll'), ''); // GitHub Pages: serve files as-is
console.log('Assembled dist/ with remotes.json');
