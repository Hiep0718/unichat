# Plan V2 — Tiến độ và sự cố đăng nhập local (11/10/2026)

## Trạng thái thực tế

**Core API đã vượt qua lỗi biên dịch khiến `dev.ps1` dừng trước khi mở cổng 8082; Flyway V34/V35 đã áp dụng thành công theo phê duyệt của người dùng. Chưa có bằng chứng đăng nhập end-to-end thành công trên máy người dùng.** Lệnh `mvn -o -B test-compile` trong `core-api` → `BUILD SUCCESS` lúc 16:50 (UTC+7). Core sau đó kết nối shared PostgreSQL và JPA validate thành công, nhưng môi trường chạy công cụ không mở được Java loopback selector để khởi động Tomcat.

Log người dùng cung cấp chỉ ra `AuthPostgresIT.java:53` gọi `assertFalse` với giá trị generic `Boolean`; Java chọn overload không xác định giữa `boolean` và `BooleanSupplier`. Vì Maven `spring-boot:run` biên dịch cả test source, Core dừng trước lúc kiểm tra mật khẩu hoặc chạy Flyway. Đã ép kết quả thành `boolean` rõ ràng. Bộ 38 test auth/security/Flyway liên quan và toàn bộ 279 Core unit tests sau đó PASS. Testcontainers chỉ phục vụ integration test và **không phải điều kiện để khởi động local qua PowerShell**.

`dev-service.ps1` hiện truyền cấu hình DB bằng environment kế thừa từ `.env`, thay vì đưa URL, username và password vào JVM arguments. Cách này tránh lộ bí mật trong command line và lỗi tách đối số khi JDBC URL có ký tự `&`. Thay đổi có thể đảo lại bằng cách khôi phục đúng một dòng runner; không tác động schema. Đường Flyway startup cũng đã bỏ lệnh tự ghi đè checksum V23 trong `flyway_schema_history`; chỉ migration versioned mới được phép thay đổi schema sau gate.

Kiểm tra DB **chỉ đọc** ban đầu cho thấy shared Supabase ở V33, có các cột account/session/OTP của Plan V2. Sau khi người dùng cho phép, Core Flyway áp dụng đúng V34 và V35 lúc 16:57 (UTC+7). Truy vấn chỉ đọc sau đó xác nhận hai migration thành công, `chat_operations.first_token_at`, `password_reset_otps.purpose` và hai marker `security_telemetry_coverage` đều hiện diện. Có 1 ADMIN ACTIVE, 3 USER ACTIVE và 1 USER LOCKED trong kiểm tra trước đó, nhưng chưa biết tài khoản người báo lỗi nên không thể kết luận tài khoản đó bị khóa.

Core lần đầu sau migration dừng khi khởi tạo `java.net.http.HttpClient`; đã chuyển HTTP client của chat AI và Supabase Storage sang khởi tạo khi dùng, có test bảo vệ. Core lần thứ hai đi qua Flyway/JPA nhưng Tomcat không mở được Java NIO selector với lỗi `Unable to establish loopback connection`. Cùng lỗi tái hiện bằng `Selector.open()` và `HttpClient.newHttpClient()` độc lập trên JDK 17/21 ở môi trường chạy công cụ; đây chưa phải bằng chứng PowerShell trực tiếp của người dùng cũng lỗi.

Sau đó người dùng cung cấp request từ trang login: `POST /api/v1/auth/logout`, Origin `http://127.0.0.1:5173`, HTTP 403. Nguyên nhân: client có dấu chờ đăng xuất nên dọn cookie trước login; `dev.ps1` mở web bằng `127.0.0.1`, trong khi allowlist Core mặc định chỉ chứa `localhost`. Đã cho phép đúng Origin 127 local khi không có allowlist riêng, giữ production/allowlist cấu hình nguyên tắc cũ. Đồng thời refresh 400/401 và login bị từ chối không còn tự tạo dấu chờ logout, nên lần đăng nhập tiếp theo đi thẳng tới `/auth/login`. Core security-chain test xác nhận logout→login từ Origin 127 PASS và Origin lạ vẫn 403; toàn bộ 282 Core unit tests, 3 web cookie-session tests, web typecheck và scoped lint PASS. Cần restart Core rồi thử login trên trình duyệt để nghiệm thu HTTP thực tế.

