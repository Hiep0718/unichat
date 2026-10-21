import { z } from 'zod';
import { fetchJson } from '../../lib/api-client';
import { admissionMutationSchema, adminPageSchema, keyIdSchema, modelNameSchema, quickPromptSchema, userMutationSchema } from './admin-inputs';

export type SystemRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'LOCKED' | 'PENDING_VERIFICATION';

export interface UserItem {
  id: string;
  email: string;
  displayName?: string;
  systemRole: SystemRole;
  status: UserStatus;
  createdAt: string;
  version: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AiStudioKey {
  keyId: string;
  name: string;
  maskedKey: string;
  isConfigured: boolean;
  provider?: string;
  isActive?: boolean;
  supportedModels?: string[];
}

export interface RequestsSuccessDataPoint {
  date: string;
  requests: number;
  successRate: number | null;
}

export interface ErrorsDataPoint {
  date: string;
  error429: number;
  error503: number;
  errorOther: number;
  totalErrors: number;
}

export interface ModelDataPoint {
  date: string;
  [modelName: string]: string | number | null;
}

export interface AiStudioMetricsResponse {
  status: 'NO_DATA' | 'AVAILABLE';
  completeness: 'PARTIAL' | 'COMPLETE';
  sampleCount: number;
  updatedAt: string;
  retainedFrom: string | null;
  registryStatus: string;
  tier: string;
  timeRangeDays: number;
  keys: AiStudioKey[];
  models: string[];
  configuredModels: string[];
  activeProvider?: string | null;
  activeModel?: string | null;
  historicalKeys?: { keyId: string; provider: string }[];
  chartRequestsSuccess: RequestsSuccessDataPoint[];
  chartErrors: ErrorsDataPoint[];
  chartInputTokens: ModelDataPoint[];
  chartOutputTokens: ModelDataPoint[];
  chartRequestsPerModel: ModelDataPoint[];
  summary: {
    totalRequests: number;
    totalErrors: number;
    overallSuccessRate: number | null;
  };
}

export interface KeyVerifyResponse {
  status: 'HEALTHY' | 'RATE_LIMITED' | 'ERROR' | 'UNAVAILABLE' | 'UNCONFIGURED';
  message: string;
  latencyMs: number | null;
  probeType: 'METADATA' | 'GENERATION';
  maskedKey?: string;
}

export interface QuickPromptResponse {
  status: 'SUCCESS' | 'ERROR' | 'UNAVAILABLE' | 'UNCONFIGURED';
  reply: string | null;
  tokensUsed: number | null;
  latencyMs: number | null;
  model: string;
  error?: boolean;
}

export interface AdminWorkspaceItem {
  id: string;
  name: string;
  description: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'SHARED';
  ownerId: string;
  documentCount: number;
  createdAt: string;
}

export interface AdminDocumentItem {
  id: string;
  originalName: string;
  mediaType: string;
  byteSize: number;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'DELETING';
  workspaceId: string;
  createdAt: string;
}

export interface AdminAuditEvent {
  id: string;
  occurredAt: string;
  action: string;
  targetType: string;
  outcome: string;
  actorId: string | null;
  targetId: string | null;
  requestId: string;
}

/** Fetches an actual user page with bounded search and pagination. */
export async function fetchAdminUsers(
  query?: string,
  page = 0,
  size = 20
): Promise<PageResponse<UserItem>> {
  adminPageSchema.parse({ page, size });
  const search = z.string().max(200).optional().parse(query);
  const queryParam = search ? `&query=${encodeURIComponent(search)}` : '';
  return fetchJson<PageResponse<UserItem>>(`/admin/users?page=${page}&size=${size}${queryParam}`);
}

/** Updates status only when the currently displayed row version still matches. */
export async function updateAdminUserStatus(
  userId: string,
  status: UserStatus,
  expectedVersion: number
): Promise<UserItem> {
  userMutationSchema.parse({ userId, expectedVersion });
  z.enum(['ACTIVE', 'LOCKED', 'PENDING_VERIFICATION']).parse(status);
  return fetchJson<UserItem>(`/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, expectedVersion: z.number().int().nonnegative().parse(expectedVersion) }),
  });
}

/** Changes a role using optimistic concurrency; Core enforces admin invariants. */
export async function updateAdminUserRole(
  userId: string,
  systemRole: SystemRole,
  expectedVersion: number
): Promise<UserItem> {
  userMutationSchema.parse({ userId, expectedVersion });
  z.enum(['USER', 'ADMIN']).parse(systemRole);
  return fetchJson<UserItem>(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ systemRole, expectedVersion: z.number().int().nonnegative().parse(expectedVersion) }),
  });
}

/** Reads durable measurements with stable key/model filters and unknown usage preserved. */
export async function fetchAiStudioMetrics(
  days = 28,
  keyId?: string,
  model?: string
): Promise<AiStudioMetricsResponse> {
  z.number().int().min(1).max(45).parse(days);
  if (keyId) keyIdSchema.parse(keyId);
  if (model && model !== 'ALL') modelNameSchema.parse(model);
  let url = `/admin/ai-studio/metrics?days=${days}`;
  if (keyId) url += `&keyId=${encodeURIComponent(keyId)}`;
  if (model && model !== 'ALL') url += `&model=${encodeURIComponent(model)}`;
  return fetchJson<AiStudioMetricsResponse>(url);
}

/** Explicitly probes the selected provider key; generation probes may consume credits. */
export async function testProviderKey(keyId: string): Promise<KeyVerifyResponse> {
  return fetchJson<KeyVerifyResponse>('/admin/ai-studio/test-key', {
    method: 'POST',
    body: JSON.stringify({ keyId: keyIdSchema.parse(keyId) }),
  });
}

/** Legacy alias for callers migrating to provider-neutral diagnostics. */
export const testGeminiKey = testProviderKey;

/** Durable admission state and actual in-flight counts reported by Core. */
export interface AiAdmission {
  state: 'OPEN' | 'DRAINING' | 'VERIFYING';
  version: number;
  runningOperationCount: number;
  pendingAttemptCount: number;
}

/** Reads admission state without starting a provider request. */
export function fetchAiAdmission(): Promise<AiAdmission> {
  return fetchJson('/admin/ai-studio/admission');
}

/** Changes admission only for the version the operator reviewed. */
export function updateAiAdmission(state: AiAdmission['state'], expectedVersion: number): Promise<AiAdmission> {
  return fetchJson('/admin/ai-studio/admission', { method: 'PUT',
    body: JSON.stringify(admissionMutationSchema.parse({ state, expectedVersion })) });
}

/** Sends only the direct prompt entered by an admin using an explicitly selected key/model. */
export async function sendQuickPrompt(
  prompt: string,
  keyId: string,
  model: string
): Promise<QuickPromptResponse> {
  return fetchJson<QuickPromptResponse>('/admin/ai-studio/quick-prompt', {
    method: 'POST',
    body: JSON.stringify(quickPromptSchema.parse({ prompt, keyId, model })),
  });
}

// Workspace APIs
export async function fetchAdminWorkspaces(
  page = 0,
  size = 20
): Promise<PageResponse<AdminWorkspaceItem>> {
  return fetchJson<PageResponse<AdminWorkspaceItem>>(`/admin/workspaces?page=${page}&size=${size}`);
}

export async function toggleWorkspaceVisibility(
  workspaceId: string,
  visibility: 'PUBLIC' | 'PRIVATE'
): Promise<{ id: string; visibility: string }> {
  return fetchJson<{ id: string; visibility: string }>(`/admin/workspaces/${workspaceId}/visibility`, {
    method: 'PATCH',
    body: JSON.stringify({ visibility }),
  });
}

export async function deleteAdminWorkspace(workspaceId: string): Promise<void> {
  return fetchJson<void>(`/admin/workspaces/${workspaceId}`, {
    method: 'DELETE',
  });
}

// Document APIs
export async function fetchAdminDocuments(
  page = 0,
  size = 20
): Promise<PageResponse<AdminDocumentItem>> {
  return fetchJson<PageResponse<AdminDocumentItem>>(`/admin/documents?page=${page}&size=${size}`);
}

export async function retryAdminDocument(documentId: string): Promise<{ id: string; message: string }> {
  return fetchJson<{ id: string; message: string }>(`/admin/documents/${documentId}/retry`, {
    method: 'POST',
  });
}

/** Reads one append-only audit page, containing metadata only. */
export async function fetchAdminAuditEvents(page = 0, action = '', outcome = ''): Promise<PageResponse<AdminAuditEvent>> {
  adminPageSchema.parse({ page, size: 20 });
  z.string().max(100).parse(action);
  z.enum(['', 'SUCCESS', 'FAILURE', 'DENIED']).parse(outcome);
  const query = new URLSearchParams({ page: String(page), size: '20' });
  if (action) query.set('action', action);
  if (outcome) query.set('outcome', outcome);
  return fetchJson<PageResponse<AdminAuditEvent>>(`/admin/audit-events?${query}`);
}
