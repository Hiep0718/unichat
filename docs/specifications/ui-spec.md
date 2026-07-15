# UI route, wireframe và state specification — UniChat

## Metadata

| Thuộc tính | Giá trị |
|---|---|
| Phase | design-architecture |
| Task | TASK-008 |
| Version | 1.0 |
| Trạng thái | Approved — source of truth; implementation remains work-item gated |
| Owner | Hoàng Phi Hùng |

## 1. Design system

- Ngôn ngữ mặc định: tiếng Việt đầy đủ dấu.
- Font: Be Vietnam Pro self-hosted.
- Màu: navy cho cấu trúc, teal cho hành động chính, blue cho liên kết; error không chỉ dựa vào màu.
- Responsive: mobile 360px+, tablet 768px+, desktop 1280px+.
- WCAG 2.1 AA: keyboard, focus rõ, label/description, contrast, skip link và live region.
- Answer Markdown không render raw HTML; code/table/link có overflow và protocol an toàn.

## 2. Route map

| Route | Guard | Trang |
|---|---|---|
| /login | Guest | Đăng nhập |
| /register | Guest | Đăng ký |
| /workspaces | Authenticated | Danh sách Knowledge Space |
| /workspaces/:workspaceId | Workspace READ | Tổng quan |
| /workspaces/:workspaceId/documents | Workspace READ | Tài liệu |
| /workspaces/:workspaceId/chat | Workspace ASK | Hỏi đáp mới |
| /workspaces/:workspaceId/conversations/:conversationId | Chủ conversation + READ | Lịch sử hỏi đáp |
| /workspaces/:workspaceId/settings | OWNER/EDITOR theo tab | Cài đặt |
| /workspaces/:workspaceId/evaluation | OWNER/EDITOR | Đánh giá |
| /admin/users | ADMIN | Quản trị người dùng |
| /admin/metrics | ADMIN | Metric hệ thống |
| /forbidden | Authenticated | Thiếu quyền |
| * | Public | Không tìm thấy |

Guard tải session trước route; tải membership trước nội dung Workspace. Không flash nội dung bị cấm trong lúc loading.

## 3. App shell desktop

~~~text
┌──────────────────────────────────────────────────────────────────┐
│ Logo | Workspace switcher              Search | User menu        │
├───────────────┬──────────────────────────────────────────────────┤
│ Tổng quan     │ Breadcrumb + Page title + Primary action         │
│ Tài liệu      ├──────────────────────────────────────────────────┤
│ Hỏi đáp       │                                                  │
│ Lịch sử       │ Main content                                     │
│ Đánh giá*     │ loading / empty / content / error                │
│ Cài đặt*      │                                                  │
├───────────────┴──────────────────────────────────────────────────┤
│ Status/connection                    requestId khi có lỗi         │
└──────────────────────────────────────────────────────────────────┘
~~~

Dấu * chỉ hiển thị khi role cho phép. Mobile dùng top bar + drawer; primary action luôn có label, không chỉ icon.

## 4. Workspace list

~~~text
[Knowledge Space của bạn]                         [+ Tạo Workspace]
[Search 300ms] [Visibility filter]
┌─────────────────────┐  ┌─────────────────────┐
│ Tên + visibility    │  │ Tên + visibility    │
│ Vai trò | tài liệu  │  │ Vai trò | tài liệu  │
│ Cập nhật gần nhất   │  │ Cập nhật gần nhất   │
└─────────────────────┘  └─────────────────────┘
[Load more]
~~~

States: skeleton; empty có CTA tạo; no-search-result; partial error có retry; cursor load-more; quota warning.

## 5. Documents

~~~text
[Tài liệu]                    [Quota] [Tải tài liệu lên]
[Dropzone PDF/DOCX/TXT, tối đa 20 MiB]
Tên tệp | Loại | Kích thước | Trạng thái | Cập nhật | Hành động
----------------------------------------------------------------
...     | PDF  | 2 MiB      | Đang xử lý | ...      | Xem
...     | DOCX | 1 MiB      | Thất bại   | ...      | Thử lại/Xóa
~~~

Upload states: validating, uploading progress, accepted/PENDING, PROCESSING, PROCESSED, FAILED và rejected. Delete cần confirm bằng tên file, disable double submit và hiển thị DELETING đến khi saga hoàn tất.

## 6. Chat và citation

~~~text
┌───────────────────────────────────┬──────────────────────────────┐
│ Conversation                     │ Nguồn trích dẫn              │
│ User question                    │ [1] file.pdf — Trang 12      │
│ Assistant answer [1][2]          │ excerpt + relevance score    │
│ Intent | decision | strategy     │ [Mở metadata nguồn]          │
│ refusal/clarify state            │                              │
├───────────────────────────────────┴──────────────────────────────┤
│ [Nhập câu hỏi 3–2.000 ký tự]                    [Gửi]            │
└──────────────────────────────────────────────────────────────────┘
~~~

States: no documents; documents processing; ready; submitting; delayed/idempotent retry; ANSWER; CLARIFY; REFUSE; provider unavailable; permission changed; citation redacted after deletion.

Screen reader nhận thông báo khi answer hoàn tất. Citation focus được đưa tới panel và quay lại claim bằng keyboard.

## 7. Workspace settings

Tabs:

- General: name, description; OWNER/EDITOR theo matrix.
- Access: visibility, member list, role update; OWNER only.
- AI & privacy: cloudAllowed và provider disclosure; OWNER only.
- Danger zone: delete Workspace; OWNER only.

Form dùng dirty state, field error, optimistic version conflict và safe retry. Không optimistic-update permission/visibility.

## 8. Evaluation

- Dataset version và corpus snapshot.
- Chọn BASELINE hoặc ADAPTIVE; hiển thị config hash.
- Run status queued/running/completed/failed/cancelled.
- Kết quả tổng và theo intent: source hit@K, citation accuracy, refusal F1, groundedness, latency.
- Không cho sửa holdout từ UI P0.

## 9. Admin

- Users: pagination, search 300ms, status filter, lock/unlock confirm.
- Metrics: số user, Workspace, document, question, ingestion status; không có nội dung tài liệu.
- USER gọi route admin được chuyển /forbidden sau response 403; UI guard không thay thế API guard.

## 10. Error mapping

| API code | UI |
|---|---|
| VALIDATION_ERROR | Field error + summary |
| UNAUTHENTICATED | Thử refresh một lần; thất bại về login |
| FORBIDDEN | Trang thiếu quyền, không retry tự động |
| NOT_FOUND | 404 không tiết lộ tài nguyên |
| CONFLICT | Báo dữ liệu đã đổi, tải lại |
| RATE_LIMITED | Countdown theo Retry-After |
| FILE_REJECTED | Lý do cụ thể, không tạo hàng giả |
| EVIDENCE_INSUFFICIENT | Refusal/clarify card, không error toast |
| PROVIDER_UNAVAILABLE | Lỗi thân thiện + retry cùng idempotency key |
| INTERNAL_ERROR | Thông báo an toàn + requestId |

## 11. E2E critical flows

Login; create Workspace; upload/process document; ask/see citation; refusal; reload history; share/role enforcement; delete document; admin lock/unlock; evaluation run summary; keyboard-only navigation.
