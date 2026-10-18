# Architecture Decision Record — UniChat

## Metadata

| Thuộc tính | Giá trị |
|---|---|
| Phase | design-architecture |
| Task | TASK-012 |
| Version | 2.0 |
| Trạng thái | Approved — source of truth; implementation remains work-item gated |
| Product | AI Knowledge Platform for higher education |
| P0 slice | Adaptive Knowledge Retrieval & Reasoning |

## ADR-001 — Product framing

Decision: gọi sản phẩm là AI Knowledge Platform, nhưng P0 chỉ triển khai Adaptive Knowledge Retrieval & Reasoning.

Reason: giữ giá trị nghiên cứu rõ ràng mà không mở rộng sang Knowledge Graph, OCR, multi-agent hoặc memory dài hạn.

## ADR-002 — Ba runtime service trong monorepo

Decision: React SPA, Spring Boot Core API và FastAPI AI Service trong một monorepo.

Reason: Core sở hữu business/security; AI Service sở hữu extraction/retrieval/generation; frontend không chứa logic quyền. Monorepo giảm chi phí vận hành cho nhóm hai người.

## ADR-003 — Network boundary

Decision: chỉ frontend và Core API public. AI Service, PostgreSQL, ChromaDB và Ollama nằm trên private Docker network.

Reason: giảm bề mặt tấn công và ngăn client gọi thẳng retrieval/provider.

## ADR-004 — Authorization owner

Decision: Core API kiểm tra quyền trước khi gọi AI, truyền allowedDocumentIds và kiểm tra lại trước khi persist/return.

Reason: vector database không phải nguồn sự thật về quyền; reauthorization chống thay đổi ACL giữa request.

## ADR-005 — Authentication

Decision: access JWT RS256 15 phút; refresh token opaque 256 bit 7 ngày, hash trong DB, rotation/family reuse revocation; cookie HttpOnly/Secure/SameSite Strict; access token trong memory; CSRF double-submit + Origin. Hashing strategy, pepper usage, configuration contract và rotation implications phải được phê duyệt riêng trước refresh-token hashing implementation.

Reason: không lưu access token lâu dài ở browser và phát hiện refresh token bị đánh cắp.

## ADR-006 — Service authentication

Decision: Core ký service JWT RS256 exp tối đa 60 giây, gắn method/path/bodyHash/idempotencyKey/requestId/kid; AI kiểm signature, replay và claim binding.

Reason: network private không thay thế authentication và integrity.

## ADR-007 — Thay thế hàng đợi PostgreSQL bằng RabbitMQ cho Async Ingestion

Decision: Sử dụng RabbitMQ làm Message Broker chính cho hệ thống. Core API sẽ đóng vai trò Producer đẩy thông điệp vào queue, và AI Service sẽ làm Consumer để xử lý ingestion bất đồng bộ (idempotent, có retry và dead-letter queue). Loại bỏ thiết kế dùng PostgreSQL `resource_jobs` cũ.

Reason: Hệ thống đã đạt trạng thái READY. RabbitMQ cung cấp khả năng xử lý hàng đợi chuyên nghiệp, tin cậy, điều phối tốt giữa các microservices và dễ dàng mở rộng (scale) Consumer khi lượng tài liệu tăng cao.

## ADR-008 — Storage

Decision: PostgreSQL 18.4 cho nghiệp vụ, Chroma collection mục tiêu `unichat_chunks_v1` cosine cho vector, local file storage sau StoragePort. Python client hiện là `chromadb==1.5.9`, server hiện là `0.6.3`; compatibility contract chưa được chứng minh và chịu gate `SEC-DEBT-001`.

Reason: relational constraints và vector retrieval rõ ràng; interface cho phép thay local storage bằng MinIO trong tương lai.

## ADR-009 — Embedding

Decision: intfloat/multilingual-e5-base, 768 chiều, revision d128750597153bb5987e10b1c3493a34e5a4502a, prefix query:/passage:.

Reason: hỗ trợ tiếng Việt/đa ngôn ngữ, chạy local và tái lập bằng revision đóng băng.

