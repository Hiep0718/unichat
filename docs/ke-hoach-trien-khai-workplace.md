# Kế hoạch triển khai — Tầng Workplace & Cộng đồng

## Metadata

| Thuộc tính | Giá trị |
|---|---|
| Phạm vi | Workspace, bảng tin cộng đồng, đóng góp tài liệu, Work Chat |
| Người thực hiện | Hoàng Phi Hùng |
| Nhánh | `feat/knowledge-gap-escalation` |
| Ngày lập kế hoạch | 2026-09-21 |
| Hạn hoàn thành | ~2026-11-21 (2 tháng) |
| Trạng thái | Đang thực hiện — Giai đoạn 6–7 đã code xong, chờ kiểm thử thủ công |
| Tài liệu liên quan | `docs/implementation_plan.md` (nâng cấp RAG — phần của Nguyễn Thanh Hiệp) |

---

## 1. Bối cảnh và định hướng

Sau khi xin ý kiến giảng viên hướng dẫn, dự án được chuyển hướng: **phát triển theo mô hình Workplace của Meta** (nhóm, bảng tin, thông báo, tệp tin, chat) và **kết nối với phần RAG đã xây dựng sẵn**.

Định hướng này **thay thế** luồng cũ, vốn là: đăng câu hỏi → phê duyệt → nạp vào cơ sở dữ liệu để RAG học. Luồng cũ không được tiếp tục.

Điểm khác biệt cốt lõi: nội dung do người dùng thảo luận **không** trở thành nguồn tri thức cho AI. Chỉ **tài liệu đã được duyệt** mới vào thư viện và được AI trích dẫn. Thảo luận là nơi con người trao đổi; tài liệu là nơi AI đọc.

## 2. Phạm vi và phân công

| Thành phần | Người phụ trách |
|---|---|
| RAG, AI Service, chất lượng truy hồi | Nguyễn Thanh Hiệp |
| Workspace, bảng tin cộng đồng, đóng góp tài liệu, Work Chat | Hoàng Phi Hùng (tài liệu này) |

Ranh giới kỹ thuật: **Core API là nơi duy nhất quyết định quyền truy cập.** AI Service nhận vào danh sách `allowedDocumentIds` đã được duyệt sẵn và không bao giờ tự mở rộng danh sách đó.

## 3. Nguyên tắc kiến trúc

Cơ chế chịu tải của toàn bộ thiết kế nằm ở một câu truy vấn:

```java
// DocumentRepository
@Query("SELECT d.id FROM Document d WHERE d.workspaceId IN :workspaceIds AND d.status = 'PROCESSED'")
```

Vì danh sách tài liệu cho phép **chỉ lấy tài liệu ở trạng thái `PROCESSED`**, mọi tài liệu chưa duyệt (`PENDING_APPROVAL`) hoặc bị từ chối (`REJECTED`) tự động vô hình với AI — **không cần sửa một dòng nào bên AI Service**. Toàn bộ luồng đóng góp và phê duyệt dựa trên tính chất này.

Hệ quả áp dụng cho các tính năng AI về sau: muốn giới hạn AI chỉ đọc một tài liệu cụ thể, chỉ cần truyền đúng một id vào `allowedDocumentIds`. Đây là lý do tính năng tóm tắt tệp đính kèm (Giai đoạn 5, mục ②) không cần thêm endpoint mới nào ở AI Service.

## 4. Lộ trình tổng quan

| Giai đoạn | Nội dung | Ước tính | Trạng thái |
|---|---|---|---|
| 1–2 | Lấy nhóm làm trung tâm | 2 tuần | ✅ Xong |
| 3–4 | Bài viết theo phong cách Workplace | 2 tuần | ✅ Xong |
| 5 | Tích hợp AI vào cộng đồng | 1 tuần | ✅ Xong |
| 6–7 | Work Chat | 2 tuần | ✅ Đã code xong |
| 8 | Kiểm thử, hoàn thiện, viết luận văn | 1 tuần | ⬜ Chưa bắt đầu |

Giai đoạn 1–4 hoàn thành sớm hơn dự kiến (trong ngày 2026-09-21), nên lịch còn dư thời gian đệm so với hạn 2026-11-21.

---

## 5. Chi tiết từng giai đoạn

### Giai đoạn 1–2 — Lấy nhóm làm trung tâm ✅

Chuyển trọng tâm từ "bảng tin toàn hệ thống" sang "nhóm", đúng như cách Workplace tổ chức.

