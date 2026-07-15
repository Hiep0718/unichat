# Checklist readiness trước CORE-001 — UniChat

## Thông tin kiểm tra

| Thuộc tính | Giá trị |
|---|---|
| Ngày cập nhật | 2026-07-15 |
| Repository | `https://github.com/Hiep0718/unichat` |
| Default branch | `main` |
| Readiness branch | `feature/readiness-hardening` |
| Work item kế tiếp | `CORE-001 — Core Auth & DB Foundation` |
| Canonical status | `NOT READY` |

`NOT READY` phải được giữ trong readiness hardening và kiểm thử máy hiện tại.
Không chuyển trạng thái chỉ vì một máy pass hoặc readiness changes đã merge.

## Trình tự chuyển trạng thái

1. Merge readiness hardening vào `main`; trạng thái vẫn `NOT READY`.
2. Collaborator fresh-clone `main` vào thư mục mới.
3. Cả hai máy hoàn thành mandatory baseline/evidence.
4. Xác minh không còn mandatory blocker.
5. Tạo evidence PR cập nhật trạng thái.
6. Chỉ sau khi evidence PR merge, canonical status mới là
   `READY — CORE-001`.
7. Khi đó mới tạo `feature/core-001-core-auth-db-foundation` từ `main` mới nhất.

## 1. Governance và ownership

- [x] `phihungdeptraino2` có quyền collaborator `WRITE`.
- [ ] MIT License đã được review và merge với copyright:
  `Copyright (c) 2026 Nguyễn Thanh Hiệp and Hoàng Phi Hùng`.
- [ ] `CONTRIBUTING.md` đã được review và merge.
- [ ] Branch protection cho `main` đã active và được đọc lại từ GitHub.
- [ ] Milestone `P0 — Core Foundation` đã được tạo.
- [ ] Issue CORE-001 đã được tạo với scope, non-scope, DoD và evidence gates.

### Cross-review model

- PR author/implementer không tự approve.
- PR của `Hiep0718`: `phihungdeptraino2` review chính.
- PR của `phihungdeptraino2`: `Hiep0718` review chính.
- Mỗi work item có một Issue Assignee/Main Owner.
- Shared-architecture work vẫn phải có Main Owner và independent reviewer.
- Nếu cả hai cùng đóng góp code đáng kể vào một PR, tách PR hoặc dùng reviewer
  độc lập đã được phê duyệt.

CORE-001:

- Issue assignee / Main Owner: `Hiep0718`.
- Planned PR reviewer for CORE-001: `phihungdeptraino2`.

Đây là phân công riêng của CORE-001, không phải reviewer policy cố định.

## 2. Dependency và environment contract

Cài dependencies từ manifest và/hoặc lockfile tương ứng của từng ecosystem đã được review.

| Ecosystem | Source được review | Quy tắc |
|---|---|---|
| Frontend | root `package.json`, `frontend/package.json`, root `package-lock.json` | Chạy `npm ci` tại root; không giả định lockfile riêng trong `frontend` |
| Core API | `core-api/pom.xml`, Maven Wrapper | Không giả định Maven lockfile |
| AI Service | `pyproject.toml`, requirements manifests, `requirements.lock.txt` | Exact-pin inventory hiện có; không mô tả là hash-locked |

- [ ] Mỗi developer xác nhận manifest/lockfile đã review trước khi cài.
- [ ] `.env` local được tạo, bị Git-ignore và không xuất hiện trong evidence.
- [ ] Không có private key, API key, raw token hoặc secret trong repository/log.
- [ ] Documentation/evidence không chứa absolute local path hoặc local-file URI.

### JWT key contract đã xác minh

- Core API hiện đọc `JWT_PUBLIC_KEY_LOCATION` để verify access JWT.
- Core API hiện chưa đọc private key và chưa có signer.
- Readiness `.env.example` chỉ phản ánh public-key implementation hiện tại.
- CORE-001 sẽ bổ sung `JWT_PRIVATE_KEY_LOCATION` để ký access JWT.
- Mỗi developer dùng một RSA access-token key pair 2048-bit riêng.
- Service JWT key pair được hoãn tới service-authentication work item.
- Không ghi raw key vào evidence; chỉ ghi public fingerprint/key length và
  kiểm tra quyền file phù hợp.

### Refresh-token hashing guardrail

`REFRESH_TOKEN_PEPPER` không phải active readiness contract. Trước hashing
subtask của CORE-001 phải chốt hashing strategy, pepper usage, configuration
contract, hash versioning và rotation implications.

Gate này không block việc bắt đầu CORE-001 hoặc các subtask độc lập. Tuy nhiên,
CORE-001 không được đánh dấu Done hoặc merge hoàn tất nếu decision chưa được
phê duyệt và hashing subtask chưa đạt DoD.

## 3. Readiness gate classification

| Nhóm | Evidence | Blocking behavior |
|---|---|---|
| Mandatory blocker for `READY — CORE-001` | Hardening merge; protection active; required checks; issue/milestone; evidence hai máy; collaborator fresh-clone; PostgreSQL/Core health; Maven Wrapper; JWT environment | Failure giữ `NOT READY` |
| Repository regression evidence | Frontend lint/typecheck/unit/build; Playwright; AI Ruff/mypy/pytest/coverage và non-Chroma health; Compose validation; repository CI | Failure block readiness/merge nhưng không phải CORE feature DoD |
| Deferred/scoped `SEC-DEBT-001` | Chroma startup, compatibility, CRUD/retrieval integration, remediation và Chroma-dependent deployment | Không block non-Chroma CORE-001 trừ khi làm hỏng shared mandatory infrastructure |

