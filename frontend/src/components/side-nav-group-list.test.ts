import { describe, expect, it } from 'vitest';

import {
  isAuthoritativeAdmin,
  isNavPathActive,
  otherJoinedGroups,
  withActiveGroup,
  workspaceRoleLabel,
} from './side-nav-group-list';

describe('side-nav-group-list helpers', () => {
  const loaded = [
    { id: 'a', name: 'Nhóm A' },
    { id: 'b', name: 'Nhóm B' },
  ];

  it('adds an open member group when it is beyond the first loaded page', () => {
    const groups = withActiveGroup(loaded, { id: 'z', name: 'Nhóm Z' }, true);
    expect(groups.map((group) => group.id)).toEqual(['z', 'a', 'b']);
  });

  it('never inserts a non-member public group into joined groups', () => {
    const groups = withActiveGroup(loaded, { id: 'public-z', name: 'Nhóm Công Khai' }, false);
    expect(groups).toBe(loaded);
  });

  it('keeps the list unchanged when the group is already present or null', () => {
    expect(withActiveGroup(loaded, { id: 'b', name: 'Nhóm B' })).toBe(loaded);
    expect(withActiveGroup(loaded, null)).toBe(loaded);
  });

  it('excludes the active workspace from the quick-switch list', () => {
    expect(otherJoinedGroups(loaded, 'a').map((g) => g.id)).toEqual(['b']);
    expect(otherJoinedGroups(loaded, undefined)).toBe(loaded);
  });

  it('grants admin nav visibility strictly to active ADMIN accounts', () => {
    expect(isAuthoritativeAdmin({ systemRole: 'ADMIN', status: 'ACTIVE' })).toBe(true);
    expect(isAuthoritativeAdmin({ systemRole: 'ADMIN', status: 'SUSPENDED' })).toBe(false);
    expect(isAuthoritativeAdmin({ systemRole: 'USER', status: 'ACTIVE' })).toBe(false);
    expect(isAuthoritativeAdmin(null)).toBe(false);
  });

  it('matches nested paths unless exact matching is requested', () => {
    expect(isNavPathActive('/feed/posts/42', '/feed')).toBe(true);
    expect(isNavPathActive('/feed', '/feed')).toBe(true);
    expect(isNavPathActive('/feedback', '/feed')).toBe(false);
    expect(isNavPathActive('/workspaces/ws-1', '/workspaces', true)).toBe(false);
    expect(isNavPathActive('/workspaces', '/workspaces', true)).toBe(true);
  });

  it('formats Vietnamese workspace role labels including non-member previews', () => {
    expect(workspaceRoleLabel('OWNER')).toBe('Chủ sở hữu');
    expect(workspaceRoleLabel('EDITOR')).toBe('Biên tập');
    expect(workspaceRoleLabel('VIEWER')).toBe('Thành viên');
    expect(workspaceRoleLabel(null)).toBe('Chưa tham gia');
  });
});
