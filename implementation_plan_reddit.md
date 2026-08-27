# Kế hoạch: UniChat Reddit-Style Forum

## Tổng quan

Chuyển đổi UniChat từ mô hình "chọn workspace → thao tác" sang mô hình Reddit:
- **Login → Feed bài viết** (gom từ tất cả workspace đã join)
- **Mỗi bài hiện tên workspace** + nút Tham gia
- **Click bài → Chi tiết** + comment tree lồng nhau + vote
- **Click workspace → Trang workspace** (giống subreddit page)
- **Đăng bài bắt buộc chọn workspace** (Phương án A)
- **Bỏ Chat cộng đồng** (giữ Discussion, Reaction, Notification)

---

## Phase A: Dọn dẹp — Xóa Chat cộng đồng

### Backend — Xóa 15 files

#### [DELETE] Config
- `communitychat/config/WebSocketConfig.java`
- `communitychat/config/RedisConfig.java`

#### [DELETE] Chat API + Service
- `communitychat/api/CommunityChatMessagingController.java`
- `communitychat/api/CommunityChannelController.java`
- `communitychat/api/CommunityMessageController.java`
- `communitychat/api/ChannelResponse.java`
- `communitychat/api/MessageResponse.java`
- `communitychat/api/SendMessagePayload.java`
- `communitychat/service/CommunityChatService.java`
- `communitychat/service/CommunityMessagingService.java`

#### [DELETE] Chat Domain
- `communitychat/domain/CommunityChannel.java`
- `communitychat/domain/CommunityChannelRepository.java`
- `communitychat/domain/CommunityMessage.java`
- `communitychat/domain/CommunityMessageRepository.java`
- `communitychat/domain/MessageAuthorType.java`

#### [MODIFY] [pom.xml](file:///d:/DoAnTotNghiep/unichat/core-api/pom.xml)
Xóa 2 dependency:
- `spring-boot-starter-websocket`
- `spring-boot-starter-data-redis`

#### [MODIFY] [application.yml](file:///d:/DoAnTotNghiep/unichat/core-api/src/main/resources/application.yml)
Xóa block `redis:` config

#### [MODIFY] [.env](file:///d:/DoAnTotNghiep/unichat/.env)
Xóa `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

#### [MODIFY] [UniChatCoreApplication.java](file:///d:/DoAnTotNghiep/unichat/core-api/src/main/java/com/unichat/core/UniChatCoreApplication.java)
Giữ `@EnableAsync` (cần cho NotificationEventListener)

### Frontend — Xóa 2 files
- `features/community/community-chat-page.tsx`
- `features/community/community-chat-page.css`

#### [MODIFY] `community-api.ts`
Xóa toàn bộ phần WebSocket/STOMP (giữ REST: discussions, reactions, notifications)

---

## Phase B: Backend — Reddit Mechanics

### B1. Database Migration

#### [NEW] `V9__reddit_vote_score.sql`
```sql
ALTER TABLE discussions ADD COLUMN vote_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE discussion_replies ADD COLUMN vote_score INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_discussions_hot ON discussions(workspace_id, vote_score DESC, created_at DESC);
CREATE INDEX idx_discussions_new ON discussions(workspace_id, created_at DESC);
```

> [!IMPORTANT]
> Nếu V8 chưa chạy trên DB, có thể gộp luôn `vote_score` vào V8 thay vì tạo V9.

---

### B2. Feed API — Bài viết cross-workspace

#### [NEW] `communitychat/api/FeedController.java`
```
GET /api/v1/feed?sort=HOT|NEW|TOP&page=0&size=20
```
- Trả danh sách bài viết từ **tất cả workspace user đã join**
- Mỗi bài kèm: `workspaceName`, `isMember` (luôn true vì chỉ thấy workspace đã join)
- Sort theo thuật toán Reddit

#### [NEW] `communitychat/api/FeedPostResponse.java`
Mở rộng từ DiscussionResponse, thêm:
```java
record FeedPostResponse(
    // ...tất cả field của DiscussionResponse...
    String workspaceName,       // "Trí tuệ nhân tạo"
    String workspaceVisibility, // "PUBLIC"
    int voteScore,              // upvotes - downvotes
    String userVote             // "UPVOTE" | "DOWNVOTE" | null
)
```

#### [NEW] `communitychat/service/FeedService.java`
- Query discussions từ các workspace user là member
- Batch load workspace names + user votes
- Sort theo HOT/NEW/TOP

---

### B3. Nâng cấp Discussion API

#### [MODIFY] [DiscussionRepository.java](file:///d:/DoAnTotNghiep/unichat/core-api/src/main/java/com/unichat/core/communitychat/domain/DiscussionRepository.java)
Thêm query methods:
```java
// Feed: lấy bài từ nhiều workspace
Page<Discussion> findByWorkspaceIdInOrderByVoteScoreDescCreatedAtDesc(List<UUID> wsIds, Pageable p);
Page<Discussion> findByWorkspaceIdInOrderByCreatedAtDesc(List<UUID> wsIds, Pageable p);

