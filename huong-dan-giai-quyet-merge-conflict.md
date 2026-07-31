# Hướng Dẫn Giải Quyết Merge Conflict — PR #12

> **Ngày xảy ra**: 29/07/2026  
> **PR bị ảnh hưởng**: PR #12 `feat/rls-defense-in-depth` → `main`  
> **Số file bị conflict**: 5 files

---

## 📚 Giải Thích Thuật Ngữ Trước Khi Đọc

Trước khi đi vào vấn đề, hãy hiểu rõ các thuật ngữ Git sẽ xuất hiện trong tài liệu này:

| Thuật ngữ | Giải thích dễ hiểu |
|-----------|---------------------|
| **Branch** | Một "nhánh" code riêng biệt. Giống như bạn photocopy một bộ tài liệu để chỉnh sửa riêng, bản gốc vẫn giữ nguyên. Mỗi branch là một bản sao độc lập để bạn làm việc mà không ảnh hưởng đến code chính. |
| **`main`** | Branch chính (bản gốc), chứa code ổn định nhất của dự án. Mọi tính năng hoàn thiện đều được gộp vào đây. |
| **PR (Pull Request)** | Một "yêu cầu gộp code" trên GitHub. Khi bạn hoàn thành tính năng trên branch riêng, bạn tạo PR để nhờ team review và cho phép gộp code vào `main`. |
| **Merge** | Hành động "gộp" code từ một branch vào branch khác. Ví dụ: gộp tính năng mới vào `main`. |
| **Merge Conflict** | Xung đột khi merge. Xảy ra khi 2 branch cùng sửa **cùng một dòng** trong **cùng một file**. Git không biết nên giữ phiên bản nào, nên yêu cầu bạn quyết định thủ công. |
| **Commit** | Một "bản lưu" code tại một thời điểm. Giống như bạn bấm "Save" trong game — bạn có thể quay lại bất kỳ lúc nào. |
| **Push** | Đẩy các commit từ máy tính của bạn lên GitHub (remote). |
| **Fetch** | Tải thông tin mới nhất từ GitHub về máy, nhưng **chưa** thay đổi code đang làm. Giống như "kiểm tra xem có gì mới không". |
| **Checkout** | Chuyển sang một branch khác. Giống như mở một folder khác để làm việc. |
| **Stash** | "Cất tạm" những thay đổi chưa commit. Giống như bạn đang viết dở trên giấy, gấp lại cất vào ngăn kéo để làm việc khác, rồi lấy ra viết tiếp sau. |
| **HEAD** | Vị trí hiện tại bạn đang đứng trên cây commit. Nói đơn giản: "branch bạn đang ở". |
| **`origin`** | Tên mặc định của remote repository trên GitHub. Khi bạn nói `origin/main` nghĩa là "branch main trên GitHub". |

---

## 🔍 Vấn Đề Đã Xảy Ra Là Gì?

### Bối cảnh

Dự án UniChat có nhiều người cùng làm việc trên các branch khác nhau. Hai branch quan trọng liên quan đến sự cố:

```
Branch 1: feature/workspace-list-api  (PR #10 — đã merge vào main trước đó)
    → Tính năng: Kết nối giao diện danh sách Workspace với API backend
    → Sửa các file: workspace-card.tsx, workspace-api.ts, workspace-list-page.tsx, workspace-schema.ts

Branch 2: feat/rls-defense-in-depth   (PR #12 — đang chờ merge)
    → Tính năng: Tăng cường bảo mật RLS (Row Level Security)
    → CŨNG sửa các file: workspace-card.tsx, workspace-api.ts, workspace-list-page.tsx, workspace-schema.ts
```

### Vấn đề cốt lõi

**Cả hai branch đều sửa cùng các file workspace**, nhưng theo cách khác nhau:

```
Thời gian:
─────────────────────────────────────────────────────────►

1. Cả 2 branch được tạo từ main (cùng xuất phát điểm)
2. Branch 1 (PR #10) sửa file workspace-api.ts theo cách A
3. Branch 2 (PR #12) sửa file workspace-api.ts theo cách B
4. PR #10 được merge vào main TRƯỚC ✅
5. PR #12 muốn merge vào main → BÁO CONFLICT ❌
   (vì main đã có code theo cách A, mà PR #12 lại muốn đưa code theo cách B)
```

