# Báo cáo tiến độ và tổng quan dự án UniChat

## Thông tin chung

| Thuộc tính | Nội dung |
|---|---|
| Thời điểm báo cáo | 15/07/2026 |
| Dự án | UniChat — Nền tảng tri thức AI cho giáo dục đại học |
| Nhóm thực hiện | Nguyễn Thanh Hiệp, Hoàng Phi Hùng |
| Phạm vi P0 | Adaptive Knowledge Retrieval & Reasoning |
| Trạng thái tổng quát | Đã hoàn thành thiết kế, nền tảng kỹ thuật và hạng mục triển khai đầu tiên; chưa hoàn thiện luồng sản phẩm P0 đầu-cuối |

## 1. Tóm tắt điều hành

UniChat được định hướng là một nền tảng tri thức AI phục vụ môi trường giáo dục đại học. Thay vì chỉ trả lời câu hỏi từ tài liệu, phạm vi P0 tập trung vào **Adaptive Knowledge Retrieval & Reasoning**: hệ thống chọn chiến lược truy xuất phù hợp với loại câu hỏi, kiểm tra mức độ đầy đủ của bằng chứng và trả lời kèm trích dẫn có thể kiểm chứng.

Đến thời điểm báo cáo, nhóm đã hoàn thành phần lớn công việc chuẩn bị: yêu cầu, kiến trúc, mô hình dữ liệu, hợp đồng API, kế hoạch kiểm thử, thiết lập ba dịch vụ và kiểm tra chất lượng nền tảng. Hạng mục mã nguồn đầu tiên của Core API đã được triển khai và đánh giá đạt yêu cầu. Các luồng nghiệp vụ chính như đăng nhập, Workspace, tải tài liệu, lập chỉ mục, hỏi–đáp có trích dẫn và giao diện người dùng vẫn đang ở giai đoạn tiếp theo.

**Kết luận ngắn:** dự án đã vượt qua giai đoạn thiết kế và sẵn sàng tiếp tục phát triển các chức năng P0 không phụ thuộc ChromaDB. Việc triển khai chức năng truy xuất vector và mọi triển khai môi trường thật đang bị chặn có kiểm soát bởi một rủi ro bảo mật ChromaDB đã được ghi nhận.

## 2. Mục tiêu và phạm vi P0

### Mục tiêu

- Tổ chức tài liệu học tập PDF, DOCX và TXT theo Workspace có phân quyền.
- Truy xuất tri thức theo ngữ cảnh câu hỏi, thay vì dùng một cấu hình tìm kiếm cố định cho mọi truy vấn.
- Chỉ tạo câu trả lời khi bằng chứng đủ mạnh; yêu cầu làm rõ hoặc từ chối khi dữ liệu không đủ.
- Gắn trích dẫn đến vị trí nguồn để người học và giảng viên kiểm tra được thông tin.
- Đánh giá định lượng chất lượng của chiến lược adaptive so với baseline Top-K cố định.

### Ngoài phạm vi P0

Knowledge Graph, OCR, đa tác tử, bộ nhớ dài hạn, giọng nói, LMS integration và các chức năng cộng đồng được giữ cho giai đoạn mở rộng, không làm tăng rủi ro cho mốc hiện tại.

## 3. Khác biệt giữa AI chatbot và AI Knowledge Platform của UniChat

UniChat không chỉ đổi tên từ chatbot sang nền tảng tri thức. AI chatbot đặt hội thoại và câu trả lời là trung tâm; AI Knowledge Platform xem tài liệu, metadata, bằng chứng và khả năng truy vết là tài sản cốt lõi. Chat vẫn được giữ lại, nhưng chỉ là một giao diện để người dùng truy cập và khai thác Knowledge Space.

| Khía cạnh | AI chatbot/RAG thông thường | AI Knowledge Platform mà UniChat hướng tới | Ý nghĩa trong P0 |
|---|---|---|---|
| Định vị | Trợ lý hỏi–đáp tài liệu | Nền tảng tổ chức và khai thác tri thức bằng AI | Đặt trọng tâm vào tri thức, không chỉ màn hình chat |
| Vấn đề giải quyết | Tìm câu trả lời từ tài liệu đã tải lên | Tri thức phân tán, khó tổ chức, truy xuất và kiểm chứng | Workspace được xem là Knowledge Space |
| Đơn vị cốt lõi | Conversation, câu hỏi và tệp tải lên | Knowledge Space, tài liệu, metadata, citation và retrieval trace | Dữ liệu phục vụ tái sử dụng và đánh giá tri thức |
| Vai trò của chat | Trải nghiệm chính của sản phẩm | Một giao diện truy cập kho tri thức | Có thể mở rộng sang map, graph và quality sau MVP |
| Cách truy xuất | Thường dùng semantic search với Top-K cố định | Chọn chiến lược theo intent, metadata, phạm vi và chất lượng bằng chứng | Triển khai Intent Detection và Retrieval Strategy Selector |
| Kiểm soát câu trả lời | Đưa các chunk liên quan cho LLM | Gom và kiểm tra bằng chứng trước khi sinh câu trả lời | Evidence Gate trả lời, yêu cầu làm rõ hoặc từ chối |
| Citation | Tính năng bổ trợ chống hallucination | Hợp đồng truy vết tri thức bắt buộc | Mọi factual claim cần citation hợp lệ |
| Đánh giá | Độ liên quan và mức độ đúng của câu trả lời | Thêm intent accuracy, strategy correctness, citation và refusal correctness | So sánh adaptive retrieval với baseline Top-K |
| Điểm mới khóa luận | Ứng dụng RAG để hỏi–đáp tài liệu | Adaptive Knowledge Retrieval & Reasoning | Tạo đóng góp kỹ thuật có thể đo lường |