## ADR-010 — Adaptive Retrieval v1

Decision: detector luật xác định với sáu intent, strategy mapping theo phiên bản và Evidence Gate ANSWER/CLARIFY/REFUSE. Không dùng LLM classifier P0.

Reason: giải thích được, unit-test được và phù hợp quy mô dataset. Chi tiết ở adaptive-retrieval-spec.md.

## ADR-011 — Generation provider

Decision: Gemini stable gemini-3.5-flash là primary; Ollama 0.31.2 là fallback một lần chỉ cho timeout/429/5xx. Không fallback cho validation/auth/safety/evidence refusal.

Reason: fallback phải giữ semantics và không che lỗi bảo mật hoặc thiếu bằng chứng.

## ADR-012 — Citation as contract

Decision: mọi factual claim cần citation hợp lệ; PDF dùng page, DOCX dùng logical block/paragraph/table cell, TXT dùng line range; locator gắn contentHash/extractorVersion.

Reason: citation là tiêu chí chất lượng và bằng chứng khóa luận, không chỉ metadata trang trí.

## ADR-013 — Delete saga

Decision: mark DELETING/revoke retrieval → xóa vector → xóa file → redact citation excerpt → hard delete content metadata → giữ audit không nội dung.

Reason: xóa phân tán không thể là một transaction; saga idempotent ngăn dữ liệu mồ côi và rò rỉ.

## ADR-014 — API và error contract

Decision: REST prefix /api/v1 và /internal/v1; opaque cursor; Idempotency-Key cho mutation quan trọng; RFC 7807 cho error; OpenAPI sinh từ code.

Reason: contract rõ, retry an toàn và frontend sinh type thay vì lặp DTO.

## ADR-015 — UI state

Decision: TanStack Query cho server state, React Context chỉ cho access token/auth session, React Hook Form + Zod cho form, local state cho presentation. Không Redux/Zustand P0.

Reason: giảm state trùng và chỉ thêm global store khi profiling/complexity chứng minh cần.

## ADR-016 — Logging và observability

Decision: structured JSON, traceparent/requestId xuyên service, Prometheus metrics, typed errors/global handlers; không log secret, raw token, toàn văn prompt/chunk.

Reason: debug được mà không tạo kênh rò rỉ dữ liệu.

## ADR-017 — Version strategy

Decision: direct dependency exact pin; cài từ manifest và/hoặc lockfile tương ứng của từng ecosystem đã được review; không giả định ecosystem có lockfile khi repository không sử dụng. Docker image dùng tag + digest; không caret/tilde/latest. TypeScript giữ 6.0.3 thay vì nhảy major 7 vừa phát hành.

Reason: reproducibility quan trọng hơn chạy theo major mới.

## ADR-018 — Testing/evaluation

Decision: unit ≥80% core logic; integration cho mọi API/DB; Playwright cho critical flows; network ngoài hệ thống luôn mock. Nghiên cứu dùng 120 case, 60 development/60 holdout, split theo topic group.

Reason: tách kiểm thử phần mềm khỏi đánh giá nghiên cứu và ngăn data leakage.

## ADR-019 — Offset pagination cho P0

Decision: Sử dụng offset-based pagination (Spring Data `PageRequest`) cho tất cả list endpoints trong P0, thay vì cursor-based pagination opaque.

Reason: Dataset P0 nhỏ (users ~100, workspaces ~1000); offset đủ hiệu năng và Spring Data hỗ trợ native. Cursor-based refactor ảnh hưởng lớn đến backend custom query và frontend pagination component mà không mang lại giá trị tương xứng tại scale này. Sẽ nâng cấp khi dataset > 10.000.

## ADR-020 — CSRF protection exception cho P0

Decision: Không bật CSRF double-submit protection ở Core API (`csrf.disable()`) trong giai đoạn P0. Các cookie (`refresh_token`) được đặt `SameSite=Strict`.

