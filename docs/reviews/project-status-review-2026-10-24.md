# Báo cáo rà soát hiện trạng dự án UniChat

**Ngày rà soát:** 24/10/2026  
**Phạm vi:** source hiện tại trong workspace, tài liệu đặc tả, migration, test inventory và quality gates chạy tại máy hiện tại  
**Commit nền:** `ff0cf3e4be0f007ee7648db9b4be0873878648e3`  
**Nhánh:** `feat/plan-v2-auth-chat-admin-security` — ahead remote 1 commit  
**Kết luận tổng thể:** **NOT READY cho production; đã có một bản triển khai chức năng rộng, phù hợp để tiếp tục hardening và kiểm thử tích hợp.**

## 1. Cách hiểu trạng thái trong báo cáo

| Trạng thái | Ý nghĩa |
|---|---|
| ✅ Đã kiểm chứng | Có source và quality gate phù hợp đã chạy thành công tại lần rà soát này. |
| 🟡 Đã có code | Có UI/API/service nhưng chưa có bằng chứng end-to-end hoặc gate của toàn chuỗi chưa qua. |
| 🟠 Hoàn thành một phần | Luồng chính đã có nhưng còn nhánh nghiệp vụ, test, tích hợp hoặc vận hành chưa hoàn tất. |
| 🔴 Chưa sẵn sàng | Có blocker về correctness, security, test hoặc môi trường vận hành. |
| ⚪ Thiết kế/deferred | Mới có đặc tả/kế hoạch hoặc đã chủ động hoãn. |

“Có endpoint/màn hình” không được coi là “đã hoàn thành” nếu chưa có bằng chứng chạy xuyên suốt qua các dependency thật.

## 2. Tóm tắt điều hành

UniChat hiện là monorepo gồm Web React, Mobile Expo/React Native, Core API Spring Boot và AI Service FastAPI. Source đã bao phủ hầu hết nghiệp vụ chính của một AI Knowledge Platform: xác thực, workspace, tài liệu, Adaptive RAG, cộng đồng học tập, nhắn tin trực tiếp, quản trị và đánh giá AI.

Điểm mạnh hiện tại:

- Core API có phạm vi nghiệp vụ rộng; `mvn verify` đã build thành công và chạy **331/331 test**.
- Web vượt qua lint, TypeScript typecheck và production build.
- Mobile vượt qua lint, typecheck và **94/94 test**.
- Kiến trúc quyền đúng định hướng: Core API giữ authorization; AI Service nhận allowlist tài liệu.
- RAG đã có intent detection, evidence gate, citation/provenance, streaming, operation persistence và provider controls.

Các lý do chưa thể công nhận hoàn thành/production-ready:

1. Trạng thái tài liệu mâu thuẫn: README ghi `READY`, trong khi CHANGELOG và master data ghi `NOT READY`.
2. `SEC-DEBT-001` về Chroma vẫn mở và tài liệu chính thức ghi chặn Chroma-backed deployment.
3. AI Service fail Ruff với **63 lỗi**; full pytest không hoàn tất vì treo tại TestClient sau 17 test pass.
4. Frontend có **216/218 test pass**, còn 2 test fail.
5. Bốn PostgreSQL integration test `*IT` không được Maven Surefire/Failsafe chạy trong `mvn verify`.
6. E2E web chỉ có 5 spec, chưa bao phủ phần lớn critical user flow.
7. Working tree có **63 file thay đổi/untracked**; kết quả đang rà soát chưa phải một baseline sạch, tái lập được.

## 3. Ma trận chức năng hiện tại

