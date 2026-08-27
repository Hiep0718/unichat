# 📊 Báo cáo trạng thái: Community Chat & Discussion (Phase 2)

**Branch:** `feature/community-chat`  
**Ngày kiểm tra:** 2026-08-20

---

## ✅ Đã hoàn thành (Code đã viết & compile thành công)

### 1. Database — Migration `V8__community_chat.sql`
| Bảng | Mục đích |
|---|---|
| `community_channels` | Kênh chat trong workspace |
| `community_messages` | Tin nhắn cộng đồng (USER/AI) |
| `community_ai_responses` | Liên kết AI response ↔ RAG trace |
| `discussions` | Chủ đề thảo luận (Question/Discussion/Announcement) |
| `discussion_replies` | Bình luận trong discussion |
| `reactions` | Upvote/Downvote/Helpful (polymorphic) |
| `notifications` | Thông báo cho người dùng |

> [!NOTE]
> Migration V7.1 (Community Foundation) đã chạy ở Phase 1. V8 **chưa được chạy** trên DB (chỉ mới có file).

---

### 2. Backend — Java (39 files mới)

#### Config (2 files)
- [WebSocketConfig.java](file:///d:/DoAnTotNghiep/unichat/core-api/src/main/java/com/unichat/core/communitychat/config/WebSocketConfig.java) — STOMP endpoint `/ws/community`, broker `/topic`, `/queue`
- [RedisConfig.java](file:///d:/DoAnTotNghiep/unichat/core-api/src/main/java/com/unichat/core/communitychat/config/RedisConfig.java) — RedisTemplate cho presence tracking

#### Domain / Entities (14 files)
- `CommunityChannel`, `CommunityMessage`, `Discussion`, `DiscussionReply`, `Reaction`, `Notification` + Repositories + Enums

#### API / Controllers (15 files)
- `CommunityChannelController` — GET `/api/v1/workspaces/{id}/channels`
- `CommunityMessageController` — GET messages with pagination
- `CommunityChatMessagingController` — STOMP `@MessageMapping("/workspaces/{id}/chat")`
- `DiscussionController` — CRUD discussions + replies
- `ReactionController` — POST toggle reactions
- `NotificationController` — GET/POST notifications + mark read

#### Service (6 files)
- `CommunityChatService` — Channel listing, message history
- `CommunityMessagingService` — Xử lý tin nhắn STOMP, detect `@AI`, gọi RAG, broadcast
- `DiscussionService` — CRUD + AI auto-reply via `CompletableFuture`
- `ReactionService` — Toggle logic
- `NotificationService` — CRUD + mark all read
- `NotificationEventListener` — `@Async @EventListener` push real-time khi có reply mới

---

### 3. Frontend — React/TypeScript (7 files mới)

| File | Chức năng |
|---|---|
| `community-api.ts` | REST client + STOMP WebSocket client (connect, subscribe, send) |
| `community-chat-page.tsx` + `.css` | Giao diện chat real-time, @AI highlight, typing indicator |
| `discussion-page.tsx` + `.css` | List + Detail + Modal tạo mới + Reply form |
| `notification-bell.tsx` + `.css` | Chuông thông báo trên sidebar, badge, dropdown |

#### Routing & Navigation ✅
- 2 route mới đã đăng ký trong `app-router.tsx`: `/community-chat`, `/discussions`
- 2 nav item mới đã thêm vào `side-nav-bar.tsx`: "Chat cộng đồng", "Thảo luận"
- `NotificationBell` đã được tích hợp vào sidebar footer

---

## ⚠️ Chưa hoàn thành — Cần làm để chạy được

### Mức độ: 🔴 CRITICAL (Không chạy được nếu thiếu)

#### 1. Security: Mở endpoint WebSocket cho trình duyệt kết nối
[SecurityConfiguration.java](file:///d:/DoAnTotNghiep/unichat/core-api/src/main/java/com/unichat/core/shared/config/SecurityConfiguration.java) hiện chỉ cho phép:
```
/api/v1/health, /actuator/health, /api/v1/auth/**
```
**Cần thêm:**
```java
.requestMatchers("/ws/**").permitAll()  // SockJS handshake
```

#### 2. Vite Proxy: Chưa forward WebSocket tới backend
[vite.config.ts](file:///d:/DoAnTotNghiep/unichat/frontend/vite.config.ts) chỉ proxy `/api`. **Cần thêm:**
```typescript
'/ws': {
  target: 'http://127.0.0.1:8082',
  changeOrigin: true,
  ws: true,  // Enable WebSocket proxying
},
```

#### 3. V8 Migration chưa chạy trên database
File `V8__community_chat.sql` đã có nhưng chưa được Flyway thực thi. Cần khởi động Core API 1 lần để Flyway chạy migration.

#### 4. Redis chưa chắc đang chạy
Cần kiểm tra Docker container `unichat-redis` có đang chạy không.

---

### Mức độ: 🟡 IMPORTANT (Chức năng chưa đầy đủ)

#### 5. Chưa có Unit Tests cho community module
Theo rule AGENTS.md: *"Untested code is unfinished. Core business logic requires at least 80% unit coverage."*

Cần test cho:
- `CommunityChatService`
- `CommunityMessagingService` (đặc biệt logic `@AI` detection)
- `DiscussionService`
- `ReactionService`
- `NotificationService`

#### 6. WebSocket Authentication chưa xử lý
`CommunityChatMessagingController` nhận `Principal` nhưng STOMP handshake chưa có interceptor xác thực JWT. Người dùng chưa đăng nhập vẫn có thể kết nối.

**Cần tạo:** `WebSocketAuthInterceptor` để verify JWT khi handshake.

#### 7. Frontend community-api.ts — WebSocket URL hardcoded
```typescript
const socketUrl = '/api/v1/ws/community';
```
Nhưng backend đăng ký endpoint là `/ws/community` (không có `/api/v1` prefix). Cần sửa thành `/ws/community`.

---

### Mức độ: 🟢 NICE-TO-HAVE (Cải thiện chất lượng)

#### 8. Redis presence tracking chưa implement
`RedisConfig` đã cấu hình nhưng chưa có service nào dùng Redis để track online users.

#### 9. Chưa có notification cho Document Approved/Rejected
`NotificationEventListener` chỉ handle `NewReplyEvent`. Chưa có event cho document moderation flow.

#### 10. Reaction count chưa hiển thị trên Frontend
Backend có `ReactionController` nhưng frontend chưa gọi API này, chưa hiển thị nút vote/reaction.

#### 11. Chưa có Playwright E2E test cho community flow

---

## 📋 Checklist hành động (theo thứ tự ưu tiên)

| # | Việc cần làm | Độ khó | Ưu tiên |
|---|---|---|---|
| 1 | Sửa `SecurityConfiguration` mở `/ws/**` | Dễ | 🔴 |
| 2 | Sửa `vite.config.ts` proxy WebSocket | Dễ | 🔴 |
| 3 | Sửa WebSocket URL trong `community-api.ts` | Dễ | 🔴 |
| 4 | Kiểm tra Redis + chạy V8 migration | Dễ | 🔴 |
| 5 | Tạo `WebSocketAuthInterceptor` (JWT handshake) | Trung bình | 🟡 |
| 6 | Viết unit tests cho 5 service classes | Trung bình | 🟡 |
| 7 | Implement Redis presence tracking | Trung bình | 🟢 |
| 8 | Thêm Reaction UI trên frontend | Trung bình | 🟢 |
| 9 | Thêm notification events cho document moderation | Trung bình | 🟢 |
| 10 | E2E tests | Khó | 🟢 |

---

## Kết luận

> **Tiến độ tổng thể: ~75% hoàn thành**  
> Code đã viết đầy đủ cho cả backend lẫn frontend, nhưng **chưa thể chạy thực tế** do thiếu 4 bước cấu hình critical (Security, Proxy, URL, Migration). Sau khi sửa 4 điểm đó, chức năng cơ bản sẽ hoạt động. Phần test và polish cần thêm effort.
