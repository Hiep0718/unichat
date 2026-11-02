import { describe, expect, it } from 'vitest';

import { heroPrompts } from './hero-prompts';
import type { WorkspaceDto } from './workspace-schema';

function workspace(over: Partial<WorkspaceDto> = {}): WorkspaceDto {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    ownerId: '22222222-2222-4222-8222-222222222222',
    name: 'Mongodb',
    description: '',
    visibility: 'PUBLIC',
    cloudAllowed: false,
    documentCount: 6,
    memberCount: 1,
    recentPostCount: 0,
    postCount: 0,
    faces: [],
    topics: [],
    hasCover: false,
    version: 0,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    userRole: 'OWNER',
    ...over,
  };
}

describe('heroPrompts', () => {
  it('should name the member’s own group in the suggestion', () => {
    // Arrange, Act
    const [first] = heroPrompts([workspace({ name: 'Mongodb' })]);

    // Assert
    expect(first?.label).toContain('Mongodb');
    expect(first?.question).toContain('Mongodb');
  });

  it('should skip a group with no documents to answer from', () => {
    // Arrange: mời tóm tắt một kho rỗng là mời người dùng vào một câu trả
    // lời "không đủ bằng chứng".
    const list = [
      workspace({ id: 'a', name: 'Rỗng', documentCount: 0 }),
      workspace({ id: 'b', name: 'Có tài liệu', documentCount: 4 }),
    ];

    // Act
    const prompts = heroPrompts(list);

    // Assert
    expect(prompts).toHaveLength(1);
    expect(prompts[0]?.workspaceId).toBe('b');
  });

  it('should give each suggestion a different group', () => {
    // Arrange: ba gợi ý cùng một nhóm chỉ là một gợi ý viết ba lần.
    const list = [
      workspace({ id: 'a', name: 'A' }),
      workspace({ id: 'b', name: 'B' }),
      workspace({ id: 'c', name: 'C' }),
    ];

    // Act
    const ids = heroPrompts(list).map((prompt) => prompt.workspaceId);

    // Assert
    expect(new Set(ids).size).toBe(3);
  });

  it('should give each suggestion a different kind of job', () => {
    // Arrange
    const list = [
      workspace({ id: 'a', name: 'A' }),
      workspace({ id: 'b', name: 'B' }),
      workspace({ id: 'c', name: 'C' }),
    ];

    // Act
    const labels = heroPrompts(list).map((prompt) => prompt.label);

    // Assert
    expect(new Set(labels).size).toBe(3);
  });

  it('should stop at the limit however many groups there are', () => {
    // Arrange
    const list = Array.from({ length: 9 }, (_, i) =>
      workspace({ id: `id-${i}`, name: `Nhóm ${i}` }),
    );

    // Act, Assert
    expect(heroPrompts(list)).toHaveLength(3);
    expect(heroPrompts(list, 2)).toHaveLength(2);
  });

  it('should offer nothing at all when no group has a document yet', () => {
    // Arrange, Act, Assert
    expect(heroPrompts([workspace({ documentCount: 0 })])).toEqual([]);
    expect(heroPrompts([])).toEqual([]);
  });
});