| Nhóm chức năng | Những gì đã có trong source | Bằng chứng hiện tại | Đánh giá |
|---|---|---|---|
| Xác thực và phiên | CSRF, đăng ký, đăng nhập, refresh rotation, đăng xuất, quên/đặt lại mật khẩu, JWT RS256 | Core auth tests pass; có Web và Mobile UI | 🟡 Đã có code; thiếu E2E auth thực |
| Tài khoản cá nhân | Xem/sửa hồ sơ, display name, avatar, đổi mật khẩu | Core tests pass; Web/Mobile screen có sẵn | 🟡 Chưa có E2E đầy đủ |
| Workspace | Tạo, xem, sửa, explore, join, privacy/visibility, cover, thống kê | Core tests pass; Web/Mobile UI có sẵn | 🟠 Delete mới chuyển `DELETING`, chưa có full delete saga |
| Thành viên và vai trò | Danh sách, thêm/mời, đổi vai trò, xóa thành viên, kiểm tra quyền | Core member/security tests pass | 🟡 Thiếu DB/live E2E |
| Quản lý tài liệu | Upload, danh sách, chi tiết, download, trạng thái job, xóa | Web + Core đã có; storage adapters có test | 🟠 Chưa chứng minh full upload→queue→index→retrieval |
| Đóng góp/phê duyệt tài liệu | Pending list/count, approve, reject, contribution context | Web + Core endpoint đã có | 🟡 Thiếu E2E và DB integration gate |
| Chat AI/RAG | Hội thoại, lịch sử, hỏi đáp, SSE stream, poll/cancel, idempotency, retry/failure mapping | Core chat tests pass; Web/Mobile client có test | 🟠 AI gate chưa sạch; chưa có live RAG smoke |
| Adaptive Retrieval | Intent, query theo ngữ cảnh, E5 embedding, allowlist, evidence gate, citation validation | Nhiều unit test/source; thay đổi retrieval còn dirty | 🔴 Chưa chứng minh với Chroma/provider thật |
| Trích dẫn và provenance | Locator, citation drawer/sheet, kiểm tra source version/quyền | Core + client source/test đã có | 🟠 Chưa có ingestion→citation E2E |
| Cộng đồng/MXH học tập | Feed, post/discussion CRUD, reply, accepted answer, reaction, bookmark, mention, notification, read/pin | Core services và Web UI đã có | 🟡 Phạm vi source rộng nhưng gần như chưa có E2E |
| Tệp đính kèm và AI reply cộng đồng | Attachment, summary, compose suggestion, gọi AI trong discussion | Core/Web đã có test mức module | 🟠 Phụ thuộc AI/ingestion chưa được chứng minh xuyên suốt |
| Tìm kiếm cộng đồng | Unified search và UI kết quả | Core service test + Web UI | 🟡 Chưa có E2E/search relevance evidence |
| Work Chat 1-1 | Contact directory, tạo hội thoại, gửi/đọc tin, presence, WebSocket/STOMP | Core tests pass; Web UI tests tồn tại | 🟡 Chưa có realtime E2E nhiều client |
| Lịch sử hội thoại | List, pagination, detail, delete, studio notes | Core/Web/Mobile source có sẵn | 🟡 Client tests có nhưng thiếu live persistence E2E |
| Admin người dùng | List/filter, khóa/mở, đổi role, self-protection | Core tests pass; Web admin UI | 🟡 Chưa có E2E RBAC |
| Admin workspace/tài liệu | List, visibility, delete workspace, retry document | Core/Web đã có | 🟠 Delete saga và retry integration chưa hoàn tất |
| Audit và metrics | Audit events, system metrics, AI metrics | Endpoint/UI có sẵn | 🟡 Chưa chứng minh retention/ops trên deployment thật |
| AI Studio | Verify key, quick prompt, admission state/control | Core tests pass; Web có UI | 🟠 Một frontend test của admission control đang fail |
| Evaluation | Tạo dataset, run, result, report, UI evaluation | API/module có sẵn | 🔴 Dataset 120 case là draft động; answer đánh giá còn mô phỏng, chưa phải gold benchmark |
| Health/readiness | Core health; AI live/ready | Endpoint có sẵn | 🟠 AI ready chưa kiểm tra provider auth, model weights, RabbitMQ consumer và indexing E2E |

## 4. Chi tiết theo ứng dụng

### 4.1 Web Frontend

Web có khoảng **36 route declaration** cho landing, auth, feed/post, chat, workspace, documents, members, settings, evaluation, profile/account, work chat và admin.

Kết quả kiểm chứng:

- ✅ ESLint pass.
- ✅ TypeScript typecheck pass.
- ✅ Production build pass; Vite cảnh báo một số chunk lớn hơn 500 kB.
- 🟠 Unit/component test: **216 pass, 2 fail, tổng 218**.
  - Landing test bị kẹt ở loading screen, không thấy heading mong đợi.
  - AI admission control không render nút “Chuyển sang VERIFYING” như test mong đợi.
- 🔴 Coverage report không được tạo vì suite fail.
- 🟠 Chỉ có 5 Playwright spec: homepage, loading, style tin nhắn, Hive flow và workspace AI policy.

Các critical flow chưa có E2E rõ ràng: register/login/reset password, workspace CRUD/member, document upload/approval/delete, community posting/reply/notification, direct messaging, admin CRUD/RBAC và evaluation.

