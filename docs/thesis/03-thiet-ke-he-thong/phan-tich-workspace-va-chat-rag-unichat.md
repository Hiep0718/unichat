# Phân tích so sánh tính năng Workspace và Chat RAG trong UniChat

Báo cáo này phân tích hai năng lực chính của UniChat: **Workspace** và **Chat truy xuất thông tin** (Adaptive Knowledge Retrieval & Reasoning), đồng thời đặt chúng trong lớp sản phẩm cộng đồng gồm Bảng tin, thảo luận và Work Chat. Trong toàn bộ báo cáo, thuật ngữ **Người dùng (USER)** chỉ người dùng đã xác thực; **Chủ sở hữu (OWNER)**, **Biên tập viên (EDITOR)** và **Thành viên (VIEWER)** là vai trò trong Workspace; **Quản trị viên hệ thống (ADMIN)** là vai trò quản trị toàn hệ thống. Sinh viên và giảng viên chỉ là persona bối cảnh giáo dục, không phải tên role kỹ thuật của MVP.

---

## 1. Định nghĩa và Vai trò của từng thành phần

### 1.1. Workspace
Workspace đóng vai trò là **ranh giới tổ chức, phân quyền và tương tác cộng đồng** trong hệ thống.
* **Mục tiêu**: Gom nhóm, tổ chức tài liệu học tập theo các môn học, chủ đề hoặc nhóm nghiên cứu cụ thể. Nó biến các tài liệu phân tán thành các kho lưu trữ tri thức biệt lập và có cấu trúc.
* **Cơ chế phân quyền**: Hỗ trợ 3 chế độ hiển thị:
  * *Private*: Chỉ chủ sở hữu có quyền xem và hỏi đáp.
  * *Shared*: Chia sẻ cho một danh sách người dùng cụ thể.
  * *Public*: Công khai cho toàn bộ người dùng trong hệ thống xem hoặc truy vấn.
* **Vai trò trong nền tảng (AI Knowledge Platform)**: Workspace không chỉ là thư mục chứa file mà là không gian có tài liệu, thành viên, bài viết, phản hồi, thông báo và lịch sử khai thác tri thức. Thuật ngữ Workspace được dùng thống nhất thay cho Knowledge Space trong giao diện và use case.

### 1.2. Chat truy xuất thông tin (Adaptive Knowledge Retrieval & Reasoning)
Chat là **giao diện tương tác động và cổng truy xuất lập luận** của kho tri thức.
* **Mục tiêu**: Cho phép người dùng sử dụng ngôn ngữ tự nhiên tiếng Việt để tìm kiếm, tổng hợp và lý giải các kiến thức nằm trong tài liệu của một Workspace cụ thể.
* **Cơ chế hoạt động (Adaptive RAG)**: Khác biệt với các hệ thống RAG thông thường (chỉ dùng một thuật toán tìm kiếm tương đồng cố định với Top-K chunk), chức năng Chat của UniChat áp dụng **Adaptive Retrieval v1**:
  * *Intent Detection v1*: Phân loại câu hỏi thành các nhóm ý định (Định nghĩa, Fact QA, So sánh, Tổng hợp/Reasoning, Ngoài phạm vi).
  * *Retrieval Strategy Selector*: Điều chỉnh số lượng chunk (Retrieval Budget), ngưỡng tương đồng (Similarity Threshold) và bộ lọc metadata theo loại câu hỏi.
  * *Evidence Gate*: Đánh giá ngữ cảnh thu hồi có đủ độ tin cậy để trả lời hay không. Nếu thiếu bằng chứng, hệ thống sẽ kích hoạt luồng từ chối (Anti-Hallucination) thay vì tự bịa câu trả lời.
  * *Citation Builder*: Đính kèm nguồn gốc chi tiết (Tên tài liệu, số trang/slide/sheet, đoạn trích thực tế) vào câu trả lời cuối cùng để phục vụ kiểm chứng học thuật.

### 1.3. Lớp cộng đồng và giao tiếp người với người
Chat AI không đại diện cho toàn bộ trải nghiệm UniChat. Lớp cộng đồng đã triển khai gồm:

* **Bảng tin cộng đồng**: xem bài viết, đăng bài hoặc đặt câu hỏi, bình luận/trả lời, bày tỏ cảm xúc, lưu bài viết, ghim bài và theo dõi đã đọc.
* **Thông báo**: nhận thông báo khi có phản hồi, nhắc tên hoặc hoạt động liên quan đến bài viết.
* **Work Chat**: nhắn tin trực tiếp 1-1 bằng văn bản với thành viên cùng Workspace.
* **Tìm kiếm hợp nhất**: tìm bài viết và tài liệu trong các Workspace mà Người dùng (USER) tham gia.

Các chức năng này làm rõ UniChat là ứng dụng cộng tác tri thức có AI hỗ trợ, không phải ứng dụng chỉ để chat với AI.

---

## 2. Bảng so sánh các điểm khác biệt chính