Reason: Hệ thống stateless API sử dụng Bearer token không bị ảnh hưởng bởi CSRF. Cookie duy nhất thay đổi state là `refresh_token` đã được bảo vệ bởi cờ `SameSite=Strict`, đủ để ngăn chặn các cuộc tấn công CSRF phổ biến trên trình duyệt hiện đại trong môi trường development. CSRF double-submit sẽ là yêu cầu bắt buộc khi triển khai production với custom domain.

## ADR-021 — Short-term Conversation Memory & Context Window Compaction

Decision: Truyền conversation history (tối đa 10 lượt trao đổi gần nhất raw + compacted summary) cho LLM trong mỗi request hỏi đáp. Compaction trigger tại AI Service khi conversation context vượt quá 80% conversation token budget (8,500 tokens). Compacted summary được lưu trữ trên trường `summary` và `summary_version` của bảng `conversations` với optimistic locking. Bypass quy tắc CLARIFY đối với các đại từ phụ thuộc ngữ cảnh (ví dụ: "nó là gì", "cái đó là gì") khi có conversation history cung cấp tham chiếu. Shared prompt builder được trích xuất vào `prompt_builder.py` để loại bỏ sự trùng lặp system prompt giữa streaming và non-streaming provider.

Reason: Tính năng cốt lõi P0 cần sự mạch lạc và hiểu ngữ cảnh liên tục giữa các lượt hỏi đáp trong cùng một phiên hội thoại (multi-turn coherence). Đây là short-term session memory (trong phạm vi một phiên hội thoại), không phải long-term persistent memory xuyên các phiên hay user profiling (vẫn tuân thủ ranh giới của ADR-001).

## ADR-022 — Tệp đính kèm trong Work Chat

Decision: Tệp gửi trong hội thoại được lưu ở bảng `chat_attachments` gắn vào `direct_messages.id`, **không** đăng ký vào kho tài liệu Workspace và **không** bao giờ trở thành nguồn truy xuất cho trợ lý AI; vì vậy bảng không có cột `document_id` và enum là `IMAGE`/`FILE` thay vì `IMAGE`/`DOCUMENT` như `post_attachments`. Văn bản và tệp đi trong **một** request multipart duy nhất (`POST /work-chat/conversations/{id}/messages` với `consumes: multipart/form-data`, song song endpoint JSON cũ). `direct_messages.body` trở thành nullable, với CHECK `body IS NULL OR length(trim(body)) > 0`. Giới hạn 5 tệp và 20 MiB **cho cả tin nhắn**, allowlist PNG/JPEG/WebP/GIF/PDF/DOCX/TXT. Nội dung tệp chỉ phục vụ qua endpoint có kiểm tra tham gia hội thoại, kèm `X-Content-Type-Options: nosniff` và `Content-Disposition: inline` chỉ cho ảnh trong allowlist.

Reason: Một tệp gửi riêng giữa hai người mà tự động thành nguồn truy xuất của cả nhóm là hành vi công bố thứ chưa từng được chia sẻ — đây là quyết định về quyền riêng tư, không phải phần còn thiếu. Gộp văn bản và tệp vào một request là vì `WorkChatBroadcaster` đẩy tin nhắn ngay sau commit: tách thành hai bước sẽ hiện cho người nhận một bong bóng mà tệp chưa tới, và không có sự kiện nào sau đó thu nó lại. Giới hạn tính theo tin nhắn vì `spring.servlet.multipart.max-request-size` chặn cả request ở 25 MB, nên giới hạn theo từng tệp sẽ bị tầng servlet từ chối bằng một lỗi không nói được gì cho người dùng. Loại SVG và HTML khỏi allowlist vì cả hai chạy script khi được phục vụ inline cùng origin với API.

## ADR-023 — Hội thoại nhóm trong Work Chat

