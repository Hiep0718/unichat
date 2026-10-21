# UniChat

UniChat là nền tảng tri thức AI cho giáo dục đại học. Phạm vi P0 triển khai Adaptive Knowledge Retrieval & Reasoning cho tài liệu PDF, DOCX và TXT trong Workspace có phân quyền.

**Cách chạy chuẩn của project trên Windows: mở PowerShell, vào `D:\codex-workspace\unichat` và chạy `.\dev.ps1`.** Xem [Phát triển local](#phát-triển-local) để biết dashboard và các service.

## Trạng thái

**Canonical status: `READY`.** Dự án đang trong giai đoạn phát triển tích cực (Active Development). Core API, Frontend và Database đã hoạt động cơ bản.

Core API đã có health endpoint, request ID an toàn, typed application errors, global RFC 7807 error boundary và structured JSON logging foundation. AI Service và RabbitMQ đã được thiết lập để xử lý tác vụ bất đồng bộ.

Không commit, push, thay đổi GitHub, merge hoặc deploy nếu chưa có phê duyệt riêng.

## Kiến trúc

- `frontend`: React SPA; chỉ gọi Core API.
- `core-api`: Spring Boot; sở hữu authentication, authorization, nghiệp vụ, PostgreSQL và file-storage port.
- `ai-service`: FastAPI private; sở hữu extraction, Adaptive Retrieval, ChromaDB, embedding và generation.
- `infra`: Docker Compose và cấu hình hạ tầng local.
- `docs/specifications`: specification và sơ đồ bền vững dùng làm nguồn chuẩn.
- `docs/thesis`: bảy nhóm tài liệu luận văn, giữ nguyên tên nhóm.
- `docs/security`: tài liệu security debt hiện hành.
- `.pipeline`: checkpoint AI SDLC cục bộ, giữ nguyên trạng và không đưa vào Git.
- `.local-archive`: backup, archive, output trung gian và tệp AI tạm; chỉ lưu cục bộ và không đưa vào Git.

Chỉ frontend và Core API được expose. AI Service, PostgreSQL, ChromaDB, RabbitMQ và Ollama nằm trên private network.

## Runtime mục tiêu

- Node.js 24.18.0 LTS và npm đi kèm.
- Java 21 LTS; Maven 3.9.16 qua wrapper.
- Python 3.13.14.
- Docker 29+ và Docker Compose 5+ (bao gồm RabbitMQ).

Runtime portable nằm trong `.tools` và không được commit.

## Thiết lập

1. Sao chép `.env.example` thành `.env` và điền secret local.
2. Cài dependencies từ manifest và/hoặc lockfile tương ứng của từng ecosystem đã được review.
3. Dùng `core-api/mvnw.cmd` trên Windows hoặc `core-api/mvnw` trên Unix.
4. Bảo đảm `JAVA_HOME` trỏ đến JDK 21 trước khi chạy Core API.
5. Không dùng secret mẫu ở môi trường thật.

Test không được gọi network ngoài hệ thống.

## Generation qua Hive

Cấu hình mẫu chọn Hive qua `https://api-cdn.thehive.ai/api/v3` với model `deepseek-ai/deepseek-v4.1-flash-1017`; Secret Key chỉ đặt ở môi trường AI Service. Giữ SDK Gemini cho rollback cấu hình, không tự chuyển provider khi Hive lỗi. Khi chưa đặt `LLM_PROVIDER`, mã vẫn dùng mặc định Gemini để tương thích môi trường cũ. Không dùng lại khóa đã chia sẻ trong chat hoặc ảnh.

Hive phục vụ generation, compaction và kiểm tra quản trị; embedding E5 và dữ liệu vector không đổi. Usage không được provider báo vẫn là chưa biết, không phải 0 token hoặc số dư tài khoản. Nút kiểm tra khóa chạy một yêu cầu generation ngắn khi admin bấm và có thể dùng credit.

Gate PostgreSQL quản lý `OPEN` / `DRAINING` / `VERIFYING`, cho phép ngừng nhận câu hỏi mới nhưng giữ polling, cancel và operation đang chạy. Migration V40 được chuẩn bị cho gate; **không khởi động lại Core hoặc áp dụng migration vào DB dùng chung trước phê duyệt**, vì Flyway chạy khi startup. Tài liệu cutover/rollback tại [Hive generation runbook](docs/runbooks/hive-generation.md); việc có mã hỗ trợ không xác nhận môi trường live đã chuyển provider.

Loading toàn màn hình dùng chung một giao diện xuyên suốt xác minh phiên, tải trang và tải thông tin Workspace. Thông báo cập nhật theo bước đang xử lý; màn hình chỉ đóng khi các bước chờ đã hoàn tất.

Trang chat AI hiển thị tin nhắn người dùng và trợ lý, các bước xử lý, trích dẫn và hành động với cùng hệ thống giao diện. Kiểm thử thành phần và trình duyệt xác nhận style được áp dụng cho câu trả lời từ chối và các nút hành động.

## Phát triển local

**Entry point chuẩn để chạy project là tool PowerShell `dev.ps1` tại thư mục gốc** (yêu cầu Windows Terminal). Thực hiện lần lượt trong PowerShell:

```powershell
cd D:\codex-workspace\unichat
.\dev.ps1
```

Sau khi chạy, dùng dashboard của tool để theo dõi, dừng hoặc khởi động lại từng service. Các lệnh Maven/npm ở mục **Kiểm tra** phục vụ kiểm tra riêng từng thành phần; khi chạy toàn bộ project, dùng quy trình PowerShell trên.

Script tự kiểm tra prerequisites và port, mở từng service trong tab Windows Terminal riêng có màu phân biệt, và hiển thị dashboard giám sát real-time.

| Service | Port | Tab |
|---|---|---|
| ChromaDB | 8000 | 🟣 Tím |
| AI Service | 8001 | 🔵 Xanh dương |
| Core API | 8082 | 🟢 Xanh lá |
| Frontend | 5173 | 🟡 Vàng |
| Mobile (Expo) | 8081 / 8085 | 🟠 Cam |

Trong development, mobile dùng host mà Expo cung cấp để gọi Core API trên cổng 8082. Điện thoại thật và máy chạy Core cần cùng mạng LAN; nếu không, đặt `EXPO_PUBLIC_API_URL` thành địa chỉ Core có thể truy cập từ điện thoại rồi khởi động lại Expo. Android Emulator và iOS Simulator có địa chỉ host riêng; không dùng `localhost` cho điện thoại thật.

PostgreSQL, Document Storage và RabbitMQ sử dụng cloud (Supabase / CloudAMQP), không cần chạy local.

Nếu Core API dừng vì thiếu `direct_messages.read_at`, kiểm tra schema và lịch sử Flyway trước khi khởi động lại. Migration V38 bổ sung cột nullable này và giữ nguyên dữ liệu đã có. Với DB dùng chung, cần phê duyệt migration trước khi chạy Core vì Flyway tự áp dụng migration khi khởi động; không sửa lịch sử cũ hoặc tắt Hibernate schema validation để bỏ qua lỗi.

## Kiểm tra

- Frontend: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Core API: `core-api/mvnw.cmd verify` trên Windows hoặc `./core-api/mvnw verify` trên Unix.
- AI Service: Ruff, mypy, pytest và coverage từ virtual environment.
- E2E: `npm run e2e` sau khi Playwright Chromium đã được cài.

## Tài liệu dự án

Nguồn chuẩn nằm trong `docs/specifications/architecture-decision.md`, `docs/specifications/file-plan.md`, `docs/specifications/api-contracts.md`, `docs/specifications/data-model.md`, `docs/specifications/adaptive-retrieval-spec.md` và `docs/specifications/test-plan.md`.

API error contract và ví dụ nằm trong `docs/api/examples.md`.

Tài liệu luận văn nằm trong `docs/thesis`; security debt cần theo dõi nằm trong `docs/security/deferred-security-remediation.md`.

## Quy tắc đóng góp

Đọc `AGENTS.md` và `CONTRIBUTING.md` trước khi thay đổi. Dùng Conventional Commits và cross-review, đồng thời luôn xin phê duyệt trước commit, push, GitHub mutation, merge hoặc deploy. Dự án được cấp phép theo `LICENSE`.
