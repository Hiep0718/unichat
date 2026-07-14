# Checklist trước khi bắt đầu phát triển UniChat

## Thông tin kiểm tra

| Thuộc tính | Giá trị |
|---|---|
| Ngày lập | 2026-07-14 |
| Repository | `https://github.com/Hiep0718/unichat` |
| Visibility | Public |
| Default branch | `main` |
| CI gần nhất | Pass — frontend, Core API và AI Service |
| Phạm vi sản phẩm | P0 — Adaptive Knowledge Retrieval & Reasoning |
| Trạng thái | Chưa sẵn sàng cho phát triển nhóm cho đến khi các mục P0 bên dưới hoàn tất |

## Quy ước

- `[ ] P0`: bắt buộc hoàn tất trước khi hai người bắt đầu code chung.
- `[ ] P0-CONDITIONAL`: bắt buộc trước khi code phần retrieval, ChromaDB hoặc deploy.
- `[ ] P1`: nên hoàn tất sớm nhưng không chặn work item độc lập với phạm vi liên quan.
- Mỗi mục chỉ được đánh dấu hoàn tất khi có evidence hoặc liên kết xác minh.
- Không tự động tiếp tục checkpoint `IMP-002`; mọi công việc mới phải có issue/task mới và phạm vi được phê duyệt.

## 1. Quản trị GitHub và cộng tác — P0

- [ ] **P0 — Thêm collaborator:** thêm GitHub username của thành viên thứ hai với quyền phù hợp và xác minh họ clone/pull được repository.
  - Owner: Repository owner
  - Evidence: Username xuất hiện trong danh sách collaborators.
- [ ] **P0 — Bảo vệ `main`:** bật branch protection, cấm force push/xóa branch, yêu cầu pull request và yêu cầu CI pass trước merge.
  - Recommended default: ít nhất 1 approval và dismiss stale approvals khi có commit mới.
  - Evidence: Branch protection ruleset hoặc branch rule đang active.
- [ ] **P0 — Chốt giấy phép:** chọn license phù hợp trước khi nhận contribution vào public repository.
  - Quyết định cần người dùng: MIT, Apache-2.0 hoặc license khác.
  - Evidence: `LICENSE` được review và commit.
- [ ] **P0 — Chốt quy trình đóng góp:** tạo `CONTRIBUTING.md` với cách setup, branch naming, Conventional Commits, PR flow, test gates và quy tắc approval.
  - Evidence: Thành viên mới có thể tạo branch và PR mà không cần hỏi lại quy trình cơ bản.
- [ ] **P1 — Thêm collaboration templates:** pull-request template, bug/feature issue templates và `CODEOWNERS`.

## 2. Đồng bộ nguồn sự thật — P0

- [ ] **P0 — Cập nhật trạng thái ADR:** metadata hiện vẫn ghi “Ready for user design approval”; đổi sang trạng thái phản ánh phê duyệt thực tế trước khi dùng làm nguồn triển khai.
  - Source: `docs/specifications/architecture-decision.md`.
- [ ] **P0 — Đồng bộ cấu trúc repository trong stack spec:** loại bỏ hoặc giải thích các đường dẫn cũ như `evaluation` và `.pipeline`; xác nhận source-of-truth công khai nằm trong `docs/specifications`.
  - Source: `docs/specifications/stack-and-dependencies.md`.
- [ ] **P0 — Đồng bộ trạng thái runtime:** cập nhật bảng runtime cũ để phản ánh Node 24.18.0, Java 21, Python 3.13.14 và công cụ portable đã được dùng để verify.
- [ ] **P0 — Chốt Chroma version contract:** hiện Python client là `chromadb==1.5.9`, Docker server là `0.6.3`; phải ghi rõ compatibility contract hoặc chọn lại phiên bản trước integration.
  - Sources: `ai-service/pyproject.toml`, `infra/compose.yaml`, `docs/security/deferred-security-remediation.md`.
- [ ] **P0 — Xác nhận provider contract:** kiểm tra model Gemini đã chọn còn khả dụng cho account/quota dự kiến; nếu thay đổi model hoặc fallback semantics thì cập nhật ADR trước code.
- [ ] **P0 — Chọn work item kế tiếp:** tạo issue mới theo implementation order; không khôi phục ngầm `IMP-002`.
  - Recommended next area: Core authentication/database migration foundation, vì repository foundation và CI đã hoàn tất.
- [ ] **P0 — Viết Definition of Done cho issue:** nêu rõ scope, non-scope, affected components, API/data contract, security checks, test plan và acceptance criteria.

## 3. Thiết lập máy của từng thành viên — P0

- [ ] **P0 — Clone sạch:** thành viên thứ hai clone repository vào thư mục mới và xác nhận checkout `main` không có file local-only.
- [ ] **P0 — Runtime đúng phiên bản:** xác nhận Node 24.18.0, Java 21, Python 3.13.14, Docker 29+ và Docker Compose 5+.
- [ ] **P0 — Environment local:** sao chép `.env.example` thành `.env`; thay toàn bộ placeholder bằng secret local và xác nhận `.env` bị Git-ignore.
- [ ] **P0 — JWT/service keys local:** sinh access/service RSA key pairs riêng cho development; không dùng chung private key và không commit key.
- [ ] **P0 — Dependency reproducibility:** cài đúng dependency từ `package-lock.json`, Maven Wrapper và `ai-service/requirements.lock.txt`.
  - AI/automation chỉ được install khi có phê duyệt package riêng; con người cần review lockfile trước khi cài.