Decision: Mở rộng `direct_conversations` tại chỗ bằng cột `kind` (`DIRECT`/`GROUP`), `title`, `created_by`, cộng bảng `conversation_participants` (`conversation_id`, `user_id`, `role`, `joined_at`, `last_read_at`). Hàng DIRECT giữ cặp participant đã sắp thứ tự, hàng GROUP để hai cột đó NULL và bắt buộc có `title`; một CHECK ràng buộc đúng hình dạng của từng loại. **Cả hai loại đều có hàng participant**, kể cả hội thoại 1-1 đã tồn tại (migration backfill), nên quyền truy cập, liệt kê và trạng thái đọc chỉ có một đường code. Trạng thái đã đọc chuyển sang **mốc nước** `conversation_participants.last_read_at`; cột `direct_messages.read_at` bị bỏ sau khi backfill, và `MessageResponse` không còn `readAt` — UI chỉ hiện số tin chưa đọc. Phân quyền: chỉ OWNER đổi tên nhóm và thêm/xóa thành viên; ai cũng rời được; OWNER rời thì quyền chuyển cho người `joined_at` sớm nhất; mọi người được thêm phải thỏa `ContactDirectory.canMessage`. Tối đa 50 người. Người mới thấy toàn bộ lịch sử. Đẩy tin realtime bằng **fan-out tới từng `/user/queue/...`**, không dùng `/topic/conversation/{id}`; thêm `/user/queue/conversations` để báo danh sách hội thoại đã đổi.

Reason: Không đổi tên hai bảng vì migration chỉ còn là thêm cột cộng một lần backfill — đổi tên mua được cái tên đẹp hơn bằng cái giá là mọi nhánh đang checkout trên database dùng chung; tên "direct_" được ghi rõ trong JavaDoc là dấu vết lịch sử. Mốc nước thay cờ trên từng tin nhắn vì với N người, "đã đọc" là sự kiện của từng người chứ không của tin nhắn, và cờ trên mỗi cặp (người × tin nhắn) là một bảng nổ theo tích. Mọi thành viên phải là contact vì nếu không, nhóm trở thành đường lách luật "người lạ không nhắn được cho bạn": thêm họ vào nhóm rồi nhắn. OWNER rời phải chuyển quyền, nếu không nhóm còn người mà không ai quản trị được. Fan-out thay topic là vấn đề bảo mật thật: `StompAuthChannelInterceptor` chỉ xác thực CONNECT và **không** kiểm tra SUBSCRIBE, nên một topic đặt tên theo id hội thoại sẽ cho bất kỳ user đã đăng nhập nào nghe hội thoại của người khác; destination `/user/**` được Spring gán theo principal nên không có kẽ hở đó. Người mới thấy toàn bộ lịch sử là lựa chọn có ý thức, không phải bỏ sót: mục đích của nhóm là mạch hội thoại chung, và một người chỉ đọc được nửa sau sẽ trả lời những câu họ không nhìn thấy; nếu cần chặt hơn thì thêm `AND m.createdAt >= :joinedAt` vào truy vấn tin nhắn.

## ADR-024 — Ngữ nghĩa của ba mức Workspace visibility

Decision: Định nghĩa `PRIVATE`/`SHARED`/`PUBLIC` thành một bậc thang có hành vi thật, với **một luật mới duy nhất**: workspace `PRIVATE` không được có thành viên nào ngoài owner. Cụ thể — `PRIVATE`: `addMember` bị từ chối (400); `SHARED`: owner mời thành viên bằng email, không hiện ở trang Khám phá và người ngoài không tự tham gia được; `PUBLIC`: hiện ở Khám phá, ai đã đăng nhập cũng tự tham gia làm VIEWER, metadata và ảnh bìa đọc được từ bên ngoài. Hạ xuống `PRIVATE` khi còn thành viên ACTIVE khác bị **từ chối** (409) chứ không thu hồi hàng loạt. Luật nằm trong `WorkspaceVisibilityPolicy`, được áp ở cả ba đường vào: `WorkspaceMemberService.addMember`, `WorkspaceService.updateWorkspace` và `WorkspaceService.setVisibilityAsAdmin`. Frontend có `workspace-visibility.ts` là nguồn nhãn và mô tả duy nhất.