Phạm vi P0 chỉ hiện thực hóa module **Adaptive Knowledge Retrieval & Reasoning**, không tuyên bố xây xong toàn bộ AI Knowledge Platform. Knowledge Map, Knowledge Graph, Knowledge Quality và Knowledge Evolution là định hướng mở rộng sau MVP. Phân tích đầy đủ có tại [bao-cao-so-sanh-rag-chatbot-va-ai-knowledge-platform-unichat.md](../thesis/03-thiet-ke-he-thong/bao-cao-so-sanh-rag-chatbot-va-ai-knowledge-platform-unichat.md).

## 4. Tổng quan giải pháp

| Tầng | Công nghệ/Trách nhiệm chính |
|---|---|
| Frontend | React SPA; hiển thị Workspace, tài liệu, chat và trạng thái lỗi |
| Core API | Spring Boot; xác thực, phân quyền, nghiệp vụ, PostgreSQL, điều phối yêu cầu AI |
| AI Service | FastAPI; trích xuất tài liệu, embedding, adaptive retrieval, kiểm soát bằng chứng, sinh câu trả lời và trích dẫn |
| Hạ tầng dữ liệu | PostgreSQL cho dữ liệu nghiệp vụ; ChromaDB cho vector; file storage cho tài liệu gốc |
| Mô hình sinh | Gemini là lựa chọn chính; Ollama là phương án dự phòng có kiểm soát |

Nguyên tắc kiến trúc quan trọng là **Core API sở hữu phân quyền**. AI Service chỉ nhận danh sách ID tài liệu mà người dùng đã được phép truy cập, do đó không trở thành một lớp phân quyền thứ hai. Chỉ Frontend và Core API được mở ra bên ngoài; AI Service, PostgreSQL, ChromaDB và Ollama nằm trong mạng riêng.

Sơ đồ kiến trúc chi tiết được lưu tại [unichat-container-architecture.drawio](../specifications/diagrams/unichat-container-architecture.drawio). Các quyết định kỹ thuật và lý do lựa chọn được ghi trong [architecture-decision.md](../specifications/architecture-decision.md).

## 5. Hạng mục đã hoàn thành

| Nhóm công việc | Kết quả đã đạt | Trạng thái |
|---|---|---|
| Phân tích yêu cầu và phạm vi | Chốt sản phẩm là AI Knowledge Platform, giới hạn P0 là Adaptive Retrieval & Reasoning | Hoàn thành |
| Thiết kế kiến trúc | Hoàn thành ADR, file plan, mô hình dữ liệu, phân quyền, threat model, UI spec và sơ đồ hệ thống | Hoàn thành |
| Hợp đồng và đánh giá | Hoàn thành API contract, tiêu chuẩn trích dẫn, test plan và giao thức đánh giá 120 ca (60 phát triển / 60 holdout) | Hoàn thành |
| Nền tảng monorepo | Thiết lập React, Spring Boot, FastAPI, Docker Compose, runtime và dependency lock | Hoàn thành |
| Chất lượng nền tảng | Đã chạy lint, typecheck, unit test, build, E2E baseline, Maven verify, Ruff, Mypy và Compose validation | Đạt |
| Core API IMP-001 | Health endpoint, request ID an toàn, typed errors, RFC 7807, JSON logging và MVC tests | Hoàn thành, review APPROVED |
| Frontend và AI Service khởi tạo | Có khung ứng dụng và health endpoint để kiểm tra khả dụng dịch vụ | Hoàn thành nền tảng |

### Kết quả kiểm thử đã xác minh

Theo checkpoint readiness ngày 15/07/2026:

- Frontend: lint, typecheck, unit test, build và Playwright baseline đều đạt.
- Core API: Maven `verify` đạt; 10/10 kiểm thử JUnit thành công.
- Core API IMP-001: độ bao phủ dòng 93,20% và nhánh 83,33% cho module error/web mới.
- AI Service: Ruff, Mypy strict và pytest coverage đạt 92,96%.
- Docker Compose validation, kiểm tra UTF-8 không BOM, giới hạn kích thước tệp và dependency audit policy đều đạt.

Bằng chứng chi tiết được lưu tại [implementation-summary.md](../../.pipeline/implementation-summary.md) và [review-report.md](../../.pipeline/review-report.md).

## 6. Hạng mục đang thực hiện và kế hoạch tiếp theo

