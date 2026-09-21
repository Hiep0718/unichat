/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

export type WorkspaceRole = 'OWNER' | 'EDITOR' | 'VIEWER';
export type WorkspaceVisibility = 'PRIVATE' | 'SHARED' | 'PUBLIC';

export interface WorkspaceDetails {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly visibility: WorkspaceVisibility;
  readonly role: WorkspaceRole;
  readonly ownerId?: string;
}

interface WorkspaceContextState {
  readonly workspace: WorkspaceDetails | null;
  readonly role: WorkspaceRole;
  readonly isOwner: boolean;
  /** May manage workspace content directly: OWNER and EDITOR. */
  readonly canEdit: boolean;
  /**
   * May contribute documents. Every active member can, but a contribution from
   * someone without {@link canEdit} stays out of retrieval until approved.
   */
  readonly canContribute: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextState | null>(null);

interface WorkspaceProviderProps {
  readonly workspace: WorkspaceDetails;
  readonly children: ReactNode;
}

export function WorkspaceProvider({ workspace, children }: WorkspaceProviderProps) {
  const value = useMemo<WorkspaceContextState>(() => {
    const role = workspace.role || 'VIEWER';
    const isOwner = role === 'OWNER';
    const canEdit = role === 'OWNER' || role === 'EDITOR';
    // Non-members reach this provider with no role at all; only actual members
    // may contribute, otherwise the upload would fail server-side.
    const canContribute = Boolean(workspace.role);

    return {
      workspace,
      role,
      isOwner,
      canEdit,
      canContribute,
    };
  }, [workspace]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextState {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
