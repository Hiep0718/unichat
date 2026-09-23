/**
 * A member's profile.
 * Route: /users/:userId
 *
 * Shows the groups the viewer and the member share, and what the member has
 * contributed inside them. Both are scoped on the server, so this page cannot
 * reveal where someone is a member beyond the viewer's own reach.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { EntityAvatar } from '../../components/entity-avatar';
import { ContributionStats } from './components/contribution-stats';
import { fetchMemberProfile } from './profile-api';
import { openConversation } from '../work-chat/work-chat-api';
import type { MemberProfile } from './profile-api';
import './profile-page.css';

const ROLE_TEXT: Record<string, string> = {
  OWNER: 'Chủ nhóm',
  EDITOR: 'Biên tập',
  VIEWER: 'Thành viên',
};

type PageState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly profile: MemberProfile }
  | { readonly status: 'missing' };

export function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<PageState>({ status: 'loading' });

  useEffect(() => {
    if (!userId) {
      return;
    }
    let cancelled = false;
    fetchMemberProfile(userId)
      .then((profile) => {
        if (!cancelled) setState({ status: 'ready', profile });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'missing' });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (state.status === 'loading') {
    return <p className="profile-page__state">Đang tải hồ sơ...</p>;
  }

  if (state.status === 'missing') {
    return (
      <div className="profile-page__state">
        <Icon name="person_off" size={36} />
        <p>Không tìm thấy thành viên này, hoặc bạn không cùng nhóm nào với họ.</p>
      </div>
    );
  }

  const { profile } = state;

  const message = async () => {
    const conversation = await openConversation(profile.userId);
    navigate(`/work-chat?conversation=${conversation.id}`);
  };

  return (
    <div className="profile-page">
      <header className="profile-page__header">
        <EntityAvatar
          name={profile.displayName}
          size={88}
          shape="circle"
          userId={profile.userId}
          hasAvatar={profile.hasAvatar}
          avatarColor={profile.avatarColor}
        />

        <div className="profile-page__identity">
          <h1 className="profile-page__name">{profile.displayName}</h1>
          <p className="profile-page__handle">
            Nhắc tên bằng <strong>@{profile.handle}</strong>
          </p>
          {profile.topTags.length > 0 && (
            <p className="profile-page__topics">
              Hay trả lời về
              {profile.topTags.map((tag) => (
                <span key={tag} className="profile-page__topic">{tag}</span>
              ))}
            </p>
          )}
        </div>

        <div className="profile-page__actions">
          {profile.self ? (
            <button
              type="button"
              className="profile-page__edit"
              onClick={() => navigate('/account')}
            >
              <Icon name="edit" size={17} /> Sửa hồ sơ
            </button>
          ) : (
            profile.canMessage && (
              <button type="button" className="profile-page__message" onClick={() => void message()}>
                <Icon name="chat" size={17} /> Nhắn tin
              </button>
            )
          )}
        </div>
      </header>

      <ContributionStats contributions={profile.contributions} />

      <section className="profile-card">
        <h2 className="profile-card__heading">
          {profile.self ? 'Nhóm của bạn' : 'Nhóm chung'} ({profile.sharedGroups.length})
        </h2>
        {profile.sharedGroups.length === 0 ? (
          <p className="profile-card__empty">Chưa tham gia nhóm nào.</p>
        ) : (
          <ul className="profile-groups">
            {profile.sharedGroups.map((group) => (
              <li key={group.workspaceId}>
                <button
                  type="button"
                  className="profile-groups__row"
                  onClick={() => navigate(`/workspaces/${group.workspaceId}/discussions`)}
                >
                  <EntityAvatar name={group.name} size={34} />
                  <span className="profile-groups__name">{group.name}</span>
                  <span className={`profile-groups__role profile-groups__role--${group.role.toLowerCase()}`}>
                    {ROLE_TEXT[group.role] ?? group.role}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default ProfilePage;
