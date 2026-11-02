/**
 * Tổng hợp ba con số của danh sách workspace: số không gian, số tài liệu,
 * số thành viên.
 */

import { useMemo } from 'react';

import { summariseWorkspaces } from '../workspace-totals';

import type { WorkspaceDto } from '../workspace-schema';

import './quick-stats.css';

interface QuickStatsProps {
  readonly workspaces: readonly WorkspaceDto[];
}

/**
 * Hiển thị ba ô đếm.
 *
 * Không có biểu tượng: một con số 48px đã đủ nói nó là gì khi đứng cạnh nhãn
 * của chính nó, còn biểu tượng trong ô vuông nhuộm màu là thứ bộ phong cách
 * cấm thẳng.
 */
export function QuickStats({ workspaces }: QuickStatsProps) {
  const stats = useMemo(() => summariseWorkspaces(workspaces), [workspaces]);

  return (
    <section className="quick-stats" aria-label="Thống kê nhanh">
      {stats.map((stat) => (
        <div key={stat.key} className="quick-stats__card">
          <span className="quick-stats__value">{stat.value}</span>
          <span className="quick-stats__label">{stat.label}</span>
        </div>
      ))}
    </section>
  );
}