**Hình dung đơn giản:**

```
Bạn (PR #12) và bạn đồng đội (PR #10) cùng sửa file "workspace-api.ts".
Bạn đồng đội nộp bài trước → giáo viên (main) đã nhận bản của họ.
Bạn nộp bài sau → giáo viên thấy hai bản khác nhau ở cùng chỗ → hỏi: "Giữ bản nào?"
→ Đó chính là MERGE CONFLICT.
```

### Dấu hiệu nhận biết trên GitHub

Trên trang PR #12, GitHub hiển thị:

```
⚠ This branch has conflicts that must be resolved
  Use the web editor or the command line to resolve conflicts before continuing.

  📄 .github/dependency-audit-exceptions.json
  📄 frontend/src/features/workspaces/components/workspace-card.tsx
  📄 frontend/src/features/workspaces/workspace-api.ts
  📄 frontend/src/features/workspaces/workspace-list-page.tsx
  📄 frontend/src/features/workspaces/workspace-schema.ts
```

Nút **"Merge pull request"** bị vô hiệu hóa (xám) → không thể merge cho đến khi resolve conflict.

---

## 🔧 Cách Đã Giải Quyết (Từng Bước)

### Bước 1: Cất tạm công việc đang dở (Stash)

```bash
git stash
```

**Tại sao?** Lúc đó đang ở branch `feature/workspace-list-api` và có file đang sửa dở (`WorkspaceService.java`). Cần cất tạm để chuyển branch mà không mất code.

**Kết quả:** Git lưu lại thay đổi chưa commit, working directory sạch sẽ.

---

### Bước 2: Tải thông tin mới nhất từ GitHub

```bash
git fetch origin main
git fetch origin feat/rls-defense-in-depth
```

**Tại sao?** Cần đảm bảo máy local có thông tin mới nhất của cả `main` và branch PR #12. `fetch` chỉ tải metadata, chưa thay đổi gì trên máy.

---

### Bước 3: Checkout sang branch bị conflict (PR #12)

```bash
git checkout -b feat/rls-defense-in-depth origin/feat/rls-defense-in-depth
```

**Giải thích:**
- `checkout -b`: Tạo branch mới trên máy local VÀ chuyển sang branch đó
- `origin/feat/rls-defense-in-depth`: Lấy code từ GitHub về

**Kết quả:** Bây giờ đang đứng trên branch `feat/rls-defense-in-depth` với code giống hệt trên GitHub.

---

### Bước 4: Merge main vào branch để thấy conflict

```bash
git merge origin/main
```

**Giải thích:** Lệnh này cố gắng gộp code mới nhất của `main` vào branch hiện tại. Git sẽ:
- Tự động merge được những file không xung đột ✅
- Báo CONFLICT ở những file cả hai branch cùng sửa ❌

**Kết quả Git trả về:**

```
Auto-merging .github/dependency-audit-exceptions.json
CONFLICT (content): Merge conflict in .github/dependency-audit-exceptions.json

Auto-merging frontend/src/features/workspaces/components/workspace-card.tsx
CONFLICT (content): Merge conflict in workspace-card.tsx

Auto-merging frontend/src/features/workspaces/workspace-api.ts
CONFLICT (add/add): Merge conflict in workspace-api.ts

Auto-merging frontend/src/features/workspaces/workspace-list-page.tsx
CONFLICT (content): Merge conflict in workspace-list-page.tsx

Auto-merging frontend/src/features/workspaces/workspace-schema.ts
CONFLICT (add/add): Merge conflict in workspace-schema.ts

Automatic merge failed; fix conflicts and then commit the result.
```

> **Lưu ý:** `CONFLICT (content)` nghĩa là cùng sửa nội dung, `CONFLICT (add/add)` nghĩa là cả hai branch đều thêm file mới cùng tên.

---

### Bước 5: Đọc và phân tích từng conflict

Khi mở file bị conflict, Git đánh dấu vùng xung đột bằng **conflict markers**:

```
<<<<<<< HEAD
  Code từ branch hiện tại (feat/rls-defense-in-depth)
  Đây là phiên bản CỦA BẠN
=======
  Code từ branch đang merge vào (origin/main)  
  Đây là phiên bản ĐÃ CÓ TRÊN MAIN
>>>>>>> origin/main
```

