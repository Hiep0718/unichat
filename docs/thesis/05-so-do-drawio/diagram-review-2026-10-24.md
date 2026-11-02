# Rà soát sơ đồ UniChat — 24/10/2026

## Kết luận

Các sơ đồ hiện có đúng về các luồng P0 chính và đã được validator kiểm tra. Hai trang use case hiện chỉ mô tả actor, ranh giới ứng dụng và chức năng nghiệp vụ; các chi tiết kỹ thuật được giữ ở architecture, activity, workflow và retrieval pipeline.

## Ma trận kiểm tra

| Sơ đồ | Đánh giá nội dung | Kết quả validator | Việc còn lại |
|---|---|---:|---|
| `unichat-activity-flows.drawio` | Đủ request, ingestion, chat/citation, security retry, admin và baseline/adaptive | 0 lỗi / 0 cảnh báo | Có thể dùng trong báo cáo |
| `unichat-adaptive-retrieval-pipeline.drawio` | Đúng P0: authorization input, intent, strategy, ChromaDB, Evidence Gate, Hive, citation và trace; đã route lại shortcut/cross-phase | 0 lỗi / 0 cảnh báo | Dùng được cho báo cáo |
| `unichat-architecture-usecase.drawio` | Có kiến trúc, use case nghiệp vụ và component adaptive; provider đã sửa thành Hive/manual rollback | 0 lỗi / 0 cảnh báo | Dùng trang use case nghiệp vụ, không dùng nó để mô tả pipeline |
| `unichat-chat-retrieval-workflow.drawio` | Đúng luồng Core API → AI Service → retrieval → answer → persistence/SSE; đã phân bố cổng nối Evidence Gate → LLM | 0 lỗi / 0 cảnh báo | Dùng được cho báo cáo |
| `unichat-document-ingestion-workflow.drawio` | Đúng upload/approval → RabbitMQ → AI Service → vector index → trạng thái; đã bỏ waypoint xuyên phase | 0 lỗi / 0 cảnh báo | Dùng được cho báo cáo |
| `unichat-erd.drawio` | Sinh từ migrations: 41 bảng, 54 foreign keys, có community/work chat/security/evaluation | 0 lỗi / 0 cảnh báo | PNG cũ chưa được xuất lại trong sandbox |
| `unichat-usecase-product.drawio` | Thể hiện Người dùng (USER), Chủ sở hữu/Biên tập viên Workspace, Quản trị viên hệ thống (ADMIN) và đầy đủ chức năng cộng đồng, Work Chat, tài liệu, hỏi đáp | 0 lỗi / 0 cảnh báo | Sơ đồ đề xuất dùng cho Chương 4 |

## Quy tắc đọc

- Core API là authority duy nhất cho authorization; AI Service chỉ nhận các `documentId` đã được phép.
- Hive/DeepSeek V4.1 Flash là provider đang cấu hình; Gemini là manual rollback, không phải automatic fallback.
- Community, work chat, Studio Notes, SSE streaming và mobile là product extensions đã có; đóng góp nghiên cứu vẫn là Adaptive Knowledge Retrieval & Reasoning.
- Thuật ngữ sản phẩm thống nhất là Người dùng (USER), OWNER/EDITOR/VIEWER trong Workspace và Quản trị viên hệ thống (ADMIN); Sinh viên/Giảng viên chỉ là persona giáo dục.
- Bảng tin cộng đồng, đăng bài, bình luận/trả lời, cảm xúc/lưu bài, thông báo, tìm kiếm hợp nhất và Work Chat được xem là chức năng sản phẩm ngang hàng với hỏi đáp AI.
- Use case không chứa RabbitMQ, vector index, Intent, Evidence Gate, SSE/provider hoặc quan hệ `include/extend`; các chi tiết này chỉ nằm trong sơ đồ kỹ thuật.
- OCR scan, LMS, voice và mindmap/diagram generation chưa được biểu diễn như tính năng đã hoàn thành.

## Hạn chế kiểm định

Draw.io CLI trong môi trường hiện tại không sinh được PNG mới. Vì vậy, nguồn `.drawio` đã được validator kiểm tra nhưng `unichat-erd.png` không được thay bằng bản chưa kiểm chứng. Bảy DOCX đã được kiểm tra cấu trúc OOXML và đọc lại bằng `python-docx`; render PNG bị chặn vì runtime bundled không có `soffice.exe`.

## Bố cục sau vòng rà soát bổ sung

- `unichat-usecase-product.drawio`: giữ nền sáng và phân bố lại cổng nối actor/hub nhiều association.
- `unichat-architecture-usecase.drawio`: tắt lưới khi mở/in và phân bố các tuyến actor → frontend, USER/ADMIN → use case.
- `unichat-erd.drawio`: tắt lưới, giữ khoảng cách dạng ma trận theo domain để tránh dồn bảng và đường quan hệ.
- `unichat-activity-flows.drawio`: tắt lưới trên cả sáu trang, giữ luồng dọc và corridor trống giữa các bước.
- Hai trang use case: loại bỏ node kỹ thuật và quan hệ luồng, giữ actor → chức năng nghiệp vụ ở mức product/business.

Sau vòng này, cả bảy file đều đạt `0 error(s), 0 warning(s)` và `0 crossings / 0 overlaps` theo validator hình học.
