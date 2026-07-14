# Hoãn khắc phục bảo mật ChromaDB

## Thông tin quyết định

| Thuộc tính | Giá trị |
|---|---|
| Mã công việc | SEC-DEBT-001 |
| Trạng thái | Deferred — User accepted risk |
| Ngày ghi nhận | 2026-07-13 |
| Người chấp nhận | Người dùng |
| Thời điểm bắt buộc xem lại | Trước tính năng đầu tiên dùng ChromaDB hoặc trước mọi triển khai, tùy điều kiện nào đến trước |

## Rủi ro được hoãn

Python dependency `chromadb==1.5.9` có advisory Critical `GHSA-f4j7-r4q5-qw2c`, alias `PYSEC-2026-311`, CVSS 9.3 theo kết quả OSV đã lưu. Việc chấp nhận hoãn không có nghĩa cấu hình này an toàn cho production.

Logback không thuộc phạm vi hoãn: `logback-core` và `logback-classic` đã được nâng lên 1.5.35, Maven verify đã đạt và JAR đã được kiểm tra.

## Lý do hoãn

Bản đầy đủ `chromadb==0.6.3` kéo theo `chroma-hnswlib==0.7.6`, không có wheel tương thích Python 3.13 trên Windows hiện tại và yêu cầu Microsoft C++ Build Tools. Cài build tool hoặc đổi sang gói thin client chính thức là mở rộng phạm vi package/tool, chưa được phê duyệt.

## Trạng thái có thể tái lập

- Manifest Python được khôi phục về `chromadb==1.5.9`, khớp môi trường hiện có.
- Chroma server giữ image 0.6.3 có digest cố định.
- Chroma server không mở host port và chỉ nằm trên Docker network `private` với `internal: true`.
- Chưa có tính năng ứng dụng nào sử dụng ChromaDB; chưa xác nhận tương thích client 1.5.9 với server 0.6.3.
- Không có package mới được cài trong quyết định hoãn này.

## Biện pháp kiểm soát tạm thời

1. Không triển khai cấu hình accepted-risk này ra môi trường công khai.
2. Không mở cổng Chroma ra host hoặc Internet.
3. Core API tiếp tục là ranh giới xác thực và phân quyền duy nhất.
4. Không nhận cấu hình model repository hoặc `trust_remote_code` từ dữ liệu người dùng.
5. Không bắt đầu tính năng Chroma-backed trước khi SEC-DEBT-001 được đóng.
6. Không xem việc hoãn là phê duyệt cài package, build tool, commit, push hoặc deploy.

## Công việc bắt buộc ở phiên sau

1. Xin phê duyệt riêng cho một trong hai hướng:
   - Khuyến nghị: dùng official thin client `chromadb-client==0.6.3`.
   - Thay thế: dùng Python/toolchain có wheel tương thích hoặc cài Microsoft C++ Build Tools.
2. Cập nhật đồng bộ `pyproject.toml`, `requirements.txt` và lock file.
3. Viết integration test xác nhận client kết nối và thao tác collection với Chroma server 0.6.3.
4. Chạy lại `pip check`, Ruff, mypy, pytest, Docker Compose validation và OSV audit.
5. Chỉ đóng SEC-DEBT-001 khi advisory Critical không còn trong resolved inventory và toàn bộ gate đạt.

## Bằng chứng

- Kết quả quét: `.pipeline/dependency-audit-osv.json`
- Phê duyệt remediation ban đầu: `.pipeline/security-remediation-approval.json`
- Risk acceptance: `.pipeline/security-risk-acceptance.json`
- Handoff: `.pipeline/session-handoff.md`
