/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

export type WorkspaceRole = 'OWNER' | 'EDITOR' | 'CONTRIBUTOR' | 'VIEWER';
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
  readonly canEdit: boolean;
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
    const canContribute = role === 'OWNER' || role === 'EDITOR' || role === 'CONTRIBUTOR';

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
