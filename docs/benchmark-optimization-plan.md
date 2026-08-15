# Kế hoạch Tối ưu & Benchmark — v2 (Risk-Hardened)

> [!NOTE]
> Plan này đã tích hợp mitigations cho **22 rủi ro** từ [risk_analysis.md](file:///C:/Users/ThanhHiep/.gemini/antigravity-ide/brain/c7d31f22-35f6-4366-a79e-0f600908b4cd/risk_analysis.md). Mỗi thay đổi so với plan v1 được đánh dấu ⚠️ RISK kèm ID.

## Bối cảnh & Hiện trạng

**Pipeline RAG đã hoạt động end-to-end** nhưng có 7 vấn đề chính cần cải thiện (chunking đơn giản, eval sơ khai, thiếu dataset, thiếu paired comparison, LLM provider sai spec, thiếu promptVersion, intent detector hardcode). Chi tiết xem plan v1.

## Quyết định đã xác nhận ✅

| # | Quyết định |
|---|---|
| Q1 | 3 cụm giáo dục ĐH: quy chế đào tạo, giáo trình CNTT, tài liệu nghiên cứu |
| Q2 | Semi-automated: script sinh câu hỏi, user review & chỉnh sửa |
| Q3 | Khóa **`gemini-2.5-flash`** làm primary |
| Q4 | **Tắt Ollama fallback trong evaluation** |
| Q5 | **Hybrid 3 cấp: Header → Paragraph → Sentence** |
| Q6 | **Phase 0→1→2→3→4** tuần tự |
| Q7 | **Full benchmark**: 120 cases, paired, bootstrap CI 95% |

---

## Phase 0: Preflight — Xử lý rủi ro P0

> [!CAUTION]
> Phase này **bắt buộc hoàn tất** trước khi bắt đầu code. Ước lượng: 1–2 ngày.

### 0.1 ⚠️ R-09 — Xử lý secret leak trong `.env`

#### [MODIFY] [.gitignore](file:///d:/codex-workspace/unichat/.gitignore)
- Thêm `.env` vào `.gitignore` (hiện chỉ có `.env.example`)

#### Hành động thủ công (user):
1. Rotate **tất cả** credentials đã bị lộ:
   - `POSTGRES_PASSWORD` → đổi trên Supabase Dashboard
   - `SUPABASE_SERVICE_KEY` → regenerate trên Supabase Dashboard
   - `GEMINI_API_KEY` → regenerate trên Google AI Studio
   - `MAIL_PASSWORD` → đổi app password Gmail
   - `RABBITMQ_URL` → đổi password trên CloudAMQP
2. Chạy `git rm --cached .env` để bỏ khỏi tracking
3. Cập nhật `.env.example` chỉ chứa placeholder

---

### 0.2 ⚠️ R-02 — Verify ChromaDB compatibility

#### Hành động:
```bash
# Trong ai-service venv
python -c "
import chromadb
client = chromadb.HttpClient(host='localhost', port=8000)
print('Server version:', client.get_version())
print('Client version:', chromadb.__version__)
col = client.get_or_create_collection('compat_test', metadata={'hnsw:space': 'cosine'})
col.add(ids=['test1'], documents=['hello'], embeddings=[[0.1]*768])
result = col.query(query_embeddings=[[0.1]*768], n_results=1)
print('Query OK:', result['ids'])
client.delete_collection('compat_test')
print('COMPATIBILITY PASSED')
"
```

**Nếu FAIL**: Dùng `CHROMA_MODE=ephemeral` cho evaluation (data in-memory, re-ingest mỗi run). Ghi vào decisions-log.

---

### 0.3 ⚠️ R-11 — Chuẩn bị tài liệu song song

#### Hành động thủ công (user):
Chuẩn bị **ít nhất 9 tài liệu** (3 tài liệu × 3 cụm):

| Topic Group | Tài liệu mẫu | Format |
|---|---|---|
| `quy_che_dao_tao` | Quy chế đào tạo tín chỉ, Quy định điểm số, Quy chế tốt nghiệp | PDF |
| `giao_trinh_cntt` | Giáo trình Cơ sở dữ liệu, Giáo trình Lập trình, Giáo trình Mạng | PDF/DOCX |
| `tai_lieu_nghien_cuu` | Bài báo RAG, Tài liệu NLP tiếng Việt, Tài liệu Embedding | PDF |

Upload vào workspace test qua UI hoặc API. Đợi ingestion `PROCESSED` trước Phase 2.

---

### 0.4 ⚠️ R-20 — Pre-cache embedding model

```bash
cd ai-service
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('intfloat/multilingual-e5-base')"
```

---

## Phase 1: Hybrid 3-Level Chunking

### ⚠️ R-01 — PDF heading: Heuristic text thay vì font size

#### [MODIFY] [text_extractor.py](file:///d:/codex-workspace/unichat/ai-service/app/services/text_extractor.py)

> [!IMPORTANT]
> **R-01 mitigation**: PyPDF `extract_text()` **không trả font metadata**. KHÔNG dùng font size analysis. Thay bằng heuristic text-based.

Nâng cấp extraction với heading detection:

**PDF** — Heuristic text-based (không cần dependency mới):
```python
def _is_heading_heuristic(line: str, prev_blank: bool, next_blank: bool) -> bool:
    """Detect heading qua đặc điểm text, không cần font metadata."""
    stripped = line.strip()
    if not stripped or len(stripped) > 150:
        return False
    # Tiêu đề thường: viết hoa, ngắn, đứng giữa 2 dòng trống
    is_short_standalone = len(stripped) < 80 and prev_blank and next_blank
    is_all_upper = stripped.isupper() and len(stripped) > 3
    is_numbered_heading = bool(re.match(
        r'^(Chương|CHƯƠNG|Phần|PHẦN|Mục|Bài|Điều)\s+\d+', stripped
    ))
    is_roman_heading = bool(re.match(r'^[IVXLC]+[\.\)]\s+', stripped))
    return is_all_upper or is_numbered_heading or is_roman_heading or is_short_standalone
```

**DOCX** — python-docx native style detection (đã work):
```python
# paragraph.style.name chứa 'Heading 1', 'Heading 2', 'Title', etc.
if 'Heading' in para.style.name or para.style.name == 'Title':
    block_type = "HEADING"
    heading_level = int(para.style.name[-1]) if para.style.name[-1].isdigit() else 1
```

**TXT** — Heuristic:
```python
# Dòng có # prefix (Markdown-style)
# Dòng ALL_CAPS ngắn (<80 chars)
# Dòng "Chương/Phần/Mục + số"
```

Output — `ExtractedBlock`:
```python
@dataclass
class ExtractedBlock:
    text: str
    block_type: Literal["HEADING", "PARAGRAPH", "TABLE", "LIST"]
    heading_level: int | None
    locator_type: str
    locator_value: str
    content_hash: str
    source_page_or_index: int
```

Giữ backward compatibility: `ExtractedChunk` adapter → `ExtractedBlock` cho code cũ.

---

### ⚠️ R-18 — Dual collection strategy cho chunking migration

#### [MODIFY] [vector_store.py](file:///d:/codex-workspace/unichat/ai-service/app/services/vector_store.py)

> [!WARNING]
> **R-18 mitigation**: Chunking mới tạo chunks khác → phá vỡ vectors cũ. Dùng **dual collection** để so sánh.

```python
COLLECTION_V1 = "unichat_chunks_v1"      # Sliding window cũ (giữ nguyên)
COLLECTION_V2 = "unichat_chunks_v2"      # Hybrid 3-level mới

def get_active_collection_name() -> str:
    """Return collection name based on chunking strategy config."""
    return os.getenv("CHUNKING_COLLECTION", COLLECTION_V1)
```

- Ingestion mới → ghi vào **cả v1 và v2** (cho benchmark comparison)
- Retrieval → đọc từ collection được chỉ định (v1 hoặc v2)
- Benchmark so sánh: chạy cùng query trên v1 vs v2

Re-ingestion step cuối Phase 1:
```bash
# Re-ingest tất cả documents vào collection v2
python -m app.services.reingest --collection unichat_chunks_v2 --workspace-id <ID>
```

#### [NEW] `ai-service/app/services/reingest.py`

Script re-ingest toàn bộ documents trong workspace:
1. List tất cả documents PROCESSED từ workspace
2. Đọc file từ storage (Supabase hoặc local)
3. Extract → Chunk (hybrid mới) → Embed → Store vào collection v2
4. Log progress và errors

---

### ⚠️ R-03 + R-19 — Thêm metadata fields khi store chunks

#### [MODIFY] [vector_store.py](file:///d:/codex-workspace/unichat/ai-service/app/services/vector_store.py) (tiếp)

> **R-03/R-19 mitigation**: Thêm `document_status`, `ingestion_version`, `source_group` vào Chroma metadata khi ingestion.

```python
metadatas.append({
    "workspace_id": workspace_id,
    "document_id": document_id,
    "chunk_index": chunk.chunk_index,
    "locator_type": chunk.locator_type,
    "locator_value": chunk.locator_value,
    "content_hash": chunk.content_hash,
    # ⚠️ R-03: Thêm cho Phase 3 retrieval filter
    "document_status": "PROCESSED",
    "ingestion_version": "v2.0",
    # ⚠️ R-19: source_group = document_id cho P0
    "source_group": document_id,
})
```

Lưu ý: `document_status` trong Chroma là **snapshot tại thời điểm ingest** — không tự cập nhật khi document bị xóa. Core API `allowedDocumentIds` vẫn là source of truth cho authorization.

---

### [MODIFY] [chunker.py](file:///d:/codex-workspace/unichat/ai-service/app/services/chunker.py)

Thay sliding window bằng **Hybrid 3-Level Chunker**:

```python
DEFAULT_MAX_CHUNK_SIZE = 800
DEFAULT_MIN_CHUNK_SIZE = 100
DEFAULT_SENTENCE_OVERLAP = 2
```

Logic:
1. Nhận `list[ExtractedBlock]` → nhóm theo heading (Level 1)
2. Section > max_chunk_size → split tại paragraph (Level 2)
3. Paragraph > max_chunk_size → split tại câu (Level 3)
4. Chunk < min_chunk_size → merge với adjacent
5. Overlap: 2 câu cuối chunk trước → đầu chunk sau (Level 3 only)
6. **Edge case**: tài liệu không có heading → fallback paragraph→sentence (không heading level)

#### [NEW] `ai-service/app/services/sentence_splitter.py`

Vietnamese-aware sentence splitter:
- Split: `. `, `! `, `? `, `\n\n`, `;\n`
- Preserve abbreviations: `TP.`, `PGS.`, `TS.`, `ThS.`, `GS.`, `v.v.`, `tr.`, `NXB.`
- NFC normalize trước khi split

#### [NEW] `ai-service/app/services/chunking_benchmark.py`

So sánh old (v1) vs new (v2) chunking trên cùng tài liệu:
- Metrics: chunk count, size distribution, % cắt giữa câu, % giữ trọn section, coherence score

#### [NEW] `ai-service/app/tests/test_chunker_hybrid.py`

Tests bao gồm:
- PDF: heading heuristic (ALL_CAPS, "Chương X"), multi-page section
- DOCX: Heading 1/2/3 style, table, Normal paragraphs
- TXT: `#` heading, ALL_CAPS heading, no-heading fallback
- Vietnamese full diacritics
- Edge: section too long → paragraph → sentence split
- Edge: section too short → merge

#### ⚠️ R-22 — Viết test song song

> Mỗi file code mới **phải có test file tương ứng** trước khi chuyển sang file tiếp theo. Không để test cuối phase.

---

## Phase 2: Evaluation Framework

### ⚠️ R-06 + R-15 — Lưu trace/results vào JSON local (không PostgreSQL)

> [!IMPORTANT]
> **R-06/R-15 mitigation**: AI Service không kết nối PostgreSQL. Evaluation tables có RLS `deny_all`. **Tất cả evaluation data lưu vào JSON files local.**

#### [NEW] `ai-service/app/evaluation/storage.py`

```python
EVAL_DATA_DIR = Path("data/evaluation")

class EvaluationStore:
    """File-based evaluation storage — PostgreSQL-independent."""

    def save_run(self, run: EvaluationRun) -> Path:
        """Save run metadata + config snapshot to JSON."""
        path = EVAL_DATA_DIR / "runs" / f"{run.run_id}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(asdict(run), indent=2, ensure_ascii=False))
        return path

    def save_results(self, run_id: str, results: list[EvaluationResult]) -> Path:
        """Save all case results for a run."""
        path = EVAL_DATA_DIR / "results" / f"{run_id}.jsonl"
        with path.open("w", encoding="utf-8") as f:
            for r in results:
                f.write(json.dumps(asdict(r), ensure_ascii=False) + "\n")
        return path

    def save_trace(self, run_id: str, case_id: str, trace: dict) -> None:
        """Persist full retrieval trace per case (spec §10 fields)."""
        path = EVAL_DATA_DIR / "traces" / run_id / f"{case_id}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(trace, indent=2, ensure_ascii=False))

    def load_run(self, run_id: str) -> dict: ...
    def load_results(self, run_id: str) -> list[dict]: ...
    def list_runs(self) -> list[dict]: ...
```

Cấu trúc data trên disk:
```
ai-service/data/evaluation/
├── runs/                    # EvaluationRun metadata
│   └── {run_id}.json
├── results/                 # EvaluationResult per case (JSONL)
│   └── {run_id}.jsonl
├── traces/                  # Full retrieval traces per case
│   └── {run_id}/
│       └── {case_id}.json
├── datasets/                # Evaluation cases
│   └── v1.0/
│       ├── cases.json
│       └── manifest.md
└── reports/                 # Generated reports
    └── {run_id}.md
```

Thêm `data/evaluation/` vào `.gitignore` (chứa output, không phải source code).

---

### ⚠️ R-10 — Question generator: Anti-bias design

#### [NEW] `ai-service/app/evaluation/question_generator.py`

> [!WARNING]
> **R-10 mitigation**: Script sinh câu hỏi từ chunks dễ tạo bias. Thiết kế 4 loại câu hỏi để cân bằng.

```python
class QuestionCategory(StrEnum):
    DIRECT = "DIRECT"           # Câu hỏi trực tiếp từ chunk (60%)
    PARAPHRASED = "PARAPHRASED" # Diễn đạt lại, không dùng từ gốc (20%)
    ADVERSARIAL = "ADVERSARIAL" # Câu hỏi gần scope nhưng thiếu evidence (10%)
    OUT_OF_SCOPE = "OUT_OF_SCOPE"  # Hoàn toàn ngoài tài liệu (10%)
```

Phân bổ 120 cases:
| Category | Số lượng | Evidence Label | Nguồn |
|---|---|---|---|
| DIRECT | 72 (60%) | SUFFICIENT | Sinh từ chunks |
| PARAPHRASED | 24 (20%) | SUFFICIENT | Sinh từ chunks, diễn đạt lại |
| ADVERSARIAL | 12 (10%) | INSUFFICIENT | **Tạo thủ công** — câu hỏi hợp lệ nhưng tài liệu không đủ |
| OUT_OF_SCOPE | 12 (10%) | OUT_OF_SCOPE | **Tạo thủ công** — hoàn toàn ngoài phạm vi |

Script sinh DIRECT + PARAPHRASED tự động, output JSON draft. User phải:
1. Review và chỉnh sửa câu hỏi tự động
2. **Tự viết 24 câu ADVERSARIAL + OUT_OF_SCOPE** (đánh dấu `"auto_generated": false`)
3. Confirm dataset version

#### ⚠️ R-21 — Đọc chunks từ Chroma, không từ Supabase

> **R-21 mitigation**: Question generator đọc chunks đã ingest từ Chroma thay vì raw files từ Supabase Storage. Tránh dependency vào network/credentials.

```python
def _load_chunks_from_chroma(workspace_id: str) -> list[dict]:
    """Load all chunks for workspace from ChromaDB."""
    client = get_chroma_client()
    collection = client.get_collection(COLLECTION_NAME)
    results = collection.get(
        where={"workspace_id": {"$eq": workspace_id}},
        include=["documents", "metadatas"],
    )
    return [
        {"text": doc, "metadata": meta}
        for doc, meta in zip(results["documents"], results["metadatas"])
    ]
```

---

### ⚠️ R-12 — Evaluation runner: Rate limiter + checkpoint/resume

#### [NEW] `ai-service/app/evaluation/runner.py`

> **R-12 mitigation**: 240 Gemini calls có thể bị throttle. Thêm rate limiter, backoff, và checkpoint để resume.

```python
class EvaluationRunner:
    RATE_LIMIT_RPM = 10           # Max 10 requests/minute (safe cho free tier)
    CHECKPOINT_INTERVAL = 10      # Save checkpoint mỗi 10 cases
    MAX_RETRIES_PER_CASE = 2      # Retry 2 lần cho 429/5xx

    def run_paired(self, dataset: list[EvaluationCase], ...) -> list[EvaluationResult]:
        results = self._load_checkpoint(run_id)  # Resume nếu có
        remaining = [c for c in dataset if c.case_id not in completed_ids]

        for i, case in enumerate(remaining):
            # Rate limiting
            self._wait_for_rate_limit()

            # Run baseline + adaptive
            baseline_result = self._run_single(case, branch="BASELINE", ...)
            adaptive_result = self._run_single(case, branch="ADAPTIVE", ...)

            results.extend([baseline_result, adaptive_result])

            # Checkpoint
            if (i + 1) % self.CHECKPOINT_INTERVAL == 0:
                self._save_checkpoint(run_id, results)

        return results

    def _run_single(self, case, branch, retries=0):
        try:
            # ... retrieval + generation logic
            pass
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (429, 500, 502, 503) and retries < self.MAX_RETRIES_PER_CASE:
                wait = 2 ** retries * 5  # Exponential backoff: 5s, 10s
                time.sleep(wait)
                return self._run_single(case, branch, retries + 1)
            raise
```

---

### ⚠️ R-13 — Bootstrap CI dùng stdlib, không numpy

#### [NEW] `ai-service/app/evaluation/metrics.py`

> **R-13 mitigation**: `numpy` không phải direct dependency. Implement bootstrap bằng `random` stdlib.

```python
import random

def paired_bootstrap_ci(
    baseline_scores: list[float],
    adaptive_scores: list[float],
    n_bootstrap: int = 1000,
    confidence: float = 0.95,
) -> tuple[float, float, float]:
    """Paired bootstrap CI cho chênh lệch, dùng stdlib random."""
    n = len(baseline_scores)
    diffs = []
    for _ in range(n_bootstrap):
        indices = [random.randint(0, n - 1) for _ in range(n)]
        b_sample = [baseline_scores[i] for i in indices]
        a_sample = [adaptive_scores[i] for i in indices]
        diff = sum(a_sample) / n - sum(b_sample) / n
        diffs.append(diff)
    diffs.sort()
    alpha = (1 - confidence) / 2
    lo = diffs[int(alpha * n_bootstrap)]
    hi = diffs[int((1 - alpha) * n_bootstrap)]
    mean_diff = sum(diffs) / len(diffs)
    return mean_diff, lo, hi
```

Các metric khác (intent F1, confusion matrix, source hit@K, MRR, refusal F1, latency p50/p95) — implement thuần Python, không dependency ngoài.

---

### ⚠️ R-14 — Answer score: 2-pass (auto metrics + manual grading)

#### [NEW] `ai-service/app/evaluation/report.py`

> **R-14 mitigation**: Answer score rubric (0-2) cần human judgment. Tách thành 2 pass.

**Pass 1 (automated)**: Runner tính tất cả auto-gradeable metrics:
- Intent accuracy, source hit@K, MRR, citation accuracy, locator accuracy, refusal F1, latency, tokens
- Answer score = `null` (chưa grading)

**Pass 2 (manual)**: User mở results JSONL, thêm `answer_score` cho mỗi case:
```bash
# Xuất results cần grading
python -m app.evaluation.grading_export --run-id <ID> --output grading_sheet.json

# User mở grading_sheet.json, thêm answer_score (0/1/2) cho mỗi case
# Import lại
python -m app.evaluation.grading_import --run-id <ID> --input grading_sheet.json
```

Report generator kiểm tra: nếu có `answer_score` → tính mean/per-intent. Nếu không → ghi "Pending manual grading".

---

### Các files evaluation còn lại (không thay đổi so với plan v1)

- `ai-service/app/evaluation/dataset.py` — Load/validate 120 cases
- `ai-service/app/evaluation/calibration.py` — Grid search development set
- `ai-service/app/evaluation/labeling_guide.md` — Hướng dẫn gán nhãn

---

## Phase 3: Tối ưu RAG Pipeline

### ⚠️ R-04 — Refactor LLM provider sang `google-genai` SDK

#### [MODIFY] [llm_provider.py](file:///d:/codex-workspace/unichat/ai-service/app/core/rag/llm_provider.py)

> [!WARNING]
> **R-04 mitigation**: Code hiện dùng raw httpx + truyền API key trong URL. Refactor sang `google-genai==2.11.0` (đã installed) + đọc `GEMINI_MODEL` từ env.

```python
from google import genai

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

def call_gemini_api(system_prompt: str, question: str) -> tuple[str, str]:
    """Call Gemini via official SDK — không leak API key trong URL."""
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=f"{system_prompt}\n\nCÂU HỎI: {question}",
    )
    return response.text, GEMINI_MODEL
```

Thay đổi key:
- **Khóa 1 model** từ env `GEMINI_MODEL` (mặc định `gemini-2.5-flash`)
- Không try 4 models
- API key không xuất hiện trong URL/log
- SDK có built-in retry cho transient errors
- Fallback policy đúng spec §8: chỉ cho timeout/429/5xx, không cho validation/auth/safety

#### [MODIFY] [retrieval.py](file:///d:/codex-workspace/unichat/ai-service/app/api/v1/retrieval.py)

Thêm `provider_model` từ AI response vào trace (để Core API có thể đọc).

---

### ⚠️ R-08 — Core API đọc provider từ AI response

#### [MODIFY] [ChatService.java](file:///d:/codex-workspace/unichat/core-api/src/main/java/com/unichat/core/chat/service/ChatService.java)

> **R-08 mitigation**: Không hardcode `"gemini-3.5-flash"`. Đọc `provider` từ AI response.

```java
// TRƯỚC (line 138):
// new Message(..., "gemini-3.5-flash", ...)

// SAU:
String providerModel = (String) aiResponse.getOrDefault("provider", "unknown");
Message assistantMessage = new Message(
    assistantMessageId, conversation.getId(), "ASSISTANT",
    assistantContent, intent, refusalCode, providerModel, Instant.now(clock)
);
```

Cũng thêm `configHash` và `evidenceScore` vào `RetrievalAnswerResponse` để frontend có thể hiển thị.

---

### Các thay đổi RAG pipeline khác (giữ nguyên từ plan v1)

#### [MODIFY] [intent_detector.py](file:///d:/codex-workspace/unichat/ai-service/app/core/rag/intent_detector.py)
- Load patterns từ YAML, negative_patterns, priority ordering, cache config + hash

#### [MODIFY] [retrieval_engine.py](file:///d:/codex-workspace/unichat/ai-service/app/core/rag/retrieval_engine.py)
- ⚠️ R-03: **Bỏ** filter `documentStatus` trong Chroma query (metadata có thể stale). Thay vào đó, tin tưởng `allowedDocumentIds` từ Core API (đã filter PROCESSED)
- Sort candidates by similarity descending

#### [MODIFY] [citation_validator.py](file:///d:/codex-workspace/unichat/ai-service/app/core/rag/citation_validator.py)
- Kiểm tra locator format hợp lệ
- Return chi tiết lỗi (không chỉ bool)

#### [MODIFY] [retrieval_trace.py](file:///d:/codex-workspace/unichat/ai-service/app/core/rag/retrieval_trace.py)
- ⚠️ R-06: Thêm đầy đủ fields spec §10: `promptTokens`, `promptVersion`, `providerModel`, `coverageScore`
- Giữ `logger.info()` cho production logging
- Evaluation framework dùng `EvaluationStore.save_trace()` riêng (Phase 2)

---

### ⚠️ R-05, R-07, R-17 — Tech debt log (không block benchmark)

#### [MODIFY] [.pipeline/decisions-log.md](file:///d:/codex-workspace/unichat/.pipeline/decisions-log.md)

Ghi nhận tech debt không thuộc scope benchmark nhưng cần fix trước production:

```markdown
## Tech Debt — Benchmark Scope Exclusions

- **R-05**: `security.py` bypass JWT trong local/test. Cần implement
  RS256 verification + replay detection trước deploy.
- **R-07**: `ChatService.askQuestion()` không reauthorize trước persist.
  Cần thêm `validateAccess()` sau AI call, trước save.
- **R-17**: `ChatService` không gửi service JWT khi gọi AI Service.
  Cần implement service JWT signing trong Core API.
```

---

## Phase 4: Benchmark Suite & Evidence

#### [NEW] `ai-service/app/evaluation/benchmark_suite.py`

Full benchmark pipeline (cập nhật theo risk mitigations):

```
1. Verify ChromaDB connectivity (⚠️ R-02)
2. Load evaluation dataset, validate 120 cases (⚠️ R-10 categories)
3. Run chunking benchmark: v1 collection vs v2 collection (⚠️ R-18)
4. Run paired evaluation — rate limited (⚠️ R-12), Gemini-only (Q4)
5. Compute auto metrics (⚠️ R-13 stdlib bootstrap)
6. Save to JSON local (⚠️ R-06/R-15)
7. Generate report with "Pending manual grading" note (⚠️ R-14)
8. Export grading sheet for manual answer scoring
```

#### [MODIFY] [eval.py](file:///d:/codex-workspace/unichat/ai-service/app/api/v1/eval.py)

Endpoints — tất cả đọc/ghi JSON local (không PostgreSQL):
- `POST /eval/run` → trigger benchmark suite
- `POST /eval/generate-questions` → semi-auto question generator
- `GET /eval/runs` → list runs từ `data/evaluation/runs/`
- `GET /eval/runs/{runId}/results` → results từ JSONL
- `GET /eval/runs/{runId}/report` → generated markdown report

#### [NEW] `docs/evaluation/` — Evidence artifacts (giữ nguyên)

---

## Risk Mitigation Traceability

| Risk ID | Mitigation | Phase | File(s) affected |
|---|---|---|---|
| R-01 | Heuristic text heading (không font) | 1 | `text_extractor.py` |
| R-02 | Preflight compatibility test | 0 | Script thủ công |
| R-03 | Thêm metadata + tin tưởng allowedDocIds | 1, 3 | `vector_store.py`, `retrieval_engine.py` |
| R-04 | Refactor sang `google-genai` SDK | 3 | `llm_provider.py` |
| R-05 | Tech debt log | 3 | `decisions-log.md` |
| R-06 | JSON local storage cho traces | 2 | `evaluation/storage.py` |
| R-07 | Tech debt log | 3 | `decisions-log.md` |
| R-08 | Đọc provider từ AI response | 3 | `ChatService.java` |
| R-09 | Rotate secrets + .gitignore | 0 | `.gitignore`, `.env` |
| R-10 | 4 question categories (adversarial) | 2 | `question_generator.py` |
| R-11 | Chuẩn bị tài liệu song song | 0 | Thủ công |
| R-12 | Rate limiter + checkpoint/resume | 2 | `evaluation/runner.py` |
| R-13 | Bootstrap stdlib `random` | 2 | `evaluation/metrics.py` |
| R-14 | 2-pass answer scoring | 2 | `evaluation/report.py` |
| R-15 | JSON local thay PostgreSQL | 2 | `evaluation/storage.py` |
| R-16 | Endpoints trên AI Service (pragmatic) | 4 | `eval.py` |
| R-17 | Tech debt log | 3 | `decisions-log.md` |
| R-18 | Dual collection v1/v2 + re-ingest | 1 | `vector_store.py`, `reingest.py` |
| R-19 | `source_group = document_id` | 1 | `vector_store.py` |
| R-20 | Pre-cache embedding model | 0 | Script thủ công |
| R-21 | Đọc chunks từ Chroma | 2 | `question_generator.py` |
| R-22 | Test song song mỗi file | 1–4 | Tất cả test files |

---

## Verification Plan

### Automated Tests (cập nhật)

```bash
# Phase 1
cd ai-service
python -m pytest app/tests/test_chunker_hybrid.py -v
python -m pytest app/tests/test_sentence_splitter.py -v
python -m pytest app/tests/test_text_extractor_heading.py -v  # ⚠️ R-01

# Phase 2
python -m pytest app/tests/test_evaluation_storage.py -v      # ⚠️ R-06/R-15
python -m pytest app/tests/test_evaluation_metrics.py -v       # ⚠️ R-13
python -m pytest app/tests/test_evaluation_runner.py -v        # ⚠️ R-12
python -m pytest app/tests/test_question_generator.py -v       # ⚠️ R-10

# Phase 3
python -m pytest app/tests/test_intent_detector_yaml.py -v
python -m pytest app/tests/test_llm_provider_sdk.py -v         # ⚠️ R-04
python -m pytest app/tests/test_citation_validator_enhanced.py -v

# Full suite — must pass 80% coverage (⚠️ R-22)
python -m pytest app/tests/ -v --cov=app --cov-report=html
```

### Acceptance Criteria (giữ nguyên) + Benchmark Targets (giữ nguyên)

| Metric | Target |
|---|---|
| Intent macro-F1 | ≥ 0.80 |
| Citation source accuracy | ≥ 0.90 |
| Locator accuracy | ≥ 0.85 |
| Claim support rate | ≥ 0.90 |
| Refusal F1 | ≥ 0.80 |
| Adaptive vs Baseline | ≥ 5% trên ít nhất 1 metric chính |
| p95 latency increase | ≤ 25% |
| Prompt tokens increase | ≤ 25% |
