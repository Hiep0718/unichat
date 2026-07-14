# Đặc tả Adaptive Retrieval v1 — UniChat

## Metadata

| Thuộc tính | Giá trị |
|---|---|
| Phase | design-architecture |
| Task | TASK-004 |
| Version | 1.0 |
| Trạng thái | Ready for design approval |
| Owner | Hoàng Phi Hùng |
| Reviewer | Nguyễn Thanh Hiệp |

## 1. Mục tiêu và giới hạn

Adaptive Retrieval v1 chọn chiến lược truy hồi bằng luật xác định, giải thích được và có phiên bản. P0 không dùng LLM để phân loại intent, không web-search, không hybrid search, không reranker và không tự thay đổi threshold trong production.

Đầu vào gồm câu hỏi, workspaceId, danh sách documentId đã được Core API cấp quyền, conversation summary tối đa một lượt và strategyVersion. Đầu ra gồm intent, ruleId, confidence, retrieval strategy, evidence decision, answer hoặc refusal, citations và retrieval trace.

## 2. Chuẩn hóa câu hỏi

1. Kiểm tra độ dài từ 3 đến 2.000 ký tự bằng schema.
2. Chuẩn hóa Unicode NFC và khoảng trắng.
3. Tạo bản chữ thường giữ nguyên dấu để lưu trace.
4. Tạo shadow text bỏ dấu chỉ để so luật; không dùng shadow text để sinh câu trả lời.
5. Không ghi nguyên câu hỏi vào log vận hành; chỉ lưu hash, độ dài và trace được phép.

## 3. Taxonomy và thứ tự ưu tiên

Thứ tự xử lý khi nhiều luật cùng khớp:

OUT_OF_SCOPE → COMPARISON → SUMMARY → DEFINITION → REASONING → FACT.

| Intent | Dấu hiệu chính | Ví dụ hành vi |
|---|---|---|
| OUT_OF_SCOPE | Yêu cầu ngoài tài liệu/sản phẩm được hỗ trợ hoặc yêu cầu nguy hiểm | Từ chối có lý do, không truy hồi |
| COMPARISON | so sánh, khác nhau, ưu/nhược điểm, giữa A và B | Cần tối thiểu hai nhóm bằng chứng |
| SUMMARY | tóm tắt, tổng quan, ý chính của tài liệu/chương | Mở rộng coverage theo tài liệu |
| DEFINITION | là gì, định nghĩa, khái niệm | Ưu tiên đoạn giải thích trực tiếp |
| REASONING | tại sao, suy luận, ảnh hưởng, nguyên nhân | Cho phép nhiều đoạn bổ trợ |
| FACT | ai, khi nào, bao nhiêu, ở đâu hoặc mặc định | Truy hồi chính xác, ngân sách vừa |

OUT_OF_SCOPE chỉ áp dụng khi yêu cầu rõ ràng nằm ngoài năng lực. Thiếu bằng chứng trong corpus là quyết định của Evidence Gate, không tự đổi intent thành OUT_OF_SCOPE.

## 4. Luật phát hiện intent

- Luật nằm trong tệp YAML có strategyVersion, ruleId, priority, patterns và negativePatterns.
- Mỗi pattern phải có unit test tiếng Việt có dấu, không dấu và trường hợp phủ định.
- Câu so sánh thiếu một trong hai đối tượng trả CLARIFY trước truy hồi.
- Câu quá ngắn, đại từ không xác định hoặc phụ thuộc ngữ cảnh chưa có trả CLARIFY.
- FACT là fallback duy nhất; mọi fallback phải có ruleId FACT_DEFAULT.
- Confidence là mức luật cố định theo cấu hình, không được diễn giải như xác suất mô hình.

## 5. Chiến lược truy hồi ban đầu

| Intent | topK | Similarity floor | Max chunks | Min source groups | Evidence gate |
|---|---:|---:|---:|---:|---:|
| FACT baseline | 5 | 0,70 | 4 | 1 | 0,72 |
| DEFINITION | 4 | 0,72 | 3 | 1 | 0,74 |
| FACT | 5 | 0,70 | 4 | 1 | 0,72 |
| COMPARISON | 10 | 0,64 | 6 | 2 | 0,68 |
| SUMMARY | 12 | 0,60 | 8 | 3 | 0,66 |
| REASONING | 12 | 0,62 | 8 | 2 | 0,68 |
| OUT_OF_SCOPE | 0 | Không áp dụng | 0 | 0 | Từ chối ngay |

