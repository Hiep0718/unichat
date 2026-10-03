# Tổng kết phần Workspace & Cộng đồng

## Metadata

| Thuộc tính | Giá trị |
|---|---|
| Phạm vi | Workspace, bảng tin cộng đồng, đóng góp tài liệu, Work Chat, hồ sơ thành viên |
| Đối tượng dùng | Bất kỳ nhóm cần tra cứu trên tài liệu của mình: doanh nghiệp, phòng ban, tổ dự án, nhóm học, lớp |
| Người thực hiện | Hoàng Phi Hùng |
| Nhánh | `feat/knowledge-gap-escalation` (29 commit, đã merge `main`) |
| Ngày tổng kết | 2026-09-23 |
| Kiểm thử | Backend 168/168 · Frontend 59/59 |
| Tài liệu liên quan | `docs/ke-hoach-trien-khai-workplace.md` (kế hoạch), `.pipeline/decisions-log.md` (nhật ký quyết định) |

---

## 1. Một ý tưởng xuyên suốt

Toàn bộ phần này dựng trên **một câu truy vấn duy nhất**:

```java
// DocumentRepository
@Query("SELECT d.id FROM Document d WHERE d.workspaceId IN :workspaceIds AND d.status = 'PROCESSED'")
List<UUID> findAllowedDocumentIdsForWorkspaces(...)
```

Danh sách tài liệu đưa cho AI **chỉ gồm tài liệu ở trạng thái `PROCESSED`**. Hệ quả:

- Tài liệu chưa duyệt (`PENDING_APPROVAL`) hoặc bị từ chối (`REJECTED`) **tự động vô hình** với AI.
- Không cần sửa một dòng nào bên AI Service để có cơ chế phê duyệt.
- Muốn AI chỉ đọc **đúng một** tài liệu, chỉ cần truyền đúng một id — đó là toàn bộ cơ chế của tính năng tóm tắt tệp đính kèm.

Đây là điều nên nói trong buổi bảo vệ: **cơ chế phân quyền không nằm rải rác ở nhiều chỗ, nó nằm ở một chỗ duy nhất và mọi thứ khác thừa hưởng.**

**Ranh giới với phần của bạn cùng nhóm:** Core API là nơi duy nhất quyết định quyền truy cập. AI Service nhận vào danh sách id đã được duyệt sẵn và không bao giờ tự mở rộng.

---

## 2. Bảng tin cộng đồng

### 2.1 Đổi trục từ "điểm số" sang "trạng thái giải quyết"

Bản đầu làm theo kiểu Reddit: bình chọn lên/xuống, xếp hạng theo điểm. Đã bỏ.

**Lý do bỏ bình chọn xuống:** trong một nhóm mà mọi người quen mặt nhau — tổ dự án, nhóm học, phòng ban — bỏ phiếu xuống gây tổn thương thật; và ở quy mô vài chục người thì điểm số không xếp hạng được gì, 3 phiếu với 5 phiếu chẳng nói lên điều gì.

Thay bằng **bộ cảm xúc tích cực**: `LIKE`, `LOVE`, `INSIGHTFUL`, `CELEBRATE`. Migration `V17` gộp `UPVOTE`/`HELPFUL` cũ thành `LIKE` và xoá hẳn `DOWNVOTE`.

Trục mới của bảng tin là **trạng thái giải quyết**, tính từ hai dữ kiện đã có:

| Trạng thái | Điều kiện |
|---|---|
| Chưa có lời giải | `replyCount == 0` |
| Đang thảo luận | có trả lời, chưa ai được chấp nhận |
| Đã có lời giải | `acceptedReplyId != null` |

Đây là câu hỏi người đọc thật sự cần: *"cái này còn cần giúp không?"* — chứ không phải *"cái này được bao nhiêu điểm?"*

### 2.2 Bài viết

