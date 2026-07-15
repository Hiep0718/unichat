# UniChat

UniChat là nền tảng tri thức AI cho giáo dục đại học. Phạm vi P0 triển khai Adaptive Knowledge Retrieval & Reasoning cho tài liệu PDF, DOCX và TXT trong Workspace có phân quyền.

## Trạng thái

**Canonical status: `NOT READY`.** Repository đang trong giai đoạn readiness hardening. Không tạo branch triển khai CORE-001 cho đến khi readiness changes và evidence từ cả hai máy đã được review, merge vào `main`.

Core API đã có health endpoint, request ID an toàn, typed application errors, global RFC 7807 error boundary và structured JSON logging foundation.

Không commit, push, thay đổi GitHub, merge hoặc deploy nếu chưa có phê duyệt riêng. `SEC-DEBT-001` là scoped exception cho non-Chroma work item; Chroma-backed retrieval và deployment phụ thuộc Chroma vẫn `NOT READY`.

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

Chỉ frontend và Core API được expose. AI Service, PostgreSQL, ChromaDB và Ollama nằm trên private network.

## Runtime mục tiêu

- Node.js 24.18.0 LTS và npm đi kèm.
- Java 21 LTS; Maven 3.9.16 qua wrapper.
- Python 3.13.14.
- Docker 29+ và Docker Compose 5+.

Runtime portable nằm trong `.tools` và không được commit.

## Thiết lập

1. Sao chép `.env.example` thành `.env` và điền secret local.
2. Cài dependencies từ manifest và/hoặc lockfile tương ứng của từng ecosystem đã được review.
3. Dùng `core-api/mvnw.cmd` trên Windows hoặc `core-api/mvnw` trên Unix.
4. Bảo đảm `JAVA_HOME` trỏ đến JDK 21 trước khi chạy Core API.
5. Không dùng secret mẫu ở môi trường thật.

Test không được gọi network ngoài hệ thống.

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