- Trang chủ riêng cho mỗi nhóm, có tab Bài viết / Giới thiệu / Thành viên / Tài liệu.
- Dựng lại bảng tin xoay quanh **trạng thái giải quyết câu hỏi** (chưa có lời giải / đang thảo luận / đã giải quyết), thay cho kiểu xếp hạng Reddit.
- Bài Thông báo (`ANNOUNCEMENT`) giới hạn cho OWNER và EDITOR.
- Luồng đóng góp tài liệu: thành viên gửi tài liệu kèm **mô tả và lý do cần bổ sung**, chủ nhóm xem được ai gửi và vì sao trước khi duyệt; có chỉ báo số yêu cầu đang chờ.
- Chuyển tiếp câu hỏi AI không trả lời được thành bài đăng hỏi cộng đồng (nguồn gốc tên nhánh `knowledge-gap-escalation`).

### Giai đoạn 3–4 — Bài viết theo phong cách Workplace ✅

- Đính kèm tệp vào bài viết: ảnh hiển thị trực tiếp, tài liệu đi vào thư viện nhóm theo đúng quy tắc phê duyệt sẵn có.
- Tác giả sửa và xoá bài viết của mình; xoá mềm để giữ toàn vẹn tham chiếu.
- Thay bỏ phiếu lên/xuống bằng **bộ cảm xúc tích cực** (LIKE, LOVE, INSIGHTFUL, CELEBRATE). Lý do: bỏ phiếu xuống gây tổn thương trong nhóm mà ai cũng quen mặt nhau, và ở quy mô một lớp học thì điểm số không xếp hạng được gì.
- Nhắc tên (`@`) với gợi ý thành viên, kèm thông báo cho người được nhắc.
- Ghim bài, theo dõi ai đã đọc, tìm kiếm trong phạm vi nhóm.

### Giai đoạn 5 — Tích hợp AI vào cộng đồng ✅

| Mục | Nội dung | Ước tính | Trạng thái |
|---|---|---|---|
| ① | `@AI` trả lời trong bình luận, kèm trích dẫn | 2 ngày | ✅ Xong |
| ② | Đăng bài kèm tệp → AI tóm tắt tài liệu | 2 ngày | ✅ Xong |
| ③ | Gợi ý khi soạn bài | 1 ngày | ✅ Xong |
| ④ | Tìm kiếm hợp nhất (bài viết + tài liệu) | 2 ngày | ✅ Xong |

**① `@AI` kèm trích dẫn.** Sửa `DiscussionService`: mã cũ chỉ đọc trường `answer` và vứt bỏ `citations`, đồng thời gán câu trả lời của AI cho chính người hỏi. Nay trợ lý đăng bài bằng một tài khoản hệ thống riêng (khoá đăng nhập), giữ lại trích dẫn để người đọc kiểm chứng được, và ghi `retrieval_trace_id` (cột có từ V8, trước nay chưa từng dùng).

**② Tóm tắt tệp đính kèm.** Móc vào callback RabbitMQ có sẵn: tài liệu ingest xong → phát sự kiện → gọi AI Service với `allowedDocumentIds` **chỉ chứa đúng tệp đó**. Không cần thêm endpoint mới ở AI Service, không phụ thuộc tiến độ của Hiệp.

**③ Gợi ý khi soạn bài.** Khi người dùng gõ tiêu đề, hệ thống tìm các bài tương tự trong nhóm (debounce 300 ms, một câu truy vấn có đánh chỉ mục, **không** gọi AI Service), ưu tiên hiện bài đã có lời giải lên trước. Đồng thời cho biết nhóm có bao nhiêu tài liệu đã duyệt để người dùng biết trợ lý AI có đủ nguồn trả lời hay chưa. Bấm vào gợi ý sẽ mở bài cũ thay vì đăng bài mới.

**④ Tìm kiếm hợp nhất.** `GET /api/v1/search` trả về cả bài viết lẫn tài liệu trong mọi nhóm người dùng tham gia. Phạm vi lấy từ danh sách thành viên trên server, **không có tham số workspace nào để client nới rộng**. Hai loại kết quả để riêng thành hai mục chứ không trộn vào một bảng xếp hạng — chúng không so sánh được với nhau, và người đang tìm tệp thì muốn thấy tệp, không phải tệp bị xếp dưới ba bài thảo luận có nhắc tới nó. Tài liệu chỉ khớp theo **tên tệp**: tìm trong nội dung tài liệu là việc của RAG, làm lại bằng SQL ở đây chỉ cho ra câu trả lời tệ hơn bằng một đường thứ hai.

