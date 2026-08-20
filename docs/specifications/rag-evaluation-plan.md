# Kế hoạch Đánh giá RAG Benchmark Uy tín & Miễn phí ($0 Budget)

> **Dự án**: UniChat — AI Knowledge Platform cho Giáo dục Đại học  
> **Công cụ**: Arize Phoenix Web UI + RAGAS Framework + Golden Dataset (120 câu)  
> **Chi phí**: **0 VNĐ (Miễn phí 100%)**

---

## 1. Mục tiêu và Ý nghĩa Kế hoạch

1. **Độ uy tín Khoa học**: Đánh giá hiệu năng hệ thống Adaptive Retrieval RAG theo chuẩn công nghiệp được quốc tế thừa nhận (IEEE / ACM / RAGAS / Arize AI).
2. **Giao diện Web Dashboard Trực quan**: Tự động dựng Web UI tại `http://localhost:6006` để trực quan hóa biểu đồ RAG Triad, vết thực thi (Traces) và chụp ảnh đưa vào Báo cáo Đồ án Tốt nghiệp.
3. **So sánh Thực nghiệm (A/B Testing)**: Đánh giá đối chứng giữa **Baseline RAG (Top-K cố định)** và **Adaptive RAG v1 (Phân loại Intent + Evidence Gate)** trên cùng một tập dữ liệu test đóng băng (Holdout Set).

---

## 2. Danh mục Công cụ & Chi phí

| Thành phần | Công cụ lựa chọn | Chi phí | Vai trò & Ý nghĩa |
|---|---|---|---|
| **RAG Metrics Framework** | **RAGAS** | $0 | Tính 4 chỉ số vàng: *Faithfulness*, *Answer Relevance*, *Context Precision*, *Context Recall*. |
| **Web Dashboard & Tracing** | **Arize Phoenix** | $0 | Dựng Web UI tại `localhost:6006` theo dõi vết thực thi, biểu đồ Radar và bảng điểm. |
| **LLM Evaluator (Judge)** | **Gemini 2.5 Flash API (Free) / Ollama Local** | $0 | Đóng vai trò LLM-as-a-judge chấm điểm trung lập cho các chỉ số Faithfulness và Relevance. |
| **Golden Dataset** | **golden_dataset.json (120 câu)** | $0 | Tập câu hỏi và đáp án mẫu được gán nhãn thủ công theo 6 nhóm Intent chuẩn. |

---

## 3. Cấu trúc Tập dữ liệu Đánh giá (Golden Dataset 120 câu)

Cấu trúc lưu trữ tại `ai-service/app/data/golden_dataset.json` chia đều 20 câu cho 6 nhóm Intent:

```json
[
  {
    "id": "eval_def_001",
    "question": "Tính Đa hình (Polymorphism) trong Lập trình hướng đối tượng là gì?",
    "ground_truth": "Đa hình là khả năng các đối tượng thuộc các lớp khác nhau phản ứng khác nhau với cùng một thông điệp hoặc phương thức.",
    "expected_intent": "DEFINITION",
    "document_scope": ["OOP_04_Ke_Thua_Da_Hinh.pdf"]
  },
  {
    "id": "eval_cmp_001",
    "question": "So sánh sự khác nhau giữa Nạp chồng (Overloading) và Ghi đè (Overriding)",
    "ground_truth": "Overloading xảy ra trong cùng một lớp với cùng tên nhưng khác tham số; Overriding xảy ra giữa lớp cha và lớp con với cùng chữ ký phương thức.",
    "expected_intent": "COMPARISON",
    "document_scope": ["OOP_04_Ke_Thua_Da_Hinh.pdf"]
  }
]
```

---

## 4. Các bước Triển khai Chi tiết

### Bước 1: Cài đặt Thư viện vào `ai-service`
Thêm vào `ai-service/requirements.txt`:
```text
arize-phoenix>=4.0.0
ragas>=0.2.0
```

### Bước 2: Khởi tạo Phoenix Web Tracing Server
Trong `ai-service/app/main.py`:
```python
import phoenix as px

# Bật Phoenix Web Dashboard chạy ngầm tại http://localhost:6006
px.launch_app()
```

### Bước 3: Xây dựng Script Chấm điểm `eval_benchmark_runner.py`
Tạo file `ai-service/app/services/eval_benchmark_runner.py`:
1. Nạp `golden_dataset.json`.
2. Chạy câu hỏi qua **Baseline RAG** $\rightarrow$ ghi nhận RAGAS Score & Phoenix Trace.
3. Chạy câu hỏi qua **Adaptive RAG v1** $\rightarrow$ ghi nhận RAGAS Score & Phoenix Trace.
4. Tự động push dữ liệu lên Phoenix Web UI và xuất báo cáo `docs/evaluation/eval_report_latest.html`.

### Bước 4: Trực quan hóa & Chụp ảnh Báo cáo
* Mở trình duyệt tại `http://localhost:6006`.
* Xuất các biểu đồ:
  * **Biểu đồ Radar**: So sánh 4 chỉ số RAGAS giữa Baseline và Adaptive RAG.
  * **Bảng Refusal F1-Score**: Đánh giá độ chính xác của Evidence Gate khi gặp câu hỏi ngoài phạm vi (`OUT_OF_SCOPE`).
  * **Latency & Token Cost**: Đánh giá thời gian phản hồi p95.

---

## 5. Kết quả Kỳ vọng cho Báo cáo Đồ án

| Metric RAG | Mục tiêu Baseline RAG | Mục tiêu Adaptive RAG v1 | Mức cải thiện kỳ vọng |
|---|---|---|---|
| **Faithfulness** (Độ trung thực) | 82.0% | **94.5%** | **+12.5%** (Nhờ Evidence Gate) |
| **Context Precision** (Độ chính xác) | 75.0% | **88.0%** | **+13.0%** (Nhờ Strategy Selector) |
| **Answer Relevance** (Độ liên quan) | 80.0% | **92.0%** | **+12.0%** |
| **Refusal F1-Score** (Từ chối đúng) | 0.45 | **0.88** | **+0.43** (Loại bỏ ảo giác hoàn toàn) |
