import type { WorkspaceDto } from './workspace-schema';

/** Một con số của dải thống kê nhanh. */
export interface WorkspaceTotal {
  /** Khóa React, đồng thời là tên vai của ô. */
  readonly key: string;
  readonly label: string;
  readonly value: number;
}

/**
 * Cộng dồn các con số của một danh sách workspace.
 *
 * Ở module riêng chứ không nằm cạnh component dùng nó: xuất một hàm bên cạnh
 * một component làm hỏng fast refresh của file đó, và đó chính là nguyên nhân
 * Vite phục vụ một module cũ không còn export nào khớp sau lần sửa trước.
 *
 * @param workspaces Danh sách workspace đã tải về.
 * @returns Ba mục đếm theo đúng thứ tự hiển thị.
 */
export function summariseWorkspaces(
  workspaces: readonly WorkspaceDto[],
): readonly WorkspaceTotal[] {
  const totals = workspaces.reduce(
    (sum, ws) => ({
      documents: sum.documents + ws.documentCount,
      members: sum.members + ws.memberCount,
    }),
    { documents: 0, members: 0 },
  );

  return [
    { key: 'workspaces', label: 'Workspace', value: workspaces.length },
    { key: 'documents', label: 'Tài liệu', value: totals.documents },
    { key: 'members', label: 'Thành viên', value: totals.members },
  ];
}