**Cách đọc:**
- `<<<<<<< HEAD` → Bắt đầu code của branch bạn đang đứng
- `=======` → Ranh giới phân cách
- `>>>>>>> origin/main` → Kết thúc code từ main

**Ví dụ thực tế** trong file `workspace-schema.ts`:

```typescript
<<<<<<< HEAD
// Phiên bản từ feat/rls-defense-in-depth (đơn giản, chỉ có schema)
import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(3, '...').max(100, '...'),
  description: z.string().max(1000, '...').optional(),
  visibility: z.enum(['PRIVATE', 'SHARED', 'PUBLIC']),
});

export type CreateWorkspaceFormValues = z.infer<typeof createWorkspaceSchema>;
=======
// Phiên bản từ main (đầy đủ: có DTO types, JSDoc, zod/v4)
import { z } from 'zod/v4';

export type WorkspaceVisibility = 'PRIVATE' | 'SHARED' | 'PUBLIC';

export interface WorkspaceDto {
  readonly id: string;
  readonly name: string;
  // ... đầy đủ các field
}

export interface PagedResponse<T> { ... }

export const createWorkspaceSchema = z.object({ ... });

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
>>>>>>> origin/main
```

---

### Bước 6: Quyết định giữ phiên bản nào

Sau khi đọc kỹ cả 5 file, đây là phân tích và quyết định:

#### File 1: `dependency-audit-exceptions.json`

