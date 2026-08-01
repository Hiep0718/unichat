# RLS Remediation Plan
Date: 2026-07-22
Updated: 2026-07-22
Author: Hiep / AI-assisted

## 1. Mở đầu — Bối cảnh

Supabase linter báo cáo tất cả bảng trong schema `public` đang **tắt Row-Level Security (RLS)**. Dù UniChat sử dụng Supabase **chỉ làm managed PostgreSQL host** (không dùng Supabase Auth hay PostgREST cho business logic), Supabase vẫn expose PostgREST API tại `https://<project-ref>.supabase.co/rest/v1/` cùng với các role tự tạo (`anon`, `authenticated`, `service_role`). Nếu API key bị lộ, bất kỳ ai cũng có thể đọc/ghi dữ liệu qua PostgREST.

### Kiến trúc truy cập dữ liệu UniChat

```
React SPA (client)
    │
    ▼
Core API (Spring Boot) ← sở hữu auth + authorization (ADR-002, ADR-004)
    │ JDBC / JPA
    ▼
PostgreSQL (Supabase hosted, private network — ADR-003)
```

- **Client không bao giờ kết nối trực tiếp đến PostgreSQL.**
- Core API kết nối PostgreSQL bằng DB role `postgres.<project-id>` (superuser, BYPASSRLS) qua Supabase Pooler.
- Authorization logic hoàn toàn do Core API xử lý trước khi thực thi SQL.
- RLS đóng vai trò **defense-in-depth** (lớp bảo vệ cuối cùng), không phải authorization layer chính.

## 2. Vấn đề cần giải quyết

- Chặn hoàn toàn truy cập dữ liệu qua PostgREST API của Supabase nếu API key (`anon`, `service_role`) bị lộ.
- Áp dụng least-privilege: chỉ Core API DB role có quyền đọc/ghi.
- Giữ nguyên chức năng Core API (Spring Boot JPA) — superuser/BYPASSRLS tự động bypass RLS.

## 3. Mục tiêu

- Bật RLS trên mọi bảng `public`.
- Tạo policy `deny_all` chặn mọi non-superuser access.
- Thu hồi (`REVOKE`) toàn bộ quyền của `anon`, `authenticated`, `service_role` trên schema `public`.
- Đóng gói vào Flyway migration có version hóa.
- Xác minh Core API vẫn hoạt động bình thường sau khi bật RLS.

## 4. Phạm vi

18 bảng trong schema `public` (đã loại `resource_jobs` — xem Ghi chú):

- public.users
- public.refresh_tokens
- public.workspaces
- public.workspace_members
- public.documents
- public.conversations
- public.messages
- public.citation_history
- public.retrieval_traces
- public.retrieval_trace_items
- public.evaluation_cases
- public.evaluation_runs
- public.evaluation_results
- public.idempotency_records
- public.rate_limit_buckets
- public.audit_events
- public.password_reset_otps
- public.flyway_schema_history

Ghi chú:
- `resource_jobs` đã bị xóa bởi migration `V5__drop_resource_jobs.sql` theo ADR-007 (RabbitMQ thay thế).
- `flyway_schema_history` được bao gồm vì Core API role (superuser) tự bypass RLS khi Flyway chạy migration.

## 5. Giả định

- Core API kết nối PostgreSQL bằng DB role `postgres.<project-id>` có quyền **superuser** hoặc **BYPASSRLS**. Đã xác minh bằng: `SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;`
- Supabase tự tạo roles `anon`, `authenticated`, `service_role` — tất cả phải bị `REVOKE ALL`.
- UniChat **không** sử dụng Supabase Auth, PostgREST, hay Supabase Dashboard/API để truy vấn dữ liệu. `service_role` cũng bị revoke.
- JWT được Core API tự quản lý (RS256, 15 phút — ADR-005), không dùng `auth.uid()` của Supabase.

## 6. Chiến lược Defense-in-Depth (3 lớp)

```
┌──────────────────────────────────────────────────────┐
│ Lớp 1: REVOKE ALL từ anon/authenticated/service_role │
│         → Chặn hoàn toàn PostgREST API               │
├──────────────────────────────────────────────────────┤
│ Lớp 2: ENABLE RLS + Policy deny_all USING(false)     │
│         → Chặn mọi truy cập nếu vượt qua Lớp 1      │
├──────────────────────────────────────────────────────┤
│ Lớp 3: Core API role (superuser/BYPASSRLS)           │
│         → Duy nhất authorized accessor qua JDBC       │
└──────────────────────────────────────────────────────┘
```

## 7. Kế hoạch hành động chi tiết

### Bước 1 — Khảo sát Supabase roles & quyền hiện tại (0.5 ngày)

Chạy trên Supabase SQL Editor hoặc qua Core API DB connection:

```sql
-- Kiểm tra roles hiện có
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles
WHERE rolname IN ('anon', 'authenticated', 'service_role', 'postgres');

-- Kiểm tra quyền hiện tại trên từng bảng
SELECT grantee, table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
ORDER BY table_name, grantee;

-- Kiểm tra RLS status hiện tại
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Xác minh Core API user có BYPASSRLS
SELECT rolname, rolsuper, rolbypassrls
FROM pg_roles
WHERE rolname = current_user;
```

### Bước 2 — Drop bảng deprecated (đã thực hiện)

Migration: `V5__drop_resource_jobs.sql`

```sql
DROP INDEX IF EXISTS idx_resource_jobs_status_available_lease;
DROP TABLE IF EXISTS resource_jobs;
```

### Bước 3 — Enable RLS + Deny-all + Revoke (đã thực hiện)

Migration: `V6__enable_rls_defense_in_depth.sql`