### 4.2 Core API

Core có **24 controller** và khoảng **103 HTTP mapping annotation**. Các module lớn gồm auth, user, workspace, document, chat, community, work chat, admin, audit, health và private service security.

Kết quả kiểm chứng:

- ✅ `mvn verify` build JAR thành công.
- ✅ **331 test pass, 0 fail, 0 error**.
- 🟠 JaCoCo line coverage khoảng **55.0%** và branch coverage khoảng **46.0%**, thấp hơn chuẩn 80% cho core business logic.
- 🔴 Bốn PostgreSQL integration test có hậu tố `*IT` không được chạy; POM không cấu hình Maven Failsafe. Vì vậy kết quả 331 test chưa chứng minh migration/repository trên PostgreSQL thật.
- 🟠 Migration có V38 và V46 cùng phục hồi `direct_messages.read_at`; V46 đang untracked và tên cho biết “after V45” trong khi repository không có V41–V45. Cần xác minh lịch sử Flyway trên database mục tiêu trước khi merge/deploy.
- 🟠 Xóa workspace mới đánh dấu `DELETING`; source còn TODO cho full delete saga.

### 4.3 AI Service

AI Service có **16 route decorator** cho health, retrieval/stream, metrics, key verification, quick prompt, evaluation và vector/storage status.

Năng lực đã có trong source:

- Extraction PDF/DOCX/TXT, chunking, embedding và Chroma adapter.
- Contextual query, conversation memory, intent detection, adaptive retrieval và evidence gate.
- Gemini/Hive/Ollama-oriented provider abstraction, generation controls và failure taxonomy.
- Citation validation, retrieval trace, metrics/evaluation storage và RabbitMQ ingestion consumer/publisher.

Kết quả kiểm chứng:

- ✅ mypy strict pass trên **102 source files**.
- 🔴 Ruff fail với **63 lỗi**: import order/position, line length, unused import, exception chaining, silent continue và các rule khác.
- 🔴 Pytest thu thập **351 test** nhưng full suite không hoàn tất. Sau 17 test pass, suite treo tại request TestClient không xác thực; đã tái hiện khi đổi thư mục tạm vào workspace.
- 🔴 Không có coverage đáng tin cậy cho lần rà soát này.
- 🔴 `SEC-DEBT-001` và compatibility Chroma client/server vẫn chưa được đóng.
- 🟠 Chưa có OCR/diagram extraction; retrieval hiện chủ yếu dựa vào text extraction.

### 4.4 Mobile

Mobile đã có screen cho login/register/forgot password, đổi mật khẩu, tài khoản, feed, workspace mine/explore/detail, documents, danh sách hội thoại và AI chat.

Kết quả kiểm chứng:

- ✅ ESLint pass.
- ✅ TypeScript typecheck pass.
- ✅ **25/25 suite, 94/94 test pass** sau khi đặt Jest cache trong workspace.
- 🟠 Chưa chạy Expo native build/device smoke.
- 🟠 Chưa ngang feature parity với Web: không thấy admin, quản trị member/settings đầy đủ, post detail/create đầy đủ hoặc Work Chat 1-1 chuyên biệt.

## 5. Hạ tầng, dữ liệu và bảo mật

- Kiến trúc private-network cho AI Service, PostgreSQL, ChromaDB, RabbitMQ và Ollama đã được mô tả đúng hướng.
- Core API giữ authorization và chuyển `allowedDocumentIds` sang AI Service; đây là boundary phù hợp.
- Test hiện tại chủ yếu là unit/module/mocked integration; chưa có bằng chứng live stack cho PostgreSQL + RabbitMQ + storage + Chroma + embedding + provider.
- AI `/health/ready` chưa đủ để kết luận hệ thống phục vụ RAG được: chưa xác thực provider, tải model, trạng thái consumer và dữ liệu collection mục tiêu.
- Chroma critical debt còn mở; vì vậy không nên public/deploy luồng Chroma-backed.
- Runtime documentation ghi Java 21, trong khi Core POM đặt `java.version=17`; cần thống nhất toolchain được hỗ trợ.

## 6. Độ đầy đủ của kiểm thử

