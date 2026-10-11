/**
 * Deterministic gradient theme system for mobile workspaces.
 * Mirrored 1:1 from frontend/src/features/workspaces/group-theme.ts.
 */

export interface GroupTheme {
  readonly from: string;
  readonly via: string;
  readonly to: string;
  readonly blobA: string;
  readonly blobB: string;
}

export const THEMES: readonly GroupTheme[] = [
  {
    from: '#8B5CF6', via: '#D946EF', to: '#4C1D95',
    blobA: 'rgba(240, 171, 252, 0.62)', blobB: 'rgba(34, 211, 238, 0.38)',
  },
  {
    from: '#22D3EE', via: '#3B82F6', to: '#1E3A8A',
    blobA: 'rgba(165, 243, 252, 0.58)', blobB: 'rgba(167, 139, 250, 0.40)',
  },
  {
    from: '#FB7185', via: '#F97316', to: '#881337',
    blobA: 'rgba(253, 230, 138, 0.58)', blobB: 'rgba(244, 114, 182, 0.42)',
  },
  {
    from: '#34D399', via: '#06B6D4', to: '#065F46',
    blobA: 'rgba(190, 242, 100, 0.48)', blobB: 'rgba(103, 232, 249, 0.44)',
  },
  {
    from: '#3B82F6', via: '#8B5CF6', to: '#312E81',
    blobA: 'rgba(147, 197, 253, 0.58)', blobB: 'rgba(232, 121, 249, 0.40)',
  },
  {
    from: '#FBBF24', via: '#EC4899', to: '#701A75',
    blobA: 'rgba(254, 215, 170, 0.58)', blobB: 'rgba(192, 132, 252, 0.42)',
  },
  {
    from: '#A3E635', via: '#10B981', to: '#14532D',
    blobA: 'rgba(217, 249, 157, 0.54)', blobB: 'rgba(94, 234, 212, 0.42)',
  },
  {
    from: '#38BDF8', via: '#6366F1', to: '#1E1B4B',
    blobA: 'rgba(186, 230, 253, 0.56)', blobB: 'rgba(216, 180, 254, 0.40)',
  },
  {
    from: '#F472B6', via: '#A855F7', to: '#581C87',
    blobA: 'rgba(251, 207, 232, 0.56)', blobB: 'rgba(125, 211, 252, 0.38)',
  },
  {
    from: '#2DD4BF', via: '#2563EB', to: '#134E4A',
    blobA: 'rgba(153, 246, 228, 0.54)', blobB: 'rgba(165, 180, 252, 0.42)',
  },
  {
    from: '#F87171', via: '#F59E0B', to: '#7F1D1D',
    blobA: 'rgba(254, 240, 138, 0.56)', blobB: 'rgba(252, 165, 165, 0.44)',
  },
  {
    from: '#818CF8', via: '#22D3EE', to: '#1E3A8A',
    blobA: 'rgba(199, 210, 254, 0.56)', blobB: 'rgba(103, 232, 249, 0.42)',
  },
];

export function groupThemeFor(workspaceId: string): GroupTheme {
  let hash = 0;
  for (let i = 0; i < workspaceId.length; i += 1) {
    hash = (hash * 31 + workspaceId.charCodeAt(i)) % 1000003;
  }
  return THEMES[Math.abs(hash) % THEMES.length] ?? THEMES[0];
}
