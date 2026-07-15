# SEC-DEBT-001 — ChromaDB Critical scoped exception

## Trạng thái

| Thuộc tính | Giá trị |
|---|---|
| Mã công việc | `SEC-DEBT-001` |
| Trạng thái | Open — unresolved explicit scoped exception |
| Ngày ghi nhận | 2026-07-13 |
| Phạm vi được phép | Chỉ non-Chroma work item |
| Thời điểm bắt buộc xem lại | Trước Chroma-backed work hoặc deployment phụ thuộc Chroma |

## Finding chưa được giải quyết

Python dependency `chromadb==1.5.9` có advisory Critical
`CVE-2026-45829`, `GHSA-f4j7-r4q5-qw2c` và `PYSEC-2026-311`, CVSS 9.3 theo evidence OSV
đã thu. Chroma server hiện dùng image `0.6.3` có digest cố định.

Vulnerability và client/server incompatibility đều chưa được giải quyết. Việc
container khởi động không chứng minh client `1.5.9` tương thích server `0.6.3`.

## Policy exception

`SEC-DEBT-001` là exception tường minh, không phải implicit risk acceptance:

- Warning, package/version, advisory ID và severity phải luôn xuất hiện trong
  audit evidence.
- Exception chỉ cho phép work item không sử dụng hoặc thay đổi Chroma-backed
  retrieval tiếp tục.
- Chroma-backed retrieval tiếp tục `NOT READY`.
- Deployment có đường chạy phụ thuộc Chroma tiếp tục `NOT READY`.
- Exception không cho phép mở Chroma ra host/Internet.
- `SEC-DEBT-001` phải giữ trạng thái open cho tới khi remediation hoàn tất.
- Exception không phải phê duyệt cài package, build tool, commit, push hoặc
  deployment.

## CI enforcement

Machine-readable record nằm tại `.github/dependency-audit-exceptions.json`.
Required check `dependency-audit-policy`:

- trả `PASS_WITH_SCOPED_EXCEPTION` chỉ khi finding khớp chính xác record và
  thay đổi chỉ thuộc non-Chroma scope;
- fail khi có High/Critical mới, exception drift, audit unavailable hoặc
  warning không thể xác minh;
- fail nếu Chroma dependency, retrieval, compatibility configuration hoặc
  deployment scope bị thay đổi trong khi exception còn open;
- fail đối với release audit khi exception còn open;
- không tắt npm/Maven/Python audit và không dùng global Critical ignore.

## Startup và readiness

Chroma startup evidence có thể được thu riêng. Nó không phải acceptance gate
của CORE-001 và không được dùng làm compatibility evidence.

Chroma-only failure không block CORE-001. Nếu Chroma làm shared infrastructure
bắt buộc không khởi động hoặc ngăn PostgreSQL/Core/mandatory regression gate
chạy, readiness evidence phải ghi rõ shared gate bị ảnh hưởng; khi đó failure
có thể là blocker.

## Closure criteria

Chỉ đóng `SEC-DEBT-001` khi đồng thời:

1. Advisory Critical không còn trong resolved inventory.
2. Client/server version contract đã được review.
3. Integration test kết nối, create collection, upsert, query và delete pass.
4. `pip check`, Ruff, mypy, pytest, Compose validation và dependency audit pass.
5. Network isolation tiếp tục được chứng minh.

Mọi remediation có package/tool mới cần approval riêng.
