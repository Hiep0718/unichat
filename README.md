# UniChat

UniChat là nền tảng tri thức AI cho giáo dục đại học. Phạm vi P0 triển khai Adaptive Knowledge Retrieval & Reasoning cho tài liệu PDF, DOCX và TXT trong Workspace có phân quyền.

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

## Phát triển local

Chạy toàn bộ stack dev bằng một lệnh duy nhất (yêu cầu Windows Terminal):

```powershell
.\dev.ps1
```

Script tự kiểm tra prerequisites và port, mở từng service trong tab Windows Terminal riêng có màu phân biệt, và hiển thị dashboard giám sát real-time.

| Service | Port | Tab |
|---|---|---|
| ChromaDB | 8000 | 🟣 Tím |
| AI Service | 8001 | 🔵 Xanh dương |
| Core API | 8082 | 🟢 Xanh lá |
| Frontend | 5173 | 🟡 Vàng |

PostgreSQL, Document Storage và RabbitMQ sử dụng cloud (Supabase / CloudAMQP), không cần chạy local.

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
