# Kế hoạch Nâng cấp RAG Ingestion & AI Chat Engine (UniChat Next-Gen Upgrade)

Tài liệu thiết kế kỹ thuật chi tiết nhằm nâng cấp toàn diện **Hệ thống Phân mảnh Tri thức (Chunking)** và **Hệ thống Phản hồi AI (RAG & Chat Engine)** cho UniChat.

---

## 🎯 Mục tiêu chính (Core Goals)

1. **Real-time SSE Streaming Tokens (Phản hồi tức thì trong 200ms):**
   - Triển khai Server-Sent Events (SSE) streaming token trên FastAPI (`ai-service`) và Node.js Core API Gateway.
   - Frontend cập nhật chữ gõ real-time, stream mượt mà từ KaTeX đến sơ đồ tư duy Mermaid.js.

2. **Context-Enriched & Semantic Chunking (Phân mảnh giàu ngữ cảnh):**
   - Bổ sung **Breadcrumbs ngữ cảnh** (chuỗi tiêu đề cấp cha `Tài liệu > Chương > Mục`) gắn trực tiếp vào đầu mỗi chunk.
   - Trượt gối đầu linh hoạt (Sliding Overlap $15-20\%$) để bảo toàn tri thức tại ranh giới cắt.

3. **Cross-Encoder Re-Ranking & Multi-Turn Conversational RAG:**
   - Đánh giá lại thứ hạng Top-20 vector candidates bằng **Cross-Encoder Reranker**, giữ lại Top-5 chunk chuẩn xác nhất trước khi nạp vào LLM context window.
   - **Query Rewriter:** Nhớ ngữ cảnh lịch sử hội thoại 3-5 câu gần nhất để tự động giải nghĩa đại từ thay thế (*"Nó là gì?"*, *"Phương pháp này hoạt động ra sao?"*).

---

## 💡 User Review Required

> [!IMPORTANT]
> **Stream Token vs Complete Formatting:** Khi stream real-time, khối code Mermaid ` ```mermaid ` hoặc KaTeX `$$` sẽ hiển thị dưới dạng văn bản thô cho đến khi token đóng khối (` ``` ` hoặc `$$`) xuất hiện. Frontend sẽ có cơ chế buffer thông minh để xử lý mượt mà.

> [!TIP]
> **Tương thích hoàn toàn ngược (Backward Compatibility):** Các API cũ `/api/v1/rag/query` không bị ảnh hưởng, Endpoint mới `/api/v1/rag/query-stream` được bổ sung song song.

---

## 📋 Open Questions

> [!NOTE]
> Bạn có muốn kích hoạt thêm chế độ **Multi-Query Expansion** (sinh 3 phiên bản câu hỏi đồng nghĩa trước khi search vector) trong đợt triển khai này không?

---

## 🏗️ Thay đổi Đề xuất (Proposed Changes)

---

### Component 1: Ingestion & Chunking Pipeline (`ai-service`)

#### [MODIFY] [chunker.py](file:///d:/codex-workspace/unichat/ai-service/app/services/chunker.py)
- Bổ sung hàm `enrich_chunk_with_breadcrumbs()`: Trích xuất đường dẫn tiêu đề cha (`H1 > H2 > H3`) và chèn thêm block `[Nguồn: <filename> | Tiêu đề: <breadcrumbs>]` vào đầu nội dung text của từng `ChunkResult`.
- Bổ sung `sliding_overlap`: Đảm bảo 100-150 ký tự gối đầu giữa các chunk liền kề.

---

### Component 2: RAG Retrieval & Reasoning Engine (`ai-service`)

#### [MODIFY] [retrieval_engine.py](file:///d:/codex-workspace/unichat/ai-service/app/core/rag/retrieval_engine.py)
- Tích hợp **Cross-Encoder Reranker**: Đánh giá câu hỏi $Q$ và candidate chunk $C_i$ để tính lại điểm số `rerank_score`. Xếp hạng lại Top-20 thành Top-5 chunk có độ liên quan cao nhất.
- Thêm module **Query Rewriter**: Nhận `history_messages` và `query`, dùng LLM chuyển đổi các câu hỏi chứa đại từ mập mờ thành câu hỏi độc lập đầy đủ ngữ cảnh.

#### [MODIFY] [llm_provider.py](file:///d:/codex-workspace/unichat/ai-service/app/core/rag/llm_provider.py)
- Xây dựng hàm generator `generate_rag_stream()` hỗ trợ `yield` từng token real-time từ Gemini SDK / Provider fallback cascade.
- Trả về token kèm metadata trích dẫn (`citations`) và `intent` ở event khởi tạo stream (`event: metadata`).

#### [MODIFY] [rag_router.py](file:///d:/codex-workspace/unichat/ai-service/app/api/v1/endpoints/rag_router.py)
- Thêm endpoint `POST /api/v1/rag/query-stream` trả về `EventSourceResponse` (Server-Sent Events).

---

### Component 3: Core API Gateway (`core-api`)

#### [MODIFY] [rag_proxy_controller.ts](file:///d:/codex-workspace/unichat/core-api/src/controllers/rag.controller.ts)
- Proxy SSE stream từ `ai-service` sang client web với mã hóa JWT authorization và xác thực quyền truy cập tài liệu.

---

### Component 4: Frontend Real-time Streaming UI (`frontend`)

#### [MODIFY] [chat-api.ts](file:///d:/codex-workspace/unichat/frontend/src/features/chat/chat-api.ts)
- Bổ sung hàm `streamQueryRAG()` kết nối SSE endpoint và xử lý event stream token.

#### [MODIFY] [chat-page.tsx](file:///d:/codex-workspace/unichat/frontend/src/features/chat/chat-page.tsx)
- Cập nhật state `messages` cập nhật dòng chữ gõ mượt mà từng token khi nhận dữ liệu từ `streamQueryRAG()`.

#### [MODIFY] [chat-message-item.tsx](file:///d:/codex-workspace/unichat/frontend/src/features/chat/components/chat-message-item.tsx)
- Hỗ trợ render Markdown + KaTeX + Mermaid khi nội dung đang được stream dở dang mà không gây đứt gãy giao diện.

---

## 🧪 Kế hoạch Kiểm thử & Xác minh (Verification Plan)

### Automated Tests
- Chạy unit test suite cho Chunker: `pytest ai-service/app/tests/test_chunker.py`
- Chạy RAG Benchmark test suite: `pytest ai-service/app/tests/test_adaptive_retrieval_edge_cases.py`
- Chạy TypeScript typecheck: `npm run typecheck --workspace frontend`

### Manual Verification
1. Tải lên 1 tài liệu PDF phức tạp có tiêu đề phân cấp. Kiểm tra thông số chunk lưu trữ trong ChromaDB để đảm bảo Breadcrumbs ngữ cảnh được chèn chính xác.
2. Đặt câu hỏi trong ứng dụng Web và xác nhận câu trả lời được stream chữ gõ real-time ngay trong $200\text{ms}$.
3. Đặt câu hỏi chứa đại từ thay thế (*"Nó là gì?"*) và xác nhận Query Rewriter chuyển đổi ngữ cảnh chính xác từ câu hỏi trước.
4. Kiểm tra các sơ đồ tư duy Mermaid và công thức toán KaTeX hiển thị đẹp mắt sau khi stream hoàn tất.
