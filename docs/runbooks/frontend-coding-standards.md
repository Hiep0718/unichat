# Quy Chuẩn Coding Frontend (Vite + React + TypeScript) — UniChat

Tài liệu này xác định các quy tắc phát triển, cấu trúc thư mục, quy ước đặt tên và tiêu chuẩn chất lượng code cho phân hệ Frontend của dự án UniChat. Toàn bộ lập trình viên (bao gồm các thành viên trong nhóm và AI) bắt buộc phải tuân thủ để đảm bảo code sạch, đồng bộ và dễ bảo trì.

---

## 1. Nguyên Tắc Cốt Lõi (Senior Engineering Standards)

* **TypeScript Strict**: Luôn cấu hình `strict: true` trong `tsconfig.json`. Tuyệt đối không dùng kiểu `any`, không ép kiểu cưỡng chế (như `as any` hoặc `!`) trừ khi có lý do bất khả kháng và phải comment giải thích.
* **Quy tắc 30 - 60 - 300**:
  * **Hàm xử lý thuần logic**: Không vượt quá **30 dòng**.
  * **Hàm Render (JSX)**: Không vượt quá **60 dòng** JSX, giới hạn tối đa tuyệt đối là **100 dòng**. Nếu vượt quá, bắt buộc phải tách component con.
  * **Độ dài tệp tin**: Một file code không vượt quá **300 dòng**. Các file cấu hình đặc biệt, schema phức tạp hoặc giao diện UI trang chính có thể mở rộng tối đa **500 dòng**.
* **Độ sâu lồng nhau (Nesting levels)**: Tối đa **3 cấp lồng nhau** (như `if`, `for`, `map`). Sử dụng kỹ thuật **Early Return** (trả về sớm) để giữ code phẳng.
* **Khai báo biến**: Luôn dùng `const`. Chỉ dùng `let` khi thực sự cần thay đổi giá trị. **Không bao giờ** sử dụng `var`.
* **Thông tin người dùng**: Đảm bảo hiển thị đầy đủ tiếng Việt có dấu trong giao diện.
* **Ghi log**: Không sử dụng `console.log` trong môi trường Production. Sử dụng một logger được đóng gói hoặc wrapper tùy biến.

---

## 2. Quy Ước Đặt Tên (Naming Conventions)

Để tránh lộn lộn giữa các hệ điều hành (như Windows không phân biệt chữ hoa/thường nhưng Linux có phân biệt), quy ước đặt tên file và thư mục được chốt như sau:

* **Tên thư mục & Tên file**: Luôn dùng **kebab-case** (chữ thường, ngăn cách bởi dấu gạch ngang).
  * *Hợp lệ*: `user-profile.tsx`, `auth-api.ts`, `question-form/`.
  * *Không hợp lệ*: `UserProfile.tsx`, `authApi.ts`, `QuestionForm/`.
* **Tên Component React & Types/Interfaces**: Dùng **PascalCase**.
  * *Ví dụ*: `const UserProfile = () => {}`, `interface UserProfileProps {}`.
* **Tên Hàm & Biến**: Dùng **camelCase**.
  * *Ví dụ*: `const userData = ...`, `function fetchWorkspaceList() {}`.
* **Tên File Kiểm Thử (Tests)**: Trùng tên với file cần test kèm đuôi `.spec.ts` hoặc `.spec.tsx`.
  * *Ví dụ*: `workspace-form.spec.tsx` nằm cùng thư mục với `workspace-form.tsx`.

---

## 3. Cấu Trúc Thư Mục Theo Tính Năng (Feature-based)

Dự án áp dụng cấu trúc **Feature-based** (chia theo tính năng nghiệp vụ) thay vì Layer-based (chia theo components/hooks/pages ở root). Mỗi feature nằm trong thư mục `src/features/<feature-name>/`.

### 3.1. Cấu trúc một thư mục Feature
Mỗi thư mục feature cần có cấu trúc tự đóng gói như sau:
```text
src/features/workspaces/
├── components/                 # Các component chỉ dùng riêng cho feature này
│   ├── workspace-card.tsx
│   └── workspace-form.tsx
├── hooks/                      # Custom hooks riêng cho feature
│   └── use-workspace-query.ts
├── workspace-api.ts            # Các hàm gọi API (Fetch/Axios)
├── workspace-schema.ts         # Zod schemas để validate dữ liệu đầu vào/ra
├── index.ts                    # Public Barrel file - xuất bản các component cần dùng bên ngoài
└── workspace-list-page.tsx     # Component trang chính (Route Page)
```

