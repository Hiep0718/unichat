/**
 * The signed-in person's own face, for the comment box.
 *
 * The session only knows a name, so the picture and chosen colour come from
 * `/users/me` — under the same query key the settings page uses, so a
 * session that has opened either one asks the server only once.
 */
import { useQuery } from '@tanstack/react-query';

import { EntityAvatar } from '../../../components/entity-avatar';
import { authApi } from '../../auth/api/auth-api';
import { useAuth } from '../../auth/auth-context';

interface MyAvatarProps {
  readonly size?: number;
}

/** Five minutes: a new picture shows on the next card opened after that. */
const PROFILE_STALE_MS = 5 * 60 * 1000;

export function MyAvatar({ size = 32 }: MyAvatarProps) {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: authApi.getMe,
    staleTime: PROFILE_STALE_MS,
    enabled: Boolean(user),
  });

  return (
    <EntityAvatar
      name={profile?.displayName || user?.displayName || 'Bạn'}
      {...(user?.id ? { userId: user.id } : {})}
      hasAvatar={profile?.hasAvatar ?? false}
      avatarColor={profile?.avatarColor ?? null}
      size={size}
      shape="circle"
    />
  );
}
