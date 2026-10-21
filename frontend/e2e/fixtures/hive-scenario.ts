import type { Page, Route } from '@playwright/test';
import type { AiAdmission, AiStudioMetricsResponse } from '../../src/features/admin/admin-api';

/** Actual configured Hive model used by the offline public contract fixture. */
export const HIVE_MODEL = 'deepseek-ai/deepseek-v4.1-flash';
/** Offline workspace identity, accepted by the production question contract. */
export const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
/** Mutable server state for testing operator transitions without external services. */
export interface HiveScenario {
  admission: AiAdmission;
  registryAvailable: boolean;
  conflictNextUpdate: boolean;
  chatFailure: string | null;
  calls: { path: string; method: string; body: unknown }[];
}

function metrics(scenario: HiveScenario): AiStudioMetricsResponse {
  return { status: 'AVAILABLE', completeness: 'PARTIAL', sampleCount: 2, updatedAt: '2026-10-16T00:00:00Z',
    retainedFrom: '2026-10-15T00:00:00Z', registryStatus: scenario.registryAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
    tier: 'UNKNOWN', timeRangeDays: 28, activeProvider: scenario.registryAvailable ? 'hive' : null,
    activeModel: scenario.registryAvailable ? HIVE_MODEL : null, configuredModels: [HIVE_MODEL],
    keys: [{ keyId: 'hive-primary', name: 'Hive chính', maskedKey: '***1111', isConfigured: true,
      provider: 'hive', isActive: true, supportedModels: [HIVE_MODEL] }],
    historicalKeys: [{ keyId: 'gemini-primary', provider: 'gemini' }], models: [HIVE_MODEL, 'gemini-2.5-flash'],
    chartRequestsSuccess: [], chartErrors: [], chartInputTokens: [{ date: '15/10', [HIVE_MODEL]: null }, { date: '16/10', [HIVE_MODEL]: 0 }],
    chartOutputTokens: [], chartRequestsPerModel: [], summary: { totalRequests: 2, totalErrors: 0, overallSuccessRate: 100 } };
}

async function json(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function admission(route: Route, scenario: HiveScenario): Promise<void> {
  if (route.request().method() === 'GET') { await json(route, scenario.admission); return; }
  const payload = route.request().postDataJSON() as { state: AiAdmission['state']; expectedVersion: number };
  if (scenario.conflictNextUpdate) {
    scenario.conflictNextUpdate = false;
    scenario.admission = { ...scenario.admission, version: scenario.admission.version + 1, pendingAttemptCount: 1 };
  }
  if (payload.expectedVersion !== scenario.admission.version) { await json(route, { errorCode: 'CONFLICT' }, 409); return; }
  scenario.admission = { ...scenario.admission, state: payload.state, version: scenario.admission.version + 1 };
  await json(route, scenario.admission);
}

function frame(event: string, data: unknown): string { return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`; }

async function chat(route: Route, scenario: HiveScenario): Promise<void> {
  if (scenario.chatFailure) {
    await json(route, { errorCode: scenario.chatFailure, requestId: 'offline-request', detail: 'Private upstream details' }, 503);
    return;
  }
  const result = { operationId: 'operation-1', conversationId: '22222222-2222-4222-8222-222222222222', messageId: 'message-1',
    decision: 'ANSWER', answer: 'Câu trả lời có bằng chứng từ tài liệu.', intent: 'FACT', strategyVersion: 'v1',
    citations: [], refusalCode: null, requestId: 'offline-request', knowledgeMode: 'STRICT', sections: [], providerModel: HIVE_MODEL };
  await route.fulfill({ contentType: 'text/event-stream', body: frame('metadata', {
    operationId: result.operationId, conversationId: result.conversationId, knowledgeMode: 'STRICT', provisional: true,
  }) + frame('token', { delta: 'Nội dung tạm', attemptId: 'attempt-1', sequence: 1 }) + frame('final', result)
    + frame('done', { operationId: result.operationId, messageId: result.messageId }) });
}

async function api(route: Route, path: string, scenario: HiveScenario): Promise<void> {
  const request = route.request();
  scenario.calls.push({ path, method: request.method(), body: request.postData() ? request.postDataJSON() : null });
  if (path.endsWith('/auth/refresh')) { await json(route, { accessToken: 'offline-token', tokenType: 'Bearer', expiresIn: 900 }); return; }
  if (path.endsWith('/users/me')) { await json(route, { id: 'admin-1', email: 'admin@example.test', displayName: 'Quản trị viên', systemRole: 'ADMIN', status: 'ACTIVE' }); return; }
  if (path.endsWith('/ai-studio/metrics')) { await json(route, metrics(scenario)); return; }
  if (path.endsWith('/ai-studio/admission')) { await admission(route, scenario); return; }
  if (path.endsWith('/ai-studio/test-key')) { await json(route, { status: 'HEALTHY', message: 'Đã kiểm tra', latencyMs: 8, probeType: 'GENERATION' }); return; }
  if (path.endsWith('/ai-studio/quick-prompt')) { await json(route, { status: 'SUCCESS', reply: 'Xin chào từ Hive', model: HIVE_MODEL, tokensUsed: null, latencyMs: 10 }); return; }
  if (path.endsWith('/questions/stream')) { await chat(route, scenario); return; }
  if (path === `/api/v1/workspaces/${WORKSPACE_ID}`) {
    await json(route, { id: WORKSPACE_ID, name: 'Nhóm nghiên cứu', visibility: 'PRIVATE', userRole: 'OWNER',
      description: '', cloudAllowed: true, version: 0 }); return;
  }
  await json(route, { content: [], number: 0, size: 20, totalElements: 0, totalPages: 0 });
}

/** Intercepts every API and blocks remote resources; no request reaches a live backend/provider. */
export async function installHiveScenario(page: Page): Promise<HiveScenario> {
  const scenario: HiveScenario = { admission: { state: 'OPEN', version: 1, runningOperationCount: 0, pendingAttemptCount: 0 },
    registryAvailable: true, conflictNextUpdate: false, chatFailure: null, calls: [] };
  await page.routeWebSocket('**/*', (socket) => socket.close());
  await page.route('**/*', async (route) => {
    const address = new URL(route.request().url());
    if (address.pathname.startsWith('/api/')) { await api(route, address.pathname, scenario); return; }
    if (['127.0.0.1', 'localhost'].includes(address.hostname) && address.port === '5173') { await route.continue(); return; }
    await route.abort();
  });
  return scenario;
}