a) Enable RLS trên 18 bảng:

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
-- ... (lặp cho tất cả 18 bảng, xem migration file)
ALTER TABLE flyway_schema_history ENABLE ROW LEVEL SECURITY;
```

b) Deny-all policy — chặn mọi non-superuser:

```sql
CREATE POLICY "deny_all" ON users FOR ALL USING (false);
CREATE POLICY "deny_all" ON refresh_tokens FOR ALL USING (false);
-- ... (lặp cho tất cả 18 bảng)
```

c) Revoke quyền từ PostgREST roles:

```sql
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE USAGE ON SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE USAGE ON SCHEMA public FROM authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM service_role;
REVOKE USAGE ON SCHEMA public FROM service_role;
```

### Bước 4 — Kiểm thử (1 ngày)

a) **Integration tests Core API**: Chạy toàn bộ test suite Spring Boot — tất cả JPA operations phải pass vì superuser bypass RLS.

```bash
cd core-api && ./gradlew test
```

b) **PostgREST verification**: Thử truy cập qua Supabase REST API với `anon` key:

```bash
curl -H "apikey: <anon-key>" \
     -H "Authorization: Bearer <anon-key>" \
     "https://<project-ref>.supabase.co/rest/v1/users?select=*"
# Expected: 403 hoặc [] (empty)
```

c) **Smoke test**: Kiểm tra frontend → Core API → DB flow hoạt động bình thường.

### Bước 5 — Rollout production

- Chạy Flyway migration trên production (Spring Boot tự chạy khi khởi động).
- Giám sát log Core API: không có lỗi 500 liên quan đến RLS/permission.
- Giám sát Supabase Dashboard: kiểm tra linter đã hết cảnh báo RLS.

### Bước 6 — Giám sát & hardening

- Chạy Supabase linter định kỳ sau mỗi migration mới.
- Bật alert khi có lỗi 403/500 tăng đột biến trên Core API.
- Mỗi bảng mới trong tương lai **bắt buộc** thêm `ENABLE ROW LEVEL SECURITY` + `deny_all` policy ngay trong migration tạo bảng.

### Bước 7 — Rollback plan

Nếu RLS phá vỡ Core API flow (ví dụ: DB role không có BYPASSRLS):

```sql
-- Rollback khẩn cấp — chạy qua Supabase SQL Editor
DROP POLICY IF EXISTS "deny_all" ON users;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- Lặp cho từng bảng bị ảnh hưởng

-- Restore quyền tạm thời nếu cần
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
```

Lưu ý: Flyway không hỗ trợ rollback tự động — rollback phải chạy thủ công qua SQL Editor.

## 8. Cảnh báo & best-practices

- **Không bao giờ** expose Supabase `anon` key hoặc `service_role` key trong frontend code.
- Ghi lại mọi RLS policy trong Flyway migration để version hóa — không dùng SQL Editor trực tiếp trên production.
- Mỗi bảng mới phải có RLS + deny_all policy ngay trong migration tạo bảng.
- Nếu trong tương lai cần Supabase Dashboard để truy vấn dữ liệu, tạo ADR mới và policy riêng cho `service_role` (SELECT only, bảng cụ thể).
- Kiểm tra Supabase Pooler (Supavisor) truyền đúng DB role khi kết nối — đặc biệt ở Transaction Mode.

## 9. Rủi ro còn lại

- Nếu Supabase Pooler gộp connections dưới cùng một non-superuser role, Core API có thể bị chặn bởi RLS. Cần xác minh role trước khi deploy.
- `flyway_schema_history` có RLS deny_all — Flyway vẫn hoạt động vì chạy dưới superuser. Nếu chuyển sang non-superuser DB role trong tương lai, cần thêm policy cho Flyway.
- Supabase có thể tự tạo thêm roles hoặc bảng nội bộ qua các bản cập nhật — cần kiểm tra định kỳ.

## 10. Checklist

- [ ] Chạy khảo sát roles & quyền hiện tại (Bước 1)
- [ ] Xác minh Core API DB role có `BYPASSRLS` hoặc `SUPERUSER`
- [ ] Apply migration `V5__drop_resource_jobs.sql`
- [ ] Apply migration `V6__enable_rls_defense_in_depth.sql`
- [ ] Chạy integration tests Core API → tất cả pass
- [ ] Kiểm thử PostgREST API Supabase với `anon` key → trả `403` hoặc `[]`
- [ ] Smoke test frontend → Core API → DB flow
- [ ] Chạy Supabase linter → không còn cảnh báo RLS
- [ ] Cập nhật `docs/specifications/data-model.md` — loại bỏ `resource_jobs`

## 11. Timeline ước tính

| Bước | Thời gian |
|---|---|
| Khảo sát roles & quyền | 0.5 ngày |
| Apply migrations (staging) | 0.5 ngày |
| Integration & PostgREST testing | 1 ngày |
| Rollout production | 0.5 ngày |
| **Tổng** | **2.5 ngày** |

## 12. Flyway Migrations

| Migration | Mục đích |
|---|---|
| `V5__drop_resource_jobs.sql` | Xóa bảng deprecated `resource_jobs` (ADR-007) |
| `V6__enable_rls_defense_in_depth.sql` | Enable RLS + deny_all + revoke PostgREST roles |

## 13. Tài liệu tham khảo

- Supabase linter: https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public
- Supabase RLS guide: https://supabase.com/docs/guides/auth#row-level-security
- ADR-002 (3 runtime services): `docs/specifications/architecture-decision.md`
- ADR-003 (Network boundary): `docs/specifications/architecture-decision.md`
- ADR-004 (Authorization owner): `docs/specifications/architecture-decision.md`
- ADR-005 (Authentication): `docs/specifications/architecture-decision.md`
- ADR-007 (RabbitMQ thay resource_jobs): `docs/specifications/architecture-decision.md`