| Thứ tự | Hạng mục | Mục tiêu đầu ra |
|---:|---|---|
| 1 | IMP-002: Core API database migration và authentication primitives | Cơ sở dữ liệu, xác thực JWT và các primitive bảo mật |
| 2 | Workspace và phân quyền | Người dùng, vai trò, quyền truy cập tài liệu theo Workspace |
| 3 | Tài liệu và ingestion job | Tải tài liệu, lưu trữ, resource job và trích xuất nội dung |
| 4 | Xử lý SEC-DEBT-001 | Loại bỏ hoặc khắc phục dependency ChromaDB có mức rủi ro Critical |
| 5 | Adaptive retrieval và hỏi–đáp có trích dẫn | Intent detection, chiến lược truy xuất, evidence gate, citation |
| 6 | Giao diện P0 và E2E | Hoàn thiện các luồng đăng nhập, tài liệu, chat, phân quyền và đánh giá |
| 7 | Hardening và đánh giá thực nghiệm | Quan sát hệ thống, delete saga, báo cáo benchmark adaptive–baseline |

Thứ tự trên bảo đảm các lớp xác thực, phân quyền và dữ liệu được hoàn thiện trước khi mở rộng sang truy xuất vector và sinh câu trả lời AI.

## 7. Rủi ro, giới hạn và cách kiểm soát

| Vấn đề | Mức độ/Tác động | Biện pháp hiện tại |
|---|---|---|
| `chromadb==1.5.9` có advisory Critical | Chặn tính năng dùng ChromaDB và mọi deployment | Đã ghi thành SEC-DEBT-001; không mở cổng Chroma; chỉ chạy trong private network |
| Tương thích Chroma client/server chưa xác nhận | Không thể khẳng định luồng vector hoạt động an toàn | Cần phê duyệt hướng xử lý, cập nhật lock file và viết integration test |
| Luồng P0 đầu-cuối chưa hoàn thành | Chưa thể demo đầy đủ trải nghiệm người dùng | Phát triển theo thứ tự Core API → quyền → tài liệu → retrieval → UI/E2E |
| Docker daemon chưa chạy trong checkpoint cũ | Chưa có bằng chứng chạy stack đầy đủ tại thời điểm đó | Compose configuration đã được kiểm tra; sẽ xác minh stack khi triển khai integration |

Chi tiết rủi ro, tiêu chí đóng và các bước khắc phục nằm tại [deferred-security-remediation.md](../security/deferred-security-remediation.md).

## 8. Tiêu chí đánh giá nghiên cứu

Phần thực nghiệm dự kiến so sánh baseline truy xuất Top-K cố định với chiến lược adaptive trên 120 ca kiểm thử, tách 60 ca phát triển và 60 ca holdout theo nhóm chủ đề để hạn chế leakage.

Các chỉ số chính gồm:

- Độ đúng trích dẫn tối thiểu 0,90.
- Mức độ claim được bằng chứng hỗ trợ tối thiểu 0,90.
- Tỷ lệ từ chối đúng câu hỏi ngoài phạm vi tối thiểu 0,90.
- Độ tăng p95 latency của adaptive không vượt quá 25% so với baseline.

Quy tắc adaptive, evidence gate và phương pháp đánh giá được mô tả trong [adaptive-retrieval-spec.md](../specifications/adaptive-retrieval-spec.md) và [evaluation-protocol.md](../specifications/evaluation-protocol.md).

## 9. Đề xuất nội dung trao đổi với giảng viên hướng dẫn

1. Xác nhận phạm vi P0 hiện tại là đủ cho mục tiêu khóa luận: adaptive retrieval, evidence gate, citation và đánh giá định lượng.
2. Góp ý về bộ 120 ca đánh giá, đặc biệt nhóm câu hỏi và tiêu chí kiểm tra trích dẫn.
3. Xác nhận thứ tự ưu tiên xử lý: hoàn thiện Core API và phân quyền trước, sau đó giải quyết rủi ro ChromaDB để mở phần retrieval.
4. Thống nhất các mốc minh chứng tiếp theo: demo quản lý tài liệu có phân quyền, demo hỏi–đáp có trích dẫn, và báo cáo benchmark adaptive–baseline.

## 10. Kết luận

UniChat đã có nền tảng thiết kế và kỹ thuật vững chắc, với các ràng buộc bảo mật, kiểm thử và tiêu chí nghiên cứu được xác định rõ. Tiến độ hiện tại phù hợp để chuyển sang phát triển các chức năng nghiệp vụ cốt lõi. Nhóm cần ưu tiên hoàn thiện authentication, Workspace và ingestion; đồng thời đóng SEC-DEBT-001 trước khi bắt đầu phần truy xuất vector hoặc triển khai môi trường thật.

> **Ghi chú về nguồn bằng chứng:** Báo cáo này sử dụng checkpoint triển khai đã xác minh gần nhất. Checkpoint kỹ thuật ghi nhận IMP-001 hoàn thành ngày 13/07/2026; đợt readiness hardening ngày 15/07/2026 xác nhận lại các quality gate. Báo cáo không khẳng định các luồng P0 chưa được triển khai là đã hoàn thành.