// Workspace page: lấy bài 1 workspace
Page<Discussion> findByWorkspaceIdOrderByVoteScoreDescCreatedAtDesc(UUID wsId, Pageable p);
Page<Discussion> findByWorkspaceIdOrderByCreatedAtDesc(UUID wsId, Pageable p);
```

#### [MODIFY] [DiscussionResponse.java](file:///d:/DoAnTotNghiep/unichat/core-api/src/main/java/com/unichat/core/communitychat/api/DiscussionResponse.java)
Thêm: `voteScore`, `userVote`

#### [MODIFY] [ReplyResponse.java](file:///d:/DoAnTotNghiep/unichat/core-api/src/main/java/com/unichat/core/communitychat/api/ReplyResponse.java)
Thêm: `voteScore`, `userVote`

#### [MODIFY] [DiscussionController.java](file:///d:/DoAnTotNghiep/unichat/core-api/src/main/java/com/unichat/core/communitychat/api/DiscussionController.java)
- `listDiscussions()`: thêm `sort` param
- Thêm `GET /discussions/{id}` — chi tiết 1 bài + tăng view_count

#### [MODIFY] [DiscussionService.java](file:///d:/DoAnTotNghiep/unichat/core-api/src/main/java/com/unichat/core/communitychat/service/DiscussionService.java)
- `listDiscussions()`: chọn sort query (HOT/NEW/TOP)
- `listDiscussions()` + `getReplies()`: batch load `userVote` từ reactions table
- `getDiscussion()`: trả 1 bài + increment viewCount

---

### B4. Vote Score Tracking

#### [MODIFY] [Discussion.java](file:///d:/DoAnTotNghiep/unichat/core-api/src/main/java/com/unichat/core/communitychat/domain/Discussion.java)
Thêm field `voteScore` (int), getter/setter, `adjustVoteScore(int delta)`

#### [MODIFY] [DiscussionReply.java](file:///d:/DoAnTotNghiep/unichat/core-api/src/main/java/com/unichat/core/communitychat/domain/DiscussionReply.java)
Thêm field `voteScore` (int), getter/setter, `adjustVoteScore(int delta)`

#### [MODIFY] [ReactionService.java](file:///d:/DoAnTotNghiep/unichat/core-api/src/main/java/com/unichat/core/communitychat/service/ReactionService.java)
Khi toggle vote → cập nhật `vote_score`:
| Action | Delta |
|---|---|
| New UPVOTE | +1 |
| Remove UPVOTE | -1 |
| New DOWNVOTE | -1 |
| Remove DOWNVOTE | +1 |
| UPVOTE → DOWNVOTE | -2 |
| DOWNVOTE → UPVOTE | +2 |

Cần inject `DiscussionRepository` + `DiscussionReplyRepository` để update score.

---

### B5. Join Workspace API

#### [MODIFY] Workspace module
Cần endpoint để user tham gia workspace từ feed:
```
POST /api/v1/workspaces/{workspaceId}/join
```
- Kiểm tra workspace visibility = PUBLIC
- Tạo WorkspaceMember với role VIEWER, status ACTIVE
- Trả về success/already-member

> [!NOTE]
> Cần kiểm tra xem `WorkspaceMemberService` đã có method join chưa. Nếu có → tái sử dụng. Nếu chưa → tạo mới.

---

## Phase C: Frontend — Reddit UI

### C1. Trang Feed (trang chủ sau login)

#### [NEW] `features/feed/feed-page.tsx`
Trang chủ Reddit-style, hiển thị bài viết từ mọi workspace đã join.

Layout:
```
┌─ Sidebar ─┬─────────────── Main Content ──────────────────┐
│            │  [🔥 Hot] [🆕 New] [⬆️ Top]     [+ Tạo bài] │
│ 🏠 Feed    │                                               │
│ 📚 Spaces  │  ┌─ Post Card ──────────────────────────────┐ │
│ 👤 Account │  │  📘 Workspace Name                       │ │
│            │  │  ▲                                        │ │
│            │  │  42  [QUESTION] Tiêu đề bài viết         │ │
│            │  │  ▼   Nội dung tóm tắt 2 dòng...         │ │
│            │  │      👤 author • 2h • 💬 8 replies       │ │
│            │  └──────────────────────────────────────────┘ │
│            │  ┌─ Post Card ──────────────────────────────┐ │
│            │  │  ...                                      │ │
└────────────┴──────────────────────────────────────────────┘
```

#### [NEW] `features/feed/feed-page.css`
#### [NEW] `features/feed/feed-api.ts`

---

### C2. Trang Chi tiết bài viết

#### [NEW] `features/feed/post-detail-page.tsx`
```
┌─────────────────────────────────────────────────────────┐
│  ← Quay lại   📘 Trí tuệ nhân tạo                     │
│                                                         │
│  ▲  [QUESTION] Cách sử dụng RAG hiệu quả?             │
│  42  Nội dung đầy đủ bài viết...                       │
│  ▼   👤 nguyenvana • 2 giờ trước • 👁 156 views        │
│─────────────────────────────────────────────────────────│
│  8 Bình luận    [Sắp xếp: Tốt nhất ▼]                  │
│                                                         │
│  ▲ 12 ▼  tranb: Bạn nên dùng recursive chunking        │
│  │       ├── ▲ 5 ▼  nguyenvana: Cảm ơn!                │
│  │       └── ▲ 8 ▼  🤖 AI: Dựa trên tài liệu...       │
│  ▲  3 ▼  leC: Theo kinh nghiệm của tôi...              │
│                                                         │
│  [Viết bình luận... @AI để hỏi trợ lý]                 │
└─────────────────────────────────────────────────────────┘
```

#### [NEW] `features/feed/post-detail-page.css`

---

### C3. Component: Vote (tái sử dụng)

#### [NEW] `features/feed/components/vote-control.tsx`
```
  ▲         ← Click = UPVOTE (cam khi active)
  42        ← Score (đỏ nếu âm)
  ▼         ← Click = DOWNVOTE (xanh khi active)
