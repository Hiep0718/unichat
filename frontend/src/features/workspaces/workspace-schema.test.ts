import { describe, expect, it } from 'vitest';

import { updateWorkspaceSchema } from './workspace-schema';

describe('updateWorkspaceSchema', () => {
  it('should preserve explicit AI policy booleans with the expected version', () => {
    expect(updateWorkspaceSchema.parse({ cloudAllowed: false, expectedVersion: 0 }))
      .toEqual({ cloudAllowed: false, expectedVersion: 0 });
    expect(updateWorkspaceSchema.parse({ cloudAllowed: true, expectedVersion: 2 }))
      .toEqual({ cloudAllowed: true, expectedVersion: 2 });
  });

  it.each(['false', 'true', 0, 1, null])('should reject non-boolean AI policy %s', (cloudAllowed) => {
    expect(updateWorkspaceSchema.safeParse({ cloudAllowed, expectedVersion: 1 }).success).toBe(false);
  });

  it.each([undefined, -1, 1.5, '1', null])('should reject invalid or missing expected version %s', (expectedVersion) => {
    expect(updateWorkspaceSchema.safeParse({ cloudAllowed: true, expectedVersion }).success).toBe(false);
  });

  it('should accept metadata and visibility updates only with a valid version', () => {
    expect(updateWorkspaceSchema.safeParse({ name: 'Nhóm học tập', visibility: 'SHARED', expectedVersion: 4 }).success).toBe(true);
    expect(updateWorkspaceSchema.safeParse({ name: 'Nhóm học tập' }).success).toBe(false);
  });
});