Similarity dùng cosine trên collection unichat_chunks_v1. Mọi truy vấn bắt buộc lọc workspaceId, documentId thuộc allowedDocumentIds, documentStatus PROCESSED và ingestionVersion hiện hành.

## 6. Evidence Gate

Evidence score được tính:

evidenceScore = 0,50 × topSimilarity + 0,30 × meanTop3Similarity + 0,20 × coverageScore.

coverageScore nằm trong [0,1] và phản ánh số nhóm nguồn cần thiết theo intent. topSimilarity và meanTop3Similarity bằng 0 khi không có chunk.

Quyết định:

- CLARIFY: câu hỏi mơ hồ, thiếu đối tượng so sánh hoặc thiếu phạm vi mà người dùng có thể bổ sung.
- REFUSE: OUT_OF_SCOPE; không có chunk hợp lệ; thiếu source group bắt buộc; hoặc evidenceScore thấp hơn gate.
- ANSWER: đủ source group, evidenceScore đạt gate và citation validator đạt yêu cầu.

Refusal phải nói rõ tài liệu hiện có chưa đủ bằng chứng và gợi ý cách thu hẹp câu hỏi. Không được dùng kiến thức nền để lấp khoảng trống.

## 7. Sinh câu trả lời và citation

- Generator nhận duy nhất câu hỏi đã chuẩn hóa, chunks được cấp quyền và metadata locator.
- Output phải là JSON có schema: answer, claims, citationIds, refusal, refusalReason.
- Mỗi claim thực tế phải tham chiếu ít nhất một citationId.
- Citation validator kiểm tra documentId thuộc allowedDocumentIds, chunk tồn tại, excerpt khớp content hash và locator hợp lệ.
- Nếu output sai schema hoặc citation không hợp lệ, thử lại đúng một lần với cùng evidence.
- Lần hai vẫn sai thì REFUSE; không mở rộng corpus hoặc đổi model ngầm.
- PDF dùng pageNumber; DOCX dùng logicalBlock/paragraph/tableCell; TXT dùng lineStart-lineEnd.

## 8. Provider và fallback

Gemini stable là provider chính. Ollama là fallback cục bộ duy nhất cho timeout, HTTP 429 hoặc HTTP 5xx; thử tối đa một lần. Không fallback khi lỗi xác thực, lỗi schema đầu vào, safety refusal hoặc Evidence Gate từ chối.

Mỗi run khóa providerModel, promptVersion, embeddingRevision, strategyVersion, temperature và configHash. Không ghi API key, raw token hoặc nội dung riêng tư vào log.

## 9. Calibration và đóng băng

Calibration chỉ dùng 60 case development, 10 case mỗi intent và tách theo cụm chủ đề tài liệu.

- topK candidates: 3, 4, 5, 8, 10, 12.
- similarity floor candidates: 0,58 đến 0,76, bước 0,02.
- evidence gate candidates: 0,62 đến 0,78, bước 0,02.
- Chọn cấu hình theo source hit@K, citation accuracy, refusal F1 và p95 latency.
- Không dùng holdout để sửa luật hoặc threshold.
- Cấu hình cuối lưu strategyVersion và SHA-256; thay đổi sau đóng băng tạo version mới.

## 10. Retrieval trace bắt buộc

Trace lưu requestId, userId đã pseudonymize, workspaceId, intent, ruleId, confidence, strategyVersion, allowedDocumentCount, retrieved chunk IDs, scores, coverage, evidenceScore, decision, refusalCode, provider, latency, token usage và timestamp UTC.

Trace không lưu toàn văn chunk hoặc câu hỏi trong log sự kiện. Dữ liệu nghiên cứu có quyền riêng được lưu trong bảng chuyên biệt và áp dụng retention.

## 11. Tiêu chí chấp nhận

- AC-AR-01: Sáu intent có test dương, test âm và test ưu tiên.
- AC-AR-02: Không truy hồi chunk ngoài allowedDocumentIds trong mọi test.
- AC-AR-03: COMPARISON không ANSWER khi chỉ có một source group.
- AC-AR-04: OUT_OF_SCOPE không gọi vector store hoặc LLM.
- AC-AR-05: Mọi answer có citation hợp lệ hoặc chuyển REFUSE.
- AC-AR-06: Cùng input và config tạo cùng intent, strategy và evidence decision.
- AC-AR-07: Mọi run có configHash và trace đầy đủ.
- AC-AR-08: Holdout không xuất hiện trong calibration hoặc prompt.