Reason: Trước ADR này ba mức chỉ khác nhau cái nhãn trên thẻ: mọi điều kiện trong toàn bộ codebase đều là `== PUBLIC` hoặc `!= PUBLIC`, nên `PRIVATE` và `SHARED` hành xử giống hệt nhau, và không test nào chạm tới `SHARED`. Nguy hiểm hơn, bốn màn hình mô tả chúng **mâu thuẫn nhau**: ba chỗ hứa `PRIVATE` là "chỉ mình tôi" trong khi `addMember` không hề kiểm tra visibility, nên người dùng chọn `PRIVATE` vì tin lời hứa đó rồi tự tay phá vỡ nó mà hệ thống không cảnh báo; một chỗ còn hứa `SHARED` cho "truy cập qua link" trong khi không có bảng, endpoint hay token mời nào tồn tại. Chọn sửa code cho khớp lời hứa thay vì viết lại lời hứa cho khớp code, vì "chỉ mình tôi" là kỳ vọng đúng của người dùng về một mức tên là Riêng tư, và vì nó biến enum chết thành bậc thang mà ai cũng đoán được. Luật chuyển trạng thái là bắt buộc chứ không phải thừa: thiếu nó thì guard ở `addMember` là cánh cửa không có tường — mời năm người rồi hạ về `PRIVATE` là có workspace ghi "Chỉ mình bạn truy cập" trong khi năm người vẫn đọc được. Từ chối thay vì tự động REVOKE vì thu hồi quyền hàng loạt sau một cú click là thao tác owner không lấy lại được. Đường admin phải đi qua service vì trước đây nó ghi thẳng repository, tức là bỏ qua mọi luật; nhân tiện `valueOf` không bọc ở đó trả 500 cho mọi chuỗi sai thay vì 400. Link mời **không** nằm trong phạm vi ADR này: nó cần bảng `workspace_invites` với token hash, hạn dùng và thu hồi, nên được tách thành việc riêng, và mọi mô tả hứa hẹn link đã bị gỡ khỏi UI cho tới khi tính năng tồn tại.

## ADR-025 — Link mời workspace

Decision: Thêm bảng `workspace_invites` (`token_hash` SHA-256 duy nhất, `role`, `expires_at`, `max_uses`/`used_count`, `revoked_at`) cùng bốn route: `POST`/`GET`/`DELETE` dưới `/workspaces/{id}/invites` cho chủ nhóm, và `GET /invites/{token}` (**không cần đăng nhập**) cộng `POST /invites/{token}/accept` (cần đăng nhập) cho người được mời. Token là 32 byte ngẫu nhiên, trả về **đúng một lần** lúc tạo; chỉ hash được lưu. `role` bị CHECK ràng buộc còn `VIEWER`/`EDITOR`. Đếm lượt dùng ở bước accept, không ở bước preview. Workspace `PRIVATE` không tạo được link — dùng lại `WorkspaceVisibilityPolicy.requireCanAddMember` của ADR-024, không viết luật mới. Frontend thêm route công khai `/invite/:token`, và `AuthGuard`/`GuestGuard` nay mang theo `?redirect=` qua màn đăng nhập.

