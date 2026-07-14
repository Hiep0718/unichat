# Giao thức nghiên cứu và đánh giá — UniChat Adaptive Retrieval v1

## Metadata

| Thuộc tính | Giá trị |
|---|---|
| Execution Mode | Orchestrated / strict |
| Phase | design-architecture |
| Owner | Nguyễn Thanh Hiệp + Hoàng Phi Hùng |
| Sub-agent Available | Có; Architect đã hoàn tất review đọc-only |
| Fallback Reason | Không áp dụng cho artifact này |
| Tool Discovery Method | Collaboration tools và nguồn nghiên cứu sơ cấp |
| Version | 1.0 |
| Trạng thái | Ready for design approval |

## 1. Câu hỏi nghiên cứu

- RQ-01: Adaptive Retrieval theo loại câu hỏi có cải thiện khả năng truy hồi đúng nguồn so với RAG dùng Top-K cố định không?
- RQ-02: Evidence Gate có tăng độ chính xác của hành vi từ chối khi tài liệu không đủ bằng chứng không?
- RQ-03: Mức cải thiện chất lượng phải đánh đổi bao nhiêu về latency, token và số chunk đưa vào prompt?

## 2. Giả thuyết

- H1: Adaptive Retrieval tăng source hit@K hoặc citation source accuracy ít nhất 5 điểm phần trăm so với baseline trên holdout.
- H2: Evidence Gate đạt refusal F1 tối thiểu 0,80 trên nhóm ngoài phạm vi và nhóm thiếu bằng chứng.
- H3: Adaptive Retrieval không làm p95 latency tăng quá 25% và tổng token prompt trung bình tăng quá 25% so với baseline.

Các ngưỡng là mục tiêu đánh giá, không phải lý do để loại bỏ hoặc sửa hậu nghiệm dữ liệu. Nếu không đạt, báo cáo phải trình bày kết quả âm và phân tích nguyên nhân.

## 3. Thiết kế đối chứng

| Thuộc tính | Baseline | Adaptive v1 |
|---|---|---|
| Embedding | Cùng model/version | Cùng model/version |
| Vector store | Cùng collection/snapshot | Cùng collection/snapshot |
| Generator | Cùng provider/model/temperature | Cùng provider/model/temperature |
| Prompt trả lời | Cùng template, trừ metadata strategy | Cùng template, trừ metadata strategy |
| Retrieval | Top-K = 5, một threshold toàn cục | Intent-specific Top-K, threshold và coverage rule |
| Evidence gate | Một threshold toàn cục | Rule theo intent, có ACCEPT/CLARIFY/REFUSE |
| Dataset | Cùng holdout và thứ tự câu hỏi | Cùng holdout và thứ tự câu hỏi |

Mỗi câu hỏi được chạy theo cặp baseline/adaptive. Provider/model, corpus snapshot, embedding, prompt và seed/config được khóa trong một EvaluationRun.

## 4. Dataset và chia tập

- Tối thiểu 120 câu hỏi, cân bằng 20 câu cho mỗi nhóm: DEFINITION, FACT, COMPARISON, SUMMARY, REASONING và OUT_OF_SCOPE.
- Mỗi EvaluationCase lưu: `caseId`, `datasetVersion`, intent label, question, workspace/document scope, expected source locator, expected answer notes và evidence label.
- Development set: 60 câu, 10 câu mỗi nhóm; dùng duy nhất để chọn detector rule, Top-K, threshold và Evidence Gate.
- Holdout set: 60 câu, 10 câu mỗi nhóm; đóng băng trước khi chạy đánh giá chính.
- Chia development/holdout theo cụm chủ đề nguồn, không để câu cùng tài liệu/chủ đề rơi vào hai tập; dùng ít nhất ba cụm tài liệu/môn học.
- Nhóm OUT_OF_SCOPE gồm cả câu hoàn toàn ngoài tài liệu và câu có chủ đề gần nhưng không đủ bằng chứng.

## 5. Gán nhãn

1. Hai thành viên gán nhãn độc lập intent, expected source và evidence availability.
2. Không xem output baseline/adaptive trong lúc gán nhãn.
3. Tính tỷ lệ đồng thuận và Cohen's kappa cho intent/evidence label; mục tiêu kappa từ 0,70.
4. Bất đồng được giải quyết bằng thảo luận có ghi lý do; nếu vẫn bất đồng, xin ý kiến GVHD.
5. Mọi sửa nhãn sau khi mở holdout phải tạo dataset version mới và được công bố trong báo cáo.

## 6. Metrics

