# Stack, repository và dependency proposal — UniChat

## Metadata

| Thuộc tính | Giá trị |
|---|---|
| Phase | design-architecture |
| Task | TASK-007 |
| Version | 1.0 |
| Trạng thái | Approved — installed baseline; readiness evidence pending |
| Repository | Monorepo |
| Chính sách | Pin direct dependency; commit lockfile; không dùng latest/caret/tilde |

## 1. Runtime và dịch vụ đã khóa

| Thành phần | Phiên bản/định danh | Cơ sở |
|---|---|---|
| Node.js | 24.18.0 LTS | Nhánh LTS chính thức |
| React | 19.2.7 | Release ổn định |
| Vite | 8.1.4 | Stable; hỗ trợ Node 20.19+/22.12+ |
| TypeScript | 6.0.3 | Chọn nhánh 6 ổn định thay vì major 7 mới |
| Java | Temurin/OpenJDK 21 LTS | Runtime Core API |
| Spring Boot | 4.1.0 | Stable; yêu cầu Java 17+ |
| Maven Wrapper | 3.9.16 | Build tái lập, không phụ thuộc Maven global |
| Python | 3.13.14 | Maintenance release |
| FastAPI | 0.139.0 | Stable release |
| PostgreSQL | 18.4 | Major được hỗ trợ |
| Chroma Python client | 1.5.9 | Exact pin hiện có; Critical advisory thuộc `SEC-DEBT-001` |
| Chroma server | 0.6.3 + digest | Compatibility với client 1.5.9 chưa được chứng minh |
| Ollama | 0.31.2 | Local fallback |
| Gemini | gemini-3.5-flash | Stable model |
| Embedding | intfloat/multilingual-e5-base | 768 chiều, cosine |
| Embedding revision | d128750597153bb5987e10b1c3493a34e5a4502a | Commit được đóng băng |

## 2. Cấu trúc repository

- frontend: React SPA, public entry.
- core-api: Spring Boot, public API và authorization owner.
- ai-service: FastAPI, chỉ private network.
- infra: Docker Compose, reverse proxy, observability và script.
- docs: ADR, API, runbook, evidence và thesis mapping.
- evaluation: target future path cho dataset/config/script; chưa tồn tại trong baseline hiện tại.
- .pipeline: state AI SDLC local, Git-ignored và không phải public source of truth.

Chỉ frontend và core-api được expose. PostgreSQL, ChromaDB, ai-service và Ollama ở private Docker network.

## 3. Template đã dùng khi scaffold

Phần này là historical scaffold record; repository foundation đã được tạo:

- react-vite-ts phù hợp làm nền nhưng đang ở React 18/Vite 6/TypeScript 5; phải thay toàn bộ version range bằng exact pin và bỏ boilerplate state không dùng.
- spring-boot-java phù hợp cấu trúc tối thiểu nhưng đang ở Spring Boot 3.3, có H2/Lombok và thiếu Maven Wrapper; phải nâng 4.1.0, bỏ H2/Lombok, thêm wrapper.
- python-fastapi phù hợp bootstrap nhưng dùng range >= và Python 3.10; phải chuyển sang pyproject/lock exact cho Python 3.13.14.

Không chạy npx scaffold. Copy template chỉ thực hiện sau approval TASK-013.

## 4. Frontend direct dependencies

| Package | Version | Vai trò |
|---|---:|---|
| react | 19.2.7 | UI |
| react-dom | 19.2.7 | DOM renderer |
| react-router-dom | 7.18.1 | Routing |
| @tanstack/react-query | 5.101.2 | Server state |
| react-hook-form | 7.81.0 | Form state |
| zod | 4.4.3 | Input/schema validation |
| react-markdown | 10.1.0 | Answer Markdown, raw HTML disabled |
| remark-gfm | 4.0.1 | GFM |
| tailwindcss | 4.3.2 | Styling |
| @fontsource/be-vietnam-pro | 5.2.8 | Font self-hosted |

Frontend dev/test pin:

