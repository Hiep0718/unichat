import type { Page, Route } from '@playwright/test';
import type { InviteDto } from '../../src/features/workspaces/invite-api';
import type { WorkspaceDto } from '../../src/features/workspaces/workspace-schema';

/** Offline shared workspace whose owner issues invite links. */
export const INVITE_WORKSPACE_ID = '22222222-2222-4222-8222-222222222222';

/** Mutable simulated Core state; every call stays inside the browser. */
export interface InviteLinkScenario {
  invites: InviteDto[];
  created: unknown[];
}

const OWNER = { userId: 'owner-1', email: 'owner@example.test', displayName: 'Chủ nhóm',
  hasAvatar: false, avatarColor: null, role: 'OWNER', status: 'ACTIVE', invitedById: null,
  workspaceId: INVITE_WORKSPACE_ID };

const WORKSPACE: WorkspaceDto = {
  id: INVITE_WORKSPACE_ID, ownerId: 'owner-1', name: 'Nhóm ôn thi', description: '',
  visibility: 'SHARED', cloudAllowed: false, version: 1, userRole: 'OWNER', documentCount: 0,
  memberCount: 1, recentPostCount: 0, faces: [], hasCover: false, topics: [], createdAt: '', updatedAt: '',
};

async function json(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function invitesRequest(route: Route, scenario: InviteLinkScenario): Promise<void> {
  if (route.request().method() === 'GET') {
    await json(route, scenario.invites.map((invite) => ({ ...invite, token: null })));
    return;
  }
  const input = route.request().postDataJSON() as { role: InviteDto['role']; maxUses: number };
  scenario.created.push(input);
  const invite: InviteDto = {
    id: `inv-${scenario.invites.length + 1}`, token: `tok-${scenario.invites.length + 1}`,
    role: input.role, createdAt: '2026-11-22T00:00:00Z', expiresAt: '2026-11-29T00:00:00Z',
    maxUses: input.maxUses, usedCount: 0, active: true,
  };
  scenario.invites.unshift(invite);
  await json(route, invite, 201);
}

async function apiRequest(route: Route, scenario: InviteLinkScenario): Promise<void> {
  const path = new URL(route.request().url()).pathname;
  const base = `/api/v1/workspaces/${INVITE_WORKSPACE_ID}`;
  if (path.endsWith('/auth/refresh')) {
    await json(route, { accessToken: 'offline-token', tokenType: 'Bearer', expiresIn: 900 }); return;
  }
  if (path.endsWith('/users/me')) {
    await json(route, { id: 'owner-1', email: OWNER.email, displayName: OWNER.displayName, systemRole: 'USER', status: 'ACTIVE' });
    return;
  }
  if (path === base) { await json(route, WORKSPACE); return; }
  if (path === `${base}/members`) { await json(route, [OWNER]); return; }
  if (path === `${base}/invites`) { await invitesRequest(route, scenario); return; }
  if (path.endsWith('/workspaces/topics')) { await json(route, []); return; }
  await json(route, { content: [], number: 0, size: 20, totalElements: 0, totalPages: 0 });
}

/** Mocks every API and blocks remote resources and sockets. */
export async function installInviteLinkScenario(page: Page): Promise<InviteLinkScenario> {
  const scenario: InviteLinkScenario = { invites: [], created: [] };
  await page.routeWebSocket('**/*', (socket) => socket.close());
  await page.route('**/*', async (route) => {
    const address = new URL(route.request().url());
    if (address.pathname.startsWith('/api/')) { await apiRequest(route, scenario); return; }
    if (['127.0.0.1', 'localhost'].includes(address.hostname) && address.port === '5173') { await route.continue(); return; }
    await route.abort();
  });
  return scenario;
}