## Tasklist 37 mã của Plan V2

Quy ước: **Code** = phần triển khai đã có và có kiểm tra hẹp; **Một phần** = còn contract/test/gate; **Chưa nghiệm thu** = chưa đủ bằng chứng để đánh dấu VERIFIED. Không mã nào dưới đây được tự động coi là release-ready.

| Mã | Tiến độ | Việc đã làm / việc còn để đóng task |
|---|---|---|
| SET-01 | Code | Đã chụp branch/dirty baseline và giữ thay đổi người khác; còn đối chiếu exact write set cuối đợt. |
| SET-02 | Một phần | Đã kiểm runtime local và Maven; Docker/Testcontainers không có daemon, iPhone/Expo thực tế chưa kiểm. |
| CHAT-01 | Một phần | Core/AI/web/mobile có DTO và SSE contract; còn fixture liên dịch vụ/API examples/ADR đồng bộ. |
| AZ-01 | Code | Method security, admin guard và bỏ ngoại lệ email/tên; cần HTTP integration đầy đủ. |
| AUT-01 | Một phần | Validation/typed errors đã bổ sung; cần phủ mọi input và RFC7807 endpoint. |
| AZ-02 | Một phần | Source ACL, owner, cloud policy và recheck đã code; live retrieval metadata và revoke giữa inference chưa nghiệm thu. |
| AZ-03 | Một phần | Note ownership/provenance và source redaction đã code; cần DB/HTTP IDOR test. |
| AZ-04 | Một phần | Service JWT, nonce, checkpoint và private endpoints đã code; cần DB multiworker/replay integration. |
| AZ-05 | Một phần | Durable rate/concurrency leases đã code; cần thử tải/race qua HTTP và DB thật. |
| AUT-02 | Code | Failed-login commit, manual/temporary lock đã code; PostgreSQL race test viết nhưng chưa chạy. |
| AUT-03 | Code | Refresh rotation, reuse revoke, family checks đã code; PostgreSQL race test viết nhưng chưa chạy. |
| AUT-04 | Một phần | HMAC OTP, cooldown, atomic reset và revoke đã code; SMTP/error/race integration còn thiếu. |
| AUT-05 | Code | securityVersion, status/family validation và revocation đã code; cần HTTP/DB integration. |
| AUT-06 | Một phần | Cookie/native split, Origin/CORS/CSRF đã code; cần kiểm profile production và browser E2E. |
| AUT-07 | Một phần | Web bootstrap/generation/cookie coordinator đã code; cần hai-tab Playwright và login thật. |
| AUT-08 | Một phần | Native SecureStore refresh-only/generation/logout tombstone đã code; iPhone thực tế chưa nghiệm thu. |
| CHAT-02 | Một phần | Short transaction/sequence/conditional commit đã code; crash, cancel và delete race DB thật chưa chạy. |
| CHAT-03 | Một phần | Operation binding, idempotency, status/replay/lease đã code; cần HTTP/DB recovery test. |
| CHAT-04 | Code | Strict/expanded mode và evidence gate đã code; live corpus và full client E2E chưa kiểm. |
| CHAT-05 | Một phần | Citation schema/validator/hash/version/locator đã code; live ingestion metadata chưa tương thích đầy đủ nên fail-closed. |
| CHAT-06 | Một phần | Provider policy/fallback/checkpoint/telemetry đã code; cần Core-AI contract và DB integration. |
| CHAT-07 | Một phần | SSE provisional/reset/final/done, cancellation và progress đã code; slow client/disconnect E2E chưa chạy. |
| CHAT-08 | Một phần | Source-safe history/summary và compaction adapter đã code; cần revoke/version race thật. |
| CHAT-09 | Một phần | Web chat state, mode, citations/history và an toàn render đã code; Playwright chưa PASS. |
| MOB-01 | Một phần | Native SSE/retry/status recovery đã code và Jest PASS; background/foreground trên iPhone chưa chạy. |
| MOB-02 | Một phần | Conversation/message pagination và states đã code; lịch sử nhiều trang với API thật chưa nghiệm thu. |
| MOB-03 | Một phần | Citation sheet/labels và redaction đã code; source revoke trên iPhone chưa kiểm. |
| ADM-01 | Một phần | User list/role/status/version/self-guard đã code; concurrent last-admin DB test chưa chạy. |
| ADM-02 | Một phần | Core auth/chat metrics và NO_DATA contract đã code; số liệu live cần đối soát. |
| ADM-03 | Một phần | Provider attempts/coverage/window đã code; V35 chưa có trên shared DB. |
| ADM-04 | Một phần | Audit storage/emitters và filters đã code; transaction fault tests còn thiếu. |
| ADM-05 | Một phần | Key ID/resolver/prompt và bỏ demo success đã code; provider thực/key B chưa kiểm live. |
| ADM-06 | Một phần | Web dashboard states/navigation đã code; browser E2E còn thiếu. |
| QA-01 | Chưa nghiệm thu | Core 282 unit tests PASS; PostgreSQL/Testcontainers và endpoint matrix chưa chạy đầy đủ. |
| QA-02 | Một phần | AI 131 scoped pytest PASS, mypy strict 86 files PASS, Ruff scoped PASS; full contract/fault gate còn thiếu. |
| QA-03 | Chưa nghiệm thu | Mobile Jest 22 suites/73 tests PASS; web full Vitest còn 1 App test lỗi; Playwright/iPhone chưa chạy. |
| QA-04 | Chưa nghiệm thu | CI có DB test gate; chưa có traceability/evidence và release runbook cuối. |