### Giai đoạn 6–7 — Work Chat ✅ (đã code, chờ kiểm thử thủ công)

Nhắn tin trực tiếp giữa các thành viên. Cần lưu ý: **phải làm lại từ đầu.**

- Migration `V9` đã `DROP TABLE` ba bảng chat cũ (`community_channels`, `community_messages`, `community_ai_responses`).
- `core-api/pom.xml` hiện **không có** phụ thuộc websocket lẫn redis.

Phạm vi được giữ hẹp có chủ đích, để kịp hạn:

- Chỉ chat 1-1, chỉ văn bản. Không chat nhóm, không gửi tệp.
- WebSocket/STOMP thuần Spring, **không dùng Redis**.
- Trạng thái trực tuyến lưu trong bộ nhớ tiến trình.

Giới hạn cần nêu rõ trong luận văn: vì trạng thái nằm trong bộ nhớ, thiết kế này chưa mở rộng ra nhiều tiến trình được. Đây là đánh đổi có ý thức theo thời hạn, không phải thiếu sót.

**Đã triển khai (3 chặng):**

1. *Lưu trữ và phân quyền* — bảng `direct_conversations` / `direct_messages` (V22), chỉ nhắn được với người **cùng nhóm**, hai người lưu theo thứ tự cố định để một cặp chỉ có một cuộc trò chuyện.
2. *Realtime* — STOMP qua WebSocket, xác thực ở **CONNECT frame** (trình duyệt không đặt được header cho handshake), chỉ dùng user destination nên không ai nghe được hàng đợi của người khác. Đẩy tin **sau khi commit**.
3. *Giao diện* — trang `/work-chat`: danh sách trò chuyện, khung tin nhắn, chọn người nhắn. Mất kết nối thì báo "đang kết nối lại", **vẫn gửi được** vì gửi đi qua REST chứ không qua socket.

**Phụ thuộc mới:** `spring-boot-starter-websocket` (version theo parent BOM) và `@stomp/stompjs@7.3.0` (không kéo theo gói nào).

**Chưa làm:** chưa chạy thử thật hai người nhắn cho nhau — việc đó cần hai tài khoản đăng nhập, mà tôi không tạo dữ liệu thử trên cơ sở dữ liệu chung. Cần bạn kiểm thử thủ công.

### Giai đoạn 8 — Kiểm thử, hoàn thiện, viết luận văn ⬜

- Bổ sung kiểm thử Playwright cho các luồng quan trọng.
- Dọn lỗi lint có sẵn (hiện **32 lỗi + 2 cảnh báo**: chủ yếu `no-console` và `react-hooks/set-state-in-effect`).
- Tách `DocumentService.java` (hiện 498 dòng, vượt mức 300 dòng của `AGENTS.md`).
- Thu thập số liệu đánh giá cho luận văn.
- Viết chương kết quả và đánh giá.

---

## 6. Rủi ro và phụ thuộc

| Rủi ro | Ảnh hưởng | Cách xử lý |
|---|---|---|
| Work Chat làm lại từ đầu, không có nền cũ | Cao — chiếm 2/4 tuần còn lại | Giữ phạm vi hẹp (1-1, chỉ văn bản, không Redis) |
| Cơ sở dữ liệu phát triển dùng chung với đồng đội | Trung bình | Migration đã va chạm số hiệu phiên bản một lần (V16); cần thống nhất số hiệu trước khi thêm migration mới |
| `mvnw test` không phát hiện lỗi khởi động | Trung bình | Flyway và kiểm tra schema chỉ chạy khi khởi động thật; phải chạy ứng dụng để xác minh, không chỉ chạy test |
| Tính năng AI phụ thuộc AI Service đang chạy | Thấp | Các luồng đều có đường xử lý khi AI Service không phản hồi, và nói rõ với người đọc thay vì im lặng |

## 7. Ghi chú về tài liệu này

Giai đoạn 1–4 được ghi lại dựa trên các commit đã thực hiện chúng, nên phản ánh đúng những gì đã làm. Nếu có chi tiết nào lệch với kế hoạch ban đầu như bạn nhớ, hãy sửa lại trực tiếp trong tài liệu này.