| Nhóm | Metric | Cách tính |
|---|---|---|
| Intent | Accuracy, macro precision/recall/F1, confusion matrix | So predicted intent với gold label. |
| Retrieval | source hit@K, MRR, document coverage | Expected source có trong retrieved chunks và thứ hạng đầu tiên. |
| Strategy | strategy correctness | Predicted strategy khớp mapping đã đóng băng. |
| Citation | citation source accuracy, locator accuracy | Citation trỏ đúng document và đúng page/paragraph/line. |
| Groundedness | claim support rate | Tỷ lệ claim được ít nhất một retrieved chunk hỗ trợ. |
| Refusal | precision, recall, F1 | So ACCEPT/CLARIFY/REFUSE với evidence label. |
| Answer | correctness/relevance rubric 0-2 | 0 sai/không căn cứ; 1 một phần; 2 đúng và đủ theo expected notes. |
| Hiệu năng | latency p50/p95, retrieved chunks, prompt tokens | Đo theo cặp trên cùng môi trường. |
| Vận hành | provider failure/fallback rate | Số lần provider chính lỗi và kết quả fallback. |

Metric chính để kết luận H1 là source hit@K và citation source accuracy. Groundedness và refusal F1 là metric an toàn bắt buộc; answer score là metric hỗ trợ.

## 7. Mục tiêu ban đầu

- Intent macro-F1 ≥ 0,80.
- Citation source accuracy ≥ 0,90.
- Locator accuracy ≥ 0,85.
- Claim support rate ≥ 0,90.
- Refusal F1 ≥ 0,80.
- Không có retrieval từ Workspace không được phép trong toàn bộ bộ test.
- Adaptive tăng ít nhất 5 điểm phần trăm ở một metric retrieval chính mà không làm metric an toàn giảm.
- p95 latency tăng không quá 25%; prompt tokens trung bình tăng không quá 25%.

## 8. Leakage control và tái lập

- Không đưa holdout vào prompt few-shot, detector examples hoặc quá trình chỉnh threshold.
- Không đổi corpus, chunking, embedding, provider, answer prompt hoặc dataset giữa hai nhánh so sánh.
- Không loại câu hỏi sau khi xem kết quả; mọi exclusion phải được định nghĩa trước và ghi lý do.
- Lưu `datasetVersion`, `corpusSnapshot`, `embeddingModel`, `generatorModel`, `strategyVersion`, `promptVersion`, timestamp và config hash.
- Mock provider trong unit/integration test; chỉ evaluation run có kiểm soát mới gọi provider thật.
- Dữ liệu đánh giá không chứa secrets hoặc tài liệu không được phép gửi tới provider cloud.

## 9. Phân tích kết quả

- Báo cáo kết quả tổng và theo từng intent.
- Dùng paired bootstrap 1.000 mẫu với 95% confidence interval cho chênh lệch source hit/citation accuracy.
- Dùng bảng lỗi cho false accept, false refusal, wrong-source citation và intent confusion.
- Báo cáo latency/token cùng chất lượng; không kết luận tốt hơn nếu chỉ tăng chất lượng bằng cách tăng retrieval budget không kiểm soát.
- Giữ nguyên và phân tích kết quả âm.

## 10. Bằng chứng đầu ra

- Dataset manifest và hướng dẫn gán nhãn.
- Evaluation cases, runs, results và retrieval traces.
- Config snapshot cho baseline/adaptive.
- Bảng metric tổng/theo intent, confusion matrix và latency distribution.
- Tối thiểu 10 case study gồm thành công, sai intent, sai citation, false refusal và provider failure.
- Ảnh/bảng báo cáo có thể tái tạo từ dữ liệu kết quả, không nhập tay số liệu cuối.

## 11. Cơ sở nghiên cứu

- [Adaptive-RAG — NAACL 2024](https://aclanthology.org/2024.naacl-long.389/) đề xuất chọn chiến lược theo độ phức tạp câu hỏi; UniChat thu hẹp thành taxonomy giải thích được và retrieval budget theo intent.
- [Self-RAG — ICLR 2024](https://openreview.net/attachment?id=hSyW5go0v8&name=pdf) cho thấy lợi ích của quyết định retrieval/critique; UniChat chỉ áp dụng evidence decision đơn giản, không huấn luyện reflection token.
- [Corrective Retrieval Augmented Generation](https://arxiv.org/abs/2401.15884) nhấn mạnh đánh giá chất lượng tài liệu truy hồi trước sinh; UniChat dùng Evidence Gate trong corpus được ủy quyền và không web-search.
- [RAGAS — EACL 2024](https://aclanthology.org/2024.eacl-demo.16/) tách đánh giá retrieval, faithfulness và generation; UniChat ưu tiên nhãn thủ công có expected source, RAGAS là mở rộng.

