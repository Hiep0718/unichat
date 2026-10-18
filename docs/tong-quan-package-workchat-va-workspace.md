# Tổng quan package `workchat` và `workspace` — dành cho người mới

Tài liệu này là **danh mục tra cứu từng class** của hai package trong `core-api`:
`com.unichat.core.workchat` (nhắn tin nội bộ) và `com.unichat.core.workspace`
(Knowledge Space). Mỗi class được nói rõ: nó làm gì, chứa gì, và **vì sao** nó
được thiết kế như vậy.

Giả định bạn biết lập trình cơ bản nhưng chưa quen Spring Boot. Mọi khái niệm lạ
đều được giải thích ở [Phần 0](#phần-0--hiểu-quy-ước-3-tầng-trước-đã).

Tài liệu liên quan:

- [`doc-code-cho-nguoi-moi.md`](doc-code-cho-nguoi-moi.md) — đi theo **một request
  duy nhất** từ đầu đến cuối, trích từng dòng code. Đọc trước nếu bạn muốn hiểu
  *cách một request chạy*; đọc tài liệu này nếu bạn muốn *bản đồ toàn bộ hai package*.
- [`luong-hoat-dong-chat-va-workspace.md`](luong-hoat-dong-chat-va-workspace.md) —
  nghiệp vụ, không phải code.
- [`kien-truc-va-luong-hoat-dong.md`](kien-truc-va-luong-hoat-dong.md) — kiến trúc
  toàn hệ thống.

---

## Mục lục

- [Phần 0 — Hiểu quy ước 3 tầng trước đã](#phần-0--hiểu-quy-ước-3-tầng-trước-đã)
- [Phần 1 — Package `workchat`: Nhắn tin nội bộ](#phần-1--package-workchat-nhắn-tin-nội-bộ)
  - [1.1 `workchat/domain/` — Dữ liệu](#11--workchatdomain--dữ-liệu)
  - [1.2 `workchat/service/` — Logic nghiệp vụ](#12--workchatservice--logic-nghiệp-vụ)
  - [1.3 `workchat/ws/` — Thời gian thực (WebSocket)](#13--workchatws--thời-gian-thực-websocket)
  - [1.4 `workchat/api/` — Cửa HTTP](#14--workchatapi--cửa-http)
- [Phần 2 — Package `workspace`: Knowledge Space](#phần-2--package-workspace-knowledge-space)
  - [2.1 `workspace/domain/`](#21--workspacedomain)
  - [2.2 `workspace/service/`](#22--workspaceservice)
  - [2.3 `workspace/api/`](#23--workspaceapi)
- [Phần 3 — Xâu chuỗi lại: một tin nhắn đi như thế nào](#phần-3--xâu-chuỗi-lại-một-tin-nhắn-đi-như-thế-nào)
- [Phần 4 — Những bài học thiết kế](#phần-4--những-bài-học-thiết-kế)

---

## Phần 0 — Hiểu quy ước 3 tầng trước đã

Mỗi feature trong `core-api` đều chia làm 3 thư mục. Hiểu được 3 cái này là đọc
được mọi package:

| Thư mục | Vai trò | Ví dụ dễ hình dung |
|---|---|---|
| `api/` | **Cửa tiếp khách.** Nhận HTTP request, kiểm tra dữ liệu gửi lên có hợp lệ không, gọi service, trả JSON về. Không chứa logic nghiệp vụ. | Lễ tân nhận đơn |
| `service/` | **Bộ não.** Chứa toàn bộ quy tắc nghiệp vụ: ai được làm gì, tính toán, phối hợp nhiều repository, mở transaction. | Nhân viên xử lý đơn |
| `domain/` | **Kho và bản thiết kế dữ liệu.** Gồm `@Entity` (ánh xạ 1 class ↔ 1 bảng DB), `enum`, và `Repository` (interface truy vấn DB). | Kho hàng và sổ sách |

Vài khái niệm Java/Spring xuất hiện liên tục:

- **`record`** — class chỉ để chứa dữ liệu, bất biến, Java tự sinh constructor và
  getter. Dự án dùng nó cho mọi DTO (Request/Response).
- **DTO** (Data Transfer Object) — object chỉ để truyền qua mạng. Khác Entity:
  Entity là hình dạng **trong DB**, DTO là hình dạng **gửi cho client**. Tách ra
  để không lỡ tay lộ trường nhạy cảm.
- **`@Service` / `@Component` / `@RestController`** — đánh dấu để Spring tự tạo
  đối tượng và "tiêm" (inject) vào constructor của class khác. Bạn không bao giờ
  thấy `new SomeService(...)` trong code nghiệp vụ.
- **`@Transactional`** — gói các lệnh DB vào một giao dịch: hoặc thành công hết,
  hoặc hỏng thì rollback hết. `readOnly = true` nghĩa là chỉ đọc.
- **`Repository`** — bạn chỉ **khai báo tên method**, Spring Data JPA tự viết SQL.
  Ví dụ `findByMessageIdOrderByCreatedAtAsc` tự thành
  `SELECT ... WHERE message_id = ? ORDER BY created_at ASC`. Khi tên method không
  đủ diễn đạt thì viết `@Query` thủ công.
- **`UUID`** — khóa chính kiểu chuỗi 128-bit thay cho số tự tăng. Dự án dùng
  `UuidGenerator.generateV7()` — UUID v7 có chứa timestamp nên sắp xếp theo id gần
  như sắp xếp theo thời gian, index DB không bị phân mảnh.

---

## Phần 1 — Package `workchat`: Nhắn tin nội bộ

Đây là tính năng chat 1-1 và chat nhóm (giống Messenger thu nhỏ), **không liên
quan** đến AI chat với tài liệu.

> **Luật xương sống của cả package:** bạn chỉ được nhắn tin cho người **cùng
> chung ít nhất một Workspace**. Đây là lý do package này phụ thuộc vào package
> `workspace`.

### 1.1 — `workchat/domain/` — Dữ liệu

#### Các Entity (bảng DB)

**`DirectConversation.java`** — một cuộc trò chuyện. Đây là class quan trọng
nhất, và có một điểm dễ gây nhầm:

> Tên class có chữ "Direct" nhưng nó đại diện cho **cả chat 1-1 lẫn chat nhóm**.
> Lý do lịch sử: migration V22 chỉ làm chat 1-1, đến V31 mở rộng thành nhóm nhưng
> không đổi tên bảng (đổi tên bảng trên DB đang chạy là rủi ro). Được ghi lại
> trong ADR-023.

Các cột:

- `kind` — `DIRECT` (2 người) hoặc `GROUP` (nhiều người).
- `participantLow` / `participantHigh` — hai người của chat 1-1, **luôn sắp xếp
  theo thứ tự UUID**. Mẹo này rất hay: dù A mở chat với B hay B mở với A, cặp lưu
  xuống vẫn giống nhau, nên không bao giờ tạo ra 2 cuộc trò chuyện trùng. Null
  với nhóm.
- `title` — tên nhóm. Null với chat 1-1 (vì tên hiển thị chính là tên người kia).
- `lastMessageAt` — thời điểm tin nhắn cuối. Lưu ngay tại đây (dữ liệu "thừa") để
  sắp xếp danh sách hội thoại mà không cần JOIN sang bảng messages.
- `avatarStorageKey` — ảnh nhóm.

Điểm đáng học: constructor là `private`, chỉ tạo được qua 2 **factory method**
tĩnh `between(...)` (chat 1-1) và `group(...)` (nhóm). Nhờ vậy không ai tạo được
object sai hình dạng — ví dụ nhóm mà lại có `participantLow`. Các method
`rename()`, `otherThan()`, `replaceAvatar()` đều tự kiểm tra và ném exception nếu
gọi sai kiểu: logic bảo vệ nằm **trong** entity chứ không rải ra ngoài.

**`DirectMessage.java`** — một tin nhắn: `id`, `conversationId`, `senderId`,
`body`, `createdAt`. `body` **có thể null** khi tin nhắn chỉ có file. Không có cột
"đã đọc" — xem giải thích ngay dưới.

**`ConversationParticipant.java`** — một người trong một cuộc trò chuyện. Tồn tại
cho **cả** chat 1-1 (2 dòng) lẫn nhóm (N dòng), để code kiểm tra quyền chỉ cần
viết một lần.

- `role` — `OWNER` / `MEMBER`.
- `lastReadAt` — **watermark**, mốc "đã đọc tới đây". Thay vì đánh dấu từng tin
  nhắn đã đọc bởi từng người (nhóm 20 người nhân 1000 tin = 20.000 dòng), chỉ lưu
  1 mốc thời gian mỗi người. Số tin chưa đọc = đếm tin có
  `created_at > last_read_at`.
- `readUpTo()` chỉ đẩy mốc **tiến lên**, không lùi — cuộn lên xem tin cũ không làm
  "chưa đọc" lại.

**`ChatAttachment.java`** — file gửi kèm tin nhắn. Thuộc về **message**, không
thuộc về conversation, để text và file là một thể thống nhất. `storageKey` (vị
trí file thật) **không bao giờ** trả cho client.

#### Các Enum

| Enum | Giá trị | Ý nghĩa |
|---|---|---|
| `ConversationKind` | `DIRECT`, `GROUP` | Loại hội thoại |
| `ParticipantRole` | `OWNER`, `MEMBER` | OWNER mới được đổi tên nhóm, thêm hoặc xóa thành viên |
| `ChatAttachmentKind` | `IMAGE`, `FILE` | IMAGE hiển thị inline, FILE là nút tải về. **Cố ý không đặt tên `DOCUMENT`** — để nhắc rằng file chat không bao giờ vào thư viện tài liệu và AI không bao giờ đọc nó |

#### Các Repository

- **`DirectConversationRepository`** — `findByParticipantLowAndParticipantHigh`
  (tìm chat 1-1 của một cặp), `findForParticipant` (danh sách hội thoại của tôi,
  sắp theo `COALESCE(lastMessageAt, createdAt) DESC` — hội thoại mới mở chưa có
  tin nhắn vẫn nằm trên, không rơi xuống đáy).
- **`DirectMessageRepository`** — ngoài phân trang tin nhắn còn có 2 query gom
  nhóm quan trọng:
  - `countUnreadByConversation` — đếm tin chưa đọc cho **cả trang** hội thoại bằng
    **1 câu SQL native** (phải native vì phải JOIN bảng participant để lấy
    watermark). Loại trừ tin của chính mình.
  - `findLatestPerConversation` — lấy tin mới nhất của mỗi hội thoại để hiển thị
    dòng preview.

  > Cả hai sinh ra để tránh **vấn đề N+1**: nếu load 20 hội thoại rồi mỗi cái
  > query riêng thì thành 40 lượt đi DB. Đây là bài học hiệu năng quan trọng nhất
  > trong package này.

- **`ConversationParticipantRepository`** — tìm membership (cơ sở của mọi kiểm tra
  quyền), liệt kê thành viên, đếm thành viên.
- **`ChatAttachmentRepository`** — `findByIdAndMessageId` khớp **cả hai** id, để
  không ai dùng id file của hội thoại khác tuồn qua hội thoại mình có quyền.

#### Hai "Event" (sự kiện nội bộ)

**`DirectMessageSentEvent`** và **`ConversationListChangedEvent`** là record mang
dữ liệu, được service "phát" ra sau khi lưu DB xong, và tầng WebSocket "nghe" rồi
đẩy xuống browser.

Tại sao cần trung gian? Để `DirectMessageService` **không biết gì về WebSocket**.
Nhờ vậy viết unit test cho nó mà không cần dựng broker, và nếu WebSocket chết thì
tin nhắn vẫn lưu được. Đây là nguyên tắc **tách biệt mối quan tâm**.

Điểm tinh tế: event mang theo **danh sách người nhận**, không phải
`conversationId`. Nhờ vậy bộ phát sóng không bao giờ phải tự quyết định ai được
xem — quyền đã chốt ở tầng service.

### 1.2 — `workchat/service/` — Logic nghiệp vụ

Bảy class, mỗi class một trách nhiệm rõ ràng (nguyên tắc **Single Responsibility**
trong SOLID).

**`ContactDirectory.java`** (102 dòng) — *"Tôi được nhắn tin cho ai?"*

- `canMessage(A, B)` — lấy danh sách workspace ACTIVE của A và của B, có giao nhau
  thì trả `true`.
- `listContacts(callerId)` — trả về danh bạ, mỗi người kèm tên **một** nhóm chung
  (để phân biệt hai người trùng tên).
- Loại trừ tài khoản AI assistant (`00000000-0000-0000-0000-0000000000a1`) — nó
  không phải người.
- Tách riêng để luật "ai nhắn được cho ai" chỉ có **một chỗ duy nhất**.

**`ConversationAccess.java`** (122 dòng) — *"Tôi được xem hội thoại này không?"*

- `requireParticipant(callerId, conversationId)` — nạp hội thoại và xác nhận có
  dòng participant. Nếu không thì ném `NotFoundError`.

  > Để ý: không có quyền cũng trả **404 "không tồn tại"** chứ không phải 403. Trả
  > 403 vô tình xác nhận "hội thoại này có thật" cho kẻ đang dò id.

- `requireGroupOwner(...)` — dùng cho các thao tác quản trị nhóm.
- `recipientsOf(conversationId, senderId)` — mọi người trừ người gửi (client người
  gửi đã có tin rồi, đẩy lại sẽ nhân đôi bong bóng chat).

**`ConversationSummaryAssembler.java`** (166 dòng) — *"Dựng danh sách hội thoại."*

Một dòng trong danh sách cần 4 thứ nằm ở 4 nơi: tin mới nhất, số chưa đọc, danh
sách thành viên, tên từng người. Class này gom **mỗi thứ 1 query cho cả trang**
rồi ghép lại trong bộ nhớ. Thêm hàm `preview()` cắt tin nhắn còn 120 ký tự, và trả
`"Đã gửi tệp đính kèm"` khi tin nhắn không có text.

**`DirectMessageService.java`** (253 dòng) — *Gửi và đọc tin nhắn.* Trái tim của
package.

- `openWith(A, B)` — mở chat với ai đó. Chặn tự nhắn mình, kiểm tra `canMessage`,
  tìm hội thoại cũ, **không có thì tạo mới** (`orElseGet`); gọi bao nhiêu lần cũng
  ra cùng một hội thoại.
- `send(...)` — kiểm tra quyền, kiểm tra có text hoặc file, **validate file trước
  khi ghi tin nhắn** (để file bị từ chối không để lại bong bóng rỗng), lưu
  message, lưu file, cập nhật `lastMessageAt`, rồi **phát event**.
- `markRead(...)` — đẩy watermark lên hiện tại.

**`GroupConversationService.java`** (244 dòng) — *Quản trị nhóm.*

- `create` — loại trùng và loại chính mình khỏi danh sách member, kiểm tra từng
  người có phải contact không, giới hạn 50 người, tạo conversation và participant
  rows (người tạo là OWNER).
- `addMember` — phải là OWNER, và người được thêm phải là contact của OWNER.
  **Nếu không, nhóm sẽ thành đường vòng lách luật "người lạ không nhắn được cho
  bạn".**
- `removeMember` — OWNER không được tự xóa mình (phải dùng chức năng rời nhóm).
- `leave` — nếu OWNER rời thì **trao quyền cho người vào nhóm sớm nhất**, để nhóm
  không bao giờ rơi vào cảnh không ai quản trị được.

**`ChatAttachmentService.java`** (218 dòng) — *File trong chat.*

- Giới hạn: tối đa 5 file mỗi tin nhắn, tổng 20 MiB.
- Allowlist định dạng: ảnh PNG/JPEG/WebP/GIF, tài liệu PDF/DOCX/TXT. **Cấm SVG và
  HTML** vì hai loại này chạy được JavaScript khi hiển thị inline.
- `read()` kiểm tra **cả 3 mắt xích**: caller ở trong hội thoại, message thuộc
  hội thoại đó, attachment thuộc message đó.
- Hàm `sanitize()` thay ký tự `\ / \r \n` trong tên file — chống path traversal và
  header injection.

**`GroupAvatarService.java`** (135 dòng) — *Ảnh nhóm.* Chỉ OWNER đổi được, mọi
thành viên xem được. Ảnh cũ được xóa trong `deleteQuietly()`: nếu xóa lỗi thì chỉ
ghi log warning, **không** làm hỏng thao tác upload vừa thành công.

### 1.3 — `workchat/ws/` — Thời gian thực (WebSocket)

HTTP là "hỏi và đáp": client phải hỏi mới có dữ liệu. Muốn tin nhắn tự hiện lên
cần **WebSocket**, một kết nối mở liên tục hai chiều. **STOMP** là giao thức chạy
trên WebSocket, định nghĩa kiểu "gửi tới địa chỉ nào, đăng ký nhận ở địa chỉ nào".

**`WebSocketConfig.java`** — cấu hình: endpoint `/ws/work-chat`, chỉ cho phép
origin của frontend (allowlist, không dùng `*`), broker in-memory với prefix
`/queue`, `/user`, `/app`.

> Hạn chế được ghi nhận thẳng thắn trong JavaDoc: broker nằm trong RAM của 1
> process, nên nếu chạy 2 instance thì mỗi cái chỉ thấy client của riêng nó.

**`StompAuthChannelInterceptor.java`** — xác thực. WebSocket handshake của browser
**không gửi được header `Authorization`**, nên token được gửi trong frame CONNECT.
Class này chặn frame đó, giải mã JWT, và đặt `Principal` **tên bằng userId**.

> Đây là mấu chốt bảo mật: Spring định tuyến địa chỉ `/user/**` theo tên
> principal, nên mỗi người **chỉ nhận được hàng đợi của chính mình**, không cách
> nào nghe trộm của người khác.

**`WorkChatBroadcaster.java`** — người phát sóng. Dùng
`@TransactionalEventListener(phase = AFTER_COMMIT)`: **chỉ đẩy sau khi transaction
đã commit**. Nếu đẩy trước mà transaction rollback, người nhận sẽ thấy một tin
nhắn không tồn tại và không gì gỡ xuống được.

Nó gửi riêng cho **từng người** thay vì dùng topic chung theo `conversationId`. Lý
do viết rõ trong JavaDoc: interceptor chỉ xác thực lúc kết nối chứ **không kiểm
tra lúc subscribe**, nên một topic đặt tên bằng `conversationId` thì bất kỳ ai
đăng nhập cũng subscribe được.

**`PresenceTracker.java`** — chấm xanh "đang online". Dùng
`ConcurrentHashMap<UUID, Integer>` **đếm số session** chứ không phải cờ
true/false, nên người mở app trên 2 tab rồi đóng 1 tab thì vẫn online. Dữ liệu nằm
trong RAM: mất khi restart, nhưng presence vốn là thứ "dùng xong vứt".

### 1.4 — `workchat/api/` — Cửa HTTP

**DTO Request** (có annotation validation của Jakarta, thông báo lỗi tiếng Việt):

| Class | Nội dung | Ràng buộc |
|---|---|---|
| `SendMessageRequest` | `body` | không rỗng, tối đa 4000 ký tự |
| `CreateGroupRequest` | `title`, `memberIds` | title tối đa 120 ký tự; ít nhất 1 member, tối đa 49 (49 cộng bạn là 50) |
| `RenameGroupRequest` | `title` | không rỗng, tối đa 120 |
| `AddMemberRequest` | `userId` | không null |

**DTO Response:**

| Class | Nội dung | Chi tiết đáng chú ý |
|---|---|---|
| `MessageResponse` | id, sender, body, `mine`, attachments | `mine` được tính sẵn ở server để UI không phải so id |
| `ConversationSummary` | id, kind, title, participants, lastMessage, unreadCount, hasAvatar | `title` điền cho **cả hai loại** (tên nhóm hoặc tên người kia) nên UI vẽ mọi dòng giống nhau |
| `ParticipantSummary` | userId, name, role, `me` | |
| `ContactSummary` | userId, name, sharedGroup | |
| `ChatAttachmentResponse` | id, kind, tên, mediaType, byteSize | **Cố ý không có `storageKey`** |

**`WorkChatController.java`** (178 dòng) — nói chuyện:

```text
GET  /presence                         → ai trong danh bạ đang online
GET  /contacts                         → danh bạ
GET  /conversations                    → danh sách hội thoại
POST /conversations/with/{userId}      → mở chat với ai đó
GET  /conversations/{id}/messages      → tin nhắn (phân trang)
POST /conversations/{id}/messages      → gửi (JSON)
POST /conversations/{id}/messages      → gửi kèm file (multipart)
GET  .../attachments/{id}/content      → tải file
POST /conversations/{id}/read          → đánh dấu đã đọc
```

Endpoint tải file set `X-Content-Type-Options: nosniff` và
`Content-Disposition: attachment` cho mọi thứ không phải ảnh trong allowlist, để
file khai man định dạng không chạy được script trong origin của API.

**`GroupChatController.java`** (153 dòng) — quản trị nhóm: tạo, đổi tên, ảnh nhóm,
danh sách thành viên, thêm và xóa thành viên, rời nhóm.

> Tại sao tách 2 controller? JavaDoc nói thẳng: gộp lại thì file vượt giới hạn 300
> dòng của dự án, và "quản trị một nhóm" vốn là việc khác với "nói chuyện trong
> nhóm".

---

## Phần 2 — Package `workspace`: Knowledge Space

Workspace chính là "Knowledge Space" hiện trong dropdown khi đặt câu hỏi. Nó là
ranh giới chứa tài liệu, bài viết và quyền truy cập.

### 2.1 — `workspace/domain/`

**`Workspace.java`** (183 dòng) — bảng `workspaces`:

- `ownerId`, `name`, `description`, `visibility`, `status`.
- `cloudAllowed` — có cho phép gửi dữ liệu nhóm này lên LLM cloud không (quan
  trọng về quyền riêng tư).
- `coverStorageKey` — ảnh bìa; null thì UI vẽ gradient sinh từ id.
- `@Version version` — **optimistic locking**. Mỗi lần UPDATE, Hibernate tự tăng
  số này và thêm `WHERE version = ?`. Nếu hai người sửa cùng lúc, người thứ hai bị
  từ chối thay vì ghi đè âm thầm.
- `permissionVersion` — số riêng, **chỉ tăng khi quyền thay đổi** (thêm, xóa hoặc
  đổi vai trò thành viên). Tác dụng: AI Service hoặc cache ở nơi khác chỉ cần so
  số này để biết có phải tính lại danh sách tài liệu được phép đọc hay không.

**`WorkspaceMember.java`** (84 dòng) — ai ở trong workspace nào, vai trò gì. Khóa
chính kép (`workspaceId` và `userId`) khai báo qua **`WorkspaceMemberId.java`**,
một class riêng có `equals()` và `hashCode()` — yêu cầu bắt buộc của JPA với khóa
composite.

**Các enum:**

| Enum | Giá trị | Ý nghĩa |
|---|---|---|
| `WorkspaceRole` | OWNER / EDITOR / VIEWER | OWNER toàn quyền; EDITOR sửa nội dung và ảnh bìa; VIEWER chỉ xem |
| `WorkspaceVisibility` | PRIVATE / SHARED / PUBLIC | PUBLIC hiện ở trang Khám phá, ai cũng tự join được |
| `WorkspaceStatus` | ACTIVE / DELETING / DELETED | Xóa là **soft delete** — chuyển trạng thái, không XÓA dòng |
| `WorkspaceMemberStatus` | ACTIVE / REVOKED | Đuổi thành viên cũng là soft delete, giữ lại lịch sử |

**`WorkspaceRepository.java`** — 2 query chính:

- `findAllVisibleToUser` — workspace tôi sở hữu **hoặc** là member ACTIVE. Đây
  chính là query sinh ra danh sách trong dropdown "Chọn Knowledge Space".
- `findPublicWorkspacesExcludingMember` — workspace PUBLIC tôi **chưa** tham gia,
  có tìm kiếm theo tên hoặc mô tả; dùng cho trang Khám phá.

**`WorkspaceMemberRepository.java`** — ngoài CRUD thường còn có
`findFacesForWorkspaces`, một query native dùng **window function**:

```sql
ROW_NUMBER() OVER (
  PARTITION BY m.workspace_id
  ORDER BY CASE m.role WHEN 'OWNER' THEN 0 WHEN 'EDITOR' THEN 1 ELSE 2 END,
           u.display_name
) AS rn
-- ... WHERE rn <= :perWorkspace
```

Nghĩa là: trong mỗi workspace, đánh số thành viên theo thứ tự
OWNER, EDITOR, VIEWER rồi theo tên, chỉ lấy 4 người đầu. Làm trong SQL để **giới
hạn áp dụng cho từng workspace** — nếu lấy hết rồi cắt bằng Java thì một trang 20
nhóm lớn sẽ kéo cả bảng membership về.

### 2.2 — `workspace/service/`

**`WorkspaceService.java`** (265 dòng) — vòng đời workspace:

| Method | Làm gì | Luật quyền |
|---|---|---|
| `getWorkspaces` | danh sách của tôi | — |
| `createWorkspace` | tạo, và **tự tạo luôn dòng member OWNER** cho người tạo | ai cũng được |
| `getWorkspace` | chi tiết | PUBLIC thì ai cũng xem; còn lại phải là member |
| `updateWorkspace` | sửa | VIEWER bị chặn; đổi `visibility` hoặc `cloudAllowed` chỉ OWNER; kiểm tra `expectedVersion` khớp, lệch thì `ConflictError` |
| `deleteWorkspace` | xóa | chỉ OWNER; chuyển status sang DELETING (còn TODO: saga xóa thật) |
| `getPublicWorkspaces` | trang Khám phá | — |
| `joinPublicWorkspace` | tự tham gia | chỉ với PUBLIC, vào với vai trò VIEWER, đã là member thì `ConflictError` |

Mọi thao tác đổi quyền đều gọi `workspace.incrementPermissionVersion()`.

**`WorkspaceMemberService.java`** (159 dòng) — quản lý thành viên, **mọi method
đều chỉ OWNER** (qua helper `validateOwnerAccess`). Hai lớp bảo vệ: không được hạ
vai trò của owner gốc, không được xóa owner gốc. Thêm thành viên bằng **email**
chứ không phải userId, vì người dùng biết email chứ không biết UUID.

**`WorkspaceStatsLoader.java`** (119 dòng) — gom số liệu cho thẻ workspace: số tài
liệu, số thành viên, số bài viết trong 7 ngày qua, và 4 khuôn mặt đại diện. JavaDoc
ghi rõ động cơ: trước đây đếm từng workspace một nên 20 nhóm là 20 lượt đi DB; thêm
3 chỉ số nữa theo kiểu đó thành 80. Giờ là **4 query cố định cho cả trang**, bất
kể trang có bao nhiêu dòng.

**`WorkspaceCoverService.java`** (263 dòng) — ảnh bìa. Phần hay nhất về bảo mật:

> Ảnh upload **không bao giờ được lưu nguyên bản**. Nó được giải mã, cắt về tỉ lệ
> 3:1 ở giữa, vẽ lại 1200x400, rồi mã hóa lại JPEG chất lượng 0.82. Hai lợi ích:
> (1) chặn file khổng lồ, (2) **xóa sạch metadata EXIF** — ảnh chụp từ điện thoại
> mang theo tọa độ GPS, nếu lưu nguyên thì tọa độ nhà bạn đến tay mọi người trong
> nhóm.
>
> Và việc **giải mã được** chính là phép kiểm tra thật sự rằng đây là ảnh;
> `Content-Type` chỉ là lời client tự khai.

Dùng JPEG (không phải PNG như avatar) vì ảnh bìa là ảnh chụp rộng, PNG không nén
mất dữ liệu sẽ nặng vài MB nhân với 20 thẻ trên một màn hình.

### 2.3 — `workspace/api/`

**Request DTO:** `CreateWorkspaceRequest` (name 3 đến 100 ký tự, description tối đa
1000, visibility bắt buộc), `UpdateWorkspaceRequest` (mọi trường optional, riêng
`expectedVersion` **bắt buộc**), `AddWorkspaceMemberRequest` (email và role),
`UpdateWorkspaceMemberRequest` (role).

**Response DTO:** `WorkspaceResponse` (thông tin, thống kê, và `userRole` của người
đang hỏi), `WorkspaceCardStats` (kèm record lồng `MemberFace`),
`WorkspaceMemberResponse`.

**`WorkspaceController.java`** (199 dòng):

```text
GET    /workspaces              POST  /workspaces          (có Idempotency-Key)
GET    /workspaces/{id}         PATCH /workspaces/{id}     DELETE /workspaces/{id}
GET    /workspaces/explore      POST  /workspaces/{id}/join
PUT /DELETE /GET  /workspaces/{id}/cover
```

Chi tiết hay: `@PathVariable` dùng regex `{workspaceId:[0-9a-fA-F\-]+}` để
`/workspaces/explore` không bị nuốt nhầm thành một UUID.

**Idempotency** trong `createWorkspace`: client gửi header `Idempotency-Key`; nếu
mạng chập chờn và client gửi lại lần 2 với cùng key, server trả về **kết quả đã
lưu** thay vì tạo workspace trùng.

**`WorkspaceMemberController.java`** (87 dòng) — `GET` và `POST`
`/workspaces/{id}/members`, `PATCH` và `DELETE`
`/workspaces/{id}/members/{userId}`.

---

## Phần 3 — Xâu chuỗi lại: một tin nhắn đi như thế nào

```text
Browser  POST /api/v1/work-chat/conversations/{id}/messages  {body:"Chào"}
   │
   ▼  WorkChatController.send()                       [api]
   │    · Spring Security đã giải mã JWT → lấy userId
   │    · @Valid kiểm tra body không rỗng, tối đa 4000 ký tự
   ▼  DirectMessageService.send()                     [service] @Transactional mở
   │    · ConversationAccess.requireParticipant() → có dòng participant không?
   │    · validate file (nếu có)
   │    · messageRepository.save(new DirectMessage(...))
   │    · conversation.setLastMessageAt(now) → save
   │    · eventPublisher.publishEvent(DirectMessageSentEvent(recipients, response))
   ▼  ───── COMMIT transaction ─────
   │
   ├──► HTTP 200 + MessageResponse  →  client người gửi tự vẽ bong bóng
   │
   └──► WorkChatBroadcaster.onMessageSent()           [ws]  (AFTER_COMMIT)
          · với mỗi recipientId: convertAndSendToUser(id, "/queue/messages", msg)
          · Spring định tuyến theo Principal (= userId) đã đặt lúc CONNECT
          ▼
        Browser người nhận đang subscribe /user/queue/messages → tin hiện ngay
```

Liên kết giữa hai package: bước `requireParticipant` dựa trên participant rows,
nhưng bước **tạo** hội thoại hay **thêm** thành viên thì gọi
`ContactDirectory.canMessage()`, mà hàm này lại hỏi `WorkspaceMemberRepository`.
Tức là **package `workspace` là nguồn chân lý về "ai quen ai"**, còn `workchat`
chỉ tiêu thụ nó.

---

## Phần 4 — Những bài học thiết kế

1. **Một luật, một chỗ.** `ContactDirectory` và `ConversationAccess` tồn tại chỉ
   để quy tắc không bị chép ra nhiều nơi rồi lệch nhau.
2. **Không bao giờ tin client.** Mọi id trong URL đều được kiểm tra quyền lại, vì
   UUID là thứ người ta có thể đoán hoặc lượm được.
3. **404 thay vì 403** khi không có quyền xem, để không tiết lộ sự tồn tại của tài
   nguyên.
4. **Query theo trang, không theo dòng.** Mọi chỗ hiển thị danh sách đều có một
   "loader" gom dữ liệu bằng số query cố định.
5. **Entity tự bảo vệ hình dạng của mình** bằng factory method và exception, thay
   vì để service nhớ hộ.
6. **Event tách tầng.** Service không biết WebSocket tồn tại, nên test được, và
   hỏng WebSocket không làm hỏng việc lưu tin nhắn.
7. **Xử lý lại file người dùng upload**, không lưu nguyên bản.
8. **Comment trong dự án này giải thích "tại sao", không giải thích "cái gì".** Khi
   đọc code lạ, đọc JavaDoc trước — ở đây nó nói cả những đánh đổi và hạn chế đã
   biết, ví dụ broker in-memory không chạy được đa instance.
