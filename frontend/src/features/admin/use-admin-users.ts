import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAdminUsers, updateAdminUserRole, updateAdminUserStatus } from './admin-api';
import { getSessionSnapshot } from '../../lib/session-store';
import type { UserItem, SystemRole, UserStatus } from './admin-api';

/** Debounces search and binds mutation versions to the exact displayed user row. */
export function useAdminUsers() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const generation = getSessionSnapshot().generation;
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const result = useQuery({ queryKey: ['admin-users', generation, query, page], retry: false,
    queryFn: () => fetchAdminUsers(query, page) });
  const mutate = async (user: UserItem, change: { role: SystemRole } | { status: UserStatus }) => {
    if (pending) return;
    setPending(user.id); setMutationError(null);
    try {
      if ('role' in change) await updateAdminUserRole(user.id, change.role, user.version);
      else await updateAdminUserStatus(user.id, change.status, user.version);
      if (generation === getSessionSnapshot().generation) await result.refetch();
    } catch (error: unknown) {
      if (generation === getSessionSnapshot().generation) setMutationError(error instanceof Error ? error.message : 'Không thể cập nhật tài khoản');
    } finally { if (generation === getSessionSnapshot().generation) setPending(null); }
  };
  return { search, setSearch, page, setPage, pending, mutate, result, mutationError };
}