Reason: Mời bằng email không với tới người **chưa có tài khoản**: `addMember` tra địa chỉ rồi ném `NotFoundError`, nên trước ADR này một nhóm chỉ kết nạp được người đã đăng ký, và người mới phải tự đăng ký rồi báo lại trước khi được thêm. Link cũng là hình thức mời duy nhất đi được ra ngoài sản phẩm; Work Chat không thay thế được vì nó chỉ với tới người **đã cùng workspace** với người gửi — tức đúng tập người không cần lời mời. Preview để công khai là có chủ ý: người nhận chỉ thấy màn hình đăng nhập thì không biết mình được mời vào đâu, bởi ai, nên không có lý do gì để tin mà đăng ký; đổi lại, `InvitePreview` chỉ chứa tên nhóm, tên người mời và vai trò — không danh sách tài liệu, không danh sách thành viên, không mô tả — vì mọi thứ nó trả về là công khai với bất kỳ ai cầm link, kể cả bot xem trước của Zalo hay Teams. Đếm lượt ở accept chính vì những bot đó: chúng tự GET link, nên đếm ở preview sẽ đốt lời mời trước khi người thật kịp mở. Lưu hash thay vì token theo đúng luật refresh token trong chuẩn kỹ thuật: dump bảng này không được ra một mớ link dùng được; dùng SHA-256 trần chứ không phải hàm băm mật khẩu vì đây là 256 bit ngẫu nhiên do máy sinh, không có từ điển nào để làm chậm, và salt theo dòng sẽ khiến tra cứu theo hash bất khả thi. Link không bao giờ cấp `OWNER` vì ai nhận được cũng chuyển tiếp được, và một link như thế là cách cho đi cả nhóm. Mọi trạng thái chết — sai, hết hạn, hết lượt, bị thu hồi — trả về cùng một thông báo, để người lạ cầm link không phân biệt được link hỏng với link không tồn tại. `?redirect=` là điều kiện bắt buộc chứ không phải tiện nghi: trước đó `AuthGuard` điều hướng `/login` mà không giữ đích, nên người chưa đăng nhập bấm link mời sẽ mất hẳn lời mời sau khi đăng nhập; giá trị đó được kiểm tra bằng `safeReturnTo` chỉ nhận đường dẫn nội bộ, vì một tham số do người dùng kiểm soát đưa thẳng vào redirect là lỗ hổng open redirect — biến link trỏ đúng tên miền của ta thành bàn đạp lừa đảo.

## ADR-026 — Bộ reaction theo Facebook, và định nghĩa lại "chưa có lời giải"

Decision: Thay bộ bốn reaction `LIKE/LOVE/INSIGHTFUL/CELEBRATE` bằng đúng bảy loại của Facebook — `LIKE, LOVE, CARE, HAHA, WOW, SAD, ANGRY` — giữ nguyên thứ tự Facebook làm thứ tự hiển thị trên mọi client. Migration V42 ánh xạ dữ liệu cũ: `INSIGHTFUL → WOW`, `CELEBRATE → CARE`, rồi thay CHECK constraint. Popup chọn reaction đổi sang dạng hàng icon tròn, tên hiện khi hover, vì bảy cột có nhãn nằm dưới thì rộng hơn màn hình điện thoại. Đồng thời định nghĩa lại "chưa có lời giải" ở backend: `findUnanswered` và `countUnanswered` nay yêu cầu `reply_count = 0` chứ không chỉ `accepted_reply_id IS NULL`.

Reason: Đổi bộ reaction **đảo ngược một phần ADR trước và quyết định ở V17**, nơi downvote bị bỏ với lý do trong một nhóm mà ai cũng biết nhau, reaction tiêu cực mang theo cái giá xã hội. `SAD` và `ANGRY` mang cái giá đó trở lại, và bối cảnh ở đây còn nhạy hơn mạng xã hội thường: người ta đăng câu hỏi lên bảng tin này **vì trợ lý AI đã không trả lời được**, tức họ đang ở thế cần giúp, nên một biểu tượng phẫn nộ dưới câu hỏi là thứ khiến người sau ngại hỏi. Rủi ro đó đã được nêu rõ trước khi quyết định; chủ sản phẩm chọn đánh đổi vì một bộ ai cũng nhận ra mà không cần giải thích thắng một bộ phải dạy mới hiểu, và ở quy mô nhóm thì chuẩn mực xã hội đủ sức kiềm chế. Nếu sau này cần siết, cách rẻ nhất là bỏ hai giá trị khỏi enum và ánh xạ chúng về `SAD → CARE`, `ANGRY → LIKE` trong một migration tương tự V42 — hình dạng dữ liệu không cản trở việc rút lui. `INSIGHTFUL` và `CELEBRATE` được ánh xạ chứ không xóa, vì xóa reaction sẽ âm thầm đổi số đếm dưới những bài người ta đang đọc.

