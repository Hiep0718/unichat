import type { AiStudioKey } from '../admin-api';

/** Checks the configured provider/key/model binding before enabling diagnostics. */
export function isDiagnosticSelectionValid(key: AiStudioKey | undefined, model: string,
  activeProvider: string | null | undefined, configuredModels: readonly string[]): boolean {
  return Boolean(activeProvider && key?.isConfigured && key.isActive === true
    && key.provider === activeProvider && configuredModels.includes(model) && key.supportedModels?.includes(model));
}
