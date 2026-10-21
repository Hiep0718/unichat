import type { Page, Route } from '@playwright/test';
import type { WorkspaceDto } from '../../src/features/workspaces/workspace-schema';

/** Offline workspace used to exercise explicit owner policy updates. */
export const POLICY_WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';

/** Mutable simulated Core state; all calls remain intercepted in the browser. */
export interface WorkspacePolicyScenario {
  workspace: WorkspaceDto;
  conflictNextSave: boolean;
  updates: unknown[];
}

async function json(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function workspaceRequest(route: Route, scenario: WorkspacePolicyScenario): Promise<void> {
  if (route.request().method() === 'GET') { await json(route, scenario.workspace); return; }
  const input = route.request().postDataJSON() as { cloudAllowed?: boolean; expectedVersion: number };
  scenario.updates.push(input);
  if (scenario.conflictNextSave) {
    scenario.conflictNextSave = false;
    scenario.workspace = { ...scenario.workspace, version: scenario.workspace.version + 1 };
  }
  if (input.expectedVersion !== scenario.workspace.version) {
    await json(route, { detail: 'Private conflict details' }, 409); return;
  }
  if (scenario.workspace.userRole !== 'OWNER') { await json(route, { detail: 'Forbidden' }, 403); return; }
  scenario.workspace = { ...scenario.workspace, ...input, version: scenario.workspace.version + 1 };
  await json(route, scenario.workspace);
}

async function apiRequest(route: Route, scenario: WorkspacePolicyScenario): Promise<void> {
  const path = new URL(route.request().url()).pathname;
  if (path.endsWith('/auth/refresh')) {
    await json(route, { accessToken: 'offline-token', tokenType: 'Bearer', expiresIn: 900 }); return;
  }
  if (path.endsWith('/users/me')) {
    await json(route, { id: 'owner-1', email: 'owner@example.test', displayName: 'Chủ workspace', systemRole: 'USER', status: 'ACTIVE' }); return;
  }
  if (path === `/api/v1/workspaces/${POLICY_WORKSPACE_ID}`) { await workspaceRequest(route, scenario); return; }
  await json(route, { content: [], number: 0, size: 20, totalElements: 0, totalPages: 0 });
}

/** Mocks every API and blocks remote resources, sockets and providers. */
export async function installWorkspacePolicyScenario(page: Page, userRole: WorkspaceDto['userRole'] = 'OWNER'): Promise<WorkspacePolicyScenario> {
  const scenario: WorkspacePolicyScenario = {
    workspace: { id: POLICY_WORKSPACE_ID, ownerId: 'owner-1', name: 'Nhóm nghiên cứu', description: '', visibility: 'PRIVATE',
      cloudAllowed: false, version: 3, userRole, documentCount: 0, memberCount: 1, recentPostCount: 0,
      faces: [], hasCover: false, createdAt: '', updatedAt: '' },
    conflictNextSave: false, updates: [],
  };
  await page.routeWebSocket('**/*', (socket) => socket.close());
  await page.route('**/*', async (route) => {
    const address = new URL(route.request().url());
    if (address.pathname.startsWith('/api/')) { await apiRequest(route, scenario); return; }
    if (['127.0.0.1', 'localhost'].includes(address.hostname) && address.port === '5173') { await route.continue(); return; }
    await route.abort();
  });
  return scenario;
}