| Layer | Inventory | Kết quả hiện tại | Khoảng trống chính |
|---|---:|---|---|
| Frontend unit/component | 36 file | 216/218 test pass | 2 test fail; chưa có coverage |
| Frontend E2E | 5 spec | Không chạy trong review này | Phủ rất ít critical flow |
| Mobile | 25 file | 94/94 pass | Chưa native device/build smoke |
| Core unit/module | 57 `*Test.java` | 331/331 pass | Coverage line 55%, branch 46% |
| Core PostgreSQL integration | 4 `*IT.java` | Không được Maven chạy | Thiếu Failsafe/gate DB |
| AI | 37 file, 351 test collected | 17 pass rồi treo; không có verdict toàn suite | Ruff fail, TestClient hang, không có coverage |
| Live system | Chưa có gate tái lập | Chưa kiểm chứng | Auth→upload→ingest→RAG→citation; realtime; admin; recovery |

## 7. Những gì có thể coi là đã hoàn thành

Chỉ nên công nhận “đã hoàn thành ở mức module” cho:

1. Core API build và bộ 331 unit/module test hiện được Surefire nhận diện.
2. Mobile lint, typecheck và 94 test hiện có.
3. Web lint, typecheck và production build.
4. Kiến trúc route/controller và phần lớn UI/API của auth, workspace, community, work chat và admin.

Không nên công nhận “đã hoàn thành end-to-end” cho bất kỳ chuỗi nghiệp vụ phụ thuộc database/service ngoài nào tại thời điểm này, vì bằng chứng live/integration còn thiếu.

## 8. Công việc còn lại theo ưu tiên

### P0 — Chặn công nhận READY

1. Chọn một canonical status và đồng bộ README, CHANGELOG, master data; với bằng chứng hiện tại phải là `NOT READY`.
2. Sửa 63 lỗi Ruff và nguyên nhân AI pytest treo; chạy đủ 351 test và coverage ≥80% cho core logic.
3. Đóng/remediate `SEC-DEBT-001`; chứng minh compatibility và security của Chroma client/server.
4. Cấu hình Failsafe hoặc gate tương đương để chạy 4 PostgreSQL `*IT`; xác minh toàn bộ Flyway chain trên fresh DB và upgrade DB.
5. Sửa 2 frontend test fail, tạo coverage report và đạt policy phù hợp.
6. Tạo live smoke cô lập: auth → workspace → upload → RabbitMQ → extraction/chunk/embed → Chroma → chat → citation → persistence/replay.

### P1 — Hoàn thiện sản phẩm

1. Hoàn tất workspace delete saga và document retry/recovery.
2. Bổ sung E2E cho auth, workspace/member, documents, community, Work Chat, admin và evaluation.
3. Thay draft/simulated evaluation bằng gold dataset được duyệt, grading protocol và paired baseline/adaptive report tái lập.
4. Kiểm thử WebSocket presence/read receipt với nhiều client và reconnect.
5. Hoàn tất mobile feature parity theo phạm vi sản phẩm đã chốt và chạy native build/device smoke.

### P2 — Chất lượng và hiệu năng

1. Giảm các bundle/chunk Web lớn hơn 500 kB bằng code splitting có đo lường.
2. Bổ sung OCR/diagram/table extraction nếu thesis/product scope yêu cầu multimodal retrieval.
3. Nâng coverage Core từ 55% line/46% branch lên chuẩn đã công bố.
4. Đồng bộ Java 17/21, tài liệu runtime, pipeline state và runbook.

## 9. Kết luận cuối

Project **không còn ở giai đoạn prototype đơn giản**: phạm vi source đã đủ lớn để thể hiện rõ một AI Knowledge Platform có yếu tố mạng xã hội học tập. Tuy nhiên, “nhiều chức năng đã có code” chưa đồng nghĩa với “đã hoàn thành”. Baseline hiện tại phù hợp nhất với mô tả:

> **Feature-rich implementation, module-level verification tốt ở Core/Mobile, nhưng integration/AI/security/readiness chưa đạt để release.**

Trạng thái khuyến nghị: **NOT READY — tiếp tục hardening theo P0 trước khi demo bằng dependency thật hoặc triển khai.**

## 10. Metadata thực thi review

| Thuộc tính | Giá trị |
|---|---|
| Execution mode | in-process |
| Sub-agent available | yes |
| Sub-agent used | no |
| Fallback reason | Chính sách phiên hiện tại không cho phép tự spawn khi người dùng chưa yêu cầu delegation |
| Tool discovery | pre-exposed |
| Source mutation | Không sửa source; chỉ tạo báo cáo |
| Commit/push/deploy | Không thực hiện |