```
- Hiển thị ở mọi post và comment
- Gọi `POST /api/v1/reactions` khi click
- Optimistic update (đổi màu ngay, rollback nếu API fail)

---

### C4. Component: Comment Tree (nested)

#### [NEW] `features/feed/components/comment-tree.tsx`
- Nhận flat list `ReplyResponse[]` → build tree từ `parentReplyId`
- Render recursive với indent + vertical line
- AI replies có style khác (icon 🤖, màu cyan)
- Mỗi comment có Vote control

---

### C5. Component: Create Post Modal

#### [MODIFY] `features/community/discussion-page.tsx` → Di chuyển modal ra component riêng
#### [NEW] `features/feed/components/create-post-modal.tsx`
- **Dropdown chọn workspace** (chỉ hiện workspace user đã join)
- Input title + textarea body
- Chọn flair: Câu hỏi / Thảo luận / Thông báo
- Submit → `POST /api/v1/workspaces/{wsId}/discussions`

---

### C6. Trang Workspace (giống Subreddit page)

#### [MODIFY] [workspace-overview-page.tsx](file:///d:/DoAnTotNghiep/unichat/frontend/src/features/workspaces/workspace-overview-page.tsx)
Redesign trang overview:

```
┌─ Sidebar ─┬─────────────── Main ───────┬── Info Panel ──┐
│            │  ┌─ Banner ──────────────┐ │ 📘 Workspace   │
│ 📊 Overview│  │ Trí tuệ nhân tạo     │ │ 👥 15 members  │
│ 📄 Docs    │  │ Mô tả workspace...   │ │ 📄 8 tài liệu  │
│ 💬 Chat AI │  └───────────────────────┘ │ 📅 Tạo 2/2026  │
│ 📜 History │                            │                │
│ ⚙ Settings │  [🔥 Hot] [🆕 New] [⬆ Top]│ [Tham gia] /   │
│            │                            │ [Đã tham gia]  │
│            │  ┌─ Post Card ──────────┐  │                │
│            │  │ ▲ 42 ▼ [Q] Title...  │  │                │
│            │  └──────────────────────┘  │                │
└────────────┴────────────────────────────┴────────────────┘
```

- Header: Banner + tên + mô tả + nút Tham gia
- Content: Feed bài viết CHỈ của workspace đó
- Panel phải (optional): thống kê workspace

---

## Phase D: Routing — Cấu trúc điều hướng mới

#### [MODIFY] [app-router.tsx](file:///d:/DoAnTotNghiep/unichat/frontend/src/app/app-router.tsx)

```
Authenticated routes (AppShell):
  /feed                    → FeedPage (HOME - trang chủ sau login)
  /feed/posts/:postId      → PostDetailPage
  /workspaces              → WorkspaceListPage (quản lý workspace)
  /account                 → AccountPage