| | HEAD (branch PR #12) | Main |
|---|---|---|
| SEC-DEBT-003 status | `"open"` | `"resolved"` |
| **Quyết định** | | ✅ **Giữ main** — lỗ hổng đã được fix, status đúng là "resolved" |

#### File 2: `workspace-card.tsx`

| | HEAD (branch PR #12) | Main |
|---|---|---|
| Link styling | Inline `style={{ textDecoration: 'none' }}` | CSS class (sạch hơn) |
| Menu button | ❌ Không có | ✅ Có nút "more_vert" |
| Updated time | Hiển thị raw string | Dùng `formatRelativeTime()` (ví dụ: "2 giờ trước") |
| **Quyết định** | | ✅ **Giữ main** — code chất lượng hơn |

#### File 3: `workspace-api.ts`

| | HEAD (branch PR #12) | Main |
|---|---|---|
| Types | Tự khai báo lại types trong file | Import từ `workspace-schema.ts` (DRY — không lặp code) |
| Functions | `fetchWorkspaces`, `fetchWorkspace`, `updateWorkspace` | `getWorkspaces`, `createWorkspace` với Idempotency-Key |
| JSDoc | ❌ Không có | ✅ Có đầy đủ mô tả |
| **Quyết định** | | ✅ **Giữ main** — tổ chức tốt hơn, có idempotency |

#### File 4: `workspace-list-page.tsx`

| | HEAD (branch PR #12) | Main |
|---|---|---|
| Data fetching | `useState` + `useEffect` thủ công | `useWorkspaces()` custom hook (TanStack Query) |
| Loading state | Text "Đang tải..." với inline style | `<SkeletonCard />` component đẹp |
| Error state | Inline style, basic button | CSS class `.workspace-empty`, proper styling |
| Filter buttons | Viết 4 button thủ công lặp lại | `FILTER_OPTIONS.map()` — gọn, dễ mở rộng |
| **Quyết định** | | ✅ **Giữ main** — code professional hơn nhiều |

#### File 5: `workspace-schema.ts`

| | HEAD (branch PR #12) | Main |
|---|---|---|
| Nội dung | Chỉ có Zod schema | Có `WorkspaceDto`, `PagedResponse`, `WorkspaceVisibility` type + schema |
| Zod version | `zod` | `zod/v4` (mới hơn) |
| JSDoc | ❌ Không có | ✅ Đầy đủ |
| **Quyết định** | | ✅ **Giữ main** — đầy đủ types cho toàn bộ feature |

---

### Bước 7: Thực hiện resolve — Giữ phiên bản từ main

```bash
git checkout origin/main -- \
  .github/dependency-audit-exceptions.json \
  frontend/src/features/workspaces/components/workspace-card.tsx \
  frontend/src/features/workspaces/workspace-api.ts \
  frontend/src/features/workspaces/workspace-list-page.tsx \
  frontend/src/features/workspaces/workspace-schema.ts
```

**Giải thích lệnh:**
- `git checkout origin/main --`: Lấy phiên bản file từ `main`
- Liệt kê 5 file cần resolve
- Lệnh này thay thế toàn bộ nội dung file bị conflict bằng phiên bản từ `main`
- Đồng thời đánh dấu conflict đã được giải quyết (staged)

> **Lưu ý:** Nếu muốn giữ phiên bản của HEAD (branch hiện tại), dùng: `git checkout HEAD -- <file>`  
> Nếu muốn kết hợp cả hai, phải mở file và sửa thủ công.

---

### Bước 8: Commit merge

```bash
git commit -m "fix: resolve merge conflicts with main (accept main for workspace UI)"
```

**Kết quả:** Git tạo một "merge commit" — commit đặc biệt ghi nhận việc gộp 2 branch lại.

---

### Bước 9: Push lên GitHub

```bash
git push origin feat/rls-defense-in-depth
```

**Kết quả:** GitHub nhận code mới, PR #12 tự động cập nhật, conflict biến mất, nút "Merge pull request" chuyển sang màu xanh.

---

### Bước 10: Quay lại branch cũ và lấy lại code đang dở

```bash
git checkout feature/workspace-list-api   # Quay lại branch cũ
git stash pop                              # Lấy lại code đã cất tạm
```

---

## 📋 Tóm Tắt Quy Trình (Checklist cho lần sau)

Khi gặp merge conflict trên GitHub, làm theo các bước sau:

```
1. [ ] git stash                                    ← Cất tạm code đang dở
2. [ ] git fetch origin main                        ← Cập nhật main mới nhất
3. [ ] git fetch origin <branch-bị-conflict>        ← Cập nhật branch PR
4. [ ] git checkout <branch-bị-conflict>            ← Chuyển sang branch đó
5. [ ] git merge origin/main                        ← Merge main vào → thấy conflict
6. [ ] Mở từng file, đọc conflict markers           ← Phân tích giữ code nào
7. [ ] Resolve: sửa file hoặc dùng git checkout     ← Giải quyết conflict
8. [ ] git add <file-đã-resolve>                    ← Đánh dấu đã xong
9. [ ] git commit -m "fix: resolve merge conflicts" ← Commit merge
10.[ ] git push origin <branch-bị-conflict>         ← Push lên GitHub
11.[ ] git checkout <branch-cũ>                     ← Quay lại branch cũ
12.[ ] git stash pop                                ← Lấy lại code đang dở
```

---

## ⚠️ Những Lưu Ý Quan Trọng

### Khi nào conflict xảy ra?
- Khi **2 người cùng sửa 1 file** ở **cùng vị trí** trên các branch khác nhau
- Branch tạo sau hoặc merge sau sẽ bị conflict

### Cách tránh conflict?
- **Communicate** với đồng đội: ai đang sửa file nào
- **Merge main thường xuyên**: `git merge origin/main` vào branch của bạn để luôn cập nhật
- **Chia nhỏ PR**: PR càng nhỏ → ít file thay đổi → ít khả năng conflict

### Resolve conflict sai thì sao?
- **Không sao cả!** Git luôn giữ lịch sử. Bạn có thể:
  - `git merge --abort` — Hủy merge, quay lại trạng thái trước
  - `git revert <commit>` — Tạo commit ngược lại để undo
  - `git reset --hard <commit>` — Reset về commit cũ (cẩn thận, sẽ mất code chưa commit)

### 2 cách resolve conflict

| Cách | Khi nào dùng | Ưu điểm | Nhược điểm |
|------|-------------|---------|------------|
| **GitHub Web Editor** | Conflict đơn giản, ít file | Nhanh, không cần terminal | Không test được code |
| **Local (terminal)** | Conflict phức tạp, nhiều file | Có thể build/test trước khi push | Mất nhiều bước hơn |

---

## 🎓 Bài Học Rút Ra

1. **Luôn fetch và merge main trước khi tạo PR** để phát hiện conflict sớm
2. **Đọc kỹ cả hai phiên bản** trước khi quyết định giữ bên nào
3. **Code chất lượng hơn nên được ưu tiên** — trong trường hợp này, main có code professional hơn (hooks, skeleton, JSDoc)
4. **Conflict không đáng sợ** — nó chỉ là Git hỏi bạn: "Giữ bản nào?" và bạn trả lời
