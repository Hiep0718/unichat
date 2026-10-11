# RLS Remediation Plan
Date: 2026-07-22
Updated: 2026-09-23
Author: Hiep / AI-assisted

## 1. Mở đầu — Bối cảnh

Supabase linter báo cáo các bảng trong schema `public` bị cảnh báo `rls_disabled_in_public` (Table publicly accessible). Dù UniChat sử dụng Supabase **chỉ làm managed PostgreSQL host** (không dùng Supabase Auth hay PostgREST cho business logic), Supabase vẫn expose PostgREST API tại `https://<project-ref>.supabase.co/rest/v1/` cùng với các role tự tạo (`anon`, `authenticated`, `service_role`). Nếu API key bị lộ, bất kỳ ai cũng có thể đọc/ghi dữ liệu qua PostgREST nếu bảng không có RLS.

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
- Core API kết nối PostgreSQL bằng DB role `postgres.<project-id>` (có cờ `BYPASSRLS: true`) qua Supabase Pooler.
- Authorization logic hoàn toàn do Core API xử lý trước khi thực thi SQL.
- RLS đóng vai trò **defense-in-depth** (lớp bảo vệ cuối cùng), không phải authorization layer chính.

## 2. Vấn đề cần giải quyết

- Chặn hoàn toàn truy cập dữ liệu qua PostgREST API của Supabase nếu API key (`anon`, `service_role`) bị lộ.
- Áp dụng least-privilege: chỉ Core API DB role có quyền đọc/ghi.
- Giữ nguyên chức năng Core API (Spring Boot JPA) — superuser/BYPASSRLS tự động bypass RLS.

## 3. Mục tiêu

- Bật RLS trên toàn bộ 30 bảng `public`.
- Tạo policy `deny_all` chặn mọi non-superuser/non-BYPASSRLS access.
- Thu hồi (`REVOKE`) toàn bộ quyền của `anon`, `authenticated`, `service_role` trên schema `public` (tables, sequences, routines).
- Áp dụng `ALTER DEFAULT PRIVILEGES` để tự động bảo vệ các bảng mới trong tương lai.
- Đóng gói vào Flyway migration có version hóa (`V6` và `V23`).
- Xác minh Core API vẫn hoạt động bình thường sau khi bật RLS.

## 4. Phạm vi

Toàn bộ 30 bảng trong schema `public`:

### Phase 1 (Migration V6 - tháng 07/2026 - 17 bảng nghiệp vụ ban đầu):
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

### Phase 2 (Migration V23 - tháng 09/2026 - 13 bảng tính năng mới & metadata):
- public.workspace_categories (từ V7.1)
- public.document_reviews (từ V7.1)
- public.discussions (từ V8)
- public.discussion_replies (từ V8)
- public.reactions (từ V8)
- public.notifications (từ V8)
- public.studio_notes (từ V11)
- public.bookmarks
- public.direct_conversations
- public.direct_messages
- public.post_attachments
- public.post_reads
- public.flyway_schema_history

Ghi chú:
- `resource_jobs` đã bị xóa bởi migration `V5__drop_resource_jobs.sql` theo ADR-007 (RabbitMQ thay thế).
- `community_channels`, `community_messages`, `community_ai_responses` đã bị xóa bởi `V9__reddit_vote_score.sql`.

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

### Phase 1 (Migration V6 - Đã hoàn thành 07/2026):
- [x] Chạy khảo sát roles & quyền hiện tại (Bước 1)
- [x] Xác minh Core API DB role có `BYPASSRLS` hoặc `SUPERUSER`
- [x] Apply migration `V5__drop_resource_jobs.sql`
- [x] Apply migration `V6__enable_rls_defense_in_depth.sql`
- [x] Chạy integration tests Core API → tất cả pass
- [x] Kiểm thử PostgREST API Supabase với `anon` key → trả `403` hoặc `[]`
- [x] Smoke test frontend → Core API → DB flow
- [x] Cập nhật `docs/specifications/data-model.md` — loại bỏ `resource_jobs`

### Phase 2 (Migration V23 - Đã hoàn thành 09/2026):
- [x] Khảo sát và phát hiện 13 bảng mới chưa có RLS gây cảnh báo `rls_disabled_in_public`
- [x] Xác minh DB role `postgres` giữ nguyên cờ `BYPASSRLS: true`
- [x] Tạo và áp dụng `V23__enable_rls_defense_in_depth_v2.sql`
- [x] Áp dụng `ALTER DEFAULT PRIVILEGES` chặn rò rỉ quyền trên bảng/sequence/routine tương lai
- [x] Kiểm tra chẩn đoán DB: 30/30 bảng đã bật RLS, 0 quyền cho `anon/authenticated/service_role`
- [x] Chạy toàn bộ 66 unit & integration test Core API → tất cả pass (0 failures)
- [x] Kiểm tra truy vấn Core API trên các bảng mới → 100% OK

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
| `V6__enable_rls_defense_in_depth.sql` | Phase 1: Enable RLS + deny_all + revoke PostgREST roles (17 bảng) |
| `V23__enable_rls_defense_in_depth_v2.sql` | Phase 2: Enable RLS + deny_all cho 13 bảng còn lại + revoke + alter default privileges |

## 13. Tài liệu tham khảo

- Supabase linter: https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public
- Supabase RLS guide: https://supabase.com/docs/guides/auth#row-level-security
- ADR-002 (3 runtime services): `docs/specifications/architecture-decision.md`
- ADR-003 (Network boundary): `docs/specifications/architecture-decision.md`
- ADR-004 (Authorization owner): `docs/specifications/architecture-decision.md`
- ADR-005 (Authentication): `docs/specifications/architecture-decision.md`
- ADR-007 (RabbitMQ thay resource_jobs): `docs/specifications/architecture-decision.md`

