# 🧪 Hướng dẫn Chạy Bộ Automation Test (E2E & Quay Video)

> Tài liệu hướng dẫn dành cho thành viên phát triển & tester chạy bộ kiểm thử tự động End-to-End cho dự án UniChat AI Knowledge Platform.

---

## 📌 1. Giới thiệu Bộ Automation Test

Bộ kiểm thử tự động nằm tại thư mục `automation-tests/` sử dụng framework **Playwright E2E** kết hợp với engine kiểm tra truy cập **Axe Core**.

### ✨ Tính năng nổi bật:
- 🎬 **Tự động quay Video màn hình (`.webm`)** cho 100% kịch bản kiểm thử.
- 📊 **Xuất Báo cáo HTML giao diện đẹp**, hỗ trợ xem lại luồng chạy và video trực tiếp.
- ♿ **Kiểm tra chuẩn tiếp cận WCAG2AA** tự động cho giao diện web.
- ⚡ **Tự động khởi chạy Dev Server** nếu dịch vụ frontend chưa bật.

---

## 🛠️ 2. Yêu cầu Môi trường (Prerequisites)

Trước khi chạy, hãy đảm bảo máy tính đã cài đặt:
1. **Node.js**: Phiên bản 18+ trở lên.
2. **NPM**: Đi kèm Node.js.

---

## 🚀 3. Khởi tạo & Cài đặt Lần đầu

Mở Terminal (PowerShell / Command Prompt / Git Bash) tại thư mục gốc của project:

### Bước 1: Di chuyển vào thư mục automation-tests
```bash
cd automation-tests
```

### Bước 2: Cài đặt Trình duyệt Chromium cho Playwright (Chỉ cần làm 1 lần đầu)
```bash
npx playwright install chromium
```

---

## 🏃 4. Các Lệnh Chạy Kiểm thử (Test Execution)

Bạn có thể chạy kiểm thử theo các chế độ sau:

### 🟢 Cách 1: Chạy toàn bộ Test ở chế độ Ẩn (Headless Mode - Nhanh nhất & Tự động quay Video)
```bash
npm run test
```

### 🔵 Cách 2: Chạy có Giao diện Trình duyệt bật lên (Headed Mode - Để quan sát thực tế)
```bash
npm run test:headed
```

### 🟡 Cách 3: Chạy riêng 1 file kịch bản (Spec) cụ thể
```bash
# Chạy riêng kịch bản Trang chủ & Branding
npx playwright test specs/01-landing-page.spec.ts

# Chạy riêng kịch bản Navigation & Auth Guard
npx playwright test specs/02-workspace-navigation.spec.ts
```

---

## 📺 5. Xem Báo cáo Trực quan & Tệp Video Quay lại

Sau khi chạy xong, bộ test tự động tạo báo cáo và tệp video tại thư mục `automation-tests/reports/`:

### 🎨 5.1 Mở Báo cáo HTML tương tác trên Trình duyệt:
Chạy lệnh sau ngay tại thư mục `automation-tests/`:
```bash
npm run report
```
*(Trình duyệt sẽ tự động mở giao diện báo cáo chi tiết từng bước, ảnh chụp màn hình và video quay lại của từng test case).*

### 🎥 5.2 Vị trí tệp Video màn hình `.webm`:
Tất cả các video quay lại quá trình chạy trình duyệt được lưu tại:
```
automation-tests/reports/test-results/
```
- Mở thư mục này và nhấp đúp vào bất kỳ file `.webm` nào để xem lại video phát từng bước click, gõ chữ của robot.

### 📝 5.3 Báo cáo tóm tắt định dạng Markdown:
Xem file báo cáo tổng hợp nhanh tại:
```
automation-tests/reports/AUTOMATION_TEST_REPORT.md
```

---

## 📋 6. Danh sách các Kịch bản Kiểm thử (Test Inventory)

| File Spec | Kịch bản | Nội dung kiểm thử | Video Output |
|---|---|---|---|
| `specs/01-landing-page.spec.ts` | **Landing Page & Branding** | Kiểm tra hiển thị tiêu đề `UniChat`, badge `UniChat v1.0`, nút bấm CTA và quét chuẩn tiếp cận WCAG2AA | `video-1.webm` |
| `specs/02-workspace-navigation.spec.ts` | **Redirect Guard** | Kiểm tra tự động chuyển hướng khách chưa đăng nhập từ `/workspaces` về `/login` | `video-2.webm` |
| `specs/02-workspace-navigation.spec.ts` | **Login Form** | Kiểm tra hiển thị form đăng nhập, ô Email & Password | `video-3.webm` |
| `specs/03-document-management.spec.ts` | **Document Management UI** | Kiểm tra vùng upload zone, các nhãn định dạng tệp PDF, DOCX, TXT | `video-4.webm` |
| `specs/04-chat-rag-interface.spec.ts` | **RAG Chat Preview** | Kiểm tra giao diện xem trước RAG Chat, badge trích dẫn `[1]`, `[2]` và ô nhập prompt | `video-5.webm` |

---

## ❓ 7. Xử lý Lỗi Thường gặp (Troubleshooting)

1. **Lỗi: `browserType.launch: Executable doesn't exist`**
   - **Khắc phục**: Chạy lệnh `npx playwright install chromium` tại thư mục `automation-tests/`.

2. **Lỗi: `net::ERR_CONNECTION_REFUSED at http://localhost:5173`**
   - **Khắc phục**: Playwright sẽ tự động bật frontend dev server. Nếu muốn chạy thủ công, hãy mở 1 terminal riêng tại `frontend/` và gõ `npm run dev` trước khi chạy test.