Workspace routes (WorkspaceShell):
  /workspaces/:id          → WorkspaceOverviewPage (redesigned = subreddit)
  /workspaces/:id/documents → DocumentPage
  /workspaces/:id/chat      → ChatPage (RAG AI chat)
  /workspaces/:id/conversations → ConversationListPage
  /workspaces/:id/settings  → SettingsPage
  /workspaces/:id/evaluation → EvaluationPage
```

#### [MODIFY] [side-nav-bar.tsx](file:///d:/DoAnTotNghiep/unichat/frontend/src/components/side-nav-bar.tsx)

**Global nav (không trong workspace):**
```
🏠 Feed (trang chủ)          → /feed
📚 Knowledge Spaces           → /workspaces
👤 Tài khoản                  → /account
```

**Workspace nav (trong workspace):**
```
📊 Tổng quan (bài viết workspace) → /workspaces/:id
📄 Tài liệu                       → /workspaces/:id/documents
💬 Trò chuyện AI                  → /workspaces/:id/chat
📜 Lịch sử                        → /workspaces/:id/conversations
⚙ Cài đặt                         → /workspaces/:id/settings
```
- Xóa: "Chat cộng đồng", "Thảo luận" (đã gộp vào feed/overview)

#### [MODIFY] Login redirect
Sau login thành công → redirect đến `/feed` thay vì `/workspaces`

---

## Verification Plan

### Compile
```bash
# Backend
.\mvnw.cmd compile    # 0 errors

# Frontend  
npx tsc --noEmit      # 0 errors
```

### Manual Testing Flow
1. Login → thấy Feed page (không phải workspace list)
2. Feed hiện bài viết từ các workspace đã join
3. Chuyển tab Hot/New/Top → sắp xếp đúng
4. Click ▲/▼ → score thay đổi, mũi tên đổi màu
5. Click bài → trang chi tiết + comment tree lồng nhau
6. Click tên workspace trên bài → vào trang workspace
7. Workspace page hiện feed bài viết + sidebar chức năng
8. Nút [+ Tạo bài] → modal chọn workspace + viết bài
9. Viết comment với @AI → AI tự reply

---

## Open Questions

> [!IMPORTANT]
> **V8 migration đã chạy trên database chưa?**
> - Chưa → gộp `vote_score` vào V8, không cần V9
> - Rồi → tạo V9 riêng

> [!IMPORTANT]
> **Giữ Notification bell?**
> Khuyến nghị: giữ — hiện thông báo khi có reply mới, không liên quan chat.

> [!NOTE]
> **Bài viết từ workspace chưa join?**
> Feed chỉ hiện bài từ workspace đã join (giống Reddit home feed chỉ hiện subreddit đã subscribe). Người dùng khám phá workspace mới qua trang `/workspaces` (giống Reddit's r/all hoặc browse communities).
