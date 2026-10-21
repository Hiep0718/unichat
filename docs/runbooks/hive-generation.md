# Hive generation: setup, cutover và rollback

## Điều kiện và cấu hình

Hive chỉ được AI Service gọi; web/mobile vẫn gọi Core. Tạo Secret Key mới, chỉ đặt ở môi trường server, không dùng Access Key ID làm Bearer hoặc lưu secret trong artifact/bundle/log. Không dùng lại khóa đã chia sẻ. Hive cần credit; readiness local không xác nhận khóa hoặc số dư từ xa.

| Biến | Cấu hình chuyển đổi |
|---|---|
| LLM_PROVIDER | hive; khi unset giữ legacy Gemini |
| HIVE_BASE_URL | https://api-cdn.thehive.ai/api/v3 |
| HIVE_MODEL | deepseek-ai/deepseek-v4.1-flash-1017 |
| HIVE_API_KEY | Secret Key mới, bắt buộc cho Hive |
| HIVE_API_KEY_2 / HIVE_API_KEYS | Khóa phụ/list tùy chọn, không tự xoay khi lỗi |
| HIVE_MAX_TOKENS | 4096 |
| HIVE_TEMPERATURE / HIVE_TOP_P | 0.2 / 0.9 |
| HIVE_REASONING_EFFORT | low; probe none/max128 |
| HIVE_READ_IDLE_TIMEOUT_SECONDS | 5; không phải SLA hủy toàn worker |
| ENABLE_OLLAMA_FALLBACK | false trong đợt chuyển đổi |

Settings đọc root .env rồi ai-service/.env; file sau có thể ghi đè file trước, process environment ưu tiên cao nhất. Mặc định dùng endpoint CDN chính thức; endpoint vùng `api-va1.thehive.ai` vẫn được phép khi vận hành chọn rõ ràng. Kiểm tra cấu hình hiệu lực qua registry metadata đã che key. Cấu hình provider/key/model phải khớp; không tự đổi endpoint khi lỗi. Không cần re-ingest hoặc re-embed tài liệu.

## Chuẩn bị và gate

1. Code hỗ trợ cả hai provider và gate phải có trên mọi Core instance trước khi đóng admission. Snapshot thay đổi được duyệt và giữ cấu hình provider cũ cho rollback.
2. Kiểm tra Flyway/schema trên DB mục tiêu trước khi apply. V40 được chuẩn bị dựa trên snapshot shared39 ngày12/10/2026; cần xác minh lại collision/current version và phê duyệt trước apply. Không chạy Core startup vào shared DB khi migration mới chưa được duyệt vì Flyway tự chạy.
3. Apply migration bằng quy trình được duyệt, xác minh singleton. Không sửa migration history, tắt validation, thêm client RLS policy hoặc xóa pending để ép gate hoạt động. Core DB role cần quyền bảng phù hợp; client Supabase không được truy cập gate.
4. Xác nhận compile/lint/typecheck/unit/integration/E2E và smoke môi trường kiểm thử được phép. Không install runtime/package/browser hoặc gọi provider thật khi chưa được phép.

ADMIN đọc GET /api/v1/admin/ai-studio/admission và cập nhật PUT cùng route bằng state/expectedVersion. Audit chỉ chứa metadata. Version conflict409: đọc lại và người vận hành xem state/count mới trước quyết định; không auto-retry PUT hoặc tự mở gate.

| State | Cho phép |
|---|---|
| OPEN | New chat/ADMIN diagnostics bình thường |
| DRAINING | Operation cũ, replay/poll/cancel/checkpoint/END; chặn mới chat và diagnostics |
| VERIFYING | Chặn chat mới, cho ADMIN probe/prompt nghiệm thu |

## Cutover có kiểm soát

1. Trong cửa sổ vận hành đã duyệt, chuyển OPEN→DRAINING. New requests trả503 AI_MAINTENANCE/Retry-After30, không lưu user message hoặc dùng quota mới. Public disconnect chỉ detach và không phải drain/cancel operation.
2. Chờ tối đa120 giây, đọc lại runningOperationCount/pendingAttemptCount. Cả hai phải0. Nếu còn pending/RUNNING/không xác định hoặc không đọc được gate: dừng cutover, báo trạng thái; không kill request, xóa row hoặc cho rằng row cũ đã xong. DRAINING→OPEN chỉ là thao tác hủy cửa sổ chuyển đổi được duyệt, không phải rollback đã được xác minh.
   Retention cũng không xóa attempt chưa có END. Pending quá hạn cần được điều tra riêng, không phải lý do để vượt điều kiện drain.
3. Khi drain đạt, sửa đúng provider env và restart đúng AI process theo phê duyệt. Core còn hoạt động để cung cấp control/status. Không giả định compose có container AI/Core; compose hiện chỉ có PostgreSQL/Chroma.
4. Kiểm readiness local, registry activeProvider/activeModel rồi chuyển DRAINING→VERIFYING. ADMIN chạy probe128 token và prompt synthetic JSON ngắn trong phạm vi credit và cap cấu hình đã duyệt. Quick-prompt dùng cap generation cấu hình, không giả định có body override512 token. Không sử dụng tài liệu riêng tư hoặc tự thử biến thể tham số khi provider từ chối.
5. Xác nhận kết quả, metadata/usage/error an toàn; người vận hành chuyển VERIFYING→OPEN. Chạy RAG fixture được phép tối đa4096 token, kiểm citation/model và hội thoại/history/compaction. Không lấy điểm nghiên cứu giả lập từ legacy evaluation làm evidence.
6. Theo dõi requestId/attempt/purpose, tỷ lệ lỗi/timeout/truncation, token đo được. Không log prompt/chunk/reasoning/key; usage null không phải0. Đối soát chi phí/số dư trong Hive Portal.

## Khi lỗi và rollback

- Hive không tự fallback hoặc retry transport; HTTP/auth/network/protocol failure là operation FAILED, không phải answer hoàn tất. Citation/evidence/safety refusal là domain result riêng.
- Nếu cần rollback, chuyển DRAINING và drain lại trước restart. Đặt LLM_PROVIDER=gemini cùng GEMINI_MODEL/key còn hoạt động; giữ fallback=false trong đợt này. Không cần sửa vector/history hoặc xóa metadata Hive.
- Kiểm chứng Gemini thật trong VERIFYING sau khi có phép gọi. Google AI Studio free đã không dùng được nên giữ adapter/khóa không có nghĩa rollback phục hồi dịch vụ. Nếu chưa xác thực được provider, giữ gate đóng và báo nguyên nhân; không báo success hoặc tự mở admission.
- Hoàn tác source chỉ dùng task baseline/diff đã review; bảo toàn tất cả thay đổi có trước. Commit/push/deployment, shared DB apply/state mutation, env/restart và paid smoke cần đúng approval riêng; việc viết code không tự cấp phép các bước này.
