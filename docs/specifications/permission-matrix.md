# Ma trận quyền truy cập — UniChat

## Metadata

| Thuộc tính | Giá trị |
|---|---|
| Phase | design-architecture |
| Task | TASK-005 |
| Version | 1.0 |
| Trạng thái | Approved — source of truth; implementation remains work-item gated |
| Authorization owner | Core API |

## 1. Vai trò và chế độ Workspace

- PRIVATE: chỉ OWNER truy cập.
- SHARED: OWNER cấp OWNER, EDITOR hoặc VIEWER cho người dùng cụ thể.
- PUBLIC: người dùng đã đăng nhập có quyền đọc và hỏi; khách chưa đăng nhập không truy cập.
- ADMIN quản trị tài khoản và vận hành nhưng không mặc nhiên đọc Workspace PRIVATE/SHARED.

## 2. Ma trận hành động

| Hành động | OWNER | EDITOR | VIEWER | PUBLIC_AUTH | ADMIN không là thành viên |
|---|---:|---:|---:|---:|---:|
| Xem Workspace và tài liệu đã xử lý | Có | Có | Có | Chỉ PUBLIC | Không |
| Hỏi và xem citation | Có | Có | Có | Chỉ PUBLIC | Không |
| Tạo/xóa conversation của chính mình | Có | Có | Có | Chỉ PUBLIC | Không |
| Upload tài liệu | Có | Có | Không | Không | Không |
| Xóa tài liệu | Có | Không | Không | Không | Không |
| Sửa tên/mô tả Workspace | Có | Có | Không | Không | Không |
| Đổi PRIVATE/SHARED/PUBLIC | Có | Không | Không | Không | Không |
| Mời, đổi vai trò, xóa thành viên | Có | Không | Không | Không | Không |
| Chuyển ownership | Có | Không | Không | Không | Không |
| Xóa Workspace | Có | Không | Không | Không | Không |
| Chạy evaluation trên Workspace | Có | Có | Không | Không | Không |
| Xem audit của Workspace | Có | Không | Không | Không | Không |
| Khóa/mở tài khoản người dùng | Không | Không | Không | Không | Có |
| Xem metric hệ thống không chứa nội dung | Không | Không | Không | Không | Có |

## 3. Quy tắc bất biến

1. Mọi endpoint kiểm tra authentication trước authorization.
2. Quyền được tính ở Core API từ userId, workspace visibility, membership đang hoạt động và resource state.
3. Frontend chỉ ẩn/hiện UI; không phải điểm kiểm soát bảo mật.
4. Core API truyền allowedDocumentIds sang AI Service sau khi đã kiểm tra quyền.
5. Core API kiểm tra lại quyền ngay trước khi lưu hoặc trả answer để chống thay đổi quyền giữa chừng.
6. Tài liệu ở trạng thái DELETING, FAILED hoặc PENDING không được truy hồi.
7. Người dùng bị LOCKED bị thu hồi refresh token family và không thể refresh/access tài nguyên.
8. Quyền PUBLIC không cho upload, sửa, chia sẻ, xem audit hoặc evaluation.

## 4. Thuật toán authorization

1. Xác thực access token và trạng thái tài khoản.
2. Tải Workspace bằng truy vấn tham số hóa.
3. Nếu PRIVATE, chỉ ownerId khớp userId được phép.
4. Nếu SHARED, yêu cầu membership ACTIVE và role đáp ứng action.
5. Nếu PUBLIC, action phải thuộc READ hoặc ASK và người dùng đã đăng nhập.
6. Kiểm tra trạng thái resource và ownership của conversation.
7. Ghi audit cho action nhạy cảm và trả lỗi RFC 7807 khi từ chối.

Không trả chi tiết cho phép suy đoán Workspace riêng tư; tài nguyên không nhìn thấy trả NOT_FOUND, hành động nhìn thấy nhưng thiếu quyền trả FORBIDDEN.

## 5. Thay đổi thành viên

- Workspace luôn có ít nhất một OWNER.
- Không cho OWNER cuối cùng rời hoặc tự hạ vai trò.
- Chuyển ownership cần transaction, optimistic version và audit event.
- Thay đổi quyền tăng permissionVersion; request đang chạy phải kiểm tra lại version trước khi trả dữ liệu.
- Xóa thành viên thu hồi quyền ngay, không xóa conversation cá nhân nhưng người dùng không còn đọc được nội dung nguồn.

## 6. Tiêu chí chấp nhận

- AC-PM-01: User A không thể đọc, hỏi hoặc suy đoán tài nguyên PRIVATE của User B.
- AC-PM-02: VIEWER không upload, xóa hoặc sửa Workspace.
- AC-PM-03: PUBLIC_AUTH chỉ đọc/hỏi trên Workspace PUBLIC.
- AC-PM-04: ADMIN không bypass ACL nội dung.
- AC-PM-05: allowedDocumentIds luôn là tập con của tài liệu đã cấp quyền và PROCESSED.
- AC-PM-06: Thay đổi quyền giữa request làm bước reauthorization từ chối kết quả.
