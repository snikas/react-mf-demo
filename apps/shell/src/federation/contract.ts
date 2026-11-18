import {
  ModuleManifestSchema,
  satisfies,
  type RemoteEntry,
  type RemoteModule,
} from '@demo/shell-sdk';

export class ContractError extends Error {
  override name = 'ContractError';
}

/**
 * Treat a remote's exports as `unknown` and prove they meet the module contract before
 * rendering. Validate at the boundary: the runtime check matches the TypeScript type.
 */
export function validateModule(mod: unknown, entry: RemoteEntry, sdkVersion: string): RemoteModule {
  if (typeof mod !== 'object' || mod === null) {
    throw new ContractError(`${entry.name}: exposed module is not an object`);
  }
  const record = mod as Record<string, unknown>;
  const parsed = ModuleManifestSchema.safeParse(record.manifest);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new ContractError(`${entry.name}: invalid manifest (${issues})`);
  }
  const manifest = parsed.data;
  if (manifest.name !== entry.name) {
    throw new ContractError(`Manifest name "${manifest.name}" does not match registry entry "${entry.name}"`);
  }
  if (!satisfies(sdkVersion, manifest.sdkVersionRange)) {
    throw new ContractError(
      `${manifest.name}@${manifest.version} needs shell SDK ${manifest.sdkVersionRange}, shell provides ${sdkVersion}`,
    );
  }
  if (manifest.entry === 'react' && typeof record.default !== 'function') {
    throw new ContractError(`${manifest.name}: entry "react" requires a default-exported component`);
  }
  if (manifest.entry === 'mount' && typeof record.mount !== 'function') {
    throw new ContractError(`${manifest.name}: entry "mount" requires a mount(el, sdk) export`);
  }
  return { ...record, manifest } as RemoteModule;
}