- [ ] **P0 — Docker boundary:** xác nhận PostgreSQL, ChromaDB, AI Service và Ollama không mở public port ngoài thiết kế được duyệt.
- [ ] **P0 — Startup smoke test:** khởi động theo thứ tự PostgreSQL/ChromaDB → AI Service → Core API → frontend và kiểm tra health endpoint.
- [ ] **P0 — Provider-safe local mode:** test tự động phải dùng fake/mock provider; không gọi Gemini hoặc network ngoài hệ thống.

## 4. Baseline chất lượng trước branch feature đầu tiên — P0

- [ ] **P0 — Frontend:** lint, strict typecheck, unit test và production build đều pass.
- [ ] **P0 — Core API:** Maven Wrapper `verify` pass và không bỏ qua test.
- [ ] **P0 — AI Service:** Ruff, mypy, pytest và coverage tối thiểu 80% đều pass.
- [ ] **P0 — Infrastructure:** Docker Compose config validation pass với environment mẫu.
- [ ] **P0 — E2E:** Playwright happy path hiện có pass bằng browser đã cài.
- [ ] **P0 — Fresh-clone verification:** ít nhất một thành viên chạy các gate trên từ clone mới, không phụ thuộc cache cục bộ của máy hiện tại.
- [ ] **P0 — Ghi baseline vào issue:** đính kèm command/result hoặc liên kết GitHub Actions run trước khi feature code bắt đầu.

## 5. Security và dữ liệu — P0

- [ ] **P0 — Đọc threat/permission contract:** cả hai thành viên xác nhận Core API là authorization owner và AI Service chỉ nhận `allowedDocumentIds`.
  - Sources: `docs/specifications/threat-model.md`, `docs/specifications/permission-matrix.md`.
- [ ] **P0 — Public-repository hygiene:** không đưa prompt, document content, token, private key, `.env`, raw evaluation data hoặc dữ liệu người dùng thật vào issue/log/fixture.
- [ ] **P0 — Test data:** chỉ dùng fixture tổng hợp hoặc dữ liệu đã được cho phép; ghi nguồn và license cho dataset nghiên cứu.
- [ ] **P0 — Logging policy:** không log token, prompt, chunk, toàn văn tài liệu hoặc secret; luôn giữ request ID và operation context.
- [ ] **P0 — Dependency audit plan:** thống nhất thời điểm chạy npm audit, Maven dependency audit và Python OSV/pip checks cho từng PR/release.

## 6. Gate bắt buộc trước retrieval, ChromaDB hoặc deploy — P0-CONDITIONAL

- [ ] **P0-CONDITIONAL — Đóng SEC-DEBT-001:** không bắt đầu Chroma-backed feature khi advisory Critical còn unresolved.
- [ ] **P0-CONDITIONAL — Phê duyệt hướng remediation:** ưu tiên đánh giá official thin client `chromadb-client==0.6.3`; hướng toolchain/build tools cần approval riêng.
- [ ] **P0-CONDITIONAL — Compatibility integration test:** chứng minh client kết nối, tạo collection, upsert, query và delete với server version đã khóa.
- [ ] **P0-CONDITIONAL — Security regression:** chạy pip check, Ruff, mypy, pytest, Compose validation và OSV audit sau remediation.
- [ ] **P0-CONDITIONAL — Network isolation:** chứng minh Chroma không mở host/Internet port và chỉ nằm trên private internal network.
- [ ] **P0-CONDITIONAL — Evaluation plan:** chuẩn bị dataset manifest, development/holdout split và raw-result policy trước khi calibration threshold.
- [ ] **P0-CONDITIONAL — Deployment approval:** mọi deploy cần phê duyệt riêng sau khi không còn Critical/High unresolved finding.

## 7. CI/CD và repository hardening — P1

- [ ] **P1 — Chạy E2E trong CI:** thêm Playwright job hoặc stage cho critical happy path.
- [ ] **P1 — Validate Compose trong CI:** thêm `docker compose config` để phát hiện drift sớm.
- [ ] **P1 — Xử lý Actions deprecation:** nâng các GitHub Actions đang phát cảnh báo Node.js 20 compatibility lên phiên bản được duy trì.
- [ ] **P1 — Dependency automation:** cân nhắc Dependabot/Renovate với PR nhỏ, pin version và bắt buộc review.
- [ ] **P1 — Security scanning:** bật secret scanning, dependency review và code scanning phù hợp với public repository.
- [ ] **P1 — Issue organization:** tạo labels/milestone cho P0, security debt, documentation, frontend, Core API, AI Service và infrastructure.

## 8. Definition of Ready — được phép bắt đầu code

Chỉ đánh dấu `READY` khi tất cả điều kiện sau đúng:

- [ ] Tất cả mục **P0** liên quan work item đã hoàn tất hoặc có risk acceptance rõ ràng.
- [ ] Work item có GitHub issue, owner, branch name, scope/non-scope và acceptance criteria.
- [ ] Durable specifications không còn mâu thuẫn với code/config hiện tại trong phạm vi work item.
- [ ] Cả hai thành viên có môi trường local tái lập và baseline pass.
- [ ] `main` được bảo vệ và feature work chỉ merge qua pull request.
- [ ] Không có Critical/High security finding unresolved trong dependency hoặc phạm vi sắp code.
- [ ] Test plan bao gồm unit, integration và E2E/evidence tương ứng với thay đổi.
- [ ] Mọi package/tool/service trả phí hoặc external provider mới đã có phê duyệt riêng.

**Trạng thái Definition of Ready:** `NOT READY` — chờ hoàn tất P0 checklist.

## 9. Handoff cho work item đầu tiên

| Trường | Giá trị cần điền |
|---|---|
| Collaborator GitHub username |  |
| GitHub issue |  |
| Work item/task ID mới |  |
| Owner |  |
| Reviewer |  |
| Feature branch |  |
| Target milestone |  |
| Affected components |  |
| Required design documents |  |
| Security gate |  |
| Baseline evidence |  |
| Approval reference |  |
