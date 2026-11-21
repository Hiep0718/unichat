/**
 * The page an invite link opens.
 *
 * Reachable without signing in, which is the point: someone handed a link may
 * have no account yet, and a bare login screen tells them neither what they
 * were invited to nor by whom — so they have no reason to trust it enough to
 * register. Joining still requires an account; only the description is public.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { ApiError } from '../../lib/api-client';
import { useAuth } from '../auth/auth-context';
import { loginPathFor, withReturnTo } from '../auth/return-to';
import { acceptInvite, previewInvite } from './invite-api';
import { ROLE_SUMMARY } from './workspace-visibility';

import type { InvitePreviewDto } from './invite-api';

import './invite-page.css';

type LoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly invite: InvitePreviewDto }
  | { readonly status: 'dead'; readonly message: string }
  | { readonly status: 'failed' };

/**
 * Only the server saying the link is unknown makes it dead. Anything else — a
 * dropped connection, a timeout, a server error — says nothing about the link,
 * and calling it dead sent people to ask for a new one that would fail the same way.
 */
function stateForFailure(error: unknown): LoadState {
  if (error instanceof ApiError && error.status === 404) {
    return { status: 'dead', message: error.message };
  }
  return { status: 'failed' };
}

export function InvitePage() {
  const { token = '' } = useParams<{ token: string }>();
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const workspaceId = state.status === 'ready' ? state.invite.workspaceId : null;

  useEffect(() => {
    let active = true;
    previewInvite(token)
      .then((invite) => active && setState({ status: 'ready', invite }))
      .catch((error: unknown) => active && setState(stateForFailure(error)));
    return () => {
      active = false;
    };
  }, [token, attempt]);

  const handleJoin = useCallback(async () => {
    setJoining(true);
    setJoinError(null);
    try {
      const joined = await acceptInvite(token);
      navigate(`/workspaces/${joined.workspaceId}`, { replace: true });
    } catch (error: unknown) {
      // Already a member is not a failure, it is the destination. Anyone
      // testing their own link hits this, and refusing to move left the page
      // looking as though the button did nothing.
      if (error instanceof ApiError && error.status === 409 && workspaceId) {
        navigate(`/workspaces/${workspaceId}`, { replace: true });
        return;
      }
      setJoinError(error instanceof Error ? error.message : 'Không tham gia được nhóm');
      setJoining(false);
    }
  }, [token, navigate, workspaceId]);

  if (state.status === 'loading' || isLoading) {
    return (
      <main className="invite-page">
        <p className="invite-page__card" role="status" aria-live="polite">
          Đang kiểm tra lời mời…
        </p>
      </main>
    );
  }

  if (state.status === 'dead') {
    return <DeadInvite message={state.message} />;
  }

  if (state.status === 'failed') {
    return (
      <FailedInvite
        onRetry={() => {
          setState({ status: 'loading' });
          setAttempt((current) => current + 1);
        }}
      />
    );
  }

  const { invite } = state;
  const destination = `/invite/${token}`;

  return (
    <main className="invite-page">
      <section className="invite-page__card">
        <Icon name="group_add" size={40} />
        <p className="invite-page__eyebrow">{invite.invitedByName} mời bạn tham gia</p>
        <h1 className="invite-page__title">{invite.workspaceName}</h1>
        <p className="invite-page__role">
          <Icon name="badge" size={16} />
          Bạn sẽ tham gia với vai trò <strong>{ROLE_SUMMARY[invite.role]}</strong>
        </p>

        {joinError && (
          <p className="invite-page__error" role="alert">
            {joinError}
          </p>
        )}

        {isAuthenticated ? (
          <button
            type="button"
            className="invite-page__primary"
            onClick={handleJoin}
            disabled={joining}
          >
            {joining ? 'Đang tham gia…' : 'Tham gia nhóm'}
          </button>
        ) : (
          <>
            {/* Both routes carry the destination, so signing in or signing up
                comes back here instead of dropping the invitation. */}
            <Link className="invite-page__primary" to={loginPathFor(destination)}>
              Đăng nhập để tham gia
            </Link>
            <Link className="invite-page__secondary" to={withReturnTo('/register', destination)}>
              Chưa có tài khoản? Đăng ký
            </Link>
          </>
        )}
      </section>
    </main>
  );
}

/** The server says the link is unknown, spent, expired or revoked. */
function DeadInvite({ message }: { readonly message: string }) {
  return (
    <main className="invite-page">
      <section className="invite-page__card invite-page__card--dead">
        <Icon name="link_off" size={40} />
        <h1 className="invite-page__title">Lời mời không dùng được</h1>
        <p className="invite-page__reason">{message}</p>
        <p className="invite-page__hint">
          Link mời có thể đã hết hạn, đã dùng hết lượt, hoặc bị chủ nhóm thu hồi.
          Hãy xin người mời một link mới.
        </p>
        <Link className="invite-page__secondary" to="/">
          Về trang chủ
        </Link>
      </section>
    </main>
  );
}

/** The preview could not be read; that says nothing about the link itself. */
function FailedInvite({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <main className="invite-page">
      <section className="invite-page__card">
        <Icon name="cloud_off" size={40} />
        <h1 className="invite-page__title">Chưa tải được lời mời</h1>
        <p className="invite-page__hint">
          Kết nối tới máy chủ bị gián đoạn. Link mời của bạn vẫn có thể dùng được.
        </p>
        <button type="button" className="invite-page__primary" onClick={onRetry}>
          Thử lại
        </button>
      </section>
    </main>
  );
}

export default InvitePage;