- typescript 6.0.3; vite 8.1.4; @vitejs/plugin-react 6.0.3.
- @types/react 19.2.17; @types/react-dom 19.2.3.
- vitest 4.1.10; @vitest/coverage-v8 4.1.10; jsdom 29.1.1.
- @testing-library/react 16.3.2; @testing-library/user-event 14.6.1; @testing-library/jest-dom 6.9.1.
- msw 2.15.0; @playwright/test 1.61.1; @axe-core/playwright 4.12.1.
- eslint 9.39.5; @eslint/js 9.39.5; typescript-eslint 8.63.0; eslint-plugin-react-hooks 7.1.1; eslint-plugin-react-refresh 0.5.3.

## 5. Core API dependencies

Version management dùng Spring Boot parent 4.1.0 và Maven Wrapper 3.9.16. Direct dependencies:

- spring-boot-starter-web, validation, security, oauth2-resource-server, data-jpa và actuator.
- postgresql runtime; flyway-core và flyway-database-postgresql.
- spring-boot-starter-cache chỉ dùng abstraction; P0 không thêm Redis.
- Bouncy Castle cho Argon2id/JWT key utilities khi JDK/Spring không bao phủ.
- logstash-logback-encoder và micrometer-registry-prometheus.
- spring-boot-starter-test, spring-security-test, Testcontainers PostgreSQL, WireMock và ArchUnit.

Các artifact được Spring Boot BOM quản lý không lặp version. Artifact ngoài BOM phải có property version exact trong pom. Không dùng Lombok, H2 hoặc secret mặc định.

## 6. AI Service direct dependencies

Runtime pin:

- fastapi 0.139.0; uvicorn 0.51.0.
- pydantic 2.13.4; pydantic-settings 2.14.2.
- httpx 0.28.1; google-genai 2.11.0.
- chromadb 1.5.9; sentence-transformers 5.6.0.
- pypdf 6.14.2; python-docx 1.2.0; defusedxml 0.7.1; python-multipart 0.0.32.
- structlog 26.1.0; prometheus-client 0.25.0; tenacity 9.1.4; PyYAML 6.0.3.

Dev/test pin:

- pytest 9.1.1; pytest-asyncio 1.4.0; pytest-cov 7.1.0; pytest-mock 3.15.1; respx 0.23.1.
- ruff 0.15.21; mypy 2.3.0.

PyTorch và dependency transitive nằm trong resolved exact-pin inventory sinh trên Python 3.13.14. Inventory hiện không có hashes; không thêm direct dependency nếu mã không import trực tiếp.

## 7. Không đưa vào P0

LangChain, LlamaIndex, Redis, MongoDB, MinIO, Kafka/RabbitMQ, Knowledge Graph, OCR, PPTX/XLSX parser, native mobile và Redux/Zustand.

RabbitMQ là message broker cho async ingestion (ADR-007); bảng `resource_jobs` đã bị xóa (V5 migration). Local storage nằm sau interface để mở rộng MinIO về sau.

## 8. Trạng thái máy hiện tại

| Công cụ | Hiện tại | Yêu cầu | Kết luận |
|---|---|---|---|
| Node | Portable 24.18.0 | 24.18.0 | Đạt trên máy hiện tại; cần evidence máy collaborator |
| npm | Portable 11.16.0 | 11.16.0 | Đạt trên máy hiện tại; cần evidence máy collaborator |
| Java | System 17; portable Temurin 21.0.11 | 21 LTS | Dùng portable JDK 21; cần baseline evidence |
| Maven | Wrapper 3.9.16 | Wrapper 3.9.16 | Windows null-safety hardening cần pass trước merge |
| Python | AI venv 3.13.14 | 3.13.14 | Đạt trên máy hiện tại; cần evidence máy collaborator |
| Docker | 29.1.3 | Có | Đạt |
| Docker Compose | 5.0.1 | Có | Đạt |
| Git | 2.49.0 | Có | Đạt; repository đã hoạt động trên GitHub |

## 9. Cổng cài đặt

Trước khi cài hoặc tải:

1. Người dùng phê duyệt danh sách dependency và ba runtime cần nâng.
2. Copy ba template vào thư mục đích, loại bỏ manifest cũ/range cũ.
3. Cài dependencies từ manifest và/hoặc lockfile tương ứng của từng ecosystem đã được review.
4. Pin Docker image bằng tag và digest sau pull.
5. Chạy audit, build, lint và test khói không gọi network thật.
6. Ghi mọi chênh lệch version vào decisions log.

Không cài dependency mới, commit, push, thay đổi GitHub hoặc deploy trước approval riêng.