## Ưu tiên khôi phục đăng nhập

1. **P0 — đã xử lý lỗi chặn biên dịch:** giữ `AuthPostgresIT` compile-safe, xác nhận `test-compile` và Core unit tests PASS.
2. **P0 — shared DB đã cập nhật:** V34 thêm `chat_operations.first_token_at` và index terminal; V35 thêm `password_reset_otps.purpose`, bảng `security_telemetry_coverage` và hai marker khởi đầu. Flyway history ghi thành công đúng hai version, không sửa checksum migration cũ. Rollback ứng dụng: giữ schema additive, không drop dữ liệu hoặc quay ngược session đã revoke.
3. **P0 — restart và kiểm login thật trên PowerShell người dùng:** nạp lại Core và web sau sửa local Origin, xác nhận `/auth/logout` 204 (nếu còn dấu chờ), `/auth/login` 200 và `/users/me` 200. Nếu vẫn 401/403, lấy request ID, response body và log Core để phân biệt sai mật khẩu, LOCKED, CSRF, keypair/session hay lỗi khác.
4. **P0 — kiểm cấu hình JWT:** local hiện có public key nhưng thiếu private key; fallback tạo keypair tạm chỉ dành cho `APP_ENV=local`. Token access cũ sẽ không còn hợp lệ sau restart, refresh phải cấp token mới. Production yêu cầu cả cặp khóa hợp lệ.
5. **P1 — đóng Plan V2:** chạy PostgreSQL integration/race, web Playwright, Core-AI contract, live source ACL và Expo iPhone. Chỉ đánh dấu VERIFIED khi có bằng chứng mới cho từng gate.

## Điều chưa thể kết luận

- Migration và Core unit tests PASS không có nghĩa Core đã phục vụ port 8082 hay bạn của người dùng đăng nhập thành công.
- Không có Docker local không chặn `dev.ps1`; chỉ chặn chạy bộ integration Testcontainers.
- Số liệu tài khoản DB không xác định tài khoản của người báo lỗi. Không tự mở khóa/reset mật khẩu người dùng.
- V34/V35 đã được áp dụng theo phê duyệt cụ thể; mọi mutation shared DB tiếp theo vẫn cần gate riêng của dự án.