Về "chưa có lời giải": frontend và backend đang đếm hai kiểu khác nhau. `resolveAnswerStatus` chia ba trạng thái — không có trả lời nào là *Chưa có lời giải*, có trả lời mà chưa chấp nhận là *Đang thảo luận* — trong khi hai truy vấn backend chỉ xét `accepted_reply_id IS NULL`. Hệ quả là huy hiệu số trên tab đếm cả những câu hỏi mà thẻ của chính nó ghi "Đang thảo luận", tức hai con số nói hai chuyện khác nhau trên cùng một màn hình; tệ hơn, câu hỏi nào tác giả không quay lại bấm chấp nhận thì nằm trong danh sách vĩnh viễn — bệnh kinh điển của mọi trang hỏi đáp. Chọn sửa backend theo frontend chứ không ngược lại, vì ba trạng thái là cách phân loại đúng: "chưa ai trả lời" là việc cần người giúp, còn "đã có trả lời nhưng chưa chốt" là việc của riêng tác giả. Thứ tự cũng đổi theo: bỏ `ORDER BY reply_count ASC` (nay mọi dòng đều bằng 0) và lấy mới nhất trước, vì câu hỏi chưa ai trả lời dễ được trả lời nhất khi người hỏi còn đang ở đó. Cơ chế chấp nhận câu trả lời **được giữ**: nó là nửa sau của vòng lặp P0 — AI từ chối vì thiếu bằng chứng, người dùng hỏi cộng đồng, người thật trả lời, tác giả chấp nhận — và không có nó thì không có cách nào biết một lỗ hổng tri thức đã được lấp hay chưa. Vòng lặp vẫn còn hở ở đầu cuối: câu trả lời được chấp nhận chưa quay lại kho tri thức nên AI vẫn từ chối câu hỏi đó lần sau; đó là việc riêng, chưa làm trong ADR này.

## ADR-027 — Chủ đề cho workspace, để Khám phá duyệt được chứ không chỉ tìm được

Decision: Thêm bảng `workspace_topics` (`workspace_id`, `topic`, PK cả hai) cho phép mỗi workspace mang **tối đa 3 chủ đề** lấy từ một **bộ từ vựng cố định** định nghĩa trong enum `WorkspaceTopic` (12 giá trị, mỗi giá trị có nhãn tiếng Việt và icon). Bộ từ vựng được **phục vụ qua `GET /workspaces/topics`** chứ không chép lại ở client. `GET /workspaces/explore` nhận thêm tham số `topic`. Chủ đề được nạp cho cả trang trong một truy vấn bởi `WorkspaceStatsLoader` và trả về trong `WorkspaceResponse.topics`. Nhân tiện: thêm `ORDER BY w.updatedAt DESC, w.id DESC` cho hai truy vấn khám phá, và debounce 300 ms cho ô tìm kiếm ở tab Khám phá.

Reason: Trang mang tên "Khám phá" nhưng chỉ khớp `name` và `description`, tức người dùng phải **biết trước mình tìm gì** — đúng nghĩa ngược lại với khám phá. Chủ đề cho trang một trục để nhóm lại. Nhiều chủ đề thay vì một, vì một nhóm về MongoDB vừa là Cơ sở dữ liệu vừa là Lập trình, và ép chọn một sẽ xếp nó vào thứ mà chủ nhóm tình cờ bấm trước. Từ vựng cố định thay vì tag tự do, vì tag tự do vỡ vụn ngay ngày đầu: "Lập trình", "lap trinh" và "Programming" thành ba nhóm không lọc chung được, mà lọc chính là mục đích duy nhất của tính năng này. Từ vựng nằm trong enum chứ không trong bảng, vì không có màn hình nào để quản trị nó và một bảng không có màn hình quản trị chỉ là một enum khó đọc hơn; cột lưu dạng text nên nếu sau này cần đổi thì không mất dữ liệu. **Không** đặt CHECK constraint lên giá trị chủ đề, cũng không đặt giới hạn 3 ở tầng DB: mỗi lần thêm một chủ đề hay đổi con số sẽ thành một migration trên database dùng chung — thao tác dễ sai nhất của dự án này, đã va số hiệu 5 lần — trong khi enum và validation ở biên đã bảo đảm không giá trị lạ nào lọt vào từ ứng dụng.

