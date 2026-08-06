/**
 * Quick stats cards showing aggregated workspace metrics.
 * Computes totals from the workspace list data passed as props.
 */

import { useMemo } from 'react';

import { Icon } from '../../../components/icon';

import type { WorkspaceDto } from '../workspace-schema';

import './quick-stats.css';

interface QuickStatsProps {
  readonly workspaces: readonly WorkspaceDto[];
}

interface StatItem {
  readonly icon: string;
  readonly label: string;
  readonly value: number;
  readonly variant: string;
}

/**
 * Renders three stat cards: total workspaces, documents, and members.
 */
export function QuickStats({ workspaces }: QuickStatsProps) {
  const stats = useMemo<readonly StatItem[]>(() => {
    const totalDocs = workspaces.reduce((sum, ws) => sum + ws.documentCount, 0);
    const totalMembers = workspaces.reduce((sum, ws) => sum + ws.memberCount, 0);

    return [
      { icon: 'workspaces', label: 'Workspace', value: workspaces.length, variant: 'workspaces' },
      { icon: 'description', label: 'Tài liệu', value: totalDocs, variant: 'documents' },
      { icon: 'group', label: 'Thành viên', value: totalMembers, variant: 'members' },
    ];
  }, [workspaces]);

  return (
    <section className="quick-stats" aria-label="Thống kê nhanh">
      {stats.map((stat) => (
        <div key={stat.variant} className="quick-stats__card">
          <div className={`quick-stats__icon-wrap quick-stats__icon-wrap--${stat.variant}`}>
            <Icon name={stat.icon} size={24} />
          </div>
          <div className="quick-stats__info">
            <span className="quick-stats__value">{stat.value}</span>
            <span className="quick-stats__label">{stat.label}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