- **Đính kèm tệp** (`V20`): ảnh hiển thị trực tiếp; tài liệu **đi vào thư viện nhóm theo đúng luật phê duyệt sẵn có**, nên AI đọc được sau khi duyệt.
- **Sửa và xoá bài**: chỉ tác giả sửa; tác giả hoặc chủ/biên tập viên xoá. **Xoá mềm** — dòng dữ liệu được giữ để trả lời và bookmark không bị tham chiếu gãy, nhưng biến mất khỏi mọi danh sách (`status <> 'DELETED'` áp dụng ở mọi truy vấn).
- **Nhắc tên `@`** với gợi ý thành viên; người được nhắc nhận thông báo. Nhắc tên chỉ giải được trong phạm vi thành viên đang hoạt động của nhóm, nên **một lượt nhắc không bao giờ tới được người không mở được bài đó**.
- **Ghim bài**, **theo dõi ai đã đọc**, **tìm trong nhóm**.

### 2.3 Đóng góp tài liệu có bối cảnh

Không chỉ là "ném tệp vào rồi chờ duyệt". Người đóng góp phải điền **mô tả và lý do** (`V15`), để chủ nhóm biết *ai gửi* và *vì sao cần*. Phía chủ nhóm có chỉ báo số yêu cầu đang chờ.

---

## 3. Tích hợp AI vào cộng đồng

### 3.1 `@AI` trả lời kèm trích dẫn

**Mã cũ có bốn lỗi thật**, đều đã sửa:

| Lỗi | Hậu quả | Cách sửa |
|---|---|---|
| Gán câu trả lời AI cho **chính người hỏi** | Luồng hiện ra như người hỏi tự trả lời mình | Tài khoản hệ thống riêng, khoá đăng nhập (`V19`) |
| **Vứt mất `citations`** | Câu trả lời trông có căn cứ nhưng không kiểm chứng được | Lưu vào `discussion_replies.citations` (JSONB) |
| Gọi AI Service **không có `Authorization`** | Endpoint yêu cầu service token → luồng này đang 401 | Gửi `serviceTokenIssuer.issueToken()` |
| `CompletableFuture.runAsync` **ngoài transaction**, không ghi `retrieval_trace_id` | Có thể lưu ngoài giao dịch; không truy vết được | `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` |

**Vì sao phải đợi commit:** câu trả lời của AI trỏ `parent_reply_id` vào bình luận gốc. Khoá ngoại cần dòng đó **đã nằm trên đĩa**. Đẩy sớm hơn là trả lời một bình luận có thể còn bị rollback.

### 3.2 Tóm tắt tệp đính kèm

Tài liệu ingest xong → phát `DocumentProcessedEvent` → gọi AI Service với `allowedDocumentIds` **chỉ chứa đúng tệp đó**. Không thêm endpoint nào ở AI Service.

Bốn trạng thái để người đọc phân biệt được "đang tới" với "không bao giờ tới":

`NOT_APPLICABLE` (ảnh) · `PENDING` (chờ ingest/duyệt) · `READY` · `UNAVAILABLE`

**Một quyết định cố ý:** nếu AI trả về `refusalReason` thay vì `answer`, trạng thái thành `UNAVAILABLE` — **không lưu câu từ chối thành tóm tắt**. Lưu nó là hiển thị lời xin lỗi của AI ở chỗ người đọc tưởng là nội dung tài liệu.

### 3.3 Gợi ý khi soạn bài

Gõ tiêu đề → debounce 300 ms → tìm bài tương tự bằng **một câu truy vấn có chỉ mục, không đụng AI Service**. Gọi AI mỗi lần gõ phím thì vừa chậm vừa tốn, mà thứ cần ở đây chỉ là "đã ai hỏi câu này chưa".

**Bài đã có lời giải xếp lên trước**: bài đã chốt đáp án mới kết thúc việc đi tìm của người đọc; bài chỉ "liên quan" thì câu hỏi vẫn treo.

Kèm số tài liệu đã duyệt trong nhóm — cố ý **không hứa** AI trả lời được, chỉ nói có gì để tra hay không.

### 3.4 Tìm kiếm hợp nhất

`GET /api/v1/search` trả cả bài viết lẫn tài liệu trong mọi nhóm người dùng tham gia.