> [!IMPORTANT]
> **Quy tắc Barrel file (`index.ts`)**:
> `index.ts` ở thư mục gốc của feature đóng vai trò làm cổng giao tiếp duy nhất ra ngoài. Chỉ export những gì các thư mục khác cần (ví dụ: Page component hoặc AuthContext). Không import trực tiếp từ file con của feature khác.
> * *Hợp lệ*: `import { LoginCard } from '@/features/auth'`
> * *Không hợp lệ*: `import { LoginCard } from '@/features/auth/components/login-card'`

### 3.2. Cấu trúc thư mục Src tổng thể
```text
src/
├── app/                        # Nơi chứa Router, Providers và layout tổng của ứng dụng
│   ├── app-router.tsx          # Khai báo routes (sử dụng lazy load)
│   ├── app-providers.tsx       # Bọc các provider (QueryClient, Auth, ErrorBoundary)
│   └── app-shell.tsx           # Layout khung chính của ứng dụng
├── assets/                     # Ảnh, icon tĩnh
├── components/                 # Các component dùng chung toàn hệ thống (Button, Input, Modal...)
├── features/                   # Thư mục chứa các features nghiệp vụ (auth, workspaces, chat...)
├── lib/                        # Khởi tạo các client thư viện (api-client.ts, query-client.ts)
├── styles/                     # Chứa css toàn cục (index.css)
└── types/                      # Định nghĩa kiểu dùng chung toàn hệ thống
```

---

## 4. Quy Chuẩn Giao Diện & CSS (Styling)

* **Phương pháp**: Sử dụng **Vanilla CSS** kết hợp với các biến CSS (Design Tokens) để tăng hiệu năng và kiểm soát giao diện. Tránh dùng ad-hoc style trực tiếp (inline styles).
* **CSS Variable (Tokens)**: Toàn bộ màu sắc, font chữ, border-radius, khoảng cách (spacing) phải được định nghĩa tập trung trong `src/styles/index.css`.
  ```css
  :root {
    --color-primary: #1e40af;
    --color-background-dark: #0f172a;
    --spacing-md: 16px;
    --radius-sm: 4px;
  }
  ```
* **Không dùng TailwindCSS**: Trừ khi có sự thống nhất và phê duyệt riêng từ kiến trúc hệ thống.
* **Responsive**: Mọi layout chính phải thiết kế Mobile-first hoặc Responsive sử dụng `@media` query rõ ràng.

---

## 5. Gọi API & Xử Lý Lỗi (API Integration)

* **API Client**: Sử dụng fetch client chung được định nghĩa tại `src/lib/api-client.ts` để tự động đính kèm JWT Access Token và xử lý refresh token xoay vòng tự động.
* **Xử lý lỗi chuẩn RFC 7807**: Tất cả phản hồi lỗi từ Spring Boot Core API đều tuân thủ định dạng RFC 7807. Frontend phải có một bộ mapper để phân tích lỗi và hiển thị thông báo thân thiện:
  * Lỗi validate form $\rightarrow$ Map trực tiếp vào các trường input lỗi tương ứng.
  * Lỗi hệ thống $\rightarrow$ Hiển thị qua Error Alert/Toast hoặc chuyển hướng đến trang lỗi.
* **Validate dữ liệu với Zod**: Sử dụng Zod để định nghĩa schema và validate dữ liệu từ Form trước khi gửi lên API, hoặc validate dữ liệu nhận về nếu cần kiểm soát chặt chẽ.

---

## 6. State Management

* **Server State (Dữ liệu từ API)**: Sử dụng **React Query** (TanStack Query) để quản lý cache, retry, trạng thái loading/error. Tránh đưa dữ liệu API vào global state hoặc local state thủ công.
* **Local State (Trạng thái giao diện)**: Sử dụng `useState` hoặc `useReducer` của React.
* **Global UI State**: Sử dụng React Context API cho các dữ liệu ít thay đổi (như trạng thái đăng nhập `AuthContext`, cấu hình theme). **Không cài đặt Redux hoặc Zustand** trừ khi được phê duyệt qua tài liệu ADR của hệ thống.

---

## 7. Thứ Tự Import (Import Order)

Để tránh file code lộn xộn và dễ xung đột git, hãy sắp xếp các lệnh import theo thứ tự sau (phân cách bằng một dòng trống):
1. **External Libraries**: Các thư viện ngoài (React, React Query, React Router, Zod...).
2. **Internal Absolute Components/Services**: Các module dùng chung trong project (`@/components`, `@/lib`...).
3. **Relative Imports**: Các file trong cùng thư mục (`./`, `../`).
4. **Type Imports**: Chỉ import kiểu dữ liệu (`import type { User } from ...`).

---

