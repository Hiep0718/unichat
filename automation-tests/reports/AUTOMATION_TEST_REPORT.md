# Báo cáo Kiểm thử Tự động (Automation Test Report)

> **Dự án**: UniChat AI Knowledge Platform  
> **Thư mục bộ test**: `automation-tests/`  
> **Công cụ**: Playwright E2E + Axe Accessibility Engine  
> **Thời gian thực thi**: 2026-08-15  

---

## 1. Tổng quan Kết quả Thực thi

| Chỉ số | Chi tiết |
|---|---|
| **Tổng số kịch bản (Test Cases)** | **5/5 Passed (100%)** |
| **Tự động quay Video** | ✅ **Bật (`video: 'on'`)** — Lưu file `.webm` cho từng test |
| **Báo cáo HTML trực quan** | ✅ `automation-tests/reports/html-report/index.html` |
| **Báo cáo JSON dữ liệu** | ✅ `automation-tests/reports/test-results.json` |
| **Ảnh chụp màn hình (Screenshots)** | ✅ `automation-tests/reports/test-results/` |
| **Thời gian thực thi trung bình** | ~2.1 giây / test case |

---

## 2. Danh sách các Test Case & Kết quả

| STT | Suite | Tên Test Case | Mô tả kiểm thử | Video Recording | Trạng thái |
|---|---|---|---|---|---|
| 1 | `01-landing-page.spec.ts` | **Landing Page & Branding** | Kiểm tra load trang chủ, tiêu đề, logo, badge `UniChat v1.0`, nút CTA và WCAG2AA accessibility scan | `video-1.webm` | ✅ **PASSED** |
| 2 | `02-workspace-navigation.spec.ts` | **Navigation Redirect Guard** | Kiểm tra chuyển hướng tự động khách chưa đăng nhập từ `/workspaces` về `/login` | `video-2.webm` | ✅ **PASSED** |
| 3 | `02-workspace-navigation.spec.ts` | **Login Form Layout** | Kiểm tra giao diện form đăng nhập, ô nhập Email và Password | `video-3.webm` | ✅ **PASSED** |
| 4 | `03-document-management.spec.ts` | **Document Management UI** | Kiểm tra vùng tải tài liệu upload zone, hỗ trợ định dạng PDF, DOCX, TXT | `video-4.webm` | ✅ **PASSED** |
| 5 | `04-chat-rag-interface.spec.ts` | **RAG Chat Mockup Preview** | Kiểm tra giao diện xem trước RAG Chat, trích dẫn tri thức [1], [2] và ô nhập câu hỏi | `video-5.webm` | ✅ **PASSED** |

---

## 3. Cấu trúc Thư mục Bộ Automation Test Mới

```
automation-tests/
├── package.json                   # Command runner scripts (npm run test)
├── playwright.config.ts           # Cấu hình tự động quay video & HTML report
├── specs/                         # Danh sách test cases
│   ├── 01-landing-page.spec.ts
│   ├── 02-workspace-navigation.spec.ts
│   ├── 03-document-management.spec.ts
│   └── 04-chat-rag-interface.spec.ts
└── reports/                       # Thư mục chứa Báo cáo & Video
    ├── AUTOMATION_TEST_REPORT.md  # Báo cáo tổng hợp này
    ├── html-report/               # HTML Report Playwright
    │   └── index.html
    ├── test-results.json          # Raw JSON kết quả test
    └── test-results/              # Thư mục lưu file Video (.webm) & Screenshot
```

---

## 4. Hướng dẫn Chạy Bộ Automation Test & Xem Video

### 4.1 Chạy bộ test tự động:
```bash
cd automation-tests
npm run test
```

### 4.2 Xem Báo cáo HTML & Video trên trình duyệt:
```bash
cd automation-tests
npm run report
```

---

## 5. Kết luận

Bộ automation test mới tại thư mục `automation-tests/` đã được thiết lập hoàn chỉnh, tự động kích hoạt trình duyệt Chromium, thực thi toàn bộ kịch bản E2E, **tự động quay video màn hình `.webm`** và xuất báo cáo đa dạng (HTML, JSON, Markdown).