- **Phạm vi lấy từ membership trên server, không có tham số workspace.** Id trong query string là thứ client sửa được; lấy từ danh sách thành viên thì endpoint không thể bị nới rộng từ ngoài.
- **Tài liệu chỉ khớp theo tên tệp.** Tìm trong nội dung là việc RAG đã làm bằng embedding + re-ranker; làm lại bằng SQL chỉ cho ra câu trả lời tệ hơn bằng một đường thứ hai, và hai đường sẽ mâu thuẫn.
- **Hai loại để riêng, không trộn xếp hạng.** Người tìm tệp muốn thấy tệp, không phải tệp bị xếp dưới ba bài thảo luận có nhắc tới nó.

---

## 4. Work Chat

Nhắn tin 1-1 giữa thành viên cùng nhóm. **Làm lại từ đầu** — `V9` đã `DROP TABLE` ba bảng chat cũ, `pom.xml` không có phụ thuộc websocket lẫn redis.

### 4.1 Ba quyết định cốt lõi

**Chỉ nhắn được với người cùng nhóm.** Trong bất kỳ tổ chức nào, ai cũng nhắn được cho người lạ là cách để bị quấy rối, không phải tính năng. Luật này đặt riêng trong `ContactDirectory` để có **một chỗ duy nhất** quyết định, thay vì mỗi nơi gọi tự suy ra.

**Hai người lưu theo thứ tự cố định** (`participant_low < participant_high`), không lưu "người mở"/"người nhận". Nếu lưu `(a,b)` và `(b,a)` thì hai người sẽ có **hai cuộc trò chuyện khác nhau** tuỳ ai bấm trước, và ràng buộc `UNIQUE` không chặn được. Có `CHECK` trong DB và `DirectConversation.between()` là cách duy nhất khởi tạo.

**"Không tồn tại" và "không phải người trong cuộc" trả về cùng một lỗi.** Conversation id là UUID; nếu người lạ cầm id mà nhận được hai thông báo khác nhau, họ biết cuộc trò chuyện đó *có tồn tại*.

### 4.2 Realtime

Trình duyệt **không đặt được header `Authorization` cho WebSocket handshake**. Nên handshake buộc mở (đo được HTTP **101**), còn danh tính xác thực ở **STOMP CONNECT frame**. Socket mở được nhưng không CONNECT hợp lệ thì không subscribe hay gửi được gì. REST vẫn chặn bình thường (401).

- **Chỉ soi frame CONNECT** — một frame SEND không được tự xác thực lại thành người khác giữa chừng.
- **Chỉ dùng user destination** (`/user/queue/messages`), principal đặt tên bằng user id. Spring định tuyến theo tên principal nên không ai nghe được hàng đợi của người khác.
- **Đẩy tin sau khi commit.** Đẩy trước mà transaction rollback thì người nhận thấy một tin **không tồn tại**, và không có gì gỡ nó đi sau đó.

**Gửi tin đi bằng REST, socket chỉ để nhận.** Socket là tiện ích, không phải nguồn sự thật: mất kết nối vẫn gửi được, vẫn tải được lịch sử.

### 4.3 Giới hạn đã biết (cần nêu trong luận văn)

- Chỉ 1-1, chỉ văn bản. Không chat nhóm, không gửi tệp.
- Presence lưu **trong bộ nhớ tiến trình**, đếm theo số phiên (mở 2 tab đóng 1 thì không bị hiện offline). **Chạy nhiều instance thì mỗi instance chỉ thấy client nối vào chính nó.**
- Chưa kiểm thử thật hai người nhắn cho nhau.

---

## 5. Hồ sơ thành viên

### 5.1 Tên hiển thị — sửa một lỗi lộ thông tin

Trước đây **mọi cái tên trong app** là `email.split("@")[0]` — 10 chỗ trong 5 service. Tên hiện lên khắp nơi là phần trước `@` của địa chỉ email. Ngoài việc trông dở, nó **lộ một phần email của mọi người** cho tất cả thành viên cùng nhóm.