## 8. Quy Trình Trước Khi Commit & Đẩy Code (Git Delivery Gate)

Trước khi commit và push code lên GitHub, hãy đảm bảo chạy các lệnh kiểm tra sau tại máy local:
1. **Định dạng code**:
   ```bash
   npm run lint
   ```
2. **Kiểm tra TypeScript kiểu**:
   ```bash
   npm run typecheck
   ```
3. **Chạy kiểm thử unit test**:
   ```bash
   npm run test
   ```

* **Commit Message**: Sử dụng chuẩn **Conventional Commits**:
  * `feat: ...` (tính năng mới)
  * `fix: ...` (sửa lỗi)
  * `docs: ...` (tài liệu)
  * `style: ...` (định dạng code, css, không đổi logic)
  * `refactor: ...` (tái cấu trúc code)
  * `test: ...` (thêm hoặc sửa test)

---

## 9. Bài Học Kinh Nghiệm & Khắc Phục Lỗi CI Thường Gặp (CI Troubleshooting)

Dưới đây là tổng hợp các nguyên nhân phổ biến khiến hệ thống CI (GitHub Actions) thất bại khi tạo Pull Request và cách phòng tránh:

### 9.1. Lỗi `npm ci` fail vì `package-lock.json` không đồng bộ
* **Nguyên nhân**: Khi cài đặt thêm thư viện mới (ví dụ `npm install <package> --workspace frontend`), file `frontend/package.json` được cập nhật nhưng lập trình viên **quên commit** file `package-lock.json` ở thư mục gốc (root workspace). Lệnh `npm ci` trên CI rất khắt khe, nếu phát hiện sự bất đồng bộ giữa `package.json` và `package-lock.json`, nó sẽ báo lỗi và dừng tiến trình ngay lập tức.
* **Cách khắc phục**: Luôn chạy `git status` ở thư mục gốc và đảm bảo đã `git add package-lock.json` mỗi khi có thay đổi về dependencies.

### 9.2. Lỗi Typecheck (TypeScript) khi import CSS từ node_modules
* **Nguyên nhân**: Import một package thuần CSS bằng cú pháp `import '@fontsource-variable/inter';` có thể hoạt động tốt trên Vite (do Vite tự resolve), nhưng `tsc` (TypeScript compiler) sẽ báo lỗi `Cannot find module or type declarations` vì không tìm thấy file `.d.ts`.
* **Cách khắc phục**: Khai báo rõ đuôi `.css` trong lệnh import (ví dụ: `import '@fontsource-variable/inter/index.css';`). TypeScript sẽ áp dụng module wildcard `declare module '*.css'` có sẵn để bỏ qua cảnh báo.

### 9.3. Lỗi Unit Test (RTL / Vitest) do Lazy Loading và Suspense
* **Nguyên nhân**: Khi tái cấu trúc ứng dụng sang React Router với `React.lazy()` và `<Suspense>`, component sẽ mất một khoảng thời gian nhỏ (bất đồng bộ) để tải chunk JavaScript. Nếu Unit test sử dụng các lệnh truy vấn đồng bộ như `screen.getByRole()` hay `screen.getByText()`, nó sẽ bị thất bại do lúc đó DOM chỉ đang hiển thị Fallback (ví dụ: chữ "Đang tải...").
* **Cách khắc phục**: Chuyển sang sử dụng các truy vấn bất đồng bộ `await screen.findByRole()` hoặc `await waitFor(...)` để chờ đến khi giao diện thực sự được render xong.

### 9.4. Lỗi ESLint (Lint)
* **Nguyên nhân**: Bỏ quên các lệnh `console.log(...)` dùng để debug, hoặc sử dụng kiểu dữ liệu `any` trong TypeScript.
* **Cách khắc phục**: Luôn luôn chạy lệnh `npm run lint` ở máy local trước khi commit. Đổi `any` thành `unknown` hoặc một Generic type cụ thể. Xóa bỏ hoàn toàn `console.log` trước khi push code.

### 9.5. Lỗi fail dây chuyền từ Dependency Audit Policy
* **Nguyên nhân**: Nhánh tính năng (feature branch) được tách ra từ nhánh `main` ở một thời điểm cũ (trước khi các bản vá lỗi CI/CD được merge). Điều này khiến nhánh tính năng vẫn sử dụng kịch bản CI cũ gây ra lỗi "False positive" (báo lỗi sai).
* **Cách khắc phục**: Thường xuyên đồng bộ (`git rebase main` hoặc `git merge main`) vào nhánh tính năng của bạn để cập nhật những thay đổi mới nhất về cấu trúc hạ tầng và kịch bản CI/CD.
