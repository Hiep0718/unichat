import { useCallback, useEffect, useRef, useState } from 'react';
import { getSessionSnapshot } from '../../lib/session-store';
import { isValidUuid } from '../../lib/uuid';
import { workspaceApi } from '../workspaces/workspace-api';
import { chatApi } from './chat-api';
import type { ConversationItem } from '../../types/api';
import type { WorkspaceDetail } from '../workspaces/workspace-types';

interface ListState {
  workspace: WorkspaceDetail | null; items: ConversationItem[]; page: number;
  more: boolean; total: number; loading: boolean; error: string | null;
}
const INITIAL: ListState = { workspace: null, items: [], page: -1, more: false, total: 0, loading: true, error: null };

/** Loads actual server pages, discarding callbacks after scope/session changes. */
export function useConversationList(workspaceId: string) {
  const [state, setState] = useState<ListState>(INITIAL);
  const revision = useRef(0);
  const inFlight = useRef(false);
  const load = useCallback(async (page = 0) => {
    if (!isValidUuid(workspaceId)) { setState({ ...INITIAL, loading: false, error: 'ID ngữ cảnh không hợp lệ.' }); return; }
    if (inFlight.current) return;
    inFlight.current = true;
    const request = ++revision.current;
    const generation = getSessionSnapshot().generation;
    const current = () => request === revision.current && generation === getSessionSnapshot().generation;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const [workspace, response] = await Promise.all([workspaceApi.getWorkspace(workspaceId), chatApi.getConversations(workspaceId, { page, size: 20 })]);
      if (!current()) return;
      setState((previous) => ({ workspace, items: page === 0 ? response.items : mergeItems(previous.items, response.items),
        page, more: page + 1 < response.totalPages, total: response.totalElements, loading: false, error: null }));
    } catch (error: unknown) {
      if (current()) setState((previous) => ({ ...previous, loading: false, error: error instanceof Error ? error.message : 'Không tải được lịch sử.' }));
    } finally { if (request === revision.current) inFlight.current = false; }
  }, [workspaceId]);
  useEffect(() => { void load(); return () => { revision.current += 1; inFlight.current = false; }; }, [load]);
  return { ...state, refresh: () => load(), loadMore: () => load(state.page + 1) };
}

function mergeItems(previous: ConversationItem[], incoming: ConversationItem[]): ConversationItem[] {
  return [...new Map([...previous, ...incoming].map((item) => [item.id, item])).values()];
}