`V25` thêm `display_name`, backfill đúng thứ đang hiện nên **không có gì đổi hình thức** cho tới khi ai đó tự đặt tên.

**Handle `@nhắc tên` cố ý giữ theo email.** Handle phải duy nhất — unique index trên `lower(email)` bảo đảm điều đó; tên hiển thị là văn bản tự do, hai người cùng tên "Lan" thì `@lan` sẽ mơ hồ. Đây đúng là cách Slack tách username với display name.

### 5.2 Avatar

**Ảnh không bao giờ được lưu như lúc nhận.** Nó được giải mã, vẽ lại thành vuông 256×256, mã hoá lại thành PNG:

1. Chặn chi phí phục vụ một file khổng lồ.
2. **Xoá sạch metadata** — ảnh chụp từ điện thoại mang theo toạ độ GPS; tải lên nguyên si là gửi vị trí nhà bạn cho cả nhóm.
3. **Bước giải mã chính là bước kiểm tra thật sự** — `Content-Type` chỉ là thứ client *khai*. Có test riêng cho file rác khai là `image/png`.

Avatar chữ cái là **mặc định, không phải chỗ trống chờ thay**: không ai phải tải ảnh mới nhận ra được trong danh sách. Màu là **tập cố định 6 màu**, không phải hex tự do — màu bất kỳ sau chữ cái trắng rất dễ không đọc được.

`<img src>` không gửi được token, nên ảnh tải qua blob với **cache dùng chung theo userId** — nếu không, feed 20 bài của 4 người sẽ bắn 20 request.

### 5.3 Trang profile

Hiện **nhóm chung** giữa người xem và người được xem, vai trò trong mỗi nhóm, và đóng góp **tính trong đúng những nhóm đó**.

**Vì sao không hiện mọi nhóm:** liệt kê tất cả là nói cho người xem biết người kia học và làm ở đâu, vượt quá tầm với của chính họ. Dùng lại đúng luật `ContactDirectory` — một luật, một câu trả lời.

**Không cùng nhóm nào thì báo "không tìm thấy", không phải "hồ sơ trống"** — trống mà tìm thấy vẫn xác nhận tài khoản đó tồn tại với người đang dò id.

**Số liệu hiện theo cặp**, không phải số trần:

> Đã đóng góp **9/12 tài liệu được duyệt** · **7/23 trả lời được chấp nhận**

Một con số "23 trả lời" tâng bốc người đăng 23 lần mà không giải quyết được gì. **Tỷ lệ mới nói lên đóng góp đó có dùng được không** — và đó chính là con số đem vào luận văn.

---

## 6. Giao diện

Giao diện cũ có bốn vấn đề: viền 1px ở khắp nơi (trông như bản vẽ khung), màu tím nhạt Material `#dce1ff` bạc và tương phản yếu, cột trạng thái 44px tàn dư từ hướng Reddit ăn mất chiều ngang của tiêu đề, và chữ không có phân cấp (tiêu đề 15px, chữ phụ 13px).

Đã dựng lại bảng tin và Work Chat theo hướng **"Mạch lạc"**: thẻ trắng nổi bằng **bóng đổ thay vì viền**, nhấn bằng navy `#1e3a8a` đậm, bỏ cột 44px (trạng thái thành chip ở hàng header), tiêu đề lên 17.5px/700.

Thêm bộ token `--ws-*` **chứ không sửa đè** token Material cũ — sửa đè sẽ đổi giao diện toàn bộ app gồm cả những màn chưa rà. **Các màn còn lại (tài liệu, workspace, chat AI, admin) vẫn giao diện cũ.**

---

## 7. Số liệu

| Hạng mục | Số lượng |
|---|---|
| Commit tính năng | 29 |
| Migration | 13 (V12–V26) |
| Endpoint REST | 33 (Discussion 16 · WorkChat 7 · User 6 · Feed 3 · Search 1) |
| Test backend | 168 |
| Test frontend | 59 (9 tệp) |

Ba service có kiểm thử dày nhất đều là **chỗ đặt luật phân quyền**: `DirectMessageService` (13), `ContactDirectory` (8), `MemberProfileService` (9).