| Tiêu chí so sánh | Tính năng Workspace | Chức năng Chat truy xuất thông tin |
| :--- | :--- | :--- |
| **Bản chất tính năng** | Tổ chức, quản lý tài liệu và thiết lập quyền truy cập (tĩnh). | Khai thác, truy xuất và tổng hợp tri thức thông qua hội thoại (động). |
| **Thành phần kiến trúc chính** | Tập trung ở **Core Platform API** (Java Spring Boot) và CSDL quan hệ (**PostgreSQL**). | Tập trung ở **AI & RAG Engine Service** (**FastAPI**), Vector DB (**ChromaDB**) và provider **Hive** (DeepSeek V4.1 Flash); Gemini chỉ rollback thủ công. |
| **Phạm vi tác động của dữ liệu** | Cấp độ vĩ mô (Macro): Danh sách Workspace, tệp tài liệu gốc, thành viên nhóm, cấu hình hiển thị. | Cấp độ vi mô (Micro): Đoạn văn bản (chunks), vector nhúng (embeddings), ý định truy vấn (intents), trích dẫn (citations). |
| **Quy trình xử lý chính** | Đăng nhập $\rightarrow$ Tạo Workspace $\rightarrow$ Đặt quyền $\rightarrow$ Upload tài liệu $\rightarrow$ Lưu metadata và file vật lý. | Phân loại câu hỏi $\rightarrow$ Chọn chiến lược truy xuất $\rightarrow$ Lọc vector theo Workspace $\rightarrow$ Kiểm soát bằng chứng $\rightarrow$ Sinh câu trả lời kèm Citation. |
| **Cơ chế bảo mật** | Thiết lập Access Control List (ACL) và kiểm tra quyền sở hữu/chia sẻ của người dùng. | Thực thi bộ lọc bảo mật (`workspaceId`, `documentId`) trong quá trình tìm kiếm vector, đảm bảo không rò rỉ dữ liệu giữa các Workspace. |
| **Mức độ phụ thuộc AI** | Thấp đối với quản lý Workspace và cộng đồng. | Rất cao (yêu cầu mô hình Embedding, LLM và bộ phân loại ý định). |

---

## 3. Mối quan hệ tương tác và sự hỗ trợ lẫn nhau

Hai tính năng này không hoạt động độc lập mà được tích hợp chặt chẽ để tạo nên luồng giá trị cốt lõi của UniChat:

1. **Workspace là rào chắn phân quyền cho Chat**: 
   Khi người dùng gửi câu hỏi từ giao diện Chat, Core API của Spring Boot sẽ đối chiếu quyền của người dùng với `workspaceId` trước. Nếu hợp lệ, Core API mới chuyển tiếp yêu cầu sang AI Service. Chat API tuyệt đối không thực hiện tìm kiếm vector trên toàn bộ cơ sở dữ liệu ChromaDB mà luôn áp dụng bộ lọc `workspaceId` (metadata filter) được cung cấp bởi Workspace. Điều này ngăn chặn việc rò rỉ thông tin giữa các người dùng hoặc các môn học khác nhau.
2. **Chat là công cụ giải phóng giá trị cho Workspace**: 
   Nếu không có tính năng Chat, Workspace chỉ dừng lại ở một thư mục lưu trữ file tĩnh thông thường (như Google Drive hay Dropbox). Chức năng Chat RAG thích ứng giúp người dùng "nói chuyện" với tài liệu, biến đống dữ liệu tĩnh trong Workspace thành tri thức động có thể truy xuất và kiểm chứng tức thời.
3. **Metadata liên kết hai thế giới**: 
   Khi tài liệu được tải lên qua Workspace, hệ thống trích xuất và lưu siêu dữ liệu (tên file, số trang, chunk index) vào ChromaDB. Khi Chat truy xuất các chunk này để gửi cho LLM, chính các metadata này được sử dụng để xây dựng các *Citation* (trích dẫn nguồn), giúp người dùng liên kết trực tiếp câu trả lời của Chat quay trở lại file tài liệu gốc nằm trong Workspace.

## 4. Ghi chú as-built 24/10/2026

Core API là authoritative authorization boundary: trước khi gọi AI Service, API xác định workspace/document được phép; sau AI call, API kiểm tra lại trước khi persistence/return. AI Service không tự cấp quyền. Luồng tài liệu sử dụng RabbitMQ để xử lý bất đồng bộ. Web, Expo mobile, Bảng tin cộng đồng, Work Chat, Studio Notes và SSE streaming đã có trong codebase; chúng được tách khỏi đóng góp nghiên cứu P0 là Adaptive Knowledge Retrieval & Reasoning.
---

## 4. Kết luận

* **Workspace** là phần khung cấu trúc, nền móng bảo mật và không gian cộng tác của UniChat. Nó định nghĩa ranh giới tài liệu, thành viên, thảo luận và quyền hạn của người dùng.
* **Chat truy xuất thông tin** là động cơ phân tích và giao diện tương tác thông minh của hệ thống. Nó hiện thực hóa khả năng tư duy và phản hồi thích ứng dựa trên bằng chứng thu thập được.
* Định hướng **AI Knowledge Platform** của UniChat xem Workspace và lớp cộng đồng là nền tảng cộng tác tri thức; Chat AI là một giao diện truy cập quan trọng nhưng không phải toàn bộ sản phẩm, mở đường cho Knowledge Map và Knowledge Graph.
