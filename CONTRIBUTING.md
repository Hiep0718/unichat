# Đóng góp cho UniChat

## Trạng thái phát triển

Canonical status hiện tại là `NOT READY`. Chỉ bắt đầu branch triển khai
`CORE-001` sau khi readiness evidence từ cả hai máy đã được review và merge vào
`main`.

Đọc `AGENTS.md` và các tài liệu nguồn trong `docs/specifications` trước khi thay
đổi code.

## Thiết lập dependency

Cài dependencies từ manifest và/hoặc lockfile tương ứng của từng ecosystem đã được review.

- Frontend: review root `package.json`, `frontend/package.json` và root
  `package-lock.json`, sau đó chạy `npm ci` tại repository root.
- Core API: review `core-api/pom.xml` và Maven Wrapper; repository không có
  Maven dependency lockfile.
- AI Service: review `ai-service/pyproject.toml`, requirements manifests và
  `ai-service/requirements.lock.txt` đang được CI sử dụng. File lock hiện là
  resolved exact-pin inventory, không phải hash-locked inventory.

Không thêm hoặc cài package/tool mới khi chưa có phê duyệt riêng.

## Work item và branch

- Mỗi work item có một Issue Assignee/Main Owner, scope, non-scope, acceptance
  criteria và evidence requirements.
- Dùng branch `feature/<work-item-id>-<short-description>` cho feature.
- Branch CORE-001 bắt buộc là
  `feature/core-001-core-auth-db-foundation`.
- Không tái sử dụng branch đã merge.
- Tạo branch từ `main` mới nhất sau khi fetch và xác minh commit.

## Cross-review

- PR author/implementer không tự approve PR của mình.
- PR do `Hiep0718` implement được `phihungdeptraino2` review chính.
- PR do `phihungdeptraino2` implement được `Hiep0718` review chính.
- Reviewer được xác định theo người implement của từng PR, không cố định cho
  toàn dự án.
- Shared-architecture work vẫn phải có một Main Owner và independent reviewer.
- Nếu cả hai cùng đóng góp code đáng kể vào một PR, tách PR hoặc dùng reviewer
  độc lập đã được phê duyệt.

Riêng CORE-001:

- Issue assignee / Main Owner: `Hiep0718`.
- Planned PR reviewer for CORE-001: `phihungdeptraino2`.

## Pull request flow

1. Liên kết work item và mô tả scope/non-scope.
2. Liệt kê manifest/lockfile đã review nếu dependency inventory thay đổi.
3. Chạy các checks liên quan và ghi command/result không chứa secret hoặc
   absolute local path.
4. Ghi feature E2E là `N/A` kèm lý do khi work item không tạo user-facing flow.
5. Chờ required checks và independent approval.
6. Dừng xin phê duyệt riêng trước commit, push, GitHub mutation, thay đổi branch
   protection, merge hoặc deployment.

Commit dùng Conventional Commits và chỉ chứa một logical change.

## Security và evidence

- Không commit `.env`, private key, API key, raw token, mật khẩu, prompt, chunk,
  nội dung tài liệu hoặc dữ liệu người dùng thật.
- Không đưa absolute local path, drive letter hoặc local-file URI vào tài liệu
  và committed evidence.
- Automated tests không gọi provider/network bên ngoài, ngoại trừ dependency
  audit job được thiết kế riêng.
- `SEC-DEBT-001` chỉ cho phép non-Chroma work item tiếp tục. Chroma-backed
  retrieval và deployment phụ thuộc Chroma vẫn `NOT READY`.
- Không tắt audit hoặc che giấu High/Critical finding để làm CI pass.

Refresh-token hashing strategy, pepper usage, configuration contract và
rotation implications là CORE-001 design gate chưa được chốt. Không triển khai
hashing subtask trước khi quyết định này được phê duyệt.
