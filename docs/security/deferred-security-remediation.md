# SEC-DEBT-001 — ChromaDB Critical scoped exception

## Trạng thái

| Thuộc tính | Giá trị |
|---|---|
| Mã công việc | `SEC-DEBT-001` |
| Trạng thái | Open — unresolved explicit scoped exception |
| Ngày ghi nhận | 2026-07-13 |
| Phạm vi được phép | Chroma Cloud client/retrieval trong môi trường kiểm thử; không bao gồm self-host server hoặc production release |
| Thời điểm bắt buộc xem lại | Trước self-host Chroma, thay đổi package/config, Cloud staging exercise hoặc production release |

## Finding chưa được giải quyết

Python dependency `chromadb==1.5.9` có advisory Critical
`CVE-2026-45829`, `GHSA-f4j7-r4q5-qw2c` và `PYSEC-2026-311`, CVSS 9.3 theo
evidence OSV. Advisory mô tả pre-auth code injection tại endpoint tạo collection
của ChromaDB Python server khi `trust_remote_code=true`; OSV liệt kê các bản
`chromadb` từ 1.0.0 đến 1.5.9 là bị ảnh hưởng.

Ứng dụng hiện khởi tạo `chromadb.CloudClient` khi environment yêu cầu Cloud và
dùng collection `unichat_chunks_v2`. Cấu hình hiện tại trỏ đến Chroma Cloud;
Compose vẫn định nghĩa Chroma server self-host `0.6.3`, nhưng đó là một endpoint
riêng, không phải endpoint Cloud đang được ứng dụng cấu hình sử dụng. Work item
này chưa chạy truy vấn Cloud trực tiếp; bằng chứng tự động hiện tại chỉ dùng mock.

Evidence hiện có không chứng minh Chroma Cloud bị ảnh hưởng bởi endpoint server
trên, cũng không phải xác nhận từ nhà cung cấp rằng Cloud đã được vá. Package
`chromadb==1.5.9` vẫn nằm trong môi trường AI; vì vậy finding vẫn được audit và
trạng thái debt vẫn `Open`. Ta chấp nhận phạm vi kiểm thử Cloud có giới hạn để
tiếp tục RAG, không tuyên bố vulnerability đã được khắc phục hoặc risk đã biến
mất. Không dùng thao tác Cloud thành công làm bằng chứng đóng advisory.

## Policy exception

`SEC-DEBT-001` là exception tường minh, không phải implicit risk acceptance:

- Warning, package/version, advisory ID và severity phải luôn xuất hiện trong
  audit evidence.
- Exception cho phép thay đổi/retrieval dùng Chroma Cloud client trong scope
  kiểm thử đã cấu hình; finding Critical vẫn hiện diện trong audit.
- Exception không cho phép thay đổi dependency/version pin hoặc cấu hình
  self-host Chroma.
- Self-host server và production release có phụ thuộc Chroma tiếp tục `NOT READY`.
- Không chạy/khởi tạo Chroma Python server, không bật endpoint server và không
  đặt `trust_remote_code=true`.
- Không mở Chroma ra host/Internet; ứng dụng tiếp tục dùng CloudClient/API key.
- Truy vấn đánh giá phải giới hạn bằng document allowlist do Core cấp và không
  ghi/sửa/xóa collection Cloud hiện có.
- `SEC-DEBT-001` phải giữ trạng thái open cho tới khi remediation hoàn tất.
- Exception không phải phê duyệt cài package, build tool, commit, push hoặc
  deployment.

## CI enforcement

Machine-readable record nằm tại `.github/dependency-audit-exceptions.json`.
Required check `dependency-audit-policy`:

- trả `PASS_WITH_SCOPED_EXCEPTION` chỉ khi finding khớp chính xác record và
  thay đổi chỉ thuộc non-Chroma scope hoặc Cloud-client retrieval test đã duyệt;
- fail khi có High/Critical mới, exception drift, audit unavailable hoặc
  warning không thể xác minh;
- fail nếu Chroma dependency/version, self-host Compose/server configuration
  hoặc deployment scope bị thay đổi trong khi exception còn open;
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
3. Có xác nhận/evidence về security posture của Chroma Cloud và contract của
   CloudClient; Cloud integration test trong collection staging pass.
4. `pip check`, Ruff, mypy, pytest, Compose validation và dependency audit pass.
5. Network isolation tiếp tục được chứng minh; self-host server không được
   đưa vào đường chạy nếu chưa có remediation/approval riêng.

Mọi remediation có package/tool mới cần approval riêng.