---

## 8. Nợ kỹ thuật còn lại

| Việc | Ghi chú |
|---|---|
| **Chưa kiểm thử thủ công** | Toàn bộ giao diện mới, avatar, profile, và Work Chat hai người — chưa ai nhìn thấy chạy thật |
| 32 lỗi lint có sẵn | Chủ yếu `no-console`, `react-hooks/set-state-in-effect` |
| `react-router-dom` 7.18.1 | 2 lỗ hổng high (CSRF bypass chế độ RSC), bản vá 7.18.4 |
| `DocumentService.java` 498 dòng | Vượt mức 300 dòng của `AGENTS.md` |
| Playwright cho luồng quan trọng | Chưa có |
| Quyền riêng tư profile | Chưa có tuỳ chọn "ai được xem hồ sơ tôi" — nêu như giới hạn đã biết |

### Bài học về migration (đã va hai lần)

Hai người đánh số migration độc lập trên cùng một database → **V16 và V23 đều bị va chạm**, và cả hai lần đều **im lặng** vì `validate-on-migrate` đang tắt. Đã bật lại: giờ va số sẽ **dừng app kèm thông báo rõ** thay vì bỏ qua rồi vỡ ở chỗ khác.

Hai quy ước cần thống nhất với bạn cùng nhóm:

1. **Chia dải số** — ví dụ Hùng dùng V50+, Hiệp dùng V27–V49.
2. **Không sửa file migration đã chạy** — kể cả comment, vì Flyway tính checksum trên toàn bộ nội dung file.

---

## 9. Đề xuất cải tiến

Xếp theo **giá trị cho luận văn chia cho công sức**, cao xuống thấp.

### Nên làm — rẻ và ăn thẳng vào luận đề

**1. Số liệu vòng đời tri thức cho chương đánh giá** *(~1 ngày)*
Một trang thống kê cấp nhóm: bao nhiêu câu hỏi được giải bởi AI, bao nhiêu bởi người, bao nhiêu chưa giải; bao nhiêu tài liệu được đóng góp rồi duyệt; **bao nhiêu câu trả lời của AI có trích dẫn**. Đây là **bảng số liệu cho chương kết quả** — thứ hiện phải tự đếm tay.

**2. Đánh dấu tài liệu nào đang thực sự được trích dẫn** *(~0.5 ngày)*
`retrieval_trace_id` đã ghi trên mỗi câu trả lời AI. Đếm ngược lại để hiện "tài liệu này đã được AI trích dẫn 14 lần". Cho chủ nhóm biết **đóng góp nào thật sự có ích** — và cho luận văn một con số về chất lượng kho tri thức.

### Đáng cân nhắc

**3. Thông báo gộp** *(~1 ngày)* — hiện mỗi lượt nhắc tên là một dòng thông báo. Gộp lại ("3 người đã nhắc bạn") trước khi số lượng làm nó vô dụng.

**4. Soạn thảo có định dạng** *(~1.5 ngày)* — câu hỏi kỹ thuật cần khối mã. Hiện body là văn bản thuần; trang chi tiết đã render Markdown nhưng lúc soạn thì không thấy trước được.

### Nên tránh trong 2 tháng còn lại

- **Chat nhóm / gửi tệp trong chat** — cần đổi schema và thiết kế lại phân quyền. Để lại như hướng phát triển.
- **Quyền riêng tư profile chi tiết** — nêu như giới hạn, đừng xây.
- **Chuyển nốt giao diện các màn còn lại** — làm nếu còn thời gian sau khi luận văn xong, không phải trước.

---

## 10. Việc nên làm ngay

1. **Khởi động lại và tự kiểm thử bằng mắt.** Không có gì trong tài liệu này được xác minh bằng mắt — chỉ bằng test và khởi động sạch.
2. **Nhắn bạn cùng nhóm** về dải số migration và luật không sửa file đã chạy.
3. **Mở hai trình duyệt, hai tài khoản cùng nhóm** để thử Work Chat — đây là phần duy nhất chưa từng chạy thật.
