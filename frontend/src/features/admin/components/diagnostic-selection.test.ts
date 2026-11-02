import { describe, expect, it } from 'vitest';
import { isDiagnosticSelectionValid } from './diagnostic-selection';
import type { AiStudioKey } from '../admin-api';

const primaryModel = 'gemini-3.5-flash';
const fallbackModel = 'deepseek-ai/deepseek-v4.1-flash';

function key(provider: string, routingRole: AiStudioKey['routingRole'] = null): AiStudioKey {
  const model = provider === 'gemini' ? primaryModel : fallbackModel;
  return { keyId: `${provider}-primary`, name: provider, maskedKey: '***', provider,
    isConfigured: true, isActive: true, routingRole, supportedModels: [model] };
}

describe('isDiagnosticSelectionValid', () => {
  it('should allow configured primary and fallback targets', () => {
    const models = [primaryModel, fallbackModel];

    expect(isDiagnosticSelectionValid(key('gemini', 'PRIMARY'), primaryModel, 'gemini', models)).toBe(true);
    expect(isDiagnosticSelectionValid(key('hive', 'FALLBACK'), fallbackModel, 'gemini', models)).toBe(true);
  });

  it('should reject a provider outside the configured route', () => {
    expect(isDiagnosticSelectionValid(key('hive'), fallbackModel, 'gemini', [fallbackModel])).toBe(false);
  });
});
