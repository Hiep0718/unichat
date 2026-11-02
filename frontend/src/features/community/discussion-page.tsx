/**
 * Discussion Page — workspace-scoped discussion list with Reddit-style mechanics.
 * Route: /workspaces/:workspaceId/discussions
 */
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { useWorkspace } from '../workspaces/workspace-context';
import { useWorkspace as useWorkspaceQuery } from '../workspaces/workspace-hooks';
import { GroupRail } from '../workspaces/components/group-rail';
import { fetchDiscussions, DiscussionResponse } from './community-api';
import type { FeedPostResponse } from './feed-api';
import type { WorkspaceFace } from '../workspaces/workspace-schema';
import { FeedCard } from './components/feed-card';
import { DiscussionControls } from './components/discussion-controls';
import { NewDiscussionModal } from './components/new-discussion-modal';
import './discussion-page.css';

/**
 * Presents a group's post as the shared card expects it.
 *
 * The two responses carry the same post under slightly different names, so
 * this maps rather than duplicating the card: one component means the
 * background, the attachments and the inline comments work identically here
 * and in the feed, because it is the same code drawing them.
 */
function toFeedPost(d: DiscussionResponse): FeedPostResponse {
  return {
    id: d.id,
    workspaceId: d.workspaceId,
    workspaceName: d.workspaceName ?? '',
    authorId: d.authorId,
    authorName: d.authorName,
    authorAvatar: d.authorAvatar,
    title: d.title,
    body: d.body,
    label: (d.label ?? 'DISCUSSION') as FeedPostResponse['label'],
    voteScore: d.voteScore,
    replyCount: d.replyCount,
    reactions: d.reactions,
    backgroundKey: d.backgroundKey,
    acceptedReplyId: d.acceptedReplyId,
    // Bookmarks are a feed concept; the group list neither shows nor sets them.
    isBookmarked: false,
    createdAt: d.createdAt,
    attachments: d.attachments ?? [],
    hasAiAnswer: d.hasAiAnswer,
  };
}

/** Stable empty list, so an unloaded page does not get a new array each render. */
const EMPTY_DISCUSSIONS: DiscussionResponse[] = [];

/** Same reason, for the rail's faces while the group is still loading. */
const EMPTY_FACES: readonly WorkspaceFace[] = [];


const DiscussionPage: React.FC = () => {
  const { workspaceId = '' } = useParams<{ workspaceId: string }>();
  useWorkspace();
  // The same cache entry the group page already filled, so the rail costs no
  // extra request — it only needs the faces and the member count, which the
  // workspace context does not carry.
  const { data: details } = useWorkspaceQuery(workspaceId);
  const navigate = useNavigate();

  const [activeLabel, setActiveLabel] = useState<string>('ALL');
  const [activeSort, setActiveSort] = useState<'HOT' | 'NEW'>('NEW');
  const [showModal, setShowModal] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Cached per filter combination, so returning to this tab — or stepping
  // back to a filter already seen — paints immediately instead of refetching
  // and flashing an empty list, which is what made tab switching stutter.
  const queryClient = useQueryClient();
  const label = activeLabel === 'ALL' ? undefined : activeLabel;
  const listKey = [
    'workspaces', workspaceId, 'discussions',
    { label: label ?? null, sort: activeSort, query: query || null },
  ] as const;

  const { data: discussions = EMPTY_DISCUSSIONS } = useQuery({
    queryKey: listKey,
    // Keeps this branch's in-group search argument, and main's guard against
    // a response without a content array.
    queryFn: () =>
      fetchDiscussions(workspaceId, 0, 20, label, activeSort, query || undefined)
        .then((page) => page?.content ?? []),
    enabled: Boolean(workspaceId),
  });


  const navigateToPost = (discussionId: string) => {
    navigate(`/feed/posts/${discussionId}?workspaceId=${workspaceId}`);
  };

  return (
    <div className="disc-list">
      {/* Rendered as the "Bài viết" tab of the group page, which already carries
          the group name, so only the controls remain here. */}
      <div className="disc-list__main">
        <DiscussionControls
          searchInput={searchInput}
          onSearch={setSearchInput}
          activeLabel={activeLabel}
          onLabel={setActiveLabel}
          activeSort={activeSort}
          onSort={setActiveSort}
          onCompose={() => setShowModal(true)}
        />

        {discussions.length === 0 ? (
          <DiscussionEmptyState />
        ) : (
          <div className="disc-list__cards">
            {discussions.map((d) => (
              <FeedCard
                key={d.id}
                post={toFeedPost(d)}
                onOpen={() => navigateToPost(d.id)}
                onNavigate={navigate}
                hideGroup
                pinned={d.pinned}
              />
            ))}
          </div>
        )}
      </div>

      <GroupRail
        workspaceId={workspaceId}
        faces={details?.faces ?? EMPTY_FACES}
        memberCount={details?.memberCount ?? 0}
      />

      {showModal && workspaceId && (
        <NewDiscussionModal
          workspaceId={workspaceId}
          onClose={() => setShowModal(false)}
          onCreate={(d) => {
            queryClient.setQueryData<DiscussionResponse[]>(listKey, (prev) => [d, ...(prev ?? [])]);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
};

/* ---------- Empty State ---------- */
function DiscussionEmptyState() {
  return (
    <div className="disc-list__empty">
      <div className="disc-list__empty-icon">
        <Icon name="forum" size={32} />
      </div>
      <h3>Chưa có bài thảo luận</h3>
      <p>Hãy là người đầu tiên tạo chủ đề thảo luận trong workspace này.</p>
    </div>
  );
}

export default DiscussionPage;