**Bổ sung 2026-10-17.** Bộ từ vựng ban đầu 12 giá trị bị đánh giá là quá hẹp: 6 trong 12 là nhánh con của CNTT, nên một nhóm về dinh dưỡng, lịch sử hay tâm lý không có chỗ nào ngoài "Khác". Mở lên **20 giá trị**, giữ nguyên độ sâu CNTT và thêm 8 lĩnh vực đời sống (Sức khỏe và y học, Tâm lý và phát triển bản thân, Năng suất và kỹ năng, Lãnh đạo và nhân sự, Nghệ thuật và văn hóa, Lịch sử và xã hội, Khởi nghiệp, Thiết kế và sáng tạo). **Không** gộp 6 nhánh CNTT thành một "Công nghệ" rộng kiểu NotebookLM: khán giả của Google là công chúng nói chung, còn nội dung thực tế ở đây nghiêng hẳn về một khoa CNTT, nên gộp lại sẽ dồn gần như mọi workspace vào đúng một chip và bộ lọc lại vô dụng theo kiểu khác. Thứ tự khai báo là thứ tự hiển thị, có chủ ý: kỹ thuật dẫn đầu, hai giá trị hứng rác (`RESEARCH`, `REGULATIONS`, `OTHER`) xếp cuối; đổi thứ tự an toàn vì cột lưu tên chứ không lưu ordinal. Từ vựng **vẫn nằm trong enum**, không chuyển sang bảng DB có màn hình quản trị — với phạm vi đồ án thì danh sách gần như không đổi sau khi chốt, và đường chuyển vẫn để ngỏ y như mô tả ở trên.

Kèm theo: 20 chip trên thanh lọc mà phần lớn không có workspace nào sẽ dạy người dùng rằng bộ lọc hỏng, nên thêm `GET /workspaces/explore/topics` trả về **chỉ những chủ đề đang có workspace khám phá được**, kèm số lượng. Bộ chọn khi tạo/sửa workspace vẫn hiện đủ 20, vì chủ nhóm phải xếp được nhóm mình vào một chủ đề chưa ai dùng.

Hai khiếm khuyết sửa kèm, vì chúng nằm đúng trên đường đi: truy vấn khám phá **không hề có `ORDER BY`**, nên Postgres trả về theo thứ tự tùy ý — danh sách đảo lộn giữa các lần tải và phân trang có thể lặp hoặc bỏ sót workspace; nay sắp theo hoạt động gần nhất, tie-break bằng `id` để thứ tự là toàn phần, điều kiện để phân trang ổn định. Và ô tìm kiếm ở Khám phá **không debounce**, bắn một request mỗi phím gõ, trong khi trang feed của chính dự án đã làm đúng với 300 ms. Còn một khiếm khuyết **chưa sửa**: tham số trang bị truyền hằng số 0 nên workspace thứ 21 trở đi không duyệt tới được; nó thuộc hạng mục phân trang, để riêng.

## Consequences

- Runtime đã được cung cấp theo version đã khóa; mỗi máy vẫn phải cung cấp evidence độc lập trước `READY — CORE-001`.
- Ba service tăng cấu hình nhưng ranh giới ownership và bảo mật rõ.
- Hệ thống đã tích hợp Message Broker (RabbitMQ) cho production-grade messaging; interface và schema được cập nhật tương ứng.
- Threshold ban đầu là giả thuyết, chỉ được thay qua calibration có version/hash.
- Mọi thay đổi ADR ảnh hưởng contract phải tạo ADR mới hoặc version mới, không sửa ngầm.

## Implementation gate

Design đã được phê duyệt. Mỗi implementation work item vẫn phải qua readiness, scope, review, test và delivery approval gates tương ứng.
