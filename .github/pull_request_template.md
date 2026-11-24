## Tóm tắt thay đổi

- Mô tả ngắn gọn vấn đề và giải pháp trong PR này.
- Môi trường live production: https://unichat.id.vn

## Loại thay đổi

- [ ] Tính năng mới (`feat`)
- [ ] Sửa lỗi (`fix`)
- [ ] Tái cấu trúc / tối ưu (`refactor` / `perf`)
- [ ] Tài liệu / cấu hình (`docs` / `chore`)

## Kiểm chứng

- [ ] Frontend: `tsc --noEmit`, `eslint --max-warnings 0`, `vitest run`, `npm run build`
- [ ] Core API: `./core-api/mvnw verify` (nếu có thay đổi backend)
- [ ] AI Service: `pytest`, `mypy`, `ruff` (nếu có thay đổi AI service)
- [ ] Không lộ secret, token, prompt hoặc nội dung tài liệu trong log/diff

## Lưu ý triển khai (nếu có)

- Biến môi trường mới / thay đổi trên EC2 `.env` hoặc migration cần duyệt trước khi áp dụng:

