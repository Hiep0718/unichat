# Báo cáo rà soát nghiệp vụ: Workspace nhóm, Mạng xã hội, @AI trong bài viết, Chat và Cuộc gọi

- Ngày rà soát: 15/11/2026. Cập nhật cùng ngày: thêm phần **cuộc gọi 1-1 và gọi nhóm**, **mô tả từng cột của mọi bảng dữ liệu**, và **bảng "service nào làm gì, nhận gì, trả gì"** cho từng module.
- Nhánh: `feat/knowledge-gap-escalation` (commit `494b980`)
- Phạm vi: Core API (Spring Boot), Web frontend (React), phần liên quan của AI Service (FastAPI) và migration PostgreSQL.
- Ứng dụng mobile dùng chung các endpoint này nên các lỗi phía backend cũng ảnh hưởng mobile; báo cáo không rà riêng mã mobile (trừ phần cuộc gọi, nơi mobile khác hẳn web).
- Phương pháp: đọc mã nguồn controller → service → repository → migration, đối chiếu với lời gọi API phía frontend. Danh sách cột của các bảng được đối chiếu với cấu trúc thật của cơ sở dữ liệu dùng chung (chỉ đọc `information_schema`, không đọc dữ liệu người dùng). Báo cáo chỉ dựa trên đọc mã, **chưa chạy thử nghiệp vụ**. Mục nào ghi "cần kiểm chứng" là suy luận có cơ sở nhưng chưa được xác nhận bằng test.
- **Người mới nên đọc [mục 1.3](#13-từ-điển-thuật-ngữ-cho-người-mới) và [mục 1.4](#14-bản-đồ-dữ-liệu-tất-cả-các-bảng-trong-báo-cáo) trước**, rồi mới đọc từng module.

---

## Mục lục

0. [Tóm tắt nhanh](#0-tóm-tắt-nhanh)
1. [Kiến trúc chung: một request đi qua những đâu](#1-kiến-trúc-chung-một-request-đi-qua-những-đâu) (có từ điển thuật ngữ và bản đồ dữ liệu)
2. [Workspace nhóm](#2-workspace-nhóm)
3. [Mạng xã hội: Bảng tin và Thảo luận](#3-mạng-xã-hội-bảng-tin-và-thảo-luận)
4. [@AI trong bài viết](#4-ai-trong-bài-viết)
5. [Chat: Work Chat 1-1 và nhóm chat](#5-chat-work-chat-1-1-và-nhóm-chat)
6. [Cuộc gọi: gọi 1-1 và gọi nhóm](#6-cuộc-gọi-gọi-1-1-và-gọi-nhóm)
7. [Vấn đề xuyên suốt nhiều module](#7-vấn-đề-xuyên-suốt-nhiều-module)
8. [Kế hoạch cải thiện theo mức ưu tiên](#8-kế-hoạch-cải-thiện-theo-mức-ưu-tiên)
9. [Phụ lục: tra nhanh file](#9-phụ-lục-tra-nhanh-file)

Quy ước mức độ:

| Mức | Ý nghĩa |
|---|---|
| **Nghiêm trọng** | Tính năng hỏng hoàn toàn, hoặc lỗ hổng phân quyền |
| **Cao** | Sai nghiệp vụ người dùng gặp được, hoặc vi phạm quy tắc bắt buộc trong `AGENTS.md` |
| **Trung bình** | Sai trong tình huống ít gặp hơn, dữ liệu dần lệch, trải nghiệm kém |
| **Thấp** | Thiếu sót nhỏ, mã thừa, tối ưu |

---

## 0. Tóm tắt nhanh

### 0.1. Trạng thái từng tính năng

| Tính năng | Đã làm | Trạng thái thực tế |
|---|---|---|
| Tạo, sửa, xóa, khám phá, tham gia nhóm | Đầy đủ CRUD, 3 mức hiển thị, chủ đề, ảnh bìa, thống kê thẻ | Chạy được. Có lỗ hổng: link mời vượt rào chế độ Riêng tư; xóa nhóm mới chỉ đổi trạng thái |
| Quản lý thành viên, link mời | Mời qua email, đổi vai trò, gỡ, link mời có hạn và giới hạn lượt | Tab "Thành viên" **báo lỗi 403** với người không phải chủ nhóm. Thành viên không có cách tự rời nhóm |
| Bài viết, bình luận, ghim, sửa/xóa, chấp nhận câu trả lời | Đầy đủ | Chạy được. Bài đã xóa vẫn đọc và bình luận được qua API |
| Cảm xúc (7 loại kiểu Facebook) | Có | **Không kiểm tra quyền**: ai đăng nhập cũng thả cảm xúc được vào bài của nhóm riêng tư. Đổi từ loại này sang loại khác có khả năng lỗi (cần kiểm chứng) |
| Nhắc tên `@thành viên` và thông báo | Có gợi ý tên, có lưu thông báo | **Thông báo nhắc tên không lưu được** vì vi phạm ràng buộc CHECK trong DB |
| Bảng tin tổng hợp, tìm kiếm, gợi ý bài trùng | Có | Chạy được. Bài của nhóm đã xóa vẫn hiện trong bảng tin |
| **@AI trong bình luận** | Có luồng đầy đủ: sự kiện, gọi AI, lưu câu trả lời kèm trích dẫn, frontend chờ câu trả lời | **Hỏng hoàn toàn.** AI Service luôn từ chối token, nên lần nào trợ lý cũng trả lời "Trợ lý chưa trả lời được lúc này" |
| Tóm tắt tệp đính kèm bằng AI | Có | **Hỏng** cùng nguyên nhân với @AI |
| Work Chat 1-1, nhóm chat, tệp đính kèm, realtime | Có | Chạy được. Web **chỉ hiện 20 tin mới nhất** của mỗi cuộc trò chuyện, không tải được tin cũ hơn |
| **Gọi thoại 1-1** (WebRTC) | Có trên web: đổ chuông, nhận, từ chối, cúp máy, lịch sử cuộc gọi trong khung chat | Chạy được với điều kiện mạng thông thường. **Cuộc gọi có thể treo ở trạng thái "đang gọi" mãi** nếu cả hai bên mất kết nối, khiến cả hai không gọi được ai nữa. Mobile chỉ xem lịch sử, chưa gọi được. Chưa có TURN server nên mạng 4G/NAT chặt dễ gọi không thông |
| Gọi video | Cột `media` có giá trị `VIDEO` | **Chưa làm.** Frontend luôn gọi với `AUDIO`, chỉ xin quyền micro |
| **Gọi nhóm** | Không | **Chưa làm.** Nút gọi bị ẩn trong nhóm chat; backend từ chối với "Hiện chỉ hỗ trợ gọi giữa hai người". Cần thêm media server (SFU), xem [mục 6.8](#68-gọi-nhóm-hiện-trạng-và-những-gì-cần-để-làm) |

### 0.2. Năm vấn đề cần sửa trước

1. **@AI và tóm tắt tệp đính kèm không bao giờ chạy được** ([mục 4.5](#45-những-chỗ-chưa-ổn)). Client gọi AI dùng token kiểu cũ mà AI Service đã từ chối, và request còn thiếu các trường chính sách bắt buộc.
2. **Thả cảm xúc không kiểm tra quyền** ([mục 3.6](#36-những-chỗ-chưa-ổn)). Biết ID bài viết là thả cảm xúc và xem số đếm được, dù không thuộc nhóm.
3. **Thông báo nhắc tên không lưu được** ([mục 3.6](#36-những-chỗ-chưa-ổn)). Mã ghi loại `MENTION`, nhưng ràng buộc CHECK của bảng `notifications` chỉ chấp nhận `COMMUNITY_MENTION`.
4. **Link mời đưa được người vào nhóm Riêng tư** ([mục 2.7](#27-những-chỗ-chưa-ổn)), phá vỡ cam kết "chỉ mình tôi".
5. **Tab Thành viên lỗi với người không phải chủ nhóm**, và **xóa nhóm chưa có tác dụng thật** ([mục 2.7](#27-những-chỗ-chưa-ổn)).

Cả ba lỗi 1–3 đều lọt qua kiểm thử vì các test hiện có chỉ là unit test, mock hết repository và HTTP client. Không có integration test với PostgreSQL thật cho các endpoint này, nên ràng buộc DB, thứ tự flush của Hibernate và hợp đồng token với AI Service đều không được thử (xem [mục 7](#7-vấn-đề-xuyên-suốt-nhiều-module)).

Ngoài năm vấn đề trên, phần cuộc gọi có một lỗi mức **Cao**: cuộc gọi đã nhận máy mà cả hai bên cùng mất kết nối sẽ nằm mãi ở trạng thái `ACTIVE`, và hệ thống sẽ coi cả hai người là "đang bận" vĩnh viễn ([mục 6.7, lỗi K1](#67-những-chỗ-chưa-ổn)).

---

## 1. Kiến trúc chung: một request đi qua những đâu

### 1.1. Sơ đồ tổng quát

```
 Trình duyệt (React)                          Core API (Spring Boot, cổng 8080)                 Hạ tầng riêng
 ───────────────────                          ─────────────────────────────────                 ──────────────
 Component (vd. feed-page.tsx)
   │ gọi hàm trong *-api.ts
   ▼
 lib/api-client.ts: fetchJson()  ── HTTPS ──►  Security filter: kiểm JWT RS256
   - gắn "Authorization: Bearer <access>"        │
   - gặp 401 → gọi refresh → thử lại 1 lần       ▼
                                               Controller (…/api/*.java)
                                                 - đọc userId = jwt.getSubject()
                                                 - kiểm tra input (Jakarta Validation)
                                                 ▼
                                               Service (…/service/*.java)
                                                 - KIỂM TRA QUYỀN (thành viên? vai trò?)
                                                 - nghiệp vụ, @Transactional
                                                 ▼
                                               Repository (Spring Data JPA) ───────────────────►  PostgreSQL
                                                 │
                                                 ├─ ApplicationEvent ─► Listener @Async ───────►  AI Service (FastAPI, nội bộ)
                                                 │                                                  └─► ChromaDB, Ollama/cloud LLM
                                                 └─ AFTER_COMMIT ─► WorkChatBroadcaster
                                                                       │ STOMP over WebSocket
 lib/stomp-connection.ts  ◄──── /ws/work-chat ─────────────────────────┘
   subscribe /user/queue/messages, /user/queue/conversations
```

### 1.2. Các quy ước dùng ở mọi module

- **Danh tính người gọi**: mọi controller lấy `userId` từ `jwt.getSubject()`. Frontend không bao giờ gửi `userId` của chính mình lên.
- **Kiểm tra quyền nằm ở service**, gần như luôn theo một mẫu: tìm dòng `workspace_members` có `(workspace_id, user_id, status = 'ACTIVE')`. Không có dòng nào → từ chối. Có thì đọc `role` (OWNER/EDITOR/VIEWER) để quyết định thao tác.
- **Lỗi trả về**: service ném lỗi có kiểu (`NotFoundError`, `AuthorizationError`, `ConflictError`, `ValidationError`), global handler chuyển thành RFC 7807 (`application/problem+json`). Frontend đọc trường `detail` để hiển thị.
- **Phân trang**: mặc định 20, tối đa 100 (các controller tự kẹp `Math.min(size, 100)`).
- **Tác vụ nền**: dùng sự kiện Spring. Loại `@TransactionalEventListener(AFTER_COMMIT)` chỉ chạy khi giao dịch gốc đã commit; loại `@EventListener` chạy ngay, kể cả khi giao dịch sau đó rollback.

### 1.3. Từ điển thuật ngữ cho người mới

Mỗi thuật ngữ được giải thích bằng một ví dụ trong chính dự án này.

**Các lớp mã trong Core API** (một request đi lần lượt qua các lớp này):

| Thuật ngữ | Nghĩa dễ hiểu | Ví dụ trong UniChat |
|---|---|---|
| **Controller** | "Quầy tiếp tân". Nhận HTTP request, kiểm tra dữ liệu gửi lên có đúng định dạng không, rồi chuyển cho service. Không chứa nghiệp vụ | `WorkspaceController` nhận `POST /api/v1/workspaces` |
| **Service** | "Người làm việc chính". Kiểm tra quyền, áp dụng quy tắc nghiệp vụ, gọi repository để đọc/ghi dữ liệu | `WorkspaceService.createWorkspace` tạo nhóm và gán người tạo làm chủ |
| **Repository** | "Thủ kho". Lớp duy nhất nói chuyện với cơ sở dữ liệu. Service không viết SQL trực tiếp mà gọi hàm của repository | `WorkspaceRepository.findAllVisibleToUser(userId)` |
| **Entity** | Một lớp Java tương ứng một bảng; mỗi đối tượng là một dòng | `Workspace` ↔ bảng `workspaces` |
| **DTO / Request / Response** | Gói dữ liệu đi qua mạng. *Request* là thứ frontend gửi lên, *Response* là thứ backend trả về. Tách khỏi entity để không lộ cột nội bộ (vd. `password_hash`) | `CreateWorkspaceRequest` (gửi lên), `WorkspaceResponse` (trả về) |
| **Migration** | Tệp SQL đánh số `V1`, `V2`… chạy một lần theo thứ tự để tạo/sửa bảng. Công cụ chạy là Flyway | `V44__direct_calls.sql` tạo bảng `calls` |
| **Event / Listener** | Service "phát loa" một sự kiện; nơi khác "nghe" và làm việc phụ. Giúp service chính không phải biết hết mọi việc phụ | Lưu bình luận xong phát `NewReplyEvent`; `NotificationEventListener` nghe và tạo thông báo |
| **`AFTER_COMMIT`** | Chỉ chạy việc phụ khi dữ liệu chính **đã lưu chắc chắn**. Nếu lưu thất bại thì việc phụ không chạy | Chỉ đẩy tin nhắn realtime sau khi tin đã nằm trong DB |
| **`@Async`** | Chạy việc ở luồng khác, request gốc không phải chờ | Gọi AI trả lời `@AI` mất vài chục giây nhưng người bình luận nhận phản hồi ngay |
| **`@Transactional`** | Gom nhiều thao tác DB thành "tất cả cùng thành công hoặc cùng hủy" | Tạo nhóm + tạo dòng chủ nhóm: lỗi giữa chừng thì không còn nhóm "mồ côi" |

**Cơ sở dữ liệu:**

| Thuật ngữ | Nghĩa dễ hiểu | Ví dụ |
|---|---|---|
| **UUID** | Mã định danh 128 bit, dạng `0b6f…-…`, gần như không thể trùng. Dùng thay cho số tự tăng để không đoán được ID kế tiếp | `workspaces.id` |
| **Khóa chính (PK)** | Cột (hoặc nhóm cột) xác định duy nhất một dòng | `workspace_members` dùng cặp `(workspace_id, user_id)`: một người chỉ có một dòng trong một nhóm |
| **Khóa ngoại (FK)** | Cột trỏ sang dòng của bảng khác. DB không cho trỏ tới dòng không tồn tại | `discussions.workspace_id` → `workspaces.id` |
| **`ON DELETE CASCADE`** | Xóa dòng cha thì dòng con tự bị xóa theo | Xóa một hội thoại thì các cuộc gọi của nó bị xóa |
| **CHECK** | Luật DB tự kiểm tra trước khi ghi. Sai luật thì lệnh ghi bị từ chối | `calls.status` chỉ nhận 6 giá trị |
| **UNIQUE** | Không cho hai dòng trùng giá trị ở cột (hoặc nhóm cột) đó | `reactions(user_id, target_type, target_id)`: mỗi người một cảm xúc trên một bài |
| **Index** | "Mục lục" giúp tìm nhanh, đổi lại ghi chậm hơn một chút | `idx_calls_conversation` để mở lịch sử cuộc gọi nhanh |
| **NULL** | "Chưa có giá trị". Khác với chuỗi rỗng hay số 0 | `calls.answered_at = NULL` nghĩa là chưa ai nhấc máy |
| **JSONB** | Cột chứa dữ liệu JSON, PostgreSQL đọc được bên trong | `discussion_replies.citations` chứa danh sách trích dẫn |
| **`TIMESTAMPTZ`** | Thời điểm kèm múi giờ, lưu chuẩn UTC | `created_at` |
| **Xóa mềm** | Không xóa dòng thật, chỉ đổi trạng thái (vd. `DELETED`, `REVOKED`) để giữ lịch sử và không gãy khóa ngoại | Gỡ thành viên = đổi `status` thành `REVOKED` |
| **Khóa lạc quan (`version`)** | Mỗi lần sửa thì `version + 1`. Gửi lệnh sửa kèm `version` mình đang thấy; nếu người khác vừa sửa (version đã khác) thì bị từ chối 409, tránh ghi đè lên nhau | Sửa thông tin nhóm phải gửi `expectedVersion` |
| **Bộ đếm phi chuẩn hóa** | Lưu sẵn con số (vd. số bình luận) thay vì đếm lại mỗi lần đọc. Nhanh, nhưng dễ lệch nếu cập nhật sai | `discussions.reply_count` |

**Bảo mật và mạng:**

| Thuật ngữ | Nghĩa dễ hiểu |
|---|---|
| **JWT access token** | "Vé vào cửa" có chữ ký, sống 15 phút, frontend gắn vào header `Authorization: Bearer …`. Trường `sub` (subject) trong vé là `userId` |
| **Refresh token** | "Vé đổi vé". Khi access token hết hạn, frontend đổi lấy access token mới mà không bắt đăng nhập lại |
| **Service JWT** | Vé riêng để Core API gọi AI Service. Bị "ràng buộc" với đúng method, đường dẫn, nội dung request, nên không dùng lại cho request khác được |
| **RFC 7807** | Định dạng lỗi chuẩn: JSON có `title`, `status`, `detail`. Frontend hiển thị `detail` |
| **401 / 403 / 404 / 409** | 401: chưa đăng nhập hoặc vé hết hạn. 403: đăng nhập rồi nhưng không có quyền. 404: không tìm thấy (đôi khi cố ý trả 404 để giấu việc đối tượng tồn tại). 409: xung đột (trùng, hoặc người khác vừa sửa) |
| **IDOR** | Lỗi "đổi ID là xem/sửa được đồ của người khác" vì server quên kiểm tra quyền |
| **Idempotency-Key** | Mã do client tự sinh gửi kèm request tạo mới. Gửi lại cùng mã (vd. do mạng chập chờn bấm hai lần) thì server trả lại kết quả cũ, không tạo bản thứ hai |

**Realtime và cuộc gọi:**

| Thuật ngữ | Nghĩa dễ hiểu |
|---|---|
| **WebSocket** | Kết nối mở liên tục giữa trình duyệt và server, server chủ động đẩy dữ liệu xuống được (HTTP thường thì chỉ client hỏi, server trả lời) |
| **STOMP** | "Ngôn ngữ" chạy trên WebSocket, có khái niệm *đích* (destination). Client `SUBSCRIBE` một đích để nghe, `SEND` tới một đích để gửi |
| **`/user/queue/...`** | Đích riêng cho từng người. Server gửi tới `/user/queue/messages` của user A thì chỉ các tab của A nhận |
| **Polling** | Cứ vài giây hỏi server một lần "có gì mới không". Đơn giản nhưng tốn và chậm hơn realtime |
| **WebRTC** | Công nghệ của trình duyệt để gọi thoại/video **trực tiếp giữa hai máy**. Âm thanh không đi qua server UniChat |
| **Signalling** | Bước hai trình duyệt "làm quen" với nhau trước khi gọi được: trao đổi offer/answer và ICE candidate. Server UniChat chỉ làm người chuyển thư cho bước này |
| **SDP (offer / answer)** | "Bản mô tả cuộc gọi": tôi hỗ trợ codec âm thanh nào, cấu hình mã hóa ra sao. Người gọi gửi *offer*, người nghe trả *answer* |
| **ICE candidate** | Một "đường đi có thể" tới máy mình (IP nội bộ, IP công cộng, địa chỉ qua TURN). Hai bên thử từng đường cho tới khi thông |
| **STUN** | Server nhỏ cho trình duyệt biết "nhìn từ Internet, bạn có địa chỉ IP công cộng nào". Đủ cho đa số mạng gia đình |
| **TURN** | Server **chuyển tiếp âm thanh** khi hai máy không nối thẳng được (mạng 4G, mạng công ty, NAT chặt). Tốn băng thông nên phải tự dựng hoặc thuê |
| **NAT** | Cơ chế router cho nhiều máy dùng chung một IP công cộng. Là lý do hai máy thường không "thấy" nhau trực tiếp |
| **SFU** | Media server cho **gọi nhóm**: mỗi người gửi một luồng lên SFU, SFU chia lại cho những người còn lại. Không có SFU thì gọi nhóm N người buộc mỗi máy gửi N−1 luồng, nghẽn rất nhanh |

### 1.4. Bản đồ dữ liệu: tất cả các bảng trong báo cáo

Sơ đồ quan hệ chính (mũi tên đọc là "thuộc về", `1—n` là "một … có nhiều …"):

```
                                  users  (mọi người dùng, kể cả tài khoản "Trợ lý AI")
                                    │
      ┌─────────────────────────────┼───────────────────────────────────────────────┐
      │                             │                                               │
      ▼ 1—n                         ▼ 1—n                                           ▼ 1—n
 workspaces ──1—n── workspace_members (ai ở nhóm nào, vai trò gì)        conversation_participants
   │  │  │                                                                        │ n—1
   │  │  └──1—n── workspace_invites (link mời)                                    ▼
   │  └─────1—n── workspace_topics  (chủ đề, tối đa 3)                  direct_conversations (1-1 hoặc nhóm chat)
   │                                                                     │              │
   ├──1—n── documents (thư viện tài liệu; trợ lý AI chỉ đọc ở đây)       ▼ 1—n          ▼ 1—n
   │           ▲                                                   direct_messages     calls (lịch sử gọi 1-1)
   │           │ document_id (tài liệu đính kèm bài)                   │ 1—n
   └──1—n── discussions (bài viết)                                     ▼
               │  │  │  └──1—n── post_attachments (ảnh, tài liệu đính kèm bài)   chat_attachments (tệp trong tin nhắn)
               │  │  └─────1—n── post_reads (ai đã đọc bài Thông báo)
               │  └────────1—n── bookmarks (ai đã lưu bài)
               └──────────1—n── discussion_replies (bình luận, gồm cả câu trả lời của trợ lý AI)

 reactions     : trỏ tới discussions HOẶC discussion_replies qua cặp (target_type, target_id), không có khóa ngoại
 notifications : thuộc về một user, payload JSON trỏ tới bài/bình luận
 idempotency_records : bảng kỹ thuật chống tạo trùng khi gửi lại request
```

Danh sách bảng, nhóm theo module. Bấm vào tên module để tới phần giải thích **từng cột**:

| Bảng | Module | Lưu cái gì (một câu) | Migration tạo / sửa |
|---|---|---|---|
| `users` | Dùng chung | Tài khoản: email, tên hiển thị, avatar, vai trò hệ thống | V1, V24, V25 |
| `workspaces` | [Workspace](#22-dữ-liệu-và-các-service-xử-lý) | Một nhóm: tên, mô tả, mức hiển thị, trạng thái | V1, V4, V27 |
| `workspace_members` | Workspace | Ai là thành viên nhóm nào, vai trò gì | V1 |
| `workspace_invites` | Workspace | Link mời vào nhóm (chỉ lưu bản băm của token) | V41 |
| `workspace_topics` | Workspace | Chủ đề của nhóm | V43 |
| `idempotency_records` | Workspace | Kết quả cũ của request tạo nhóm, để gửi lại không tạo trùng | V1 |
| `documents` | Tài liệu (dùng bởi @AI và đính kèm) | Tệp trong thư viện nhóm và trạng thái xử lý cho AI | V1 và nhiều bản sau |
| `discussions` | [Mạng xã hội](#32-dữ-liệu-và-các-service-xử-lý) | Bài viết trong nhóm | V8, V9, V13, V20, V28 |
| `discussion_replies` | Mạng xã hội, @AI | Bình luận, kể cả câu trả lời của trợ lý | V8, V19 |
| `reactions` | Mạng xã hội | Cảm xúc trên bài hoặc bình luận | V8, V17, V42 |
| `bookmarks` | Mạng xã hội | Bài đã lưu | V13 |
| `post_reads` | Mạng xã hội | Ai đã đọc bài Thông báo | V18 |
| `post_attachments` | Mạng xã hội, @AI | Tệp đính kèm bài và tóm tắt AI | V20, V21 |
| `notifications` | Mạng xã hội | Thông báo trên chuông | V8 |
| `direct_conversations` | [Work Chat](#52-dữ-liệu-và-các-service-xử-lý) | Một cuộc trò chuyện 1-1 hoặc nhóm chat | V22, V37, V39 |
| `conversation_participants` | Work Chat | Ai ở trong cuộc trò chuyện nào, đã đọc tới đâu | V37 |
| `direct_messages` | Work Chat | Tin nhắn | V22 (cột `read_at` thêm/xóa nhiều lần, hiện đã bỏ) |
| `chat_attachments` | Work Chat | Tệp đính kèm tin nhắn | V36 |
| `calls` | [Cuộc gọi](#62-dữ-liệu-bảng-calls-giải-thích-từng-cột) | Lịch sử cuộc gọi 1-1 | V44 |

> Lưu ý về độ chính xác: cột ghi trong báo cáo là trạng thái **sau khi chạy hết migration**, đối chiếu với DB dùng chung ngày 15/11/2026. Một số cột còn trong DB nhưng **không có mã nào dùng** (vd. `workspaces.category`, `discussions.tags`); báo cáo đánh dấu chúng là *cột thừa*.

### 1.5. Cách đọc các bảng "Service: nhận gì, trả gì"

Mỗi module có một bảng liệt kê từng hàm service với các cột:

- **Hàm**: tên phương thức Java trong service.
- **Input (nhận gì)**: tham số. `callerId`/`userId` luôn lấy từ JWT, không phải do người dùng nhập.
- **Output (trả gì)**: kiểu trả về, thường là một DTO Response. `void` nghĩa là không trả dữ liệu (HTTP 204 hoặc 200 rỗng).
- **Đọc / ghi bảng**: bảng nào bị đọc (R) hoặc ghi (W). Giúp biết một thao tác chạm tới dữ liệu nào.
- **Lỗi có thể gặp**: các lỗi nghiệp vụ chính và mã HTTP tương ứng.

---

## 2. Workspace nhóm

### 2.1. Khái niệm nghiệp vụ

Workspace (giao diện gọi là "nhóm") là ranh giới chứa tài liệu, bài viết và thành viên.

**Ba mức hiển thị.** Mỗi mức có quy tắc riêng, được gom vào [WorkspaceVisibilityPolicy.java](../../core-api/src/main/java/com/unichat/core/workspace/service/WorkspaceVisibilityPolicy.java):

| Mức | Ý nghĩa | Ai vào được |
|---|---|---|
| `PRIVATE` (Riêng tư) | Chỉ chủ nhóm | Không thêm được ai. Muốn chuyển sang PRIVATE thì nhóm không được còn thành viên khác |
| `SHARED` (Chia sẻ) | Nhóm kín | Chủ nhóm mời qua email hoặc link mời. Không hiện ở trang Khám phá |
| `PUBLIC` (Công khai) | Nhóm mở | Hiện ở Khám phá. Ai cũng tự tham gia được với vai trò VIEWER |

**Ba vai trò:**

| Vai trò | Quyền chính |
|---|---|
| `OWNER` | Mọi quyền: đổi mức hiển thị, cấu hình cloud AI, quản lý thành viên, link mời, xóa nhóm |
| `EDITOR` | Sửa tên, mô tả, chủ đề, ảnh bìa; ghim và xóa bài của người khác; đăng Thông báo |
| `VIEWER` | Đọc, đăng bài thường, bình luận |

**Trạng thái nhóm:** `ACTIVE` → `DELETING` → `DELETED`. Hiện chỉ có bước chuyển sang `DELETING`, chưa có bước nào chuyển tiếp.

**`permission_version`**: số tăng mỗi khi quyền thay đổi (thêm hoặc gỡ người, đổi vai trò, đổi mức hiển thị). Trợ lý AI dùng số này để biết ảnh chụp quyền lúc hỏi có còn đúng không. **`version`** là khóa lạc quan (optimistic lock) khi sửa thông tin nhóm.

### 2.2. Dữ liệu và các service xử lý

#### a) Bảng `workspaces`: mỗi dòng là một nhóm

| Cột | Kiểu | Bắt buộc | Ý nghĩa dễ hiểu | Ví dụ |
|---|---|---|---|---|
| `id` | UUID | Có | Mã nhóm, xuất hiện trong URL `/workspaces/{id}` | `0193…a7` |
| `owner_id` | UUID → `users.id` | Có | **Chủ nhóm gốc**, người tạo nhóm. Không bị gỡ, không bị hạ vai trò | id của Hùng |
| `name` | VARCHAR(100) | Có | Tên nhóm. DB kiểm tra dài 3–100 ký tự (`chk_workspaces_name_len`) | "Quy chế IUH" |
| `description` | TEXT | Không | Mô tả nhóm; API giới hạn 1000 ký tự | "Tài liệu quy chế đào tạo" |
| `visibility` | VARCHAR(50) | Có | Mức hiển thị: `PRIVATE`, `SHARED`, `PUBLIC` (xem bảng ba mức ở 2.1) | `PUBLIC` |
| `status` | VARCHAR(20) | Có, mặc định `ACTIVE` | Vòng đời nhóm: `ACTIVE` (đang dùng), `DELETING` (đã bấm xóa), `DELETED` (chưa dùng tới) | `ACTIVE` |
| `cloud_allowed` | BOOLEAN | Có, mặc định `false` | Chủ nhóm có cho phép gửi nội dung tài liệu tới AI chạy trên cloud không. `false` thì trợ lý chỉ dùng mô hình chạy nội bộ | `false` |
| `cover_storage_key` | VARCHAR(255) | Không | Đường dẫn ảnh bìa đã tải lên trong kho lưu trữ. `NULL` thì giao diện tự chọn ảnh theo chủ đề | `covers/0193…jpg` |
| `permission_version` | BIGINT | Có, mặc định 0 | Tăng 1 mỗi khi quyền trong nhóm thay đổi (thêm/gỡ người, đổi vai trò, đổi mức hiển thị). Trợ lý AI so số này để biết quyền có đổi trong lúc nó đang trả lời không | `7` |
| `version` | BIGINT | Có, mặc định 0 | Khóa lạc quan khi sửa thông tin nhóm (giải thích ở 1.3) | `3` |
| `created_at`, `updated_at` | TIMESTAMPTZ | Có | Lúc tạo, lúc sửa cài đặt gần nhất. **Đăng bài không làm đổi `updated_at`** (xem lỗi W8) | |
| `category`, `join_policy`, `contribution_policy`, `question_count` | | Không | **Cột thừa** từ thiết kế cũ. Entity `Workspace` không ánh xạ các cột này, không mã nào đọc hay ghi (xem lỗi W10) | |

Ràng buộc: CHECK `visibility` ∈ {PRIVATE, SHARED, PUBLIC}; CHECK độ dài `name`.

#### b) Bảng `workspace_members`: ai ở nhóm nào, với vai trò gì

| Cột | Kiểu | Bắt buộc | Ý nghĩa dễ hiểu | Ví dụ |
|---|---|---|---|---|
| `workspace_id` | UUID → `workspaces.id` | Có | Nhóm | |
| `user_id` | UUID → `users.id` | Có | Người dùng. Cặp `(workspace_id, user_id)` là **khóa chính**: một người chỉ có một dòng trong một nhóm | |
| `role` | VARCHAR(50) | Có | Vai trò: `OWNER`, `EDITOR`, `VIEWER`. DB còn cho phép `CONTRIBUTOR` nhưng mã không dùng | `VIEWER` |
| `status` | VARCHAR(50) | Có | `ACTIVE` (đang là thành viên) hoặc `REVOKED` (đã bị gỡ, **xóa mềm**). DB còn cho phép `PENDING_APPROVAL` nhưng mã không dùng | `ACTIVE` |
| `invited_by_id` | UUID | Không | Ai đã thêm người này vào nhóm. `NULL` với chủ nhóm và người tự tham gia nhóm công khai | id của chủ nhóm |

> Phiên bản trước của báo cáo ghi cột này là `added_by`; tên thật trong DB là `invited_by_id`.

**Mọi kiểm tra quyền trong hệ thống đều dựa vào bảng này**: "có dòng với `status = ACTIVE` không" quyết định người đó có thuộc nhóm không, còn `role` quyết định được làm gì.

#### c) Bảng `workspace_invites`: link mời vào nhóm

| Cột | Kiểu | Bắt buộc | Ý nghĩa dễ hiểu | Ví dụ |
|---|---|---|---|---|
| `id` | UUID | Có | Mã của link (dùng khi thu hồi) | |
| `workspace_id` | UUID → `workspaces.id` | Có | Link mời vào nhóm nào | |
| `token_hash` | VARCHAR(64), UNIQUE | Có | **Bản băm SHA-256** của token trong link. Token gốc chỉ hiện cho chủ nhóm đúng một lần; DB bị lộ cũng không dựng lại được link | `9f86d0…` (64 ký tự hex) |
| `role` | VARCHAR(16) | Có | Vai trò người nhận sẽ có. DB chỉ cho `VIEWER` hoặc `EDITOR`, **không bao giờ cấp OWNER qua link** | `VIEWER` |
| `created_by_id` | UUID | Có | Ai tạo link | |
| `created_at` | TIMESTAMPTZ | Có | Lúc tạo | |
| `expires_at` | TIMESTAMPTZ | Có | Hết hạn sau 1–30 ngày | |
| `max_uses` | INTEGER ≥ 1 | Có | Dùng được tối đa bao nhiêu lần (1–200) | `20` |
| `used_count` | INTEGER ≥ 0 | Có, mặc định 0 | Đã dùng bao nhiêu lần. Chỉ tăng khi **bấm chấp nhận**, không tăng khi chỉ mở xem trước | `3` |
| `revoked_at` | TIMESTAMPTZ | Không | Lúc chủ nhóm thu hồi. `NULL` là chưa thu hồi | |

Link còn dùng được khi: chưa thu hồi, chưa hết hạn, và `used_count < max_uses`.

#### d) Bảng `workspace_topics`: chủ đề của nhóm

| Cột | Kiểu | Ý nghĩa dễ hiểu | Ví dụ |
|---|---|---|---|
| `workspace_id` | UUID → `workspaces.id` (CASCADE) | Nhóm | |
| `topic` | VARCHAR(40) | Tên chủ đề, lấy từ enum `WorkspaceTopic` trong mã (20 giá trị). DB cố ý **không** có CHECK để thêm chủ đề mới không cần migration | `DATABASE` |

Khóa chính là cặp `(workspace_id, topic)`. Tối đa 3 chủ đề mỗi nhóm, do API kiểm tra. Có index theo `topic` để lọc nhanh ở trang Khám phá.

#### e) Bảng `idempotency_records`: chống tạo nhóm trùng

| Cột | Ý nghĩa dễ hiểu |
|---|---|
| `actor_id` | Ai gửi request |
| `route_key` | Request nào (vd. "tạo nhóm") |
| `idempotency_key` | Mã client tự sinh và gửi trong header `Idempotency-Key` |
| `request_hash` | Băm nội dung request. Cùng mã mà khác nội dung thì báo 409 |
| `response_status`, `response_body` | Kết quả lần đầu, để trả lại y nguyên khi gửi lại |
| `expires_at` | Hết hiệu lực sau 24 giờ |

#### f) Các bảng chỉ đọc

- `users`: lấy `display_name`, `avatar_storage_key`, `avatar_color` để vẽ "gương mặt" thành viên trên thẻ nhóm; lấy `email` khi chủ nhóm mời qua email.
- `documents`, `discussions`: chỉ **đếm** (số tài liệu, số bài, số bài 7 ngày qua) cho thẻ nhóm.

#### g) Service nào làm gì: nhận gì, trả gì

**`WorkspaceService`**: vòng đời nhóm, danh sách, khám phá, tham gia.

| Hàm | Input (nhận gì) | Output (trả gì) | Đọc / ghi bảng | Lỗi có thể gặp |
|---|---|---|---|---|
| `getWorkspaces` | `userId`, trang (`page`, `size`) | Trang `WorkspaceResponse` | R: `workspaces`, `workspace_members`, thống kê | |
| `createWorkspace` | `ownerId`, `CreateWorkspaceRequest {name, description, visibility, cloudAllowed, topics}` | `WorkspaceResponse` của nhóm mới | W: `workspaces`, `workspace_members` (dòng OWNER), `workspace_topics` | 400 dữ liệu sai; 409 trùng `Idempotency-Key` khác nội dung |
| `getWorkspace` | `userId`, `workspaceId` | `WorkspaceResponse` (có `userRole`, là `null` nếu chưa tham gia nhóm PUBLIC) | R: `workspaces`, `workspace_members` | 404 nếu không có quyền xem |
| `updateWorkspace` | `userId`, `workspaceId`, `UpdateWorkspaceRequest {name?, description?, visibility?, cloudAllowed?, topics?, expectedVersion}` | `WorkspaceResponse` sau khi sửa | W: `workspaces`, `workspace_topics` | 403 VIEWER; 403 không phải OWNER mà đổi mức/cloud; 409 sai `expectedVersion`; 400 về PRIVATE khi còn người khác |
| `deleteWorkspace` | `userId`, `workspaceId` | Không trả gì | W: `workspaces.status = DELETING` | 403 không phải OWNER |
| `getPublicWorkspaces` | `userId`, `search`, `topic`, trang | Trang `WorkspaceResponse` | R: `workspaces`, `workspace_topics` | |
| `getDiscoverableTopics` | `userId` | Danh sách `{topic, label, icon, count}` chỉ gồm chủ đề có nhóm | R: `workspace_topics`, `workspaces` | |
| `joinPublicWorkspace` | `userId`, `workspaceId` | `WorkspaceResponse` | W: `workspace_members` (VIEWER), `workspaces.permission_version` | 400 nhóm không PUBLIC; 409 đã là thành viên |
| `setVisibilityAsAdmin` | `workspaceId`, `visibility` | `WorkspaceResponse` | W: `workspaces` | Dùng ở trang quản trị |

`WorkspaceResponse` gồm: `id, ownerId, name, description, visibility, cloudAllowed, documentCount, memberCount, recentPostCount, postCount, faces[], topics[], hasCover, version, createdAt, updatedAt, userRole`. Các số đếm và `faces` do **`WorkspaceStatsLoader`** tính bằng 6 truy vấn cho cả trang.

**`WorkspaceMemberService`**: quản lý thành viên (chỉ OWNER).

| Hàm | Input | Output | Đọc / ghi bảng | Lỗi có thể gặp |
|---|---|---|---|---|
| `getMembers` | `currentUserId`, `workspaceId` | Danh sách `WorkspaceMemberResponse {userId, email, displayName, hasAvatar, avatarColor, role, status, invitedById}` | R: `workspace_members`, `users` | 403 không phải OWNER (lỗi W2) |
| `addMember` | `currentUserId`, `workspaceId`, `{email, role}` | `WorkspaceMemberResponse` | W: `workspace_members`, `permission_version` | 404 email chưa đăng ký; 409 đã là thành viên; 400 nhóm PRIVATE |
| `updateMemberRole` | `currentUserId`, `workspaceId`, `targetUserId`, `{role}` | `WorkspaceMemberResponse` | W: `workspace_members.role`, `permission_version` | 400 hạ vai trò chủ nhóm gốc |
| `removeMember` | `currentUserId`, `workspaceId`, `targetUserId` | Không trả gì | W: `workspace_members.status = REVOKED`, `permission_version` | 400 gỡ chủ nhóm gốc |

**`WorkspaceInviteService`**: link mời.

| Hàm | Input | Output | Đọc / ghi bảng | Lỗi có thể gặp |
|---|---|---|---|---|
| `create` | `callerId`, `workspaceId`, `{role, expiresInDays, maxUses}` | `InviteResponse {id, token, role, createdAt, expiresAt, maxUses, usedCount, active}`. **`token` chỉ có ở lần tạo** | W: `workspace_invites` | 403 không phải OWNER; 400 nhóm PRIVATE hoặc role OWNER |
| `list` | `callerId`, `workspaceId` | Danh sách `InviteResponse` (không có token) | R: `workspace_invites` | 403 |
| `revoke` | `callerId`, `workspaceId`, `inviteId` | Không trả gì | W: `revoked_at` | 404 |
| `preview` | `token` (không cần đăng nhập) | `InvitePreview {workspaceId, workspaceName, invitedByName, role}` | R: `workspace_invites`, `workspaces`, `users` | 404 cho mọi trường hợp link không dùng được |
| `accept` | `callerId`, `token` | `InvitePreview` | W: `workspace_members`, `used_count`, `permission_version` | 404 link hỏng; 409 đã là thành viên |

**`WorkspaceCoverService`**: ảnh bìa.

| Hàm | Input | Output | Đọc / ghi | Lỗi có thể gặp |
|---|---|---|---|---|
| `upload` | `userId`, `workspaceId`, tệp ảnh (multipart) | Không trả gì | W: kho tệp, `cover_storage_key` | 403 VIEWER; 400 sai định dạng hoặc quá 5 MB |
| `remove` | `userId`, `workspaceId` | Không trả gì | W: `cover_storage_key = NULL` | 403 |
| `read` | `userId`, `workspaceId` | Byte ảnh JPEG | R: kho tệp | 404 không có quyền xem hoặc chưa có ảnh |

**`WorkspaceVisibilityPolicy`** không có API riêng. Đây là "bộ luật" được các service trên gọi: `requireCanAddMember` (nhóm PRIVATE thì không thêm người), `requireCanChangeTo` (không về PRIVATE khi còn người khác).

### 2.3. Danh sách API

Controller: [WorkspaceController.java](../../core-api/src/main/java/com/unichat/core/workspace/api/WorkspaceController.java), [WorkspaceMemberController.java](../../core-api/src/main/java/com/unichat/core/workspace/api/WorkspaceMemberController.java), [WorkspaceInviteController.java](../../core-api/src/main/java/com/unichat/core/workspace/api/WorkspaceInviteController.java)

| Method & đường dẫn (`/api/v1`) | Service xử lý | Ai được gọi |
|---|---|---|
| `GET /workspaces?page&size` | `WorkspaceService.getWorkspaces` | Đăng nhập |
| `POST /workspaces` (header `Idempotency-Key` tùy chọn) | `createWorkspace` | Đăng nhập |
| `GET /workspaces/{id}` | `getWorkspace` | PUBLIC: ai cũng xem; còn lại: thành viên |
| `PATCH /workspaces/{id}` (bắt buộc `expectedVersion`) | `updateWorkspace` | OWNER, EDITOR (riêng mức hiển thị và cloud: chỉ OWNER) |
| `DELETE /workspaces/{id}` | `deleteWorkspace` | OWNER |
| `GET /workspaces/explore?search&topic&page&size` | `getPublicWorkspaces` | Đăng nhập |
| `GET /workspaces/topics` | trả enum, cache 5 phút | Đăng nhập |
| `GET /workspaces/explore/topics` | `getDiscoverableTopics` | Đăng nhập |
| `POST /workspaces/{id}/join` | `joinPublicWorkspace` | Đăng nhập, nhóm phải PUBLIC |
| `PUT / DELETE / GET /workspaces/{id}/cover` | `WorkspaceCoverService` | Ghi: OWNER, EDITOR. Đọc: ai xem được nhóm |
| `GET / POST /workspaces/{id}/members` | `WorkspaceMemberService.getMembers / addMember` | **Chỉ OWNER** |
| `PATCH / DELETE /workspaces/{id}/members/{userId}` | `updateMemberRole / removeMember` | Chỉ OWNER |
| `POST / GET /workspaces/{id}/invites` | `WorkspaceInviteService.create / list` | Chỉ OWNER |
| `DELETE /workspaces/{id}/invites/{inviteId}` | `revoke` | Chỉ OWNER |
| `GET /invites/{token}` | `preview` | **Không cần đăng nhập** |
| `POST /invites/{token}/accept` | `accept` | Đăng nhập |

### 2.4. Luồng hoạt động chi tiết

#### a) Tạo nhóm

1. **Frontend**: [create-workspace-modal.tsx](../../frontend/src/features/workspaces/components/create-workspace-modal.tsx) (form trong [workspace-form.tsx](../../frontend/src/features/workspaces/components/workspace-form.tsx), chọn chủ đề bằng [topic-picker.tsx](../../frontend/src/features/workspaces/components/topic-picker.tsx)) gọi `createWorkspace()` trong [workspace-api.ts](../../frontend/src/features/workspaces/workspace-api.ts) → `POST /workspaces` với `{name, description, visibility, cloudAllowed, topics}`.
2. **Controller** kiểm tra input: tên 3–100 ký tự, mô tả ≤ 1000, `visibility` bắt buộc, ≤ 3 chủ đề. Nếu có `Idempotency-Key`, nó tra bảng `idempotency_records`: request trùng thì trả lại đúng response cũ, khác nội dung thì báo xung đột.
3. **Service `createWorkspace`**:
   - sinh `id` UUIDv7 và tạo `Workspace` (status `ACTIVE`, `permission_version = 0`);
   - tạo `WorkspaceMember(role = OWNER, status = ACTIVE)` cho người tạo;
   - `replaceTopics`: xóa hết rồi ghi lại chủ đề vào `workspace_topics`.
4. Trả `WorkspaceResponse` kèm thống kê thẻ. `WorkspaceStatsLoader` gom 6 truy vấn: đếm tài liệu, đếm thành viên, đếm bài 7 ngày gần nhất, đếm tổng bài, 4 "gương mặt" (ROW_NUMBER theo nhóm, chủ nhóm đứng đầu), chủ đề.

#### b) Danh sách "Nhóm của tôi"

`GET /workspaces` → `WorkspaceRepository.findAllVisibleToUser` lấy nhóm `ACTIVE` mà người gọi là chủ hoặc là thành viên `ACTIVE`. Thống kê được lấy **một lần cho cả trang** (tránh N+1). Frontend hiển thị bằng [workspace-card.tsx](../../frontend/src/features/workspaces/components/workspace-card.tsx) và [group-rail.tsx](../../frontend/src/features/workspaces/components/group-rail.tsx).

#### c) Khám phá và tham gia nhóm công khai

1. [explore-tab.tsx](../../frontend/src/features/workspaces/components/explore-tab.tsx) gọi `getPublicWorkspaces()` → `GET /workspaces/explore?search=&topic=`.
2. Repository dùng chung điều kiện `DISCOVERABLE`: nhóm `ACTIVE`, `PUBLIC`, người gọi chưa là thành viên, tên hoặc mô tả khớp `LIKE`. Kết quả sắp theo `updated_at DESC, id DESC`.
3. Thanh lọc chủ đề lấy từ `GET /workspaces/explore/topics` (chỉ hiện chủ đề có nhóm).
4. Bấm "Tham gia" → `POST /workspaces/{id}/join` → service kiểm tra nhóm là PUBLIC và người gọi chưa là thành viên ACTIVE, rồi lưu `WorkspaceMember(VIEWER)` và tăng `permission_version`. Nếu người này từng bị gỡ (dòng REVOKED), JPA ghi đè dòng cũ thành ACTIVE.

#### d) Xem và sửa thông tin nhóm

- `GET /workspaces/{id}`: nhóm PUBLIC thì ai cũng xem được (`userRole = null` nếu chưa tham gia). Nhóm khác yêu cầu là thành viên; không phải thì trả **404** để giấu việc nhóm tồn tại.
- `PATCH /workspaces/{id}`: VIEWER bị chặn. `expectedVersion` phải khớp `version` hiện tại, nếu không thì báo 409 (người khác vừa sửa). Đổi `visibility` hoặc `cloudAllowed` chỉ OWNER được làm, và phải qua `requireCanChangeTo`: không cho về PRIVATE khi còn người khác trong nhóm.
- Frontend: [workspace-settings-page](../../frontend/src/features/settings/) và [group-about-tab.tsx](../../frontend/src/features/workspaces/components/group-about-tab.tsx).

#### e) Xóa nhóm

`DELETE /workspaces/{id}` → chỉ OWNER → `status = DELETING`. **Chưa có gì xảy ra sau đó** (trong mã có `// TODO: Full delete saga`, [WorkspaceService.java:195](../../core-api/src/main/java/com/unichat/core/workspace/service/WorkspaceService.java#L195)). Nhóm biến khỏi "Nhóm của tôi" và Khám phá vì hai truy vấn này lọc `ACTIVE`, nhưng các module khác vẫn coi nhóm như đang hoạt động (xem 2.7).

#### f) Quản lý thành viên (chủ nhóm)

Frontend: [member-panel.tsx](../../frontend/src/features/members/components/member-panel.tsx), hook TanStack Query trong [member-hooks.ts](../../frontend/src/features/members/member-hooks.ts) (`useMembers`, `useInviteMember`, `useUpdateMemberRole`, `useRemoveMember`). Mỗi mutation thành công thì `invalidateQueries` để tải lại danh sách.

| Thao tác | Luồng backend |
|---|---|
| Xem danh sách | `validateOwnerAccess` (phải là OWNER) → lấy thành viên ACTIVE → nạp `users` một lần → trả email, tên, avatar |
| Mời qua email | OWNER → nhóm không PRIVATE → tìm user theo email (không có thì 404) → đã ACTIVE thì 409 → lưu thành viên với vai trò được chọn → tăng `permission_version` |
| Đổi vai trò | OWNER → không được hạ vai trò của chủ nhóm gốc (`owner_id`) → lưu → tăng `permission_version` |
| Gỡ thành viên | OWNER → không được gỡ chủ nhóm gốc → đổi `status = REVOKED` → tăng `permission_version` |

#### g) Link mời

1. Chủ nhóm mở [invite-panel.tsx](../../frontend/src/features/workspaces/components/invite-panel.tsx) → `createInvite()` trong [invite-api.ts](../../frontend/src/features/workspaces/invite-api.ts) → `POST /workspaces/{id}/invites` với `{role, expiresInDays (1–30), maxUses (1–200)}`.
2. Service kiểm tra: là OWNER, nhóm không PRIVATE, `role` không phải OWNER. Sau đó sinh token ngẫu nhiên 32 byte (base64url) và chỉ lưu **SHA-256 của token**. Token gốc trả về **đúng một lần**.
3. Người nhận mở `/invite/:token` (route công khai trong [app-router.tsx](../../frontend/src/app/app-router.tsx)). Trang gọi `GET /invites/{token}`, không cần đăng nhập, để xem tên nhóm, người mời và vai trò. Response có `Cache-Control: no-store`. Link không tồn tại, hết hạn, hết lượt hay đã thu hồi đều trả cùng một lỗi 404, để người lạ không phân biệt được.
4. Đăng nhập xong bấm chấp nhận → `POST /invites/{token}/accept`. Service tạo thành viên với vai trò của link, `used_count++`, tăng `permission_version`. Lượt dùng chỉ được tính ở bước này, không tính ở bước xem trước, để bot xem trước link của ứng dụng chat không "tiêu" mất lượt mời.

#### h) Ảnh bìa

`PUT /workspaces/{id}/cover` (multipart, ≤ 5 MB, PNG/JPEG/WebP; OWNER hoặc EDITOR). Ảnh được giải mã, cắt về tỉ lệ 3:1, vẽ lại 1200×400 và mã hóa JPEG chất lượng 0.82. Việc mã hóa lại loại bỏ metadata EXIF (vd. tọa độ GPS). `GET` kiểm tra quyền xem: bìa của nhóm riêng là nội dung của nhóm đó.

### 2.5. Frontend sử dụng API thế nào

- Mọi lời gọi JSON đi qua `fetchJson()` trong [lib/api-client.ts](../../frontend/src/lib/api-client.ts): tự gắn access token, gặp 401 thì refresh rồi thử lại một lần.
- Trang nhóm [group-page.tsx](../../frontend/src/features/workspaces/group-page.tsx) có các tab con: `about`, `discussions`, `documents`, `members`. Dữ liệu nhóm và cờ `isOwner` được chia sẻ qua context `useWorkspace()`.
- Riêng upload ảnh bìa dùng `fetch` trực tiếp (multipart phải tự đặt `Content-Type`).

### 2.6. Những gì đã làm tốt

- Quy tắc mức hiển thị được gom về một chỗ (`WorkspaceVisibilityPolicy`) và áp dụng cho ba nơi: thêm thành viên, chủ nhóm đổi mức, admin đổi mức.
- Nhóm không có quyền xem trả 404 thay vì 403, nên người ngoài không dò được nhóm nào tồn tại.
- Link mời làm đúng chuẩn: token 256 bit, chỉ lưu hash, hiện một lần, có hạn và giới hạn lượt, xem trước không tính lượt, link không bao giờ cấp quyền OWNER.
- Thống kê thẻ gom theo trang (6 truy vấn cố định thay vì 6×N).
- Có khóa lạc quan khi sửa, có idempotency khi tạo.
- Ảnh bìa được mã hóa lại, xóa metadata.

### 2.7. Những chỗ chưa ổn

| # | Mức | Vấn đề | Chi tiết và cách tái hiện |
|---|---|---|---|
| W1 | **Cao** | **Link mời đưa được người vào nhóm PRIVATE** | `accept()` ([WorkspaceInviteService.java:175](../../core-api/src/main/java/com/unichat/core/workspace/service/WorkspaceInviteService.java#L175)) không gọi lại `requireCanAddMember`, và khi đổi sang PRIVATE thì link cũ không bị thu hồi. Tái hiện: tạo nhóm SHARED → tạo link mời 200 lượt → đổi sang PRIVATE (được phép vì chưa ai vào) → người khác dùng link → họ thành thành viên của nhóm "Chỉ mình tôi". **Sửa:** kiểm tra mức hiển thị trong `accept()`, và thu hồi mọi link còn hiệu lực khi chuyển sang PRIVATE |
| W2 | **Cao** | **Tab "Thành viên" lỗi với EDITOR và VIEWER** | `MemberPanel` gọi `useMembers()` cho mọi người ([member-panel.tsx:45](../../frontend/src/features/members/components/member-panel.tsx#L45)), nhưng `GET /members` chỉ cho OWNER ([WorkspaceMemberService.java:50](../../core-api/src/main/java/com/unichat/core/workspace/service/WorkspaceMemberService.java#L50)). Kết quả: người không phải chủ nhóm mở tab sẽ thấy dòng đỏ "Chỉ chủ sở hữu mới có quyền quản lý thành viên" và danh sách trống, dù tab vẫn hiện số thành viên. **Sửa:** tách endpoint "danh bạ nhóm" chỉ đọc cho mọi thành viên (tên, avatar, vai trò, không có email), còn OWNER dùng endpoint quản lý như hiện tại |
| W3 | **Cao** | **Xóa nhóm chưa có tác dụng thật** | Chỉ đổi sang `DELETING` ([WorkspaceService.java:182](../../core-api/src/main/java/com/unichat/core/workspace/service/WorkspaceService.java#L182)). Các nơi khác không kiểm tra trạng thái nhóm: bảng tin (`FeedService.resolveWorkspaceIds`) vẫn hiện bài của nhóm đã xóa; `DiscussionService` vẫn cho đăng bài, bình luận; danh bạ Work Chat (`ContactDirectory`) vẫn coi đó là nhóm chung; `GET /workspaces/{id}` với nhóm PUBLIC vẫn trả về. Ngoài ra không có khôi phục, không dọn tài liệu, vector, tệp. **Sửa:** viết một hàm kiểm tra dùng chung `requireActiveMember` (có lọc `workspace.status = ACTIVE`) cho mọi module; thêm job dọn dẹp chạy qua RabbitMQ |
| W4 | **Trung bình** | **Thành viên không thể tự rời nhóm** | `removeMember` chỉ cho OWNER; frontend không có nút "Rời nhóm". Người đã vào nhóm PUBLIC chỉ có cách nhờ chủ nhóm gỡ |
| W5 | **Trung bình** | **Nhiều OWNER nhưng `owner_id` không đổi; quyền không nhất quán** | `updateMemberRole` cho phép nâng người khác lên OWNER, và `addMember` qua email cũng nhận `role = OWNER`, trong khi link mời thì cấm OWNER. Một "đồng chủ sở hữu" như vậy **xóa được cả nhóm** (vì `deleteWorkspace` kiểm tra vai trò chứ không kiểm tra `owner_id`), nhưng không bị hạ được và không bàn giao được nhóm. **Sửa:** có chức năng "chuyển quyền sở hữu" riêng (đổi `owner_id` và hạ chủ cũ), cấm gán OWNER qua email |
| W6 | **Trung bình** | Đua lượt dùng link mời | `WorkspaceInvite` không có `@Version` hay khóa dòng; `recordUse()` là `usedCount++` trong bộ nhớ. Nhiều người bấm chấp nhận cùng lúc có thể vượt `max_uses`. Hai request chấp nhận đồng thời của cùng một người sẽ đụng khóa chính và trả 500 thay vì 409 |
| W7 | **Thấp** | Người bị gỡ tự vào lại nhóm PUBLIC ngay được | Không có danh sách chặn. Có thể chấp nhận được, nhưng nên ghi rõ thành quyết định nghiệp vụ |
| W8 | **Thấp** | Khám phá "sôi nổi nhất lên đầu" không đúng như chú thích | Sắp theo `workspaces.updated_at`, nhưng trường này chỉ đổi khi sửa cài đặt nhóm; đăng bài hay có người tham gia không cập nhật nó. Nên sắp theo `max(discussions.created_at)` hoặc số bài 7 ngày |
| W9 | **Thấp** | Mời qua email làm lộ email nào đã đăng ký | Trả "Không tìm thấy người dùng với email này". Rủi ro thấp vì chỉ OWNER gọi được |
| W10 | **Thấp** | Cột và giá trị thừa trong DB gây hiểu nhầm | `workspaces.category`, `join_policy`, `contribution_policy`, `question_count` không được entity ánh xạ và không mã nào dùng. CHECK của `workspace_members` vẫn cho `role = CONTRIBUTOR` và `status = PENDING_APPROVAL`, trong khi enum Java chỉ có `OWNER/EDITOR/VIEWER` và `ACTIVE/REVOKED`. Người mới đọc DB sẽ tưởng có tính năng "duyệt yêu cầu tham gia" hay "người đóng góp". **Sửa:** migration xóa cột thừa và thu hẹp CHECK, hoặc ghi chú rõ trong ADR |

---

## 3. Mạng xã hội: Bảng tin và Thảo luận

### 3.1. Khái niệm nghiệp vụ

| Khái niệm | Trong mã | Ghi chú |
|---|---|---|
| Bài viết | `Discussion` | Có `label`: `QUESTION` (hỏi đáp), `DISCUSSION` (thảo luận), `ANNOUNCEMENT` (thông báo, chỉ OWNER/EDITOR đăng). `status`: `OPEN`, `CLOSED`, `ARCHIVED`, `DELETED` (xóa mềm) |
| Bình luận | `DiscussionReply` | Lồng nhau qua `parent_reply_id`. `is_ai_answer = true` nếu do trợ lý viết; có `citations` (JSON) và `retrieval_trace_id` |
| Cảm xúc | `Reaction` | 7 loại: LIKE, LOVE, CARE, HAHA, WOW, SAD, ANGRY. Mỗi người tối đa 1 cảm xúc trên mỗi đối tượng. `vote_score` = tổng số cảm xúc |
| Lưu bài | `Bookmark` | |
| Đã đọc thông báo | `PostRead` | Chỉ áp dụng cho bài `ANNOUNCEMENT` |
| Tệp đính kèm | `PostAttachment` | `IMAGE` hoặc `DOCUMENT`. Tài liệu đính kèm **đồng thời được đưa vào thư viện nhóm** và có tóm tắt AI |
| Thông báo | `Notification` | Loại `DISCUSSION_REPLY` (có người bình luận bài của bạn), `MENTION` (bạn được nhắc tên) |
| Chấp nhận câu trả lời | `discussions.accepted_reply_id` | Kiểu StackOverflow, chỉ tác giả bài chọn |

### 3.2. Dữ liệu và các service xử lý

#### a) Bảng `discussions`: mỗi dòng là một bài viết

| Cột | Kiểu | Bắt buộc | Ý nghĩa dễ hiểu | Ví dụ |
|---|---|---|---|---|
| `id` | UUID | Có | Mã bài | |
| `workspace_id` | UUID → `workspaces.id` | Có | Bài thuộc nhóm nào. **Quyền đọc bài = quyền trong nhóm này** | |
| `author_id` | UUID → `users.id` | Có | Người đăng | |
| `title` | VARCHAR(200) | Có | Tiêu đề | "Điều kiện thi lại?" |
| `body` | TEXT | Có | Nội dung. Không giới hạn độ dài (lỗi S11) | |
| `label` | VARCHAR(20) | Không trong DB, mã luôn điền | Loại bài: `QUESTION` (hỏi đáp), `DISCUSSION` (thảo luận, mặc định), `ANNOUNCEMENT` (thông báo, chỉ OWNER/EDITOR). Không đổi được sau khi đăng | `QUESTION` |
| `pinned` | BOOLEAN | Có, mặc định `false` | Bài ghim lên đầu nhóm | `true` |
| `status` | VARCHAR(20) | Có, mặc định `OPEN` | `OPEN` (bình thường), `CLOSED` và `ARCHIVED` (khóa bình luận, nhưng chưa có API nào chuyển sang, lỗi S12), `DELETED` (đã xóa mềm) | `OPEN` |
| `view_count` | INTEGER | Có | Số lượt xem. Tăng ở **mỗi** lần mở bài, kể cả F5 (lỗi S5) | `42` |
| `reply_count` | INTEGER | Có | Số bình luận, lưu sẵn để khỏi đếm lại. `0` nghĩa là "chưa giải đáp" | `3` |
| `vote_score` | INTEGER | Có | Tổng số cảm xúc trên bài. Dùng để sắp "Nổi bật" | `10` |
| `accepted_reply_id` | UUID | Không | Bình luận được tác giả chọn là câu trả lời đúng (kiểu StackOverflow) | |
| `background_key` | VARCHAR(24) | Không | Mã nền màu cho bài ngắn. Có tệp đính kèm thì tự bỏ nền | `sunset` |
| `created_at`, `updated_at` | TIMESTAMPTZ | Có | Lúc đăng; lúc có thay đổi gần nhất (kể cả có bình luận mới) | |
| `edited_at` | TIMESTAMPTZ | Không | Lúc tác giả sửa bài. Có giá trị thì giao diện hiện "đã chỉnh sửa" | |
| `tags` | JSONB | Có, mặc định `[]` | **Cột thừa**: tính năng thẻ (tag) đã bị gỡ khỏi sản phẩm nhưng cột còn trong DB | `[]` |

Index đáng chú ý: GIN full-text trên `title || ' ' || body` để tìm kiếm.

#### b) Bảng `discussion_replies`: bình luận (và câu trả lời của trợ lý)

| Cột | Kiểu | Bắt buộc | Ý nghĩa dễ hiểu |
|---|---|---|---|
| `id` | UUID | Có | Mã bình luận |
| `discussion_id` | UUID → `discussions.id` | Có | Thuộc bài nào |
| `author_id` | UUID → `users.id` | Có | Người viết. Câu trả lời của trợ lý đứng tên tài khoản hệ thống `…0000a1` |
| `body` | TEXT | Có | Nội dung |
| `parent_reply_id` | UUID | Không | Trả lời cho bình luận nào. `NULL` là bình luận cấp 1. Frontend dựa vào cột này để dựng cây |
| `is_ai_answer` | BOOLEAN | Có, mặc định `false` | `true` nếu do trợ lý AI viết. Bảng tin dựa vào đây để gắn dấu "trợ lý đã trả lời" |
| `citations` | JSONB | Có, mặc định `[]` | Danh sách trích dẫn của câu trả lời AI. Mỗi phần tử: `{citationId, documentId, fileName, locator, excerpt}`, tức mã trích dẫn, tài liệu nào, tên tệp, vị trí (trang/đoạn), đoạn trích ≤ 500 ký tự |
| `retrieval_trace_id` | UUID | Không | Mã truy vết lần gọi AI, để tra log khi câu trả lời sai |
| `vote_score` | INTEGER | Có | Tổng cảm xúc trên bình luận |
| `created_at` | TIMESTAMPTZ | Có | Lúc viết |

#### c) Bảng `reactions`: cảm xúc

| Cột | Ý nghĩa dễ hiểu | Ví dụ |
|---|---|---|
| `id` | Mã dòng | |
| `user_id` | Ai thả cảm xúc | |
| `target_type` | Thả lên loại đối tượng nào: `DISCUSSION` (bài) hoặc `DISCUSSION_REPLY` (bình luận). DB còn cho `COMMUNITY_MESSAGE`, `AI_ANSWER` từ thiết kế cũ, mã không dùng | `DISCUSSION` |
| `target_id` | Mã của bài hoặc bình luận. **Không có khóa ngoại**, vì cùng cột trỏ tới hai bảng khác nhau, nên DB không chặn được ID rác (lỗi S1) | |
| `reaction_type` | Một trong 7 loại: `LIKE, LOVE, CARE, HAHA, WOW, SAD, ANGRY` | `LOVE` |
| `created_at` | Lúc thả | |

UNIQUE `(user_id, target_type, target_id)`: mỗi người chỉ có **một** cảm xúc trên một đối tượng; đổi loại là sửa dòng đó.

#### d) Các bảng nhỏ

| Bảng | Cột | Ý nghĩa dễ hiểu |
|---|---|---|
| `bookmarks` | `id`, `user_id`, `discussion_id`, `created_at` | "Tôi đã lưu bài này". UNIQUE `(user_id, discussion_id)` nên bấm lưu hai lần không tạo hai dòng |
| `post_reads` | `discussion_id`, `user_id`, `read_at` | "Tôi đã đọc bài Thông báo này lúc nào". Khóa chính là cặp, nên mỗi người chỉ được tính một lần |

#### e) Bảng `post_attachments`: tệp đính kèm bài

| Cột | Kiểu | Ý nghĩa dễ hiểu | Ví dụ |
|---|---|---|---|
| `id` | UUID | Mã tệp đính kèm | |
| `discussion_id` | UUID | Thuộc bài nào | |
| `kind` | VARCHAR(16) | `IMAGE` (hiện thành ảnh) hoặc `DOCUMENT` (PDF/DOCX/TXT) | `DOCUMENT` |
| `storage_key` | VARCHAR(255) | Đường dẫn tệp trong kho: `posts/{nhóm}/{bài}/{uuid}_{tên}` | |
| `original_name` | VARCHAR(255) | Tên tệp gốc người dùng tải lên | `quy-che.pdf` |
| `media_type` | VARCHAR(100) | Loại MIME | `application/pdf` |
| `byte_size` | BIGINT | Dung lượng (byte), tối đa 20 MiB | `1048576` |
| `document_id` | UUID → `documents.id` | Với `DOCUMENT`: bản sao tệp này trong **thư viện nhóm**. Trợ lý AI chỉ đọc được tài liệu qua thư viện | |
| `uploaded_by` | UUID | Ai tải lên | |
| `ai_summary` | TEXT | Tóm tắt 3–5 câu do AI viết | |
| `summary_state` | VARCHAR(16), mặc định `PENDING` | Trạng thái tóm tắt: `NOT_APPLICABLE` (ảnh, không tóm tắt), `PENDING` (đang chờ AI), `READY` (đã có), `UNAVAILABLE` (không tóm tắt được) | `READY` |
| `created_at` | TIMESTAMPTZ | Lúc tải lên | |

#### f) Bảng `notifications`: thông báo trên chuông

| Cột | Ý nghĩa dễ hiểu | Ví dụ |
|---|---|---|
| `id` | Mã thông báo | |
| `user_id` | **Người nhận** | |
| `type` | Loại thông báo. CHECK chỉ nhận: `DOCUMENT_APPROVED`, `DOCUMENT_REJECTED`, `JOIN_REQUEST`, `JOIN_APPROVED`, `DISCUSSION_REPLY`, `AI_MENTION_REPLY`, `COMMUNITY_MENTION`. **Không có `MENTION`**, trong khi mã ghi `MENTION` (lỗi S2) | `DISCUSSION_REPLY` |
| `workspace_id` | Nhóm liên quan | |
| `payload` | JSON chứa chi tiết. Bình luận mới: `{discussionId, replyId, replyAuthorId}`. Nhắc tên: `{discussionId, replyId, mentionedBy}` | |
| `is_read` | Đã đọc chưa | `false` |
| `created_at` | Lúc tạo | |

#### g) Service nào làm gì: nhận gì, trả gì

**`DiscussionService`**: bài viết và bình luận. Mọi hàm nhận `workspaceId` và `userId`, bắt đầu bằng `verifyMembership` (phải là thành viên ACTIVE, nếu không thì 403).

| Hàm | Input (ngoài `workspaceId`, `userId`) | Output | Đọc / ghi bảng | Lỗi có thể gặp |
|---|---|---|---|---|
| `listDiscussions` | `label?`, `sort` (NEW/HOT/TOP), `q?`, trang | Trang `DiscussionResponse` | R: `discussions`, `users`, `reactions`, `post_attachments`, `discussion_replies` | 403 |
| `getDiscussion` | `discussionId` | `DiscussionResponse` | R: như trên; W: `view_count + 1` | 404 bài không có hoặc đã xóa |
| `createDiscussion` | `{title, body, label?, backgroundKey?}` | `DiscussionResponse` | W: `discussions`; phát `MentionEvent` | 403 VIEWER đăng ANNOUNCEMENT; 400 nền màu với bài dài |
| `updateDiscussion` | `discussionId`, `{title, body, backgroundKey}` | `DiscussionResponse` | W: `discussions`, `edited_at`; phát lại `MentionEvent` (lỗi S6) | 403 không phải tác giả |
| `deleteDiscussion` | `discussionId` | Không trả gì | W: `status = DELETED` | 403 không phải tác giả hay OWNER/EDITOR |
| `setPinned` | `discussionId`, `pinned` | `DiscussionResponse` | W: `pinned` | 403 VIEWER |
| `getReplies` | `discussionId` | Danh sách `ReplyResponse`, cũ trước | R: `discussion_replies`, `users`, `reactions` | |
| `addReply` | `discussionId`, `{body, parentReplyId?}` | `ReplyResponse` | W: `discussion_replies`, `discussions.reply_count`; phát `NewReplyEvent`, `MentionEvent`, có `@ai` thì phát `AiMentionEvent` | 400 bài CLOSED/ARCHIVED |
| `acceptReply` / `clearAcceptedReply` | `discussionId`, `replyId` | `DiscussionResponse` | W: `accepted_reply_id` | 403 không phải tác giả bài |
| `listMentionableMembers` | (không) | Danh sách `{userId, handle}` | R: `workspace_members`, `users` | |

`DiscussionResponse` gồm: `id, workspaceId, workspaceName, authorId, authorName, authorAvatar, title, body, label, pinned, status, viewCount, replyCount, voteScore, createdAt, updatedAt, editedAt, backgroundKey, acceptedReplyId, attachments[], reactions, hasAiAnswer`.
`ReplyResponse` gồm: `id, discussionId, authorId, authorName, authorAvatar` (luôn `null`, giữ cho client cũ), `authorHasAvatar` (tác giả đã tải ảnh chưa), `authorAvatarColor` (màu tác giả chọn, hoặc `null`), `body, parentReplyId, isAiAnswer, createdAt, voteScore, reactions, citations[]`.

**Các service còn lại của mạng xã hội:**

| Service.hàm | Input | Output | Đọc / ghi bảng | Ghi chú |
|---|---|---|---|---|
| `FeedService.getFeed` | `userId`, `sort` (HOT/NEW/TOP/UNANSWERED/MINE), `scope` (JOINED/SAVED), `q?`, `range?`, trang | Trang `FeedPostResponse {id, workspaceId, workspaceName, author…, title, body, label, voteScore, replyCount, reactions, backgroundKey, acceptedReplyId, isBookmarked, createdAt, attachments[]}` | R: `workspace_members`, `discussions`, `reactions`, `bookmarks`, `users`, `post_attachments` | Chỉ đọc nhóm người gọi đang tham gia |
| `FeedService.getStats` | `userId` | `{totalPosts, unansweredCount}` | R: `discussions` | |
| `ReactionService.toggleReaction` | `userId`, `{targetType, targetId, reactionType}` | `ReactionSummary {counts (mỗi loại bao nhiêu), total, myReaction}` | W: `reactions`, `vote_score` của bài/bình luận | **Không kiểm tra quyền** (lỗi S1) |
| `ReactionService.summariseAll` | `targetType`, danh sách `targetIds`, `userId` | Map `id → ReactionSummary` | R: `reactions` | Dùng nội bộ để nạp theo lô |
| `BookmarkService.toggle` | `userId`, `discussionId` | `true` nếu vừa lưu, `false` nếu vừa bỏ lưu | W: `bookmarks` | Không kiểm tra thành viên (lỗi S10) |
| `PostAttachmentService.attach` | `workspaceId`, `discussionId`, `userId`, tệp | `PostAttachmentResponse {id, kind, originalName, mediaType, byteSize, documentId, aiSummary, summaryState}` | W: kho tệp, `post_attachments`; với tài liệu: `documents` + job RabbitMQ | 403 không phải tác giả; 400 quá 20 MiB, quá 10 tệp, sai định dạng |
| `PostAttachmentService.remove` | …, `attachmentId` | Không trả gì | W: xóa dòng `post_attachments` (không xóa tệp, lỗi S8) | |
| `PostAttachmentService.read` | …, `attachmentId` | `{bytes, mediaType, fileName}` | R: kho tệp | |
| `PostReadService.markRead` | `workspaceId`, `discussionId`, `userId` | Không trả gì | W: `post_reads` (nếu chưa có) | |
| `PostReadService.summarise` | như trên | `PostReadSummary {readCount, memberCount, hasRead, readers[], notYetRead[]}`. Danh sách tên chỉ có với OWNER/EDITOR và nhóm ≤ 40 người | R: `post_reads`, `workspace_members`, `users` | |
| `MentionResolver.resolve` | `workspaceId`, đoạn văn bản, người cần loại trừ | Danh sách `userId` được nhắc (tối đa 20) | R: `workspace_members`, `users` | Handle lấy từ email (lỗi S7) |
| `NotificationEventListener` | Nghe `NewReplyEvent`, `MentionEvent` | Không trả; tạo dòng thông báo | W: `notifications` | Chạy `@Async`, không đợi commit (lỗi S9) |
| `NotificationService` | `userId` (+ `limit` hoặc `notificationId`) | `getRecentNotifications` → danh sách `NotificationResponse {id, type, workspaceId, payload, isRead, createdAt}`; `getUnreadCount` → số; `markAsRead`, `markAllAsRead` → không trả | R/W: `notifications` | |
| `UnifiedSearchService.search` | `userId`, `q`, `limit` | `SearchResults` gồm bài viết và tài liệu khớp | R: `discussions`, `documents` | |
| `ComposeSuggestionService.suggest` | `workspaceId`, `userId`, `q` (≥ 5 ký tự) | Tối đa 5 `ComposeSuggestion` (bài cũ giống nội dung đang gõ) | R: `discussions` | Không gọi AI |

### 3.3. Danh sách API

Controller: [DiscussionController.java](../../core-api/src/main/java/com/unichat/core/communitychat/api/DiscussionController.java), [FeedController.java](../../core-api/src/main/java/com/unichat/core/communitychat/api/FeedController.java), [ReactionController.java](../../core-api/src/main/java/com/unichat/core/communitychat/api/ReactionController.java), [BookmarkController.java](../../core-api/src/main/java/com/unichat/core/communitychat/api/BookmarkController.java), [NotificationController.java](../../core-api/src/main/java/com/unichat/core/communitychat/api/NotificationController.java), [SearchController.java](../../core-api/src/main/java/com/unichat/core/communitychat/api/SearchController.java)

Tiền tố `D = /api/v1/workspaces/{workspaceId}/discussions`.

| Method & đường dẫn | Service | Quyền |
|---|---|---|
| `GET D?label&sort=NEW\|HOT\|TOP&q&page&size` | `DiscussionService.listDiscussions` | Thành viên |
| `POST D` `{title, body, label, backgroundKey}` | `createDiscussion` | Thành viên; ANNOUNCEMENT: OWNER/EDITOR |
| `GET D/{id}` | `getDiscussion` (+1 lượt xem) | Thành viên |
| `PUT D/{id}` | `updateDiscussion` | Tác giả |
| `DELETE D/{id}` | `deleteDiscussion` (xóa mềm) | Tác giả hoặc OWNER/EDITOR |
| `PUT D/{id}/pinned?pinned=` | `setPinned` | OWNER/EDITOR |
| `GET D/{id}/replies` | `getReplies` | Thành viên |
| `POST D/{id}/replies` `{body, parentReplyId}` | `addReply` | Thành viên |
| `PUT D/{id}/accept-reply/{replyId}`, `DELETE D/{id}/accept-reply` | `acceptReply / clearAcceptedReply` | Tác giả bài |
| `POST D/{id}/read`, `GET D/{id}/readers` | `PostReadService` | Thành viên; xem tên người đã đọc: OWNER/EDITOR |
| `POST D/{id}/attachments` (multipart) | `PostAttachmentService.attach` | Tác giả |
| `DELETE D/{id}/attachments/{aid}` | `remove` | Tác giả |
| `GET D/{id}/attachments/{aid}/content` | `read` | Thành viên |
| `GET D/mentionable-members` | `MentionResolver.listMentionable` | Thành viên |
| `GET D/suggestions?q` | `ComposeSuggestionService.suggest` | Thành viên |
| `GET /feed?sort=HOT\|NEW\|TOP\|UNANSWERED\|MINE&scope=JOINED\|SAVED&q&range&page&size` | `FeedService.getFeed` | Đăng nhập; chỉ đọc nhóm mình tham gia |
| `GET /feed/stats` | `FeedService.getStats` | Đăng nhập |
| `POST /reactions` `{targetType, targetId, reactionType}` | `ReactionService.toggleReaction` | **Chỉ cần đăng nhập** (lỗi S1) |
| `POST /bookmarks/{discussionId}` | `BookmarkService.toggle` | **Chỉ cần đăng nhập** (lỗi S10) |
| `GET /notifications?limit`, `GET /notifications/unread-count`, `POST /notifications/{id}/read`, `POST /notifications/read-all` | `NotificationService` | Chủ thông báo |
| `GET /search?q&limit` | `UnifiedSearchService.search` | Đăng nhập; chỉ nhóm mình tham gia |

### 3.4. Luồng hoạt động chi tiết

#### a) Đăng bài (kèm ảnh hoặc tài liệu)

```
create-post-modal.tsx
  │ 1. createDiscussion()  POST D  {title, body, label, backgroundKey}
  ▼
DiscussionService.createDiscussion
  ├─ verifyMembership: workspace_members ACTIVE? không → 403
  ├─ label rỗng → "DISCUSSION"; "ANNOUNCEMENT" mà là VIEWER → 403
  ├─ new Discussion(status = OPEN) → PostBackground.validate(nền màu chỉ hợp lệ với bài ngắn)
  ├─ INSERT discussions
  └─ publishMentions → MentionResolver tìm @handle → MentionEvent (→ thông báo, xem mục j)
  │
  │ 2. Với từng tệp đã chọn: uploadPostAttachment() (XHR để có thanh tiến trình)
  ▼  POST D/{id}/attachments (multipart)
PostAttachmentService.attach
  ├─ chỉ tác giả; ≤ 20 MiB; ≤ 10 tệp mỗi bài; ảnh PNG/JPEG/WebP/GIF hoặc PDF/DOCX/TXT
  ├─ nếu là DOCUMENT → DocumentService.uploadDocument(...)
  │      → INSERT documents, gửi job ingestion qua RabbitMQ, theo luật duyệt đóng góp của nhóm
  ├─ lưu blob vào storage: posts/{ws}/{post}/{uuid}_{tên}
  ├─ INSERT post_attachments
  └─ bài có nền màu → bỏ nền (ảnh trên nền màu khó đọc)
  │
  │ 3. (vài phút sau) AI Service xử lý xong tài liệu → DocumentProcessedEvent
  ▼
AttachmentSummaryService.onDocumentProcessed (@Async, AFTER_COMMIT)
  └─ gọi AiRetrievalClient.ask(chỉ 1 documentId, "Tóm tắt tài liệu này…")
       → ghi post_attachments.ai_summary hoặc đánh dấu "không có tóm tắt"
```

Trong lúc gõ, ô soạn bài gọi `GET D/suggestions?q=` (qua [compose-suggestions.tsx](../../frontend/src/features/community/components/compose-suggestions.tsx)) để gợi ý bài cũ có nội dung giống, tránh hỏi lại câu đã có người trả lời. Truy vấn chỉ chạy khi chuỗi ≥ 5 ký tự, lấy tối đa 5 bài, bài đã giải đáp lên trước, và không gọi AI.

#### b) Xem danh sách bài trong một nhóm

`GET D?label&sort&q`. Thứ tự ưu tiên điều kiện: có `q` thì tìm full-text (`to_tsvector('simple', …) @@ plainto_tsquery`); không có thì xét `label`; sau đó `HOT`/`TOP` (theo `vote_score`); mặc định `NEW`. Bài ghim luôn đứng đầu, trừ khi đang tìm kiếm. Tác giả, tệp đính kèm, cảm xúc và cờ "trợ lý đã trả lời" được nạp **theo lô cho cả trang**. Frontend: [discussion-page.tsx](../../frontend/src/features/community/discussion-page.tsx).

#### c) Bảng tin tổng hợp

[feed-page.tsx](../../frontend/src/features/community/feed-page.tsx) gọi `fetchFeed()` trong [feed-api.ts](../../frontend/src/features/community/feed-api.ts) → `GET /feed`.

1. `resolveWorkspaceIds`: lấy mọi nhóm người gọi là thành viên ACTIVE (phạm vi "tất cả nhóm công khai" đã bỏ).
2. Chọn truy vấn theo thứ tự: có `q` → tìm kiếm; `scope = SAVED` → bài đã lưu; `UNANSWERED` → câu hỏi chưa có bình luận nào; `MINE` → bài của tôi; `TOP` + `range` (TODAY/WEEK/MONTH/YEAR/ALL) → nhiều cảm xúc nhất trong khoảng thời gian; `HOT` → `vote_score` giảm dần; mặc định → mới nhất.
3. Nạp theo lô: cảm xúc, bookmark, tên nhóm, tên tác giả, tệp đính kèm.
4. `GET /feed/stats` trả `{totalPosts, unansweredCount}` cho thanh bên ([feed-sidebar.tsx](../../frontend/src/features/community/components/feed-sidebar.tsx)).

#### d) Xem chi tiết bài và bình luận

- [post-detail-page.tsx](../../frontend/src/features/community/post-detail-page.tsx) gọi `getDiscussion()` (`GET D/{id}`, backend tăng `view_count` mỗi lần gọi) rồi `fetchReplies()` (`GET D/{id}/replies`, trả **toàn bộ** bình luận theo thời gian tăng dần; frontend dựng cây theo `parentReplyId`).
- Bình luận ngay trên thẻ bảng tin dùng [inline-comments.tsx](../../frontend/src/features/community/components/inline-comments.tsx), cùng API.

#### e) Bình luận

`POST D/{id}/replies {body, parentReplyId}` → `addReply`:

1. Kiểm tra thành viên; bài thuộc đúng nhóm; bài không ở trạng thái `CLOSED` hoặc `ARCHIVED`.
2. Lưu reply, `reply_count++`, cập nhật `updated_at` của bài.
3. Phát `NewReplyEvent` → thông báo `DISCUSSION_REPLY` cho tác giả bài (trừ khi tự bình luận bài mình).
4. `publishMentions` → thông báo `MENTION`.
5. Nếu nội dung chứa `@ai` → phát `AiMentionEvent` (xem [mục 4](#4-ai-trong-bài-viết)).

#### f) Thả cảm xúc

[reaction-bar.tsx](../../frontend/src/features/community/components/reaction-bar.tsx) gọi `toggleReaction()` → `POST /reactions`. Có ba trường hợp:

- chưa có cảm xúc → thêm, `vote_score + 1`;
- bấm lại đúng loại đang có → bỏ, `vote_score − 1`;
- bấm loại khác → **xóa dòng cũ rồi chèn dòng mới**, điểm giữ nguyên.

Response là bảng đếm mới nhất kèm cảm xúc của chính mình, để frontend hiển thị số thật thay vì tự đoán.

#### g) Ghim, sửa, xóa, chấp nhận câu trả lời

- Ghim: OWNER/EDITOR → `pinned = true/false`.
- Sửa: chỉ tác giả; chỉ đổi tiêu đề, nội dung, nền; **không đổi được nhãn**, để VIEWER không lách được luật "chỉ OWNER/EDITOR đăng Thông báo". Sau khi sửa, hệ thống quét lại nhắc tên.
- Xóa: tác giả hoặc OWNER/EDITOR → `status = DELETED` (giữ dòng để bookmark và bình luận không bị gãy khóa ngoại). Mọi truy vấn danh sách đều lọc `status <> 'DELETED'`.
- Chấp nhận: chỉ tác giả bài; reply phải thuộc đúng bài; gỡ chấp nhận được.

#### h) Theo dõi "đã đọc" cho bài Thông báo

Mở bài `ANNOUNCEMENT` → frontend gọi `POST D/{id}/read` (ghi `post_reads` nếu chưa có). [post-readers.tsx](../../frontend/src/features/community/components/post-readers.tsx) gọi `GET D/{id}/readers`: ai cũng thấy con số "x/y đã đọc"; OWNER/EDITOR thấy thêm tên người đã đọc và chưa đọc, nếu nhóm ≤ 40 người.

#### i) Nhắc tên thành viên `@handle`

1. Gõ `@` trong [mention-textarea.tsx](../../frontend/src/features/community/components/mention-textarea.tsx) → `GET D/mentionable-members` trả danh sách `{userId, handle}`. **Handle là phần trước dấu `@` của email**, chữ thường.
2. Lúc lưu bài hoặc bình luận, `MentionResolver.resolve` tìm mẫu `@([A-Za-z0-9._-]{2,64})`, đối chiếu với thành viên ACTIVE của nhóm, bỏ chính tác giả, tối đa 20 người → `MentionEvent`.
3. Khi hiển thị, [mention-text.tsx](../../frontend/src/features/community/components/mention-text.tsx) tô màu các `@handle`.

#### j) Thông báo

- Ghi: `NotificationEventListener` (`@Async @EventListener`) lắng nghe `NewReplyEvent` và `MentionEvent`, chèn vào `notifications` với payload JSON chứa `discussionId`, `replyId`.
- Đọc: [notification-bell.tsx](../../frontend/src/features/community/notification-bell.tsx) **hỏi `GET /notifications/unread-count` mỗi 30 giây** (polling, không realtime); mở chuông thì gọi `GET /notifications?limit=20`; bấm vào thì `POST /{id}/read`; "Đánh dấu tất cả" thì `POST /read-all`.

#### k) Tìm kiếm chung

[search-results.tsx](../../frontend/src/features/community/components/search-results.tsx) → `GET /search?q&limit` → `UnifiedSearchService` tìm song song bài viết (full-text) và tài liệu (theo tên) trong các nhóm người gọi tham gia.

### 3.5. Những gì đã làm tốt

- Kiểm tra thành viên có lọc `status = ACTIVE`, nên người bị gỡ không còn đọc được.
- Mọi danh sách nạp dữ liệu phụ theo lô, không N+1.
- Nhãn bài cố định sau khi tạo, chặn được đường lách quyền đăng Thông báo.
- Xóa mềm, và bộ lọc "không xóa" nằm sẵn trong repository nên truy vấn mới khó quên.
- Câu hỏi "chưa giải đáp" định nghĩa nhất quán giữa số trên tab và danh sách (`reply_count = 0`).
- Bảng tin đã bỏ phạm vi "toàn hệ thống", chỉ đọc nhóm của mình.
- Tài liệu đính kèm đi qua đúng luồng thư viện, có duyệt và ingestion, không đi đường tắt.

### 3.6. Những chỗ chưa ổn

| # | Mức | Vấn đề | Chi tiết |
|---|---|---|---|
| S1 | **Nghiêm trọng** | **Thả cảm xúc không kiểm tra quyền (IDOR)** | `toggleReaction` ([ReactionService.java:55](../../core-api/src/main/java/com/unichat/core/communitychat/service/ReactionService.java#L55)) không kiểm tra người gọi có thuộc nhóm chứa bài không, cũng không kiểm tra bài có tồn tại không. Biết ID bài (vd. từ link được chia sẻ) là thả được cảm xúc vào bài của nhóm riêng tư, và response làm lộ số cảm xúc. Gửi `targetId` ngẫu nhiên thì vẫn tạo được dòng rác. **Sửa:** từ `targetId` tìm bài (hoặc bài cha của reply), lấy `workspaceId`, rồi `verifyMembership`; bài không tồn tại hoặc đã xóa thì trả 404 |
| S2 | **Cao** | **Thông báo nhắc tên không lưu được** | Code ghi `type = "MENTION"` ([NotificationEventListener.java:71](../../core-api/src/main/java/com/unichat/core/communitychat/service/NotificationEventListener.java#L71)), nhưng CHECK của bảng `notifications` ([V8__community_chat.sql:81-86](../../core-api/src/main/resources/db/migration/V8__community_chat.sql#L81-L86)) chỉ nhận `COMMUNITY_MENTION`, và không migration nào sửa ràng buộc này. Lệnh INSERT sẽ ném `DataIntegrityViolationException` trong luồng `@Async`, ngoại lệ chỉ được ghi log, người dùng **không bao giờ** nhận thông báo được nhắc tên. **Sửa:** thêm migration bổ sung `'MENTION'` vào CHECK (hoặc đổi mã sang `COMMUNITY_MENTION`), và thêm integration test với Testcontainers |
| S3 | **Cao** (cần kiểm chứng) | **Đổi cảm xúc (LIKE → LOVE) có khả năng lỗi 500** | Nhánh "đổi loại" gọi `delete(cũ)` rồi `save(mới)` trong cùng giao dịch ([ReactionService.java:69](../../core-api/src/main/java/com/unichat/core/communitychat/service/ReactionService.java#L69)). Khi flush, Hibernate chạy **INSERT trước DELETE**, nên dòng mới đụng `UNIQUE(user_id, target_type, target_id)` ([V8:74](../../core-api/src/main/resources/db/migration/V8__community_chat.sql#L74)) trước khi dòng cũ kịp bị xóa. Hiện không có test nào chạy trên DB thật cho trường hợp này. **Sửa:** cập nhật `reaction_type` ngay trên dòng cũ thay vì xóa rồi chèn |
| S4 | **Trung bình** | Bài đã xóa vẫn đọc và bình luận được qua API | `getReplies`, `addReply`, `acceptReply` ([DiscussionService.java:222](../../core-api/src/main/java/com/unichat/core/communitychat/service/DiscussionService.java#L222), [251](../../core-api/src/main/java/com/unichat/core/communitychat/service/DiscussionService.java#L251), [300](../../core-api/src/main/java/com/unichat/core/communitychat/service/DiscussionService.java#L300)), đọc tệp đính kèm và `PostReadService` dùng `findById` thay vì `requirePost`, nên bỏ qua kiểm tra `DELETED`. `acceptReply` còn không kiểm tra bài có thuộc đúng `workspaceId` không. **Sửa:** dùng `requirePost` ở mọi nơi |
| S5 | **Trung bình** | Bộ đếm bị mất cập nhật khi ghi đồng thời | `Discussion` không có `@Version`; `view_count`, `reply_count`, `vote_score` đều theo kiểu đọc, cộng trong Java, rồi ghi lại. Hai người bình luận cùng lúc, hoặc một người bình luận đúng lúc trợ lý AI ghi câu trả lời (giao dịch riêng), có thể làm mất một lần cộng. Riêng `view_count` còn tăng ở **mỗi** lần gọi GET, kể cả F5. **Sửa:** `UPDATE discussions SET reply_count = reply_count + 1 WHERE id = ?` (`@Modifying`), và chống tăng lượt xem trùng (vd. dựa trên `post_reads` hoặc cửa sổ thời gian) |
| S6 | **Trung bình** | Sửa bài thì thông báo nhắc tên bị gửi lại | `updateDiscussion` gọi lại `publishMentions` với toàn bộ nội dung ([DiscussionService.java:388](../../core-api/src/main/java/com/unichat/core/communitychat/service/DiscussionService.java#L388)). Sửa một lỗi chính tả là những người đã được nhắc nhận thêm một thông báo. **Sửa:** chỉ thông báo cho handle mới xuất hiện so với bản cũ |
| S7 | **Trung bình** | Handle nhắc tên lấy từ email: trùng và lộ thông tin | `handleOf` = phần trước `@` của email ([MentionResolver.java:79](../../core-api/src/main/java/com/unichat/core/communitychat/service/MentionResolver.java#L79)). `an@gmail.com` và `an@hust.edu.vn` cùng handle `an`, nên cả hai bị nhắc. Handle cũng làm lộ một phần email của mọi thành viên. Chú thích trong mã nói "user chưa có display name", nhưng V25 đã thêm `display_name`. **Sửa:** thêm cột `username` duy nhất, hoặc mention theo `userId` (frontend chèn token `@[Tên](userId)`) |
| S8 | **Trung bình** | Xóa tệp đính kèm để lại rác; tệp tài liệu lưu hai lần | `remove()` ([PostAttachmentService.java:124](../../core-api/src/main/java/com/unichat/core/communitychat/service/PostAttachmentService.java#L124)) chỉ xóa dòng DB: blob trên storage còn nguyên, và tài liệu đã đưa vào thư viện nhóm vẫn ở đó. Lúc tải lên, tài liệu được lưu một bản cho `documents` và một bản cho `posts/…` ([storeBlob, dòng 187](../../core-api/src/main/java/com/unichat/core/communitychat/service/PostAttachmentService.java#L187)). Nếu lần lưu thứ hai lỗi, giao dịch DB rollback nhưng tệp đã ghi lên storage vẫn còn |
| S9 | **Trung bình** | Thông báo tạo cả khi giao dịch rollback; không realtime; "đọc tất cả" không hết | Listener dùng `@EventListener` chứ không phải `AFTER_COMMIT` ([dòng 30, 59](../../core-api/src/main/java/com/unichat/core/communitychat/service/NotificationEventListener.java#L30)). `markAllAsRead` chỉ xử lý 100 thông báo mới nhất ([NotificationService.java:50](../../core-api/src/main/java/com/unichat/core/communitychat/service/NotificationService.java#L50)), nên người có hơn 100 thông báo chưa đọc vẫn còn số trên chuông. Chuông hỏi lại mỗi 30 giây dù đã có hạ tầng STOMP. **Sửa:** `AFTER_COMMIT`; `UPDATE … SET is_read = true WHERE user_id = ?`; đẩy thông báo qua `/user/queue/notifications` |
| S10 | **Thấp** | Lưu bài không kiểm tra thành viên | `BookmarkService.toggle` ([dòng 38](../../core-api/src/main/java/com/unichat/core/communitychat/service/BookmarkService.java#L38)) chỉ kiểm tra bài tồn tại. Nội dung bài không lộ (danh sách đã lưu có lọc theo nhóm), nhưng API cho phép dò ID bài nào tồn tại |
| S11 | **Thấp** | Đầu vào chưa giới hạn đủ | `body` của bài và bình luận không giới hạn độ dài (cột TEXT). `label` là chuỗi tùy ý ≤ 20 ký tự: giá trị lạ đi tới tận CHECK của DB và thành lỗi 500 thay vì 400. `parentReplyId` không được kiểm tra có thuộc cùng bài không. Thông điệp lỗi kiểm tra input còn bằng tiếng Anh ("Title is required") |
| S12 | **Thấp** | Trạng thái CLOSED/ARCHIVED không có đường vào | Code chặn bình luận khi bài `CLOSED`/`ARCHIVED`, nhưng không có API nào đóng hay lưu trữ bài, nên đây là logic chết |
| S13 | **Thấp** | "Nổi bật" (HOT) chỉ là nhiều cảm xúc nhất | Không có suy giảm theo thời gian, nên bài cũ nhiều cảm xúc đứng đầu mãi. Trong một nhóm, HOT và TOP cho cùng kết quả. Lọc theo nhãn thì bỏ qua cách sắp xếp, tìm kiếm thì bỏ qua cả nhãn lẫn ghim |
| S14 | **Thấp** | Frontend upload và tải tệp đi đường riêng | `uploadPostAttachment` (XHR) và `fetchAttachmentObjectUrl` ([community-api.ts:260](../../frontend/src/features/community/community-api.ts#L260), [317](../../frontend/src/features/community/community-api.ts#L317)) viết cứng `/api/v1`, bỏ qua `getApiBaseUrl()`, và **không tự refresh token khi gặp 401**. Sau 15 phút không thao tác, lần upload hoặc xem ảnh đầu tiên sẽ lỗi. Khi frontend và API khác domain thì hỏng hẳn |
| S15 | **Thấp** | Gợi ý khi soạn bài tải toàn bộ ID tài liệu chỉ để đếm | `ComposeSuggestionService` gọi `findAllowedDocumentIdsForWorkspaces(...).size()` ở mỗi lần gõ. Nên dùng `COUNT(*)` |
| S16 | **Thấp** | Cột và giá trị thừa | `discussions.tags` còn trong DB dù tính năng thẻ đã bị gỡ. CHECK của `reactions.target_type` còn `COMMUNITY_MESSAGE`, `AI_ANSWER`; CHECK của `notifications.type` còn `JOIN_REQUEST`, `JOIN_APPROVED`, `AI_MENTION_REPLY` mà mã không tạo. **Sửa:** dọn bằng migration cùng lúc với S2 |

---

## 4. @AI trong bài viết

### 4.1. Mục tiêu nghiệp vụ

Thành viên viết bình luận có `@AI`, ví dụ "@AI quy chế thi lại là gì?". Trợ lý tìm câu trả lời **chỉ trong tài liệu đã được duyệt của nhóm đó**, rồi đăng một bình luận trả lời kèm **trích dẫn** (tên tài liệu, vị trí, đoạn trích) để người đọc tự kiểm chứng. Bình luận của trợ lý đứng tên tài khoản hệ thống "Trợ lý AI" (`00000000-0000-0000-0000-0000000000a1`, tạo bởi migration V19).

Tính năng anh em: **tóm tắt tài liệu đính kèm**. Khi tài liệu đính kèm bài xử lý xong, trợ lý tự viết tóm tắt 3–5 câu, hiển thị bằng [attachment-summary.tsx](../../frontend/src/features/community/components/attachment-summary.tsx).

#### Dữ liệu tham gia

@AI không có bảng riêng. Nó đọc thư viện tài liệu và ghi vào bảng bình luận:

| Bảng | Đọc hay ghi | Dùng cột nào, để làm gì |
|---|---|---|
| `discussion_replies` | Ghi | Một dòng mới cho câu trả lời: `author_id` = tài khoản Trợ lý AI, `parent_reply_id` = bình luận có `@AI`, `is_ai_answer = true`, `citations` (JSON trích dẫn), `retrieval_trace_id`. Giải thích từng cột ở [mục 3.2 b](#32-dữ-liệu-và-các-service-xử-lý) |
| `discussions` | Đọc, ghi | Đọc `title` để ghép vào câu hỏi quá ngắn; tăng `reply_count` |
| `documents` | Đọc | Lấy danh sách tài liệu **được phép** cho AI đọc: `workspace_id` = nhóm của bài và `status = 'PROCESSED'`; tra `original_name` để ghi tên tệp vào trích dẫn |
| `post_attachments` | Ghi | Tóm tắt tệp: ghi `ai_summary`, chuyển `summary_state` sang `READY` hoặc `UNAVAILABLE` |
| `users` | Đọc | Tài khoản hệ thống "Trợ lý AI" (`00000000-0000-0000-0000-0000000000a1`, tạo ở V19) |

Bảng `documents` có nhiều cột phục vụ thư viện tài liệu. Các cột liên quan tới báo cáo này:

| Cột | Ý nghĩa dễ hiểu |
|---|---|
| `id`, `workspace_id` | Mã tài liệu; thuộc nhóm nào |
| `original_name`, `media_type`, `byte_size`, `storage_key`, `sha256` | Tên tệp gốc, loại tệp, dung lượng, chỗ lưu, mã băm nội dung (để phát hiện tệp trùng) |
| `status` | Vòng đời tài liệu: `PENDING_APPROVAL` (VIEWER tải lên, chờ OWNER/EDITOR duyệt) → `PENDING` (đã duyệt, chờ xử lý) → `PROCESSING` (AI Service đang cắt nhỏ và tạo vector) → `PROCESSED` (**trợ lý dùng được**) hoặc `FAILED`. Ngoài ra `REJECTED` (bị từ chối), `DELETING` (đang xóa) |
| `contributor_id`, `uploaded_by`, `approved_by`, `approved_at`, `rejection_reason`, `contribution_summary`, `contribution_reason` | Ai đóng góp, ai tải lên, ai duyệt và lúc nào, lý do từ chối, tóm tắt và lý do người đóng góp ghi khi gửi |
| `ingestion_version`, `page_or_block_count`, `indexed_chunk_count`, `indexed_character_count`, `ingestion_completed_at` | Thông tin xử lý cho AI: lần xử lý thứ mấy, số trang/khối, số đoạn đã đưa vào ChromaDB, số ký tự, lúc xử lý xong |
| `version`, `created_at`, `updated_at` | Khóa lạc quan và thời điểm |

#### Service nào làm gì: nhận gì, trả gì

| Service.hàm | Chạy khi nào | Input | Output | Đọc / ghi |
|---|---|---|---|---|
| `DiscussionService.addReply` | Người dùng gửi bình luận | Bình luận có chứa `@ai` | Phát `AiMentionEvent {workspaceId, discussionId, triggerReplyId, title, body}` | W: `discussion_replies` |
| `AiReplyService.onAiMention` | Sau khi bình luận được commit, chạy nền (`@Async`) | `AiMentionEvent` | Không trả; ghi một bình luận trả lời | R: `documents`; W: `discussion_replies`, `discussions.reply_count` |
| `AiRetrievalClient.ask` | Được `onAiMention` và `onDocumentProcessed` gọi | `workspaceId`, `allowedDocumentIds`, `question`, `traceId` | `Map` chứa `answer`, `citations[]`, `refusalReason`. **Lỗi thì trả Map rỗng, không ném lỗi** | Gọi HTTP sang AI Service |
| `AttachmentSummaryService.onDocumentProcessed` | Khi AI Service báo một tài liệu đã xử lý xong (`DocumentProcessedEvent`) | `documentId` | Không trả; ghi tóm tắt | W: `post_attachments.ai_summary`, `summary_state` |

**AI Service** (FastAPI, nội bộ, không mở ra Internet):

| Endpoint | Input (body JSON) | Output | Ai kiểm tra gì |
|---|---|---|---|
| `POST /internal/v1/retrieval/answers` | `workspaceId`, `allowedDocumentIds` (≤ 1000), `question`, `strategyVersion`, `requestId`; đường hoàn chỉnh còn cần `cloudAllowed`, `operationId`, `permissionVersion`, `sources` | `answer` (câu trả lời), `citations[]` (trích dẫn), hoặc `refusalReason` (lý do từ chối khi không đủ bằng chứng) | `security.py` kiểm tra service JWT có ràng buộc đúng request; `answer_pipeline.py` kiểm tra đủ trường chính sách; chỉ tìm trong `allowedDocumentIds` |

Nguyên tắc quan trọng: **AI Service không tự quyết ai được đọc tài liệu nào.** Core API gửi sẵn danh sách `allowedDocumentIds`; AI Service chỉ tìm trong danh sách đó.

### 4.2. Luồng hoạt động từng bước (theo thiết kế)

```
[Trình duyệt]                     [Core API]                                   [AI Service]
post-detail-page.tsx / inline-comments.tsx
 1. addReply()  POST D/{id}/replies {body: "@AI ..."}
 ─────────────────────────────────►  DiscussionService.addReply
                                      ├ lưu discussion_replies (bình luận của người dùng)
                                      ├ body.toLowerCase().contains("@ai") ?
                                      │    → publishEvent(AiMentionEvent{workspaceId, discussionId,
                                      │                    triggerReplyId, title, body})
                                      └ trả ReplyResponse (HTTP 200)
 ◄─────────────────────────────────
 2. mentionsAi(body) (regex /@ai\b/i) đúng
    → useAiReplyWatch.watch(replyId)
    → awaitAiReply: cứ 2 giây gọi GET D/{id}/replies,
      tối đa 30 lần (60 giây), tìm reply có
      isAiAnswer = true và parentReplyId = replyId
                                    (sau khi giao dịch bước 1 commit, ở luồng khác)
                                     AiReplyService.onAiMention  (@Async, AFTER_COMMIT, REQUIRES_NEW)
                                      ├ allowed = documents.findAllowedDocumentIdsForWorkspaces(ws)
                                      │           (mọi tài liệu status = 'PROCESSED' của nhóm)
                                      ├ question = body bỏ "@ai"; ngắn hơn 10 ký tự thì ghép thêm
                                      │           "Trong chủ đề \"<tiêu đề bài>\", ..."
                                      ├ AiRetrievalClient.ask(ws, allowed, question, traceId)
                                      │     POST {ai}/internal/v1/retrieval/answers  ─────────────►  verify_service_jwt
                                      │     body: {workspaceId, allowedDocumentIds,                  _policy_refusal
                                      │            question, strategyVersion, requestId}              truy hồi ChromaDB
                                      │     header Authorization: Bearer <service JWT>                sinh câu trả lời
                                      │     timeout: kết nối 5s, đọc 90s          ◄──────────────── {answer, citations[]}
                                      │     lỗi → trả Map rỗng (không ném lỗi)
                                      ├ text = answer || refusalReason || "Trợ lý chưa trả lời được lúc này..."
                                      ├ citations: tối đa 8; tên tệp tra lại từ documents; đoạn trích cắt 500 ký tự
                                      ├ INSERT discussion_replies (author = Trợ lý AI, parent = triggerReplyId,
                                      │                            is_ai_answer = true, citations, retrieval_trace_id)
                                      └ discussions.reply_count++
 3. Lần poll kế tiếp thấy reply của trợ lý
    → chèn vào luồng, hiển thị trích dẫn bằng
      reply-citations.tsx
```

Thẻ bài trên bảng tin có dấu "trợ lý đã trả lời" nhờ truy vấn `findIdsWithAiAnswer` chạy theo lô.

### 4.3. So sánh với "Trợ lý AI" trong workspace (đường đã hoàn thiện hơn)

Trợ lý AI dạng hỏi đáp (`POST /api/v1/workspaces/{id}/questions`, có bản `/stream` dạng SSE) đi qua `ChatService` → `ChatOperationService` → `ChatAccessService.read` ([ChatAccessService.java:36](../../core-api/src/main/java/com/unichat/core/chat/service/ChatAccessService.java#L36)) → `ChatHttpAiGateway`. Hai đường khác nhau như sau:

| Kiểm tra | Trợ lý AI (chat) | @AI trong bài viết |
|---|---|---|
| Phiên đăng nhập còn hiệu lực (`sessions.isActive`) | Có | Không |
| Nhóm đang `ACTIVE` | Có | Không |
| Người hỏi còn là thành viên tại thời điểm gọi AI | Có | Chỉ kiểm tra lúc lưu bình luận |
| Nhóm có cho phép xử lý cloud AI (`cloud_allowed`) | Có, gửi `cloudAllowed` | **Không gửi, không kiểm tra** |
| Ảnh chụp quyền (`permissionVersion`, `workspaceVersion`, `sources`, `fingerprint`) | Có | Không |
| Kiểm soát tải và giới hạn tần suất (`ChatOperation`, admission V40) | Có | Không |
| Token dịch vụ ràng buộc với request (method, path, hash body, requestId, chống dùng lại) | Có (`issueToken(method, path, …)`) | **Dùng token kiểu cũ** |
| Kiểm tra lại quyền sau khi AI trả lời | Có (operation, lease) | Không |

### 4.4. Những gì đã làm tốt

- Thiết kế đúng nguyên tắc "Core API giữ quyền": AI Service chỉ nhận danh sách `allowedDocumentIds` do Core quyết định.
- Câu trả lời giữ trích dẫn, có `retrieval_trace_id` để truy vết.
- Chờ giao dịch commit rồi mới gọi AI (`AFTER_COMMIT`), nên câu trả lời không treo trên một bình luận đã rollback.
- Khi lỗi vẫn đăng một câu thông báo thay vì im lặng; frontend có trạng thái chờ và báo khi hết thời gian.
- Tóm tắt tài liệu giới hạn đúng 1 tài liệu, nên không lẫn nội dung tài liệu khác.

### 4.5. Những chỗ chưa ổn

| # | Mức | Vấn đề | Chi tiết |
|---|---|---|---|
| A1 | **Nghiêm trọng** | **@AI và tóm tắt tệp đính kèm luôn thất bại: AI Service từ chối token** | `AiRetrievalClient` gắn `serviceTokenIssuer.issueToken()` không tham số ([AiRetrievalClient.java:80](../../core-api/src/main/java/com/unichat/core/communitychat/service/AiRetrievalClient.java#L80)). Hàm này tự ghi chú *"Legacy consumers must migrate to request binding; the AI verifier rejects this token"* và ký token cho path giả `/unsupported-legacy-binding` ([ServiceTokenIssuer.java:45](../../core-api/src/main/java/com/unichat/core/shared/config/ServiceTokenIssuer.java#L45)). Phía AI Service, `_check_binding` ([security.py:18](../../ai-service/app/core/security.py#L18)) so khớp method, path, hash body, header `X-Request-ID` và `Idempotency-Key`. Client không gửi `X-Request-ID` và path không khớp, nên mọi request nhận **401**. `AiRetrievalClient` bắt lỗi và trả Map rỗng, `AiReplyService` đăng câu "Trợ lý chưa trả lời được lúc này. Bạn thử nhắc lại sau ít phút nhé." **Lần nào cũng vậy.** Tóm tắt tệp đính kèm luôn ở trạng thái "không có tóm tắt" vì cùng nguyên nhân. Unit test `AiReplyServiceTest` mock client nên không phát hiện được |
| A2 | **Nghiêm trọng** | **Sửa token xong vẫn bị từ chối vì thiếu trường chính sách** | `RetrievalAnswerRequest` của AI Service nhận các trường `cloudAllowed`, `operationId`, `permissionVersion`, `sources`. `_policy_refusal` ([answer_pipeline.py:73-82](../../ai-service/app/core/rag/answer_pipeline.py#L73-L82)) trả `REFUSE "Chưa có chính sách xử lý AI hợp lệ."` nếu thiếu một trong số đó. Body hiện tại chỉ có 5 trường, nên trợ lý sẽ đăng đúng câu từ chối đó |
| A3 | **Cao** | **Bỏ qua chính sách của nhóm và không giới hạn tải** | Không kiểm tra `cloud_allowed`: nhóm đã tắt AI cloud vẫn bị gửi tài liệu đi xử lý (nếu A1, A2 được sửa theo kiểu "cho chạy là được"). Không có admission hay giới hạn tần suất: một thành viên gửi 50 bình luận "@ai" là tạo 50 lời gọi, mỗi lời gọi giữ một luồng trong pool `@Async` dùng chung tới 90 giây, ảnh hưởng cả các tác vụ nền khác (thông báo, tóm tắt) |
| A4 | **Cao** | **Không kiểm tra lại quyền sau khi AI trả lời** (vi phạm `AGENTS.md`: *"verify authorization … again before persistence/return after AI calls"*) | Trong 90 giây chờ AI, bài có thể đã bị xóa, nhóm đã bị xóa, người hỏi đã bị gỡ, hoặc tài liệu đã bị thu hồi. `onAiMention` ([AiReplyService.java:81](../../core-api/src/main/java/com/unichat/core/communitychat/service/AiReplyService.java#L81)) vẫn lưu câu trả lời và trích dẫn, và đoạn trích có thể đến từ tài liệu vừa bị thu hồi |
| A5 | **Trung bình** | **@AI trong nội dung bài viết không hoạt động, dù giao diện mời dùng** | Ô soạn bài ghi "Viết nội dung... (@AI để hỏi trợ lý, …)" ([create-post-modal.tsx:223](../../frontend/src/features/community/components/create-post-modal.tsx#L223)), nhưng `createDiscussion` ([DiscussionService.java:148](../../core-api/src/main/java/com/unichat/core/communitychat/service/DiscussionService.java#L148)) không phát `AiMentionEvent`; chỉ `addReply` có. Người dùng đăng câu hỏi kèm @AI trong bài sẽ không bao giờ nhận trả lời. **Sửa:** hỗ trợ ở `createDiscussion`, hoặc đổi chữ trong ô soạn bài |
| A6 | **Trung bình** | Nhận diện "@AI" không thống nhất giữa ba chỗ | Backend dùng `contains("@ai")` ([DiscussionService.java:283](../../core-api/src/main/java/com/unichat/core/communitychat/service/DiscussionService.java#L283)), nên khớp cả "@aiden", "@ai_team", "x@ai.edu.vn". Phần tách câu hỏi dùng `@ai\b`. Frontend dùng `/@ai\b/i` ([await-ai-reply.ts:16](../../frontend/src/features/community/await-ai-reply.ts#L16)). Hậu quả: gõ "@aiden" thì backend gọi AI nhưng frontend không chờ, và thành viên có email bắt đầu bằng "ai…" bị nhắc tên nhầm. **Sửa:** một regex dùng chung `(?<![\w.])@ai\b` và giữ "ai" làm handle dành riêng |
| A7 | **Trung bình** | Frontend chờ ngắn hơn backend; hỏi lại liên tục | Frontend chờ tối đa 30 × 2 s = 60 s ([await-ai-reply.ts:12](../../frontend/src/features/community/await-ai-reply.ts#L12)), backend cho AI tới 90 s. Câu trả lời đến ở giây 61–90 sẽ bị báo "Trợ lý chưa trả lời". Mỗi lần hỏi lại tải **toàn bộ** bình luận. Tải lại trang thì mất trạng thái "đang trả lời" vì server không lưu trạng thái này. **Sửa:** đẩy sự kiện qua STOMP (đã có `/user/queue/...`) hoặc lưu một bình luận chờ của trợ lý với trạng thái `PENDING` rồi cập nhật thành `DONE/FAILED` |
| A8 | **Thấp** | Nhóm có hơn 1000 tài liệu sẽ bị lỗi 422 | Hợp đồng giới hạn `allowedDocumentIds: max_length = 1000` ([contracts.py:44](../../ai-service/app/core/rag/contracts.py#L44)) |
| A9 | **Thấp** | Không có ngữ cảnh luồng thảo luận | Trợ lý chỉ thấy câu hỏi (và tiêu đề nếu câu quá ngắn); không thấy nội dung bài hay các bình luận trước. Câu hỏi nối tiếp kiểu "@AI còn trường hợp kia thì sao?" sẽ trả lời kém |

### 4.6. Hướng sửa đề xuất

1. **Bỏ `AiRetrievalClient` riêng, dùng lại đường của Trợ lý AI**:
   - gọi `ChatAccessService.read(actor, workspaceId)` để có `ChatSourceSnapshot` (kiểm tra nhóm ACTIVE, thành viên, `cloudAllowed`, `permissionVersion`, `sources`);
   - tạo `ChatOperation` để được kiểm soát tải và có `operationId`;
   - gọi `ChatAiGateway.answer(...)`, vốn đã ký token đúng ràng buộc.
2. **Sau khi có câu trả lời**, đọc lại: bài chưa xóa, người hỏi còn là thành viên, `permissionVersion` không đổi. Có thay đổi thì đăng "Câu hỏi không còn hợp lệ" thay cho câu trả lời.
3. **Đẩy kết quả qua WebSocket**, bỏ polling; thời gian chờ ở frontend ≥ thời hạn của operation.
4. **Thêm test hợp đồng**: một test khẳng định client gọi AI dùng `issueToken(method, path, …)` và body có đủ `cloudAllowed`, `operationId`, `permissionVersion`, `sources`; một integration test dựng AI giả kiểm tra binding.

---

## 5. Chat: Work Chat 1-1 và nhóm chat

> Ghi chú: "Trợ lý AI" (chat hỏi đáp tài liệu trong workspace) đã được mô tả ngắn ở [mục 4.3](#43-so-sánh-với-trợ-lý-ai-trong-workspace-đường-đã-hoàn-thiện-hơn) như mẫu tham chiếu, không rà sâu trong báo cáo này. Mục này rà **Work Chat**, tức nhắn tin giữa người với người.

### 5.1. Khái niệm nghiệp vụ

- **Danh bạ**: chỉ nhắn được với người **đang cùng ít nhất một nhóm** (thành viên ACTIVE). Không nhắn được với tài khoản Trợ lý AI.
- **Hai loại cuộc trò chuyện** cùng nằm trong bảng `direct_conversations`, phân biệt bằng cột `kind`:
  - `DIRECT` (1-1): xác định duy nhất bởi cặp `(participant_low, participant_high)`. ID nhỏ hơn luôn nằm ở `low`, nên (A, B) và (B, A) là cùng một dòng;
  - `GROUP` (nhóm chat): có `title`, `created_by`, tối đa 50 người; vai trò `OWNER` hoặc `MEMBER`.
- **Đã đọc**: lưu `conversation_participants.last_read_at`, chỉ tiến không lùi. Số chưa đọc = số tin của người khác gửi sau mốc này.
- **Realtime**: STOMP over WebSocket, mỗi người dùng nhận trên hàng đợi riêng.

### 5.2. Dữ liệu và các service xử lý

#### a) Bảng `direct_conversations`: mỗi dòng là một cuộc trò chuyện

Tên bảng có chữ "direct" vì ban đầu chỉ có chat 1-1; nhóm chat được thêm sau (V37) vào chính bảng này.

| Cột | Kiểu | Bắt buộc | Ý nghĩa dễ hiểu | Ví dụ |
|---|---|---|---|---|
| `id` | UUID | Có | Mã cuộc trò chuyện | |
| `kind` | VARCHAR(16) | Có, mặc định `DIRECT` | `DIRECT` (1-1) hoặc `GROUP` (nhóm chat) | `DIRECT` |
| `participant_low` | UUID | Chỉ với `DIRECT` | Người có **ID nhỏ hơn** trong hai người | |
| `participant_high` | UUID | Chỉ với `DIRECT` | Người có ID lớn hơn. Luôn sắp thứ tự như vậy nên A nhắn B và B nhắn A cùng rơi vào một dòng | |
| `title` | VARCHAR(120) | Chỉ với `GROUP` | Tên nhóm chat | "Nhóm đồ án" |
| `created_by` | UUID | Không | Người tạo nhóm chat | |
| `avatar_storage_key` | VARCHAR(255) | Không | Ảnh đại diện nhóm chat (V39) | |
| `last_message_at` | TIMESTAMPTZ | Không | Thời điểm tin mới nhất, để sắp danh sách hội thoại (mới nhất lên đầu) | |
| `created_at` | TIMESTAMPTZ | Có | Lúc tạo | |

Ràng buộc:

- `chk_direct_conversations_shape`: nếu `DIRECT` thì **phải có** hai người, `low < high`, và **không có** `title`; nếu `GROUP` thì **không có** hai cột participant nhưng **phải có** `title`.
- `uq_direct_conversations_pair` UNIQUE `(participant_low, participant_high)`: giữa hai người chỉ có đúng một cuộc 1-1.

#### b) Bảng `conversation_participants`: ai ở trong cuộc trò chuyện nào

| Cột | Ý nghĩa dễ hiểu | Ví dụ |
|---|---|---|
| `conversation_id` | Cuộc trò chuyện | |
| `user_id` | Người tham gia. Cặp `(conversation_id, user_id)` là khóa chính | |
| `role` | `OWNER` (chủ nhóm chat: đổi tên, thêm/gỡ người) hoặc `MEMBER`. Với chat 1-1 cả hai là `MEMBER` | `OWNER` |
| `joined_at` | Lúc vào cuộc trò chuyện. Khi chủ nhóm rời, người có `joined_at` sớm nhất được làm chủ | |
| `last_read_at` | **Mốc "đã đọc tới đây"**. Tin của người khác có `created_at` sau mốc này là tin chưa đọc. Chỉ tiến, không lùi | |

Cả chat 1-1 và nhóm chat đều có dòng ở bảng này. Kiểm tra "có được xem cuộc trò chuyện không" là tìm dòng ở đây.

#### c) Bảng `direct_messages`: tin nhắn

| Cột | Ý nghĩa dễ hiểu |
|---|---|
| `id` | Mã tin |
| `conversation_id` | Thuộc cuộc trò chuyện nào |
| `sender_id` | Người gửi |
| `body` | Nội dung, ≤ 4000 ký tự. Được phép `NULL` khi tin chỉ có tệp; CHECK `chk_direct_messages_body` cấm chuỗi toàn khoảng trắng |
| `created_at` | Lúc gửi; dùng để sắp tin và tính chưa đọc |

Không còn cột `read_at`: trạng thái đọc tính từ `conversation_participants.last_read_at` (xem lỗi C11 về lịch sử thêm/xóa cột này).

#### d) Bảng `chat_attachments`: tệp trong tin nhắn

| Cột | Ý nghĩa dễ hiểu | Ví dụ |
|---|---|---|
| `id` | Mã tệp | |
| `message_id` | Thuộc tin nào | |
| `kind` | `IMAGE` (hiện ngay trong khung chat) hoặc `FILE` (tải xuống) | `IMAGE` |
| `storage_key` | Đường dẫn trong kho: `chat/{hội thoại}/{tin}/…` | |
| `original_name`, `media_type`, `byte_size` | Tên gốc, loại MIME, dung lượng (> 0) | `bao-cao.pdf` |
| `created_at` | Lúc gửi | |

Giới hạn do service kiểm tra: tối đa 5 tệp mỗi tin, tổng ≤ 20 MB.

#### e) Service nào làm gì: nhận gì, trả gì

**`DirectMessageService`**: tin nhắn và danh sách hội thoại.

| Hàm | Input | Output | Đọc / ghi bảng | Lỗi có thể gặp |
|---|---|---|---|---|
| `openWith` | `callerId`, `otherUserId` | `ConversationSummary` của cuộc 1-1 (tạo mới nếu chưa có) | R: `direct_conversations`; W: `direct_conversations`, 2 dòng `conversation_participants` | 400 nhắn chính mình; 403 không chung nhóm nào |
| `listConversations` | `callerId`, `page`, `size` | Danh sách `ConversationSummary {id, kind, title, otherUserId, participants[], lastMessage, lastMessageAt, unreadCount, hasAvatar}` | R: `conversation_participants`, `direct_conversations`, `direct_messages`, `users` | |
| `listMessages` | `callerId`, `conversationId`, `page`, `size` (20) | Danh sách `MessageResponse {id, conversationId, senderId, senderName, body, mine, createdAt, attachments[]}`, mới nhất trước | R: `direct_messages`, `chat_attachments` | 404 không ở trong cuộc trò chuyện |
| `send` | `callerId`, `conversationId`, `body`, `files?` | `MessageResponse` của tin vừa gửi | W: `direct_messages`, `chat_attachments`, kho tệp, `last_message_at`; phát `DirectMessageSentEvent` | 400 rỗng, quá 4000 ký tự, tệp sai; 404 |
| `markRead` | `callerId`, `conversationId` | Không trả gì | W: `last_read_at = bây giờ` | 404 |

**`GroupConversationService`**: nhóm chat.

| Hàm | Input | Output | Đọc / ghi bảng | Lỗi có thể gặp |
|---|---|---|---|---|
| `create` | `callerId`, `title` (≤ 120), `memberIds` (1–49 người khác) | `ConversationSummary` | W: `direct_conversations` (`GROUP`), `conversation_participants` | 400 thiếu người, quá 50; 403 có người không trong danh bạ |
| `rename` | `callerId`, `conversationId`, `title` | `ConversationSummary` | W: `title` | 403 không phải chủ nhóm chat |
| `addMember` / `removeMember` | `callerId`, `conversationId`, `userId` | Danh sách `ParticipantSummary {userId, name, role, me}` | W: `conversation_participants` | 403; 409 đã có trong nhóm; 400 tự gỡ mình |
| `leave` | `callerId`, `conversationId` | Không trả gì | W: xóa dòng tham gia; có thể đổi `role` người khác thành OWNER | 400 với cuộc 1-1 |
| `listParticipants` | `callerId`, `conversationId` | Danh sách `ParticipantSummary` | R: `conversation_participants`, `users` | 404 |

**Các service hỗ trợ:**

| Service.hàm | Input | Output | Vai trò |
|---|---|---|---|
| `ContactDirectory.listContacts` | `callerId` | Danh sách `ContactSummary {userId, name, sharedGroup}` | Danh bạ: người đang chung ít nhất một nhóm (workspace) |
| `ContactDirectory.canMessage` | `callerId`, `otherUserId` | `true/false` | Luật "chỉ nhắn được người chung nhóm" |
| `ConversationAccess.requireParticipant` | `callerId`, `conversationId` | `DirectConversation` | **Nơi duy nhất quyết định ai được xem cuộc trò chuyện.** Không ở trong thì 404. Cuộc gọi cũng dùng hàm này |
| `ConversationAccess.requireGroupOwner` | như trên | `DirectConversation` | Chỉ chủ nhóm chat được qua |
| `ConversationAccess.recipientsOf` | `conversationId`, `senderId` | Tập `userId` | Ai cần nhận tin realtime (mọi người trừ người gửi) |
| `ChatAttachmentService` | `validateAll(files)`, `attachAll(...)`, `read(...)` | Không trả / danh sách `ChatAttachmentResponse {id, kind, originalName, mediaType, byteSize}` / `{bytes, mediaType, fileName}` | Kiểm tra, lưu và đọc tệp tin nhắn |
| `GroupAvatarService` | `upload`, `remove`, `read` | Không trả / byte ảnh | Ảnh đại diện nhóm chat |
| `ConversationSummaryAssembler` | Danh sách hội thoại | Danh sách `ConversationSummary` | Gom tin cuối, số chưa đọc, người tham gia theo lô |
| `WorkChatBroadcaster` | Nghe `DirectMessageSentEvent` (sau commit) | Đẩy `MessageResponse` tới `/user/queue/messages` của từng người nhận | Realtime |
| `PresenceTracker` | Sự kiện kết nối/ngắt WebSocket | `isOnline(userId)` | Đếm số phiên đang mở của mỗi người (trong RAM) |

Bảng `calls` (lịch sử cuộc gọi) nằm ở [mục 6](#6-cuộc-gọi-gọi-1-1-và-gọi-nhóm).

### 5.3. Danh sách API và kênh realtime

Controller: [WorkChatController.java](../../core-api/src/main/java/com/unichat/core/workchat/api/WorkChatController.java), [GroupChatController.java](../../core-api/src/main/java/com/unichat/core/workchat/api/GroupChatController.java). Tiền tố `/api/v1/work-chat`.

| Method & đường dẫn | Service | Ghi chú |
|---|---|---|
| `GET /contacts` | `ContactDirectory.listContacts` | Danh bạ |
| `GET /presence` | `PresenceTracker` | Ai trong danh bạ đang online |
| `GET /conversations?page&size` | `DirectMessageService.listConversations` | Kèm tin cuối, số chưa đọc, người tham gia |
| `POST /conversations/with/{userId}` | `openWith` | Mở hoặc tạo cuộc 1-1 |
| `GET /conversations/{id}/messages?page&size` | `listMessages` | Mới nhất trước, 20 tin mỗi trang |
| `POST /conversations/{id}/messages` (JSON `{body}` hoặc multipart `body` + `files`) | `send` | ≤ 4000 ký tự; ≤ 5 tệp, tổng ≤ 20 MB |
| `GET /conversations/{id}/messages/{mid}/attachments/{aid}/content` | `ChatAttachmentService.read` | Chỉ ảnh trong danh sách cho phép mới hiển thị inline, còn lại là tải xuống |
| `POST /conversations/{id}/read` | `markRead` | |
| `POST /groups` `{title, memberIds}` | `GroupConversationService.create` | |
| `PATCH /groups/{id}` `{title}` | `rename` | Chủ nhóm chat |
| `PUT / DELETE /groups/{id}/avatar`, `GET /conversations/{id}/avatar` | `GroupAvatarService` | |
| `GET /conversations/{id}/participants` | `listParticipants` | |
| `POST /groups/{id}/members` `{userId}`, `DELETE /groups/{id}/members/{userId}` | `addMember / removeMember` | Chủ nhóm chat |
| `POST /groups/{id}/leave` | `leave` | Chủ rời thì quyền chủ chuyển cho người vào sớm nhất |

| Kênh STOMP | Chiều | Nội dung |
|---|---|---|
| Endpoint `/ws/work-chat` | Kết nối | Header `Authorization: Bearer <access>` trong frame CONNECT |
| `/user/queue/messages` | Server → client | `MessageResponse` của tin mới |
| `/user/queue/conversations` | Server → client | `conversationId` vừa thay đổi (đổi tên, thêm/bớt người, avatar) |

### 5.4. Luồng hoạt động chi tiết

#### a) Kết nối realtime

1. [realtime-provider.tsx](../../frontend/src/features/realtime/realtime-provider.tsx) giữ **một** kết nối STOMP dùng chung, tạo bởi [lib/stomp-connection.ts](../../frontend/src/lib/stomp-connection.ts), tới `ws(s)://<host hiện tại>/ws/work-chat`. Trước mỗi lần kết nối hoặc tự kết nối lại, nó lấy access token mới nhất cho `connectHeaders`.
2. Backend: [StompAuthChannelInterceptor.java](../../core-api/src/main/java/com/unichat/core/workchat/ws/StompAuthChannelInterceptor.java) chặn frame `CONNECT`, giải mã JWT và gắn `StompPrincipal(userId)` cho phiên. Token sai thì từ chối kết nối.
3. [PresenceTracker.java](../../core-api/src/main/java/com/unichat/core/workchat/ws/PresenceTracker.java) đếm số phiên của mỗi người (`ConcurrentHashMap` trong bộ nhớ) để biết ai online.
4. Các tính năng đăng ký kênh qua `useRealtimeSubscription(destination, handler)`; [use-work-chat-socket.ts](../../frontend/src/features/work-chat/use-work-chat-socket.ts) đăng ký hai kênh `/user/queue/messages` và `/user/queue/conversations`.

#### b) Danh bạ và mở cuộc 1-1

1. [contact-picker.tsx](../../frontend/src/features/work-chat/components/contact-picker.tsx) gọi `fetchContacts()` → `GET /contacts`.
2. `ContactDirectory.listContacts`: lấy các nhóm của tôi, với **từng nhóm** lấy thành viên ACTIVE, bỏ tôi và Trợ lý AI, gắn nhãn bằng tên nhóm chung đầu tiên, sắp theo tên.
3. Chọn một người → `openConversation(userId)` → `POST /conversations/with/{userId}` → `openWith`: không được nhắn chính mình; `canMessage` (có nhóm chung không); tìm theo cặp (low, high). Chưa có thì tạo `direct_conversations` và 2 dòng `conversation_participants`.

#### c) Gửi và nhận tin nhắn

```
chat-composer.tsx → sendMessage()  (JSON, hoặc multipart khi có tệp, dùng fetch tới getApiBaseUrl())
  ▼  POST /work-chat/conversations/{id}/messages
DirectMessageService.send
  ├ requireParticipant: có dòng conversation_participants? không → 404 (giấu cuộc trò chuyện)
  ├ trim; > 4000 ký tự → 400; không có chữ và không có tệp → 400
  ├ validateAll(files) TRƯỚC khi tạo tin (tệp bị từ chối thì không để lại tin rỗng)
  ├ INSERT direct_messages; attachAll → chat_attachments + storage
  ├ conversation.last_message_at = now
  └ publishEvent(DirectMessageSentEvent{recipients = mọi người tham gia trừ người gửi, message})
        ▼ (AFTER_COMMIT)
     WorkChatBroadcaster.onMessageSent
        └ với từng người nhận: convertAndSendToUser(userId, "/queue/messages", message)
              ▼
     Trình duyệt người nhận: work-chat-page.tsx onPushed(message)
        ├ đang mở đúng cuộc đó → thêm vào đầu danh sách (bỏ qua nếu trùng id)
        └ gọi lại GET /conversations để cập nhật tin cuối và số chưa đọc
```

Người gửi nhận ngay `MessageResponse` từ HTTP và tự chèn tin vào luồng của mình (`setMessages([sent, ...])`).

#### d) Mở một cuộc trò chuyện và đánh dấu đã đọc

[work-chat-page.tsx](../../frontend/src/features/work-chat/work-chat-page.tsx): khi `activeId` đổi thì gọi song song `fetchMessages(activeId)` (trang 0), `fetchCallHistory`, và `markConversationRead` (→ `participant.readUpTo(now)`), rồi tải lại danh sách để số chưa đọc về 0. Danh sách do [conversation-list.tsx](../../frontend/src/features/work-chat/components/conversation-list.tsx) vẽ, luồng tin do [message-thread.tsx](../../frontend/src/features/work-chat/components/message-thread.tsx) vẽ.

`ConversationSummaryAssembler` dựng mỗi dòng danh sách từ: tin cuối, số chưa đọc (một truy vấn `countUnreadByConversation` cho cả trang), người tham gia, tên hiển thị.

#### e) Nhóm chat

| Thao tác | Frontend | Backend |
|---|---|---|
| Tạo nhóm | [group-create-modal.tsx](../../frontend/src/features/work-chat/components/group-create-modal.tsx) | Bỏ chính mình khỏi danh sách; ≥ 1 người khác; tổng ≤ 50; **mỗi người phải là danh bạ của người tạo** → tạo `GROUP`, người tạo là OWNER → thông báo qua `/queue/conversations` |
| Đổi tên, ảnh nhóm | [group-settings-panel.tsx](../../frontend/src/features/work-chat/components/group-settings-panel.tsx) | `requireGroupOwner` → lưu → thông báo cho các thành viên |
| Thêm người | như trên | OWNER; người được thêm phải là danh bạ **của OWNER**; chưa có trong nhóm; còn chỗ |
| Gỡ người | như trên | OWNER; không tự gỡ mình (phải dùng "rời nhóm"); thông báo cả người bị gỡ |
| Rời nhóm | như trên | Không áp dụng cho cuộc 1-1; xóa dòng tham gia; nếu là OWNER → người vào sớm nhất thành OWNER |

### 5.5. Những gì đã làm tốt

- Cuộc trò chuyện không thuộc về mình trả 404, không lộ sự tồn tại.
- Cặp 1-1 chuẩn hóa (low, high) có ràng buộc duy nhất, nên không bao giờ có hai cuộc 1-1 giữa cùng hai người.
- Chỉ đẩy tin realtime **sau khi commit**, nên không có tin "ma" khi giao dịch lỗi.
- `DirectMessageService` không phụ thuộc broker (phát sự kiện, để `WorkChatBroadcaster` gửi), dễ test.
- Kiểm tra tệp trước khi tạo tin; mốc đã đọc không lùi; số chưa đọc đếm theo lô.
- Presence chỉ trả người trong danh bạ, không dùng để theo dõi người lạ được.
- Kết nối STOMP lấy token mới trước mỗi lần kết nối lại (đã sửa lỗi token hết hạn làm hỏng tự kết nối lại).

### 5.6. Những chỗ chưa ổn

| # | Mức | Vấn đề | Chi tiết |
|---|---|---|---|
| C1 | **Cao** | **Web không xem được tin nhắn cũ hơn 20 tin gần nhất** | `fetchMessages(activeId)` chỉ gọi trang 0 ([work-chat-page.tsx:119](../../frontend/src/features/work-chat/work-chat-page.tsx#L119)); không có nút hay cơ chế cuộn để tải thêm. Backend đã hỗ trợ `page`, chỉ thiếu phần frontend |
| C2 | **Trung bình** | Quyền nhắn tin chỉ kiểm tra lúc mở cuộc trò chuyện | `canMessage` chỉ được gọi trong `openWith` và khi thêm người vào nhóm chat. `send` chỉ kiểm tra người gửi có trong cuộc trò chuyện. Hai người không còn chung nhóm nào (bị gỡ, nhóm bị xóa) vẫn nhắn cho nhau mãi. Cần quyết định nghiệp vụ: chặn gửi, hay cho đọc mà không cho gửi |
| C3 | **Trung bình** | Nhóm PUBLIC lớn biến mọi thành viên thành danh bạ | Ai tham gia một nhóm công khai 500 người là nhắn được cho cả 500, và không có chặn hay báo cáo. `listContacts` chạy **một truy vấn cho mỗi nhóm** và nạp hết thành viên ([ContactDirectory.java:66](../../core-api/src/main/java/com/unichat/core/workchat/service/ContactDirectory.java#L66)) |
| C4 | **Trung bình** | WebSocket chỉ xác thực một lần lúc kết nối | Interceptor chỉ xử lý `CONNECT` ([StompAuthChannelInterceptor.java:49](../../core-api/src/main/java/com/unichat/core/workchat/ws/StompAuthChannelInterceptor.java#L49)). Access token hết hạn sau 15 phút, hoặc phiên bị thu hồi (đăng xuất mọi nơi, tài khoản bị khóa), thì socket đang mở vẫn tiếp tục nhận tin. Lệnh `SUBSCRIBE` không bị kiểm tra đích. **Sửa:** kiểm tra phiên định kỳ hoặc đóng socket khi phiên bị thu hồi; chỉ cho `SUBSCRIBE` vào `/user/queue/**` |
| C5 | **Trung bình** | Broker và presence nằm trong bộ nhớ, không chạy được nhiều instance | `enableSimpleBroker("/queue")` ([WebSocketConfig.java:49](../../core-api/src/main/java/com/unichat/core/workchat/ws/WebSocketConfig.java#L49)) và `PresenceTracker` dùng map trong RAM. Chạy hai instance Core API thì người nối vào instance A không nhận được tin gửi qua instance B, và trạng thái online sai. Điều này trái quy tắc "giữ tiến trình stateless" trong `AGENTS.md`. **Sửa:** dùng STOMP broker relay qua RabbitMQ (hạ tầng đã có), presence lưu Redis hoặc DB |
| C6 | **Trung bình** | Mất tin khi rớt mạng | Khi socket kết nối lại, frontend không tải lại tin của cuộc đang mở; tin gửi trong lúc rớt mạng chỉ hiện khi đổi cuộc trò chuyện hoặc tải lại trang. Chưa thấy cơ chế bù khi kết nối lại (nên gọi lại `fetchMessages` khi `connected` chuyển từ false sang true) |
| C7 | **Thấp** | Đang xem cuộc trò chuyện mà vẫn tăng số chưa đọc | `onPushed` ([work-chat-page.tsx:95](../../frontend/src/features/work-chat/work-chat-page.tsx#L95)) thêm tin vào luồng nhưng không gọi `markConversationRead`, nên danh sách hiện chấm chưa đọc trên chính cuộc đang mở. Mỗi tin đến còn gọi lại toàn bộ `GET /conversations` |
| C8 | **Thấp** | Hai người cùng bấm mở cuộc 1-1 cùng lúc | Cả hai cùng không tìm thấy rồi cùng tạo; người sau đụng `uq_direct_conversations_pair` và nhận lỗi 500 thay vì được trả cuộc đã có |
| C9 | **Thấp** | Người cuối cùng rời nhóm chat thì nhóm rỗng tồn tại mãi | Không có bước dọn dẹp |
| C10 | **Thấp** | Thiếu tính năng cơ bản của ứng dụng chat | Chưa có sửa, thu hồi, xóa tin; chưa có "đã xem" cho người gửi; chưa có "đang nhập…"; chưa tìm được trong cuộc trò chuyện |
| C11 | **Thấp** | Migration cột `read_at` bị thêm và xóa đi lại nhiều lần | V32 (thêm) → V38 (khôi phục) → V45 (xóa) → V46 (khôi phục) → V49 (xóa). Đây là dấu vết xung đột khi merge. Trạng thái cuối khớp mã (dùng `last_read_at` ở bảng participants), nhưng nên ghi ADR giải thích và tránh lặp lại |
| C12 | **Thấp** | Địa chỉ WebSocket dùng host của trang web | `window.location.host` ([stomp-connection.ts:208](../../frontend/src/lib/stomp-connection.ts#L208)) chỉ đúng khi frontend và API cùng domain (qua proxy). Nên lấy từ cấu hình giống `getApiBaseUrl()` |

---

## 6. Cuộc gọi: gọi 1-1 và gọi nhóm

> Tóm tắt: **gọi thoại 1-1 đã làm xong trên web**. Gọi video và gọi nhóm **chưa làm**. Mobile chỉ hiển thị lịch sử cuộc gọi; bấm nút gọi sẽ hiện "Gọi thoại hiện chỉ hỗ trợ trên bản web."

### 6.1. Khái niệm nghiệp vụ

**Ai gọi được cho ai:** chỉ gọi được trong một cuộc trò chuyện **1-1** của Work Chat, tức là với người đã có cuộc 1-1 với mình. Cuộc gọi không có luật quyền riêng; nó dùng lại `ConversationAccess.requireParticipant` (đã ở trong cuộc trò chuyện là gọi được).

**Âm thanh không đi qua server UniChat.** Đây là điểm quan trọng nhất để hiểu phần này:

```
                         (1) Vòng đời cuộc gọi: REST         ┌──────────────────────┐
  Trình duyệt A  ──────────────────────────────────────────► │      Core API        │
  (người gọi)    ◄────────── (2) Sự kiện: STOMP ──────────── │  - lưu bảng calls    │
       │  ▲                                                   │  - chuyển thư        │
       │  │      (3) Signalling: offer/answer/ICE qua STOMP   │    signalling        │
       │  └────────────────────────────────────────────────── │  - KHÔNG nghe/ghi âm │
       │                                                      └──────────────────────┘
       │                                                                 ▲
       │                (4) ÂM THANH đi thẳng giữa hai máy               │ (1)(2)(3)
       │                    (WebRTC, mã hóa SRTP)                         │
       └──────────────────────────────────────────────────────►  Trình duyệt B
                         nếu không nối thẳng được: qua TURN        (người nghe)
```

Có ba loại thông tin, đi ba đường khác nhau:

| Loại | Đi đường nào | Vì sao |
|---|---|---|
| **Vòng đời** (gọi, nhận, từ chối, cúp, báo lỗi) | REST (HTTP) | Xảy ra 1–2 lần mỗi cuộc gọi, làm thay đổi dữ liệu đã lưu, và có thể lỗi theo kiểu người dùng cần đọc ("bạn đang có cuộc gọi khác"). HTTP có response để trả lỗi đó |
| **Sự kiện** (có người gọi tới, bên kia đã nhận, bên kia đã cúp) | STOMP, đích `/user/queue/calls` | Server phải chủ động báo cho bên kia |
| **Signalling** (offer, answer, ICE candidate) | STOMP: gửi tới `/app/calls/{callId}/signal`, nhận ở `/user/queue/calls/signal` | Rất nhiều gói nhỏ, chỉ có giá trị trong vài giây; đi qua HTTP sẽ chậm. **Không bao giờ được lưu** vì chứa địa chỉ mạng của người dùng |

**Kết quả của một cuộc gọi** được mô tả bằng hai thông tin tách riêng:

- `status`: cuộc gọi đã tới đâu (đang đổ chuông, đang nói, đã kết thúc…);
- `end_reason`: vì sao dừng. Cùng là "nhỡ" (`MISSED`) nhưng có thể vì không ai nghe, vì người kia offline, hay vì người kia đang bận.

### 6.2. Dữ liệu: bảng `calls`, giải thích từng cột

Migration [V44__direct_calls.sql](../../core-api/src/main/resources/db/migration/V44__direct_calls.sql). Mỗi dòng là **một lần gọi**. Bảng chỉ lưu **lịch sử** (ai gọi ai, lúc nào, bao lâu, kết thúc ra sao), không lưu âm thanh hay dữ liệu signalling.

| Cột | Kiểu | Bắt buộc | Ý nghĩa dễ hiểu | Ví dụ |
|---|---|---|---|---|
| `id` | UUID | Có | Mã cuộc gọi. Mọi API vòng đời và mọi gói signalling đều mang mã này | |
| `conversation_id` | UUID → `direct_conversations.id` (CASCADE) | Có | Cuộc gọi diễn ra trong cuộc trò chuyện nào. Lịch sử cuộc gọi hiện xen kẽ với tin nhắn của cuộc trò chuyện này | |
| `caller_id` | UUID → `users.id` | Có | **Người gọi** (bấm nút gọi) | id của An |
| `callee_id` | UUID → `users.id` | Có | **Người được gọi** (người kia trong cuộc 1-1). Chỉ người này được nhận hoặc từ chối | id của Bình |
| `media` | VARCHAR(10) | Có | Người gọi yêu cầu `AUDIO` (thoại) hay `VIDEO`. Hiện frontend luôn gửi `AUDIO` | `AUDIO` |
| `status` | VARCHAR(20) | Có | Trạng thái, một trong 6 giá trị ở bảng dưới | `ENDED` |
| `started_at` | TIMESTAMPTZ | Có | Lúc bấm gọi (bắt đầu đổ chuông) | `10:00:00` |
| `answered_at` | TIMESTAMPTZ | Không | Lúc người kia nhấc máy. `NULL` = không ai nhấc máy | `10:00:07` |
| `ended_at` | TIMESTAMPTZ | Không | Lúc cuộc gọi kết thúc. `NULL` = vẫn đang đổ chuông hoặc đang nói | `10:05:07` |
| `end_reason` | VARCHAR(20) | Không | Vì sao kết thúc (bảng dưới). `NULL` khi còn đang diễn ra | `HUNG_UP` |

**Thời lượng nói chuyện** không lưu thành cột, mà tính khi đọc: `ended_at − answered_at` (ví dụ trên: 5 phút). Không ai nhấc máy thì thời lượng là 0.

**Sáu trạng thái (`status`):**

| Giá trị | Nghĩa | Còn "chiếm máy"? | `answered_at` | `ended_at` |
|---|---|---|---|---|
| `RINGING` | Đang đổ chuông, chưa ai nhấc | **Có** | NULL | NULL |
| `ACTIVE` | Đã nhấc máy, đang nói chuyện | **Có** | có | NULL |
| `ENDED` | Đã nói chuyện rồi một bên cúp máy | Không | có | có |
| `DECLINED` | Người được gọi bấm từ chối | Không | NULL | có |
| `MISSED` | Không ai nhấc máy: hết giờ đổ chuông, người kia offline hoặc đang bận, hoặc người gọi tự cúp khi còn đổ chuông | Không | NULL | có |
| `FAILED` | Hai máy không kết nối được âm thanh với nhau | Không | có thể có | có |

"Chiếm máy" nghĩa là người đó đang bận: không gọi đi được, và ai gọi tới sẽ nhận kết quả `BUSY`.

DB tự kiểm tra cột thời gian khớp với trạng thái bằng 5 ràng buộc CHECK riêng (`calls_ringing_has_no_times`, `calls_active_was_answered`, `calls_ended_was_answered`, `calls_unanswered_outcomes`, `calls_failed_is_over`). Ví dụ: không thể có dòng `ENDED` mà `answered_at` rỗng. Nhờ vậy, thời lượng không bao giờ bị tính từ một giá trị rỗng.

**Sáu lý do kết thúc (`end_reason`)** và trạng thái chúng dẫn tới:

| Lý do | Nghĩa | Dẫn tới `status` |
|---|---|---|
| `HUNG_UP` | Một bên bấm cúp máy | `ENDED` nếu đã nhấc máy; `MISSED` nếu còn đang đổ chuông (người gọi bỏ cuộc) |
| `DECLINED` | Người được gọi từ chối | `DECLINED` |
| `NO_ANSWER` | Đổ chuông quá 45 giây không ai nhấc | `MISSED` |
| `OFFLINE` | Lúc gọi, người kia không mở UniChat ở đâu cả | `MISSED` |
| `BUSY` | Lúc gọi, người kia đang trong cuộc gọi khác | `MISSED` |
| `CONNECTION_FAILED` | Âm thanh không thông được, hoặc rớt mà không tự nối lại | `FAILED` |

**Index:**

| Index | Phục vụ câu hỏi nào |
|---|---|
| `idx_calls_conversation (conversation_id, started_at DESC)` | Mở lịch sử cuộc gọi của một cuộc trò chuyện, mới nhất trước |
| `idx_calls_live_caller`, `idx_calls_live_callee` (chỉ dòng `RINGING`/`ACTIVE`) | "Người này có đang bận không?", hỏi trước mỗi cuộc gọi mới |
| `idx_calls_missed (callee_id, started_at DESC)` (chỉ dòng `MISSED`) | Dự định hiện số cuộc gọi nhỡ trên danh sách hội thoại. **Hiện chưa có mã nào dùng** (lỗi K8) |

### 6.3. API và kênh realtime

Controller: [CallController.java](../../core-api/src/main/java/com/unichat/core/workchat/call/api/CallController.java) (REST), [CallSignalController.java](../../core-api/src/main/java/com/unichat/core/workchat/call/ws/CallSignalController.java) (STOMP). Tiền tố `/api/v1`.

| Method & đường dẫn | Ai được gọi | Body gửi lên | Trả về |
|---|---|---|---|
| `POST /conversations/{conversationId}/calls` | Người trong cuộc 1-1 | `{media: "AUDIO" \| "VIDEO"}` | **201** + `CallResponse`. Kể cả khi người kia offline hoặc bận: khi đó `status = MISSED` và có `endReason` |
| `POST /calls/{callId}/accept` | Chỉ người được gọi | (không) | `CallResponse` với `status = ACTIVE` |
| `POST /calls/{callId}/decline` | Chỉ người được gọi | (không) | `CallResponse` với `status = DECLINED` |
| `POST /calls/{callId}/end` | Một trong hai bên | (không) | `CallResponse` với `ENDED` hoặc `MISSED` |
| `POST /calls/{callId}/failed` | Một trong hai bên | (không) | `CallResponse` với `status = FAILED` |
| `GET /calls/ice-servers` | Đã đăng nhập | (không) | `IceServersResponse {iceServers: [{urls, username, credential}], ttlSeconds}`. Không cache, vì mật khẩu TURN hết hạn sau 10 phút |
| `GET /conversations/{conversationId}/calls?page&size` | Người trong cuộc trò chuyện | (không) | Trang `CallHistoryEntry {id, outgoing, media, status, startedAt, talkSeconds}` nhìn từ phía người đọc (`outgoing = true` nếu mình là người gọi) |

`CallResponse` gồm: `id, conversationId, callerId, calleeId, media, status, startedAt, answeredAt, endedAt, endReason`.

| Kênh STOMP | Chiều | Nội dung |
|---|---|---|
| `/user/queue/calls` | Server → client | `CallEventMessage {callId, conversationId, peerId, peerName, incoming, media, status, endReason}`: có người gọi tới (`incoming = true`, `RINGING`), bên kia nhận máy, từ chối, cúp, hết giờ… `peer*` luôn là "người kia" nhìn từ phía người nhận |
| `/app/calls/{callId}/signal` | Client → server | `CallSignal {kind: OFFER \| ANSWER \| ICE, payload}`, `payload` ≤ 16 KB |
| `/user/queue/calls/signal` | Server → client | `RelayedSignal {callId, kind, payload}`: gói signalling của bên kia, chuyển nguyên văn |

### 6.4. Service nào làm gì: nhận gì, trả gì

**Backend** (gói [workchat/call](../../core-api/src/main/java/com/unichat/core/workchat/call/)):

| Service.hàm | Input | Output | Đọc / ghi | Lỗi có thể gặp |
|---|---|---|---|---|
| `CallService.start` | `callerId`, `conversationId`, `media` | `Call` (thành `CallResponse`) | R: `direct_conversations`, `calls` (người gọi/được gọi có đang bận?), `PresenceTracker`; W: `calls` | 404 không ở trong cuộc trò chuyện; 400 "Hiện chỉ hỗ trợ gọi giữa hai người" (nhóm chat); 400 "Bạn đang có một cuộc gọi khác" |
| `CallService.answer` | `calleeId`, `callId` | `Call` | W: `status = ACTIVE`, `answered_at` | 404; 403 không phải người được gọi; 409 "Cuộc gọi không còn đổ chuông" |
| `CallService.decline` | `calleeId`, `callId` | `Call` | W: `DECLINED`, `ended_at`, `end_reason` | như trên |
| `CallService.hangUp` | `actorId`, `callId` | `Call` | W: `ENDED`/`MISSED`, `ended_at`, `end_reason = HUNG_UP` | 403 không ở trong cuộc gọi; 409 "Cuộc gọi đã kết thúc" |
| `CallService.reportFailed` | `actorId`, `callId` | `Call` | W: `FAILED`, `end_reason = CONNECTION_FAILED` | như trên |
| `CallService.history` | `userId`, `conversationId`, trang | Trang `Call` (thành `CallHistoryEntry`) | R: `calls` | 404 |
| `CallService.requireSignalling` | `actorId`, `callId` | `Call` | R: `calls` | Gọi cho **mỗi gói signalling** để chắc người gửi thuộc cuộc gọi và cuộc gọi còn sống |
| `CallStateMachine` | `Call`, `actorId` | Không trả; sai thì ném lỗi | Không chạm DB | "Bộ luật": `requireCanAnswer`, `requireCanDecline`, `requireCanHangUp`, `requireCanSignal`. Sai **người** → 403; sai **trạng thái** → 409 |
| `RingingCallSweeper.sweep` | Chạy mỗi 10 giây (`@Scheduled`) | Không trả | R/W: `calls` đang `RINGING` quá 45 giây → `MISSED` + `NO_ANSWER`; báo cả hai bên | Chạy theo lịch chứ không hẹn giờ trong RAM, nên khởi động lại server không làm sót |
| `IceServerProvider.forCaller` | (không) | `IceServersResponse` | Đọc cấu hình `unichat.calls.stun-urls`, `turn-urls`, `turn-secret` | Mật khẩu TURN sinh mới mỗi lần, hết hạn sau 10 phút; secret không bao giờ rời server |
| `CallBroadcaster.onCallChanged` | `CallChangedEvent {recipientId, call}` (sau commit) | Đẩy `CallEventMessage` tới `/user/queue/calls` | R: `users` (tên người kia) | Đợi commit để không đổ chuông cho cuộc gọi đã bị rollback |
| `CallSignalController.relay` | `callId` (trong đích), `CallSignal`, người gửi | Chuyển `RelayedSignal` tới người kia | Gọi `requireSignalling` | Gói không hợp lệ bị **bỏ im lặng**, chỉ ghi log, để người dò không biết `callId` nào tồn tại |

**Frontend** (thư mục [features/calls](../../frontend/src/features/calls/)):

| Tệp | Vai trò | Input / output chính |
|---|---|---|
| [call-api.ts](../../frontend/src/features/calls/call-api.ts) | Hàm gọi REST | `startCall`, `acceptCall`, `declineCall`, `endCall`, `reportCallFailed`, `getIceServers`, `fetchCallHistory` → các DTO tương ứng |
| [call-signalling.ts](../../frontend/src/features/calls/call-signalling.ts) | Nghe/gửi qua STOMP | `onCallEvents(handler)`, `onCallSignals(handler)`, `sendSignal(callId, kind, payload)` |
| [call-machine.ts](../../frontend/src/features/calls/call-machine.ts) | Máy trạng thái phía trình duyệt (hàm thuần, dễ test) | Pha: `idle` → `outgoing`/`incoming` → `connecting` → `active` → `ended`; lưu `callId`, `peerName`, `muted`, `connectedAt` (để chạy đồng hồ) |
| [peer-connection.ts](../../frontend/src/features/calls/peer-connection.ts) | Bọc `RTCPeerConnection` của trình duyệt | Mở micro (chỉ âm thanh), tạo offer/answer, nhận ICE; **giữ lại ICE đến sớm** cho tới khi có offer; báo `onFailed` khi kết nối `failed`/`closed` |
| [call-provider.tsx](../../frontend/src/features/calls/call-provider.tsx) | Điều phối toàn bộ, cung cấp `useCall()` cho giao diện | `placeCall`, `answer`, `decline`, `hangUp`, `toggleMute` |
| [call-button.tsx](../../frontend/src/features/calls/components/call-button.tsx) | Nút gọi trên đầu khung chat | Chỉ hiện ở cuộc 1-1 |
| [call-overlay.tsx](../../frontend/src/features/calls/components/call-overlay.tsx) | Khung "Đang gọi… / Cuộc gọi đến / đồng hồ" | Nút nhận, từ chối, tắt micro, cúp |
| [call-log-entry.tsx](../../frontend/src/features/calls/components/call-log-entry.tsx) | Một dòng lịch sử trong khung chat | "Cuộc gọi đi · 5 phút", "Cuộc gọi nhỡ"… |

### 6.5. Luồng hoạt động chi tiết

#### a) Máy trạng thái của một cuộc gọi (phía server)

```
                         ┌─────────── người kia offline ──────────► MISSED (OFFLINE)
                         │
   bấm gọi ──► start() ──┼─────────── người kia đang bận ─────────► MISSED (BUSY)
                         │
                         └──► RINGING ──┬── người được gọi nhận ──► ACTIVE ──┬── một bên cúp ────────► ENDED (HUNG_UP)
                                         │                                    └── âm thanh không thông ─► FAILED (CONNECTION_FAILED)
                                         ├── người được gọi từ chối ─────────► DECLINED (DECLINED)
                                         ├── người gọi tự cúp ───────────────► MISSED (HUNG_UP)
                                         ├── quá 45 giây (sweeper) ──────────► MISSED (NO_ANSWER)
                                         └── kết nối hỏng khi đang đổ chuông ► FAILED (CONNECTION_FAILED)
```

#### b) Gọi đi và đổ chuông

```
Trình duyệt A (người gọi)                     Core API                                  Trình duyệt B (người nghe)
call-button → useCall().placeCall()
 1. có micro không? không → báo lỗi
 2. startCall(conversationId, "AUDIO")
    POST /conversations/{id}/calls ─────────►  CallService.start
                                               ├ requireParticipant (ở trong cuộc 1-1?)
                                               ├ là nhóm chat? → 400
                                               ├ A đang bận? → 400
                                               ├ whyCannotRing(B): offline? bận?
                                               ├ INSERT calls (RINGING)
                                               ├ nếu B offline/bận → finish(MISSED) và báo A
                                               └ ngược lại publish CallChangedEvent(B)
    ◄──────────────── 201 CallResponse          │ (sau commit)
 3. status = RINGING?                          CallBroadcaster ──── /user/queue/calls ────►  CallEventMessage
    → tạo CallPeer, mở micro,                                                                 {incoming: true, RINGING,
      tạo OFFER, gửi qua                                                                       peerName: "An"}
      /app/calls/{id}/signal ───────────────►  CallSignalController.relay                   → hiện khung "Cuộc gọi đến"
                                               ├ requireSignalling (A thuộc cuộc gọi?)       → GIỮ offer và các ICE lại,
                                               └ chuyển nguyên văn ── /user/queue/calls/signal ►  CHƯA mở micro
    ICE candidate … (nhiều gói) ────────────►  (chuyển tiếp như trên) ─────────────────────►  giữ lại
```

Thứ tự kiểm tra "B có bận không" được đặt **trước** khi lưu dòng mới của chính cuộc gọi này. Nếu đặt sau, câu truy vấn sẽ thấy chính dòng vừa lưu và luôn báo B bận (lỗi này đã từng xảy ra và đã sửa, có chú thích trong `CallService.start`).

#### c) Nhận máy và thiết lập âm thanh

1. B bấm "Nhận" → `answer()` ở frontend kiểm tra micro → `POST /calls/{id}/accept`.
2. `CallService.answer`: `CallStateMachine.requireCanAnswer` (B đúng là người được gọi, cuộc gọi còn `RINGING`) → `status = ACTIVE`, `answered_at = now` → báo cho A.
3. B **lúc này mới** tạo `CallPeer` và mở micro (để trình duyệt không hỏi quyền micro khi máy còn đang đổ chuông). B áp dụng OFFER đã giữ, tạo ANSWER gửi lại cho A, rồi áp dụng các ICE đã giữ.
4. A nhận ANSWER → `acceptAnswer`. Hai bên thử các ICE candidate; khi một đường thông, âm thanh bắt đầu chảy thẳng giữa hai máy → pha `active`, đồng hồ chạy.

#### d) Từ chối, cúp máy, kết nối thất bại

| Tình huống | Ai gọi API | Backend làm gì | Ai được báo |
|---|---|---|---|
| B từ chối | B → `POST /decline` | `DECLINED` | A (khung gọi đóng, hiện "Đã từ chối") |
| Một bên cúp | Bên đó → `POST /end` | `ENDED` nếu đã nói, `MISSED` nếu còn đổ chuông | **Chỉ bên kia** (bên bấm đã tự biết, báo lại sẽ chồng chéo việc dọn dẹp) |
| Âm thanh không thông / rớt hẳn | Bên phát hiện → `POST /failed` | `FAILED` | Bên kia |
| Không ai nhấc trong 45 giây | Không ai; `RingingCallSweeper` tự chạy | `MISSED` + `NO_ANSWER` | **Cả hai** (A tắt chuông chờ, B tắt khung cuộc gọi đến) |

Server không thể tự biết âm thanh có thông hay không, vì âm thanh không đi qua server. Vì vậy chỉ trình duyệt mới báo được `failed`.

#### e) Lịch sử cuộc gọi trong khung chat

Khi mở một cuộc trò chuyện, [work-chat-page.tsx](../../frontend/src/features/work-chat/work-chat-page.tsx) gọi song song `fetchMessages` và `fetchCallHistory` (`GET /conversations/{id}/calls`), rồi xếp cuộc gọi xen giữa tin nhắn theo thời gian. Mỗi dòng nhìn từ phía người đọc: "Cuộc gọi đi", "Cuộc gọi đến", "Cuộc gọi nhỡ", kèm thời lượng `talkSeconds`.

#### f) Mobile

Mobile có nút gọi trên đầu khung chat nhưng chỉ hiện thông báo "Gọi thoại hiện chỉ hỗ trợ trên bản web." ([messages/[conversationId].tsx](../../mobile/app/messages/%5BconversationId%5D.tsx)). Lịch sử cuộc gọi vẫn hiện trong khung chat mobile ([call-log.ts](../../mobile/src/features/messages/call-log.ts)), cùng cách diễn đạt với web. Một người dùng mobile **không nhận được** cuộc gọi đến: nếu họ chỉ mở app mobile, presence vẫn tính họ online (nếu app giữ kết nối STOMP), cuộc gọi sẽ đổ chuông mà không ai nghe được rồi thành `MISSED` sau 45 giây (cần kiểm chứng).

### 6.6. Những gì đã làm tốt

- **Âm thanh không qua server**, server chỉ chuyển thư signalling và không đọc nội dung. Dữ liệu signalling (chứa địa chỉ IP) không bao giờ được lưu hay ghi log.
- **Kiểm tra quyền ở mỗi gói signalling**, không chỉ một lần lúc bắt đầu, nên biết `callId` của người khác cũng không chen vào được. Gói bị từ chối bị bỏ im lặng để không lộ `callId` nào tồn tại.
- Tách rõ hai loại lỗi: sai **người** (403) và sai **trạng thái** (409), ở `CallStateMachine` không phụ thuộc DB nên test dễ.
- DB có 5 CHECK đảm bảo thời gian khớp trạng thái.
- Gọi cho người offline/bận vẫn được ghi thành cuộc gọi nhỡ, giống điện thoại thật, thay vì báo lỗi.
- Đổ chuông có hạn 45 giây, chạy theo lịch nên không sót khi khởi động lại.
- Người nghe không bị hỏi quyền micro khi máy còn đang đổ chuông; ICE đến sớm được giữ lại.
- Mật khẩu TURN sinh theo từng lần, hết hạn sau 10 phút, secret không gửi xuống trình duyệt.
- Chỉ đẩy sự kiện sau khi commit.

### 6.7. Những chỗ chưa ổn

| # | Mức | Vấn đề | Chi tiết |
|---|---|---|---|
| K1 | **Cao** | **Cuộc gọi `ACTIVE` có thể treo mãi, khóa cả hai người** | `RingingCallSweeper` chỉ dọn cuộc gọi `RINGING` ([RingingCallSweeper.java](../../core-api/src/main/java/com/unichat/core/workchat/call/service/RingingCallSweeper.java)). Không có gì dọn cuộc gọi `ACTIVE`: server không nghe sự kiện ngắt WebSocket để kết thúc cuộc gọi, frontend không gửi `end` khi đóng tab (`beforeunload`/`sendBeacon`). Cuộc gọi chỉ được đóng khi một trình duyệt còn mở và tự báo `end` hoặc `failed`. **Tái hiện:** đang gọi, cả hai cùng đóng tab (hoặc một bên mất mạng và bên kia đóng tab trước khi trình duyệt kịp báo `failed`). Dòng `calls` nằm mãi ở `ACTIVE`; `hasLiveCall` khiến cả hai không gọi được ai nữa ("Bạn đang có một cuộc gọi khác"), và ai gọi tới họ đều nhận `BUSY`. Chỉ sửa được bằng tay trong DB. **Sửa:** sweeper thứ hai cho `ACTIVE` quá lâu không có tín hiệu (vd. client gửi nhịp "còn sống" mỗi 15 giây, quá 60 giây không có thì `FAILED`); và/hoặc khi người dùng mất hết phiên WebSocket (`PresenceTracker`) thì kết thúc cuộc gọi của họ |
| K2 | **Trung bình** (cần kiểm chứng) | Hai người gọi nhau cùng lúc | `start()` kiểm tra "có bận không" rồi mới chèn dòng, không khóa. A gọi B và B gọi A trong cùng tích tắc: cả hai đều thấy người kia rảnh, tạo ra **hai** cuộc gọi `RINGING`, mỗi bên vừa đổ chuông vừa chờ. Hai người bấm gọi cùng một người thứ ba cũng tương tự. **Sửa:** khóa dòng theo người dùng, hoặc unique index một phần trên `(caller_id)`/`(callee_id)` với `status IN ('RINGING','ACTIVE')` (cần gộp cả hai cột vì một người có thể là người gọi hoặc người nghe) |
| K3 | **Trung bình** | Không có TURN server mặc định | Cấu hình mặc định chỉ có STUN của Google. Hai máy sau NAT chặt (4G, mạng công ty, ký túc xá) sẽ không nối thẳng được và cuộc gọi kết thúc `FAILED`. **Sửa:** dựng `coturn` hoặc thuê dịch vụ TURN, đặt `UNICHAT_CALLS_TURN_URLS` và `UNICHAT_CALLS_TURN_SECRET` |
| K4 | **Trung bình** | Presence và broker trong RAM | Giống lỗi C5: `PresenceTracker` và simple broker nằm trong bộ nhớ một instance. Chạy hai instance Core API thì người đang online ở instance kia bị coi là `OFFLINE`, gọi tới thành nhỡ ngay; gói signalling cũng không tới được |
| K5 | **Trung bình** | Mobile không gọi và không nhận được cuộc gọi | Mobile chỉ hiện thông báo. Người chỉ dùng app mobile mà vẫn giữ kết nối STOMP thì bị coi là online, cuộc gọi đến đổ chuông vô ích 45 giây (cần kiểm chứng). Cũng không có thông báo đẩy (push notification) khi có cuộc gọi đến |
| K6 | **Thấp** | `VIDEO` có trong DB và API nhưng chưa làm | Frontend luôn gọi `startCall(…, 'AUDIO')` và chỉ xin `audio: true`. Nên ghi rõ trong tài liệu, hoặc chặn `VIDEO` ở API cho tới khi làm |
| K7 | **Thấp** | Quyền gọi không xét "còn chung nhóm" | Giống C2: chỉ kiểm tra "ở trong cuộc 1-1". Hai người đã không còn chung nhóm nào vẫn gọi được cho nhau |
| K8 | **Thấp** | Có index cuộc gọi nhỡ nhưng không có tính năng | `idx_calls_missed` được tạo cho "huy hiệu cuộc gọi nhỡ trên danh sách hội thoại" nhưng không mã nào dùng; danh sách hội thoại không hiện cuộc gọi nhỡ. Người được gọi chỉ biết mình bị gọi nhỡ khi mở đúng cuộc trò chuyện đó |
| K9 | **Thấp** | Chưa có test tích hợp cho cuộc gọi | Lỗi "luôn báo bận" từng lọt tới trình duyệt vì repository bị mock trong unit test (có ghi chú trong `CallService.start`). Chưa có test Testcontainers cho `hasLiveCall`, các CHECK của bảng, và sweeper |

### 6.8. Gọi nhóm: hiện trạng và những gì cần để làm

**Hiện trạng: chưa có.** Bằng chứng trong mã:

- Backend: `CallService.start` ném `ValidationError("Hiện chỉ hỗ trợ gọi giữa hai người")` khi cuộc trò chuyện là nhóm chat.
- Frontend: [message-thread.tsx](../../frontend/src/features/work-chat/components/message-thread.tsx) chỉ hiện `CallButton` khi `!isGroup`.
- Bảng `calls` chỉ có hai cột người (`caller_id`, `callee_id`), không chứa được nhiều người.
- Kế hoạch gọi 1-1 ([ke-hoach-goi-1-1-webrtc-2026-10-18.md](ke-hoach-goi-1-1-webrtc-2026-10-18.md)) ghi rõ: *"Gọi nhóm nằm ngoài phạm vi"* vì cần SFU.

**Vì sao gọi nhóm khó hơn nhiều so với 1-1:**

| | Gọi 1-1 (hiện tại) | Gọi nhóm kiểu "mesh" (mỗi máy nối với mọi máy) | Gọi nhóm qua SFU |
|---|---|---|---|
| Mỗi máy gửi bao nhiêu luồng âm thanh | 1 | N − 1 (nhóm 6 người: 5 luồng) | 1 |
| Mỗi máy nhận bao nhiêu luồng | 1 | N − 1 | N − 1 (SFU chia lại) |
| Cần thêm hạ tầng | Không (chỉ STUN/TURN) | Không | **Có**: một media server (vd. LiveKit, mediasoup, Janus) |
| Giới hạn thực tế | | Khoảng 4–5 người là nghẽn mạng/CPU | Hàng chục người |
| Âm thanh có qua server không | Không | Không | **Có** (qua SFU, vẫn mã hóa đường truyền) |

**Những phần cần làm nếu triển khai gọi nhóm** (đề xuất, chưa có trong mã):

1. **Hạ tầng**: chọn và dựng SFU (LiveKit là lựa chọn dễ nhất vì có SDK web và React Native). SFU phải nằm trong mạng riêng giống các dịch vụ khác, chỉ mở cổng media.
2. **Dữ liệu**: bảng `calls` hiện tại không đủ. Hướng đơn giản: thêm `kind` (`DIRECT`/`GROUP`) vào `calls`, cho `callee_id` được rỗng với cuộc gọi nhóm, và thêm bảng mới `call_participants(call_id, user_id, invited_at, joined_at, left_at, end_reason)` để biết ai được mời, ai đã vào, ai rời lúc nào.
3. **Quyền**: Core API vẫn là nơi quyết định. Trước khi cho vào phòng, kiểm tra người dùng là thành viên nhóm chat (`ConversationAccess.requireParticipant`), rồi cấp một **token phòng ngắn hạn** cho SFU. SFU chỉ tin token do Core API ký.
4. **Trạng thái "bận"**: hiện "bận" nghĩa là đang có một cuộc gọi `RINGING`/`ACTIVE`. Với gọi nhóm cần quyết định nghiệp vụ: đang trong phòng nhóm thì có nhận cuộc gọi 1-1 không.
5. **Kết thúc**: phòng nhóm kết thúc khi người cuối cùng rời. Cần cả cơ chế dọn phòng treo (bài học từ lỗi K1).
6. **Frontend**: giao diện lưới nhiều người, ai đang nói, tắt/bật micro từng người; mobile cần SDK riêng.

---

## 7. Vấn đề xuyên suốt nhiều module

1. **Thiếu integration test và E2E cho các luồng này** (vi phạm mục Testing của `AGENTS.md`).
   - Test hiện có cho `communitychat`, `workspace`, `workchat` gần như toàn bộ là unit test mock repository.
   - Không có test Testcontainers nào chạy endpoint bài viết, cảm xúc, thông báo, link mời. Vì vậy ba lỗi S2 (CHECK constraint), S3 (thứ tự flush) và A1 (hợp đồng token) đều lọt.
   - E2E Playwright có `08-group-chat`, `07-work-chat-attachments`, `02-workspace-navigation`, nhưng **chưa có** kịch bản đăng bài → bình luận @AI → nhận trả lời, cũng như mời bằng link → chấp nhận.
   - Cuộc gọi cũng chỉ có unit test mock; lỗi "luôn báo bận" từng lọt tới trình duyệt vì vậy (K9).
2. **Kiểm tra "là thành viên" bị chép ít nhất 6 lần** (`DiscussionService.verifyMembership`, `PostReadService`, `PostAttachmentService`, `ComposeSuggestionService`, `WorkspaceService.checkAccess`, `WorkspaceInviteService`…). Bản nào cũng không kiểm tra trạng thái nhóm, và mã lỗi không thống nhất: workspace trả 404 để giấu, bài viết trả 403 "Bạn không phải thành viên của nhóm này", làm lộ sự tồn tại. **Đề xuất:** một bean `WorkspaceAccess` với `requireActiveMember(wsId, userId)` và `requireRole(...)`, dùng ở mọi nơi.
3. **Bộ đếm phi chuẩn hóa không an toàn khi ghi đồng thời** (S5). Nên dùng `UPDATE … SET x = x + 1` hoặc tính lại định kỳ.
4. **Sự kiện nền dùng lẫn `@EventListener` và `@TransactionalEventListener`**. Nên thống nhất: mọi tác dụng phụ ra ngoài (thông báo, AI, đẩy socket) chạy `AFTER_COMMIT`.
5. **Polling ở nhiều nơi dù đã có STOMP**: chuông thông báo (30 giây), chờ trợ lý (2 giây). Gom về một kênh `/user/queue/events`.
6. **Ngôn ngữ thông báo lỗi lẫn lộn**: nhiều chuỗi tiếng Anh ("Discussion not found", "Only the post author can accept an answer", "Title is required") hiện thẳng ra giao diện tiếng Việt.
7. **Frontend có vài lời gọi bỏ qua `fetchAuthorized`** (S14, upload ảnh bìa, gửi tin có tệp): mỗi nơi tự xử lý token, và một số nơi không refresh khi gặp 401.
8. **Trạng thái realtime nằm trong RAM của một instance** (C5, K4): simple broker và `PresenceTracker` khiến Work Chat lẫn cuộc gọi không chạy đúng khi có hai instance Core API trở lên.
9. **Cột và giá trị thừa trong DB** (W10, S16): còn dấu vết của các thiết kế cũ (`category`, `join_policy`, `tags`, `CONTRIBUTOR`, `PENDING_APPROVAL`, `COMMUNITY_MESSAGE`…). Nên dọn bằng một migration có ADR đi kèm, để người mới đọc DB không hiểu nhầm.

---

## 8. Kế hoạch cải thiện theo mức ưu tiên

### P0: sửa ngay (ảnh hưởng demo và bảo mật)

- [ ] **A1 + A2 + A3**: viết lại đường gọi AI cho @AI và tóm tắt tệp theo [mục 4.6](#46-hướng-sửa-đề-xuất); thêm test hợp đồng.
- [ ] **S1**: `toggleReaction` kiểm tra thành viên và bài tồn tại.
- [ ] **S2**: migration bổ sung `MENTION` vào CHECK của `notifications`, kèm integration test.
- [ ] **S3**: đổi cảm xúc bằng UPDATE tại chỗ, kèm integration test.
- [ ] **W1**: `accept()` kiểm tra mức hiển thị; chuyển sang PRIVATE thì thu hồi link.
- [ ] **W2**: endpoint danh bạ nhóm chỉ đọc cho mọi thành viên; tab Thành viên dùng endpoint này khi không phải OWNER.
- [ ] **K1**: dọn cuộc gọi `ACTIVE` bị treo (nhịp "còn sống" từ client + sweeper, hoặc kết thúc khi người dùng mất hết phiên WebSocket).

### P1: sửa trong vòng lặp kế tiếp

- [ ] **W3**: kiểm tra `workspace.status = ACTIVE` ở mọi module qua `WorkspaceAccess`; thiết kế job xóa nhóm.
- [ ] **A4**: kiểm tra lại quyền trước khi lưu câu trả lời AI.
- [ ] **A5, A6, A7**: hỗ trợ @AI trong bài viết, thống nhất regex, đẩy kết quả qua WebSocket.
- [ ] **S4, S5, S6**: `requirePost` ở mọi nơi; bộ đếm nguyên tử; chỉ thông báo nhắc tên mới.
- [ ] **C1, C6, C7**: tải tin cũ, bù tin khi kết nối lại, đánh dấu đã đọc khi đang mở cuộc trò chuyện.
- [ ] **W4, W5**: chức năng rời nhóm; chuyển quyền sở hữu đúng nghĩa.
- [ ] **K2, K3**: chặn hai cuộc gọi sống cùng lúc bằng ràng buộc DB; dựng TURN server cho môi trường triển khai.
- [ ] Integration test (Testcontainers) cho mọi endpoint trong mục 2.3, 3.3, 5.3, 6.3; E2E cho đăng bài + @AI, mời bằng link, gọi 1-1 (hai trình duyệt).

### P2: cải thiện

- [ ] **S7**: handle nhắc tên riêng, không suy từ email.
- [ ] **S8, S9**: dọn tệp khi xóa đính kèm; thông báo `AFTER_COMMIT`, đẩy realtime, "đọc tất cả" bằng một câu UPDATE.
- [ ] **C4, C5**: kiểm tra phiên trên WebSocket; broker relay qua RabbitMQ.
- [ ] **C2, C3**: chốt chính sách nhắn tin khi không còn chung nhóm; chặn hoặc báo cáo người dùng.
- [ ] **K5, K6, K8**: gọi trên mobile (cần thư viện WebRTC cho React Native), gọi video, huy hiệu cuộc gọi nhỡ.
- [ ] **Gọi nhóm**: chỉ bắt đầu khi đã chọn SFU, theo [mục 6.8](#68-gọi-nhóm-hiện-trạng-và-những-gì-cần-để-làm).
- [ ] **W6–W10, S10–S16, A8–A9, C8–C12, K7, K9**: các mục còn lại.

---

## 9. Phụ lục: tra nhanh file

| Lớp | Workspace | Mạng xã hội / @AI | Work Chat | Cuộc gọi |
|---|---|---|---|---|
| Controller | [workspace/api](../../core-api/src/main/java/com/unichat/core/workspace/api/) | [communitychat/api](../../core-api/src/main/java/com/unichat/core/communitychat/api/) | [workchat/api](../../core-api/src/main/java/com/unichat/core/workchat/api/), [workchat/ws](../../core-api/src/main/java/com/unichat/core/workchat/ws/) | [CallController](../../core-api/src/main/java/com/unichat/core/workchat/call/api/CallController.java), [CallSignalController](../../core-api/src/main/java/com/unichat/core/workchat/call/ws/CallSignalController.java) |
| Service | [WorkspaceService](../../core-api/src/main/java/com/unichat/core/workspace/service/WorkspaceService.java), [WorkspaceMemberService](../../core-api/src/main/java/com/unichat/core/workspace/service/WorkspaceMemberService.java), [WorkspaceInviteService](../../core-api/src/main/java/com/unichat/core/workspace/service/WorkspaceInviteService.java), [WorkspaceVisibilityPolicy](../../core-api/src/main/java/com/unichat/core/workspace/service/WorkspaceVisibilityPolicy.java), [WorkspaceStatsLoader](../../core-api/src/main/java/com/unichat/core/workspace/service/WorkspaceStatsLoader.java), [WorkspaceCoverService](../../core-api/src/main/java/com/unichat/core/workspace/service/WorkspaceCoverService.java) | [DiscussionService](../../core-api/src/main/java/com/unichat/core/communitychat/service/DiscussionService.java), [FeedService](../../core-api/src/main/java/com/unichat/core/communitychat/service/FeedService.java), [ReactionService](../../core-api/src/main/java/com/unichat/core/communitychat/service/ReactionService.java), [MentionResolver](../../core-api/src/main/java/com/unichat/core/communitychat/service/MentionResolver.java), [NotificationEventListener](../../core-api/src/main/java/com/unichat/core/communitychat/service/NotificationEventListener.java), [PostAttachmentService](../../core-api/src/main/java/com/unichat/core/communitychat/service/PostAttachmentService.java), [AiReplyService](../../core-api/src/main/java/com/unichat/core/communitychat/service/AiReplyService.java), [AiRetrievalClient](../../core-api/src/main/java/com/unichat/core/communitychat/service/AiRetrievalClient.java), [AttachmentSummaryService](../../core-api/src/main/java/com/unichat/core/communitychat/service/AttachmentSummaryService.java) | [DirectMessageService](../../core-api/src/main/java/com/unichat/core/workchat/service/DirectMessageService.java), [GroupConversationService](../../core-api/src/main/java/com/unichat/core/workchat/service/GroupConversationService.java), [ConversationAccess](../../core-api/src/main/java/com/unichat/core/workchat/service/ConversationAccess.java), [ContactDirectory](../../core-api/src/main/java/com/unichat/core/workchat/service/ContactDirectory.java), [ConversationSummaryAssembler](../../core-api/src/main/java/com/unichat/core/workchat/service/ConversationSummaryAssembler.java) | [CallService](../../core-api/src/main/java/com/unichat/core/workchat/call/service/CallService.java), [CallStateMachine](../../core-api/src/main/java/com/unichat/core/workchat/call/service/CallStateMachine.java), [RingingCallSweeper](../../core-api/src/main/java/com/unichat/core/workchat/call/service/RingingCallSweeper.java), [IceServerProvider](../../core-api/src/main/java/com/unichat/core/workchat/call/service/IceServerProvider.java), [CallBroadcaster](../../core-api/src/main/java/com/unichat/core/workchat/call/ws/CallBroadcaster.java) |
| Repository | [workspace/domain](../../core-api/src/main/java/com/unichat/core/workspace/domain/) | [communitychat/domain](../../core-api/src/main/java/com/unichat/core/communitychat/domain/) | [workchat/domain](../../core-api/src/main/java/com/unichat/core/workchat/domain/) | [workchat/call/domain](../../core-api/src/main/java/com/unichat/core/workchat/call/domain/) |
| Migration | V1, V4, V27, V41, V43 | V8, V9, V13, V17, V18, V19, V20, V21, V28, V42 | V22, V32–V49 (`read_at`), V36, V37, V39 | V44 |
| Frontend API | [workspace-api.ts](../../frontend/src/features/workspaces/workspace-api.ts), [invite-api.ts](../../frontend/src/features/workspaces/invite-api.ts), [member-api.ts](../../frontend/src/features/members/member-api.ts) | [community-api.ts](../../frontend/src/features/community/community-api.ts), [feed-api.ts](../../frontend/src/features/community/feed-api.ts), [await-ai-reply.ts](../../frontend/src/features/community/await-ai-reply.ts) | [work-chat-api.ts](../../frontend/src/features/work-chat/work-chat-api.ts), [group-api.ts](../../frontend/src/features/work-chat/group-api.ts), [stomp-connection.ts](../../frontend/src/lib/stomp-connection.ts) | [call-api.ts](../../frontend/src/features/calls/call-api.ts), [call-signalling.ts](../../frontend/src/features/calls/call-signalling.ts), [peer-connection.ts](../../frontend/src/features/calls/peer-connection.ts) |
| Frontend màn hình | [group-page.tsx](../../frontend/src/features/workspaces/group-page.tsx), [explore-tab.tsx](../../frontend/src/features/workspaces/components/explore-tab.tsx), [member-panel.tsx](../../frontend/src/features/members/components/member-panel.tsx) | [feed-page.tsx](../../frontend/src/features/community/feed-page.tsx), [discussion-page.tsx](../../frontend/src/features/community/discussion-page.tsx), [post-detail-page.tsx](../../frontend/src/features/community/post-detail-page.tsx) | [work-chat-page.tsx](../../frontend/src/features/work-chat/work-chat-page.tsx) | [call-provider.tsx](../../frontend/src/features/calls/call-provider.tsx), [call-overlay.tsx](../../frontend/src/features/calls/components/call-overlay.tsx), [call-log-entry.tsx](../../frontend/src/features/calls/components/call-log-entry.tsx) |
| AI Service | | [retrieval.py](../../ai-service/app/api/v1/retrieval.py), [security.py](../../ai-service/app/core/security.py), [answer_pipeline.py](../../ai-service/app/core/rag/answer_pipeline.py), [contracts.py](../../ai-service/app/core/rag/contracts.py) | | |
