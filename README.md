<div align="center">

# UniChat — Nền tảng Tri thức AI cho Giáo dục Đại học

**Adaptive Knowledge Retrieval & Reasoning Workspace cho tài liệu học tập PDF, DOCX và TXT**

[![Live Production](https://img.shields.io/badge/Live%20App-unichat.id.vn-045CDF?style=for-the-badge&logo=googlechrome&logoColor=white)](https://unichat.id.vn)
[![HTTPS](https://img.shields.io/badge/HTTPS-Let's%20Encrypt-2E7D32?style=for-the-badge&logo=letsencrypt&logoColor=white)](https://unichat.id.vn)
[![Frontend](https://img.shields.io/badge/React%2019-TypeScript-0284C7?style=for-the-badge&logo=react&logoColor=white)](#kiến-trúc)
[![Backend](https://img.shields.io/badge/Spring%20Boot-Java%2021-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](#kiến-trúc)
[![AI Service](https://img.shields.io/badge/FastAPI-Adaptive%20RAG-009688?style=for-the-badge&logo=fastapi&logoColor=white)](#kiến-trúc)

**[Trải nghiệm trực tiếp tại https://unichat.id.vn](https://unichat.id.vn)** · [Tài liệu đặc tả](docs/specifications/architecture-decision.md) · [Hướng dẫn triển khai EC2](docs/deployment/ec2-deployment-guide.md) · [Nhật ký thay đổi](CHANGELOG.md)

</div>

---

> [!TIP]
> **Sản phẩm đang chạy trực tuyến (HTTPS Production):** [**https://unichat.id.vn**](https://unichat.id.vn)  
> Bạn có thể đăng ký tài khoản, tạo Workspace môn học, tải giáo trình/slide (PDF, DOCX, TXT) và hỏi đáp cùng Trợ lý AI kèm trích dẫn nguồn xác thực ngay trên trình duyệt.

## Tính năng nổi bật

| Phân hệ | Khả năng chính |
|---|---|
| **Adaptive RAG & Trích dẫn nguồn** | Tự phân loại ý định câu hỏi, truy xuất lai kết hợp vector (`intfloat/multilingual-e5-base`) và lexical trên **ChromaDB**, kiểm tra ngưỡng bằng chứng (Evidence Gate), và gắn trích dẫn nhấp mở thẳng đúng trang/slide trong **Citation Drawer**. |
| **Hai chế độ tri thức minh bạch** | **Chỉ tài liệu** (`STRICT` — từ chối an toàn khi thiếu căn cứ) và **Mở rộng** (`EXPANDED` — tách riêng rõ phần đã xác thực từ tài liệu và phần kiến thức nền mở rộng). |
| **Workspace phân quyền & Lịch sử** | Phân quyền `OWNER` / `EDITOR` / `VIEWER` do Core API kiểm soát tuyệt đối; hỗ trợ tóm tắt toàn bộ kho tài liệu, **Knowledge Studio**, bong bóng mở nhanh lịch sử hội thoại theo Workspace, và chế độ Sáng/Tối. |
| **Cộng đồng Hỏi-Đáp & `@AI`** | Bảng tin theo Workspace, bình luận phân cấp, chấp nhận câu trả lời hay nhất, tóm tắt tệp đính kèm theo yêu cầu, và nhắc `@AI` để trợ lý tham gia giải đáp từ kho tài liệu được cấp quyền. |
| **Work Chat & Gọi thoại WebRTC** | Nhắn tin trực tiếp 1:1 và nhóm theo thời gian thực qua WebSocket STOMP, đính kèm tệp và gọi thoại 1:1 qua WebRTC (STUN/TURN). |
| **Admin AI Studio & Đa nền tảng** | Giám sát chỉ số sử dụng/lỗi/độ trễ theo từng provider & model, kiểm thử key có kiểm soát, cổng điều tiết `OPEN`/`DRAINING`/`VERIFYING`, cùng ứng dụng di động **Expo / React Native** (`mobile/`). |

## Kiến trúc & Triển khai Production

Hệ thống tách bạch rõ trách nhiệm giữa tầng nghiệp vụ/phân quyền và tầng AI:

- **`frontend`** — React 19 + TypeScript + Vite SPA; chỉ giao tiếp với Core API qua HTTPS cookie session + CSRF.
- **`core-api`** — Spring Boot (Java 21); sở hữu xác thực (RS256 JWT 15 phút + refresh token xoay vòng), phân quyền Workspace/tài liệu, PostgreSQL, RabbitMQ producer và hợp đồng lỗi RFC 7807.
- **`ai-service`** — FastAPI (Python 3.13, private network); sở hữu trích xuất văn bản, chunking theo phiên bản/provenance, embedding `multilingual-e5-base`, Adaptive Retrieval trên ChromaDB và generation pipeline.
- **`mobile`** — Ứng dụng Expo / React Native đồng bộ hệ thống thiết kế và API với bản Web.
- **`infra` & `docker-compose.yml`** — Đóng gói triển khai lên **AWS EC2** với **Caddy** tự động cấp chứng chỉ SSL Let's Encrypt cho `https://unichat.id.vn`, kết nối **Supabase** (PostgreSQL + Storage), **CloudAMQP** (RabbitMQ) và **Chroma Cloud**.

> **Nguyên tắc bảo mật cốt lõi:** Chỉ `frontend` và `core-api` (qua reverse proxy HTTPS) được expose ra ngoài. `ai-service`, PostgreSQL, ChromaDB và RabbitMQ luôn nằm trên mạng riêng; Core API cấp danh sách `allowedDocumentIds` cho mọi truy vấn và kiểm tra lại quyền trước khi lưu hoặc trả kết quả.

### Cấu trúc thư mục

- `frontend/` — Ứng dụng Web React SPA.
- `core-api/` — Core Backend Spring Boot.
- `ai-service/` — Private AI / Adaptive RAG Service (FastAPI).
- `mobile/` — Ứng dụng di động Expo.
- `infra/` — Dockerfile và script hạ tầng triển khai.
- `docs/specifications/` — Đặc tả kiến trúc, API contract, data model, Adaptive Retrieval và kế hoạch kiểm thử.
- `docs/runbooks/` — Hướng dẫn vận hành generation route, cutover và rollback.
- `docs/deployment/` — Hướng dẫn triển khai Docker Compose trên AWS EC2.
- `docs/thesis/` — Tài liệu đồ án tốt nghiệp và bài báo khoa học.
- `docs/security/` — Theo dõi security debt hiện hành.

## Generation qua Gemini Primary & Hive Fallback

- **Định tuyến tự động (`CHAT` / `COMPACTION` / `WORKSPACE_SUMMARY`):** Gemini primary (tối đa 2 khóa, `gemini-3.5-flash`) → Hive fallback (tối đa 2 khóa qua `https://api-cdn.thehive.ai/api/v3`, `deepseek-ai/deepseek-v4.1-flash-1017`).
- **Tối ưu độ trễ & giới hạn đầu ra:** Áp dụng `ThinkingConfig` riêng cho dòng `gemini-3.*` (`MINIMAL` cho `QUERY_PLAN`/`KEY_PROBE`, `GEMINI_THINKING_LEVEL=LOW` cho `CHAT`), `GEMINI_CHAT_ATTEMPT_TIMEOUT_SECONDS=40`, `HIVE_READ_IDLE_TIMEOUT_SECONDS=20` và `HIVE_MAX_TOKENS=8192`.
- **Failover có kiểm soát:** Chỉ tự chuyển target khi gặp lỗi tạm thời (timeout, `429`, `5xx`, lỗi mạng). Lỗi xác thực, cấu hình, safety, evidence, citation/schema và cancellation không kích hoạt fallback.
- **Điều tiết vận hành:** Cổng `OPEN` / `DRAINING` / `VERIFYING` lưu trên PostgreSQL cho phép rút tải an toàn không làm đứt các phiên đang chạy. Chi tiết cutover/rollback xem tại [Hive generation runbook](docs/runbooks/hive-generation.md).

## Phát triển local

### Runtime mục tiêu

- **Node.js** 24.18.0 LTS + npm
- **Java** 21 LTS (Maven 3.9.16 qua wrapper `core-api/mvnw.cmd` hoặc `./core-api/mvnw`)
- **Python** 3.13.14
- **Docker** 29+ & Docker Compose 5+

### Thiết lập nhanh

1. Sao chép `.env.example` thành `.env` và điền thông tin môi trường local (không dùng secret mẫu ở môi trường thật).
2. Cài dependencies theo từng phân hệ (`npm ci` trong `frontend/` / `mobile/`, tạo `.venv` trong `ai-service/`).
3. Đảm bảo `JAVA_HOME` trỏ tới JDK 21 trước khi chạy Core API.

### Khởi chạy toàn bộ stack trên Windows

Entry point chuẩn trên Windows (yêu cầu Windows Terminal) là `dev.ps1` ở thư mục gốc:

```powershell
cd D:\codex-workspace\unichat
.\dev.ps1
```

Script tự kiểm tra prerequisites/port, mở từng service trong tab Windows Terminal riêng kèm dashboard theo dõi và khởi động lại nhanh từng dịch vụ:

| Service | Port | Tab |
|---|---|---|
| ChromaDB | `8000` | 🟣 Tím |
| AI Service | `8001` | 🔵 Xanh dương |
| Core API | `8082` | 🟢 Xanh lá |
| Frontend | `5173` | 🟡 Vàng |
| Mobile (Expo) | `8081` / `8085` | 🟠 Cam |

PostgreSQL, Document Storage và RabbitMQ sử dụng dịch vụ cloud (Supabase / CloudAMQP). Khi chạy Mobile trên điện thoại thật khác host, đặt `EXPO_PUBLIC_API_URL` trỏ về địa chỉ LAN của Core API rồi khởi động lại Expo.

## Kiểm tra

Mọi test tự động đều mock phụ thuộc ngoài và không gọi mạng bên ngoài:

- **Frontend:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
- **Core API:** `core-api/mvnw.cmd verify` (Windows) hoặc `./core-api/mvnw verify` (Unix)
- **AI Service:** `pytest app/core/rag/tests app/tests`, `mypy`, `ruff` từ `.venv`
- **E2E:** `npm run e2e` (Playwright Chromium)

## Tài liệu chuẩn & Đóng góp

- Nguồn chuẩn: [architecture-decision.md](docs/specifications/architecture-decision.md), [file-plan.md](docs/specifications/file-plan.md), [api-contracts.md](docs/specifications/api-contracts.md), [data-model.md](docs/specifications/data-model.md), [adaptive-retrieval-spec.md](docs/specifications/adaptive-retrieval-spec.md), [test-plan.md](docs/specifications/test-plan.md).
- Ví dụ hợp đồng API & lỗi RFC 7807: [docs/api/examples.md](docs/api/examples.md).
- Đọc [AGENTS.md](AGENTS.md) và [CONTRIBUTING.md](CONTRIBUTING.md) trước khi đóng góp. Dùng Conventional Commits, cross-review và luôn có phê duyệt rõ ràng trước khi commit, push, thay đổi cấu hình GitHub, merge hoặc deploy. Dự án được phát hành theo [LICENSE](LICENSE).
