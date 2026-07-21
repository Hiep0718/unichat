# UniChat — Hướng Dẫn Nhập Môn Cho AI Agent (AI Agent Onboarding Guide)

Để đảm bảo chất lượng, tính nhất quán và tuân thủ nghiêm ngặt các quy định của dự án UniChat (đặc biệt trong giai đoạn phát triển tích cực `READY` hiện tại), mọi AI Agent **BẮT BUỘC** phải đọc và nắm rõ các tài liệu sau **TRƯỚC KHI** thực hiện bất kỳ thay đổi mã nguồn nào.

---

## 1. Nguồn Sự Thật Tuyệt Đối (Source of Truth)

Đây là các tệp quy định hành vi, kiến trúc và nguyên tắc cốt lõi. Hãy ưu tiên đọc theo thứ tự sau:

### 1.1. Quy tắc bắt buộc (Mandatory Rules)
- 📄 **`AGENTS.md`**: **Đọc đầu tiên.** Đây là tệp chứa các quy định tối cao dành riêng cho AI Agent. Nó quy định về chất lượng code (SOLID, độ dài hàm/file), testing (≥80% coverage), bảo mật (authorization, JWT), và quy trình Git (Conventional Commits, chặn tự động push/deploy).
- 📄 **`README.md`**: Nắm bắt trạng thái dự án (hiện đang `READY`), kiến trúc tổng quan (frontend, core-api, ai-service, RabbitMQ), yêu cầu runtime (Node.js 24, Java 21, Python 3.13), và cách chạy/test dự án.
- 📄 **`CONTRIBUTING.md`**: Đọc để hiểu luồng làm việc, cross-review, và định dạng commit.

### 1.2. Đặc tả kỹ thuật (Specifications)
Nằm trong thư mục `docs/specifications/`. Phải đọc tệp liên quan trực tiếp đến domain bạn sắp sửa:
- 📄 **`architecture-decision.md`**: Các quyết định kiến trúc (ADRs). Phải đọc để hiểu tại sao dự án dùng monorepo, tại sao Core API giữ quyền auth, và các giới hạn P0.
- 📄 **`api-contracts.md`**: Hợp đồng API chuẩn. Bắt buộc đọc khi làm việc với backend hoặc gọi API từ frontend. (Quy định REST prefix, opaque cursor, RFC 7807 error).
- 📄 **`data-model.md`**: Cấu trúc database (PostgreSQL, ChromaDB). Bắt buộc đọc khi tạo entity, repository hoặc viết query.
- 📄 **`adaptive-retrieval-spec.md`**: Trái tim của hệ thống RAG P0. Bắt buộc đọc khi làm việc với AI Service (Intent detection, Strategy, Evidence Gate, Generation).
- 📄 **`file-plan.md`**: Cấu trúc thư mục chi tiết. Bắt buộc tuân thủ khi tạo file mới để tránh phá vỡ kiến trúc monorepo.
- 📄 **`test-plan.md`**: Kế hoạch và giao thức kiểm thử. Đọc để biết cách viết unit, integration, và E2E test đúng chuẩn dự án.
- 📊 **`diagrams/`**: Xem các file sơ đồ `.drawio` để hình dung luồng dữ liệu (Data flow) và kiến trúc hệ thống trực quan.

### 1.3. UI/UX & Design (Dành cho Frontend)
- 📄 **`DESIGN.md`**: Bắt buộc đọc khi làm việc với React SPA. Quy định hệ thống màu sắc (Deep Blue primary), typography (Inter), spacing, và component styling theo phong cách "Corporate Modern".
- 📄 **`docs/specifications/ui-spec.md`**: (Nếu có yêu cầu sửa UI cụ thể).

---

## 2. Các Quy Định Cốt Lõi Cần Nhớ Nhanh

Nếu bạn chưa kịp đọc toàn bộ chi tiết, đây là các "giới hạn đỏ" không được phép vi phạm:

### Môi trường & Mã nguồn
- **Monorepo 3 dịch vụ**: `frontend` (React), `core-api` (Spring Boot), `ai-service` (FastAPI).
- **Quyền hạn**: `core-api` là chủ sở hữu quyền (AuthN/AuthZ). AI Service không bao giờ tự ý quyết định quyền truy cập tài liệu.
- **Không vội vàng**: Không tự cài package ngoài nếu chưa xin phép. Giữ nguyên các version dependencies đã ghim.
- **Message Broker**: Hệ thống sử dụng **RabbitMQ** để giao tiếp bất đồng bộ (như Document Ingestion) giữa Core API và AI Service. KHÔNG DÙNG PostgreSQL cho hàng đợi.

### Giới hạn Code (Quality Gates)
- **Độ dài**: Hàm logic thuần ≤ 30 dòng. Component React render ≤ 60 dòng (tối đa 100). File ≤ 300 dòng (config/schema tối đa 500).
- **Phức tạp**: Tối đa 3 nested levels. Dùng early return. Không dùng `var`.
- **Ngôn ngữ**: TypeScript strict mode, Python mypy strict mode. Tệp UTF-8 (không BOM). Tiếng Việt giữ nguyên dấu.

### Testing & Security
- **Untested code is unfinished**: Cần ≥80% unit test coverage cho business logic. Luôn viết mock cho các network calls ra bên ngoài.
- **Idempotency & Validations**: Mọi API endpoint đều phải validate input (Zod/Pydantic/Jakarta). Mutation quan trọng phải dùng `Idempotency-Key`.
- **Logging**: Không dùng `console.log` trên production. Structured logging không được chứa secrets, raw token, prompt, chunk hay câu hỏi gốc.

### Quy trình (SDLC)
- Cập nhật **`.pipeline/decisions-log.md`** cho mọi quyết định tự chủ.
- Dùng **Conventional Commits**.
- **KHÔNG BAO GIỜ** tự động commit, push, hay thay đổi DB/Git nếu chưa xin phép (Explicit human approval).

---

## 3. Checklist Trước Khi Bắt Đầu Task (Pre-flight Checklist)

1. [ ] Đọc mô tả Task của user cẩn thận.
2. [ ] Dùng công cụ (như `grep_search`, `list_dir`) để tìm các file liên quan đến Task.
3. [ ] Đọc lướt (view_file) `AGENTS.md` (nếu quên) và các tệp specification (trong `docs/specifications/`) liên quan đến domain của Task.
4. [ ] Nếu làm Frontend, kiểm tra `DESIGN.md`. Nếu làm API, kiểm tra `api-contracts.md`.
5. [ ] Viết ra Kế hoạch (Plan) và xin ý kiến User trước khi tạo/sửa đổi số lượng lớn file.