### Mandatory evidence trên mỗi máy

- [ ] Node 24.18.0 và npm 11.16.0.
- [ ] Java 21 và Maven Wrapper 3.9.16.
- [ ] Python 3.13.14 cho AI Service.
- [ ] Docker 29+ và Docker Compose 5+.
- [ ] Dependency installation từ reviewed ecosystem sources.
- [ ] PostgreSQL startup và `pg_isready` pass.
- [ ] Core API startup và health pass.
- [ ] `mvnw.cmd verify` pass trên Windows hoặc `./mvnw -B verify` pass trên Unix.
- [ ] Frontend lint, strict typecheck, unit test và production build pass.
- [ ] AI Ruff, mypy, pytest và coverage tối thiểu 80% pass.
- [ ] `docker compose -f infra/compose.yaml config` pass.
- [ ] Baseline Playwright pass.
- [ ] Automated tests không gọi Gemini/Ollama hoặc external provider thật.

Collaborator phải chạy evidence từ fresh clone của `main` trong thư mục mới.
Evidence không được phụ thuộc cache của máy hiện tại.

### Startup smoke

- PostgreSQL và Core API là mandatory cho CORE-001 readiness.
- AI `/internal/v1/health` là non-Chroma repository baseline.
- Frontend được xác minh qua build và Playwright.
- Chroma container running không chứng minh client/server compatibility.
- Chroma-only compatibility/retrieval failure gắn với `SEC-DEBT-001`.
- Chỉ block CORE-001 nếu Chroma làm shared mandatory infrastructure không chạy;
  evidence phải nêu chính xác shared gate bị ảnh hưởng.

## 4. Dependency audit gate

- [ ] Required check `dependency-audit-policy` xuất hiện và pass trên PR.
- [ ] Frontend npm audit, Maven resolved inventory và Python resolved inventory
  đều được kiểm tra.
- [ ] Warning/evidence của `SEC-DEBT-001` không bị che giấu.
- [ ] `PASS_WITH_SCOPED_EXCEPTION` chỉ áp dụng cho exact finding và non-Chroma
  change scope.
- [ ] High/Critical mới, exception drift hoặc audit unavailable làm check fail.
- [ ] Release audit fail khi `SEC-DEBT-001` còn open.

Chi tiết exception nằm tại `.github/dependency-audit-exceptions.json` và
`docs/security/deferred-security-remediation.md`.

## 5. Branch protection bootstrap

1. Implement check trên readiness branch.
2. Sau approval, push branch và tạo PR qua approval riêng.
3. Xác minh các check thực sự xuất hiện và pass:
   `frontend`, `core-api`, `ai-service`, `dependency-audit-policy`.
4. Chỉ sau đó cấu hình protection yêu cầu exact contexts, một approval, dismiss
   stale approvals, áp dụng cho administrators và cấm force push/delete.
5. Đọc lại active rule và required checks trước review/merge.

Nếu GitHub chỉ nhận check đã chạy trên default branch:

1. Dùng temporary protection với ba check hiện có và đầy đủ review rules.
2. Merge readiness workflow sau approval.
3. Chờ `dependency-audit-policy` chạy thành công trên `main`.
4. Bổ sung check này vào protection và xác minh lại.
5. Giữ `NOT READY` cho tới khi evidence hai máy hoàn tất.

## 6. CORE-001 scope và Definition of Done

Scope: Flyway migrations cho `users`/`refresh_tokens`, repositories, Argon2id,
access JWT RS256 signer/verifier, refresh-token generation/hash/family
primitives và tests. Non-scope: auth endpoints/UI, service JWT, AI/Chroma và
deployment.

- [ ] Flyway migration pass trên PostgreSQL sạch.
- [ ] Schema, constraints và indexes của `users`/`refresh_tokens` được xác minh.
- [ ] Repository integration tests pass.
- [ ] Argon2id unit tests pass.
- [ ] JWT RS256 signer/verifier unit tests pass.
- [ ] Refresh-token generation, hashing và family primitive unit tests pass.
- [ ] Hashing/pepper/configuration/rotation design decision đã được phê duyệt.
- [ ] Không lưu plaintext password.
- [ ] Không lưu plaintext refresh token.
- [ ] Không log secret, private key, raw token hoặc sensitive credential.
- [ ] Logic mới đạt tối thiểu 80% line/branch coverage.
- [ ] Maven Wrapper pass trên Windows và Linux CI.
- [ ] Feature E2E ghi `N/A` vì chưa có user-facing flow.
- [ ] Baseline Playwright vẫn pass.

CORE-001 không được đánh dấu Done, final approve hoặc merge hoàn tất trước khi
toàn bộ DoD, bao gồm refresh-token hashing subtask, đạt.

## 7. P1 không block CORE-001

- PR/issue templates và `CODEOWNERS`.
- Playwright/Compose validation trong CI.
- Actions maintenance, dependency automation, secret/code scanning mở rộng.
- Labels và organization automation.

**Canonical status: `NOT READY`.**
