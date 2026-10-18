# Runbook: thử nghiệm gọi 1:1

Cập nhật: 2026-10-18

Tài liệu này dành cho việc **chạy thử thật** tính năng gọi thoại 1:1. Mọi thứ trong
Giai đoạn 0–2 đã viết xong và test xanh, nhưng **chưa có dòng WebRTC nào chạy trên
trình duyệt thật và chưa có dòng SQL nào của V44 chạm database thật**. Ba bước dưới đây
là cách biết nó có hoạt động hay không.

---

## 1. Kiểm chứng migration V44 (cần Docker)

Các file `*IT` **không** chạy trong `mvnw test`: Surefire mặc định chỉ nhận `*Test`.
Phải gọi tên trực tiếp.

```bash
# Bật Docker Desktop trước, đợi nó sẵn sàng
docker info

cd core-api
./mvnw -o test -Dtest='CallPostgresIT' -DfailIfNoSpecifiedTests=false
```

`CallPostgresIT` dựng một PostgreSQL dùng một lần, chạy **toàn bộ chuỗi migration** rồi
kiểm tra 5 CHECK constraint của bảng `calls` bằng cách cố ghi những dòng mà chúng phải
từ chối. Đây là thứ duy nhất chứng minh các ràng buộc nói đúng điều ta nghĩ.

Nhân tiện chạy luôn hai IT có sẵn, chúng cũng chưa từng chạy:

```bash
./mvnw -o test -Dtest='*PostgresIT' -DfailIfNoSpecifiedTests=false
```

> Máy đang còn khoảng 6 GB đĩa trống. Docker Desktop và image `postgres:18.4` sẽ ăn
> thêm vài GB, nên dọn chỗ trước nếu cần.

---

## 2. Gọi thử giữa hai tab trên cùng máy (không cần HTTPS)

`localhost` được miễn trừ khỏi luật secure context, nên micro hoạt động bình thường.

```bash
# Terminal 1
cd core-api && ./mvnw spring-boot:run

# Terminal 2
cd frontend && npm run dev
```

Mở `http://localhost:5173` ở hai cửa sổ — **một cửa sổ thường và một cửa sổ ẩn danh**,
vì hai tài khoản không dùng chung được một session. Đăng nhập hai tài khoản khác nhau
đã có hội thoại 1:1 với nhau, rồi bấm nút điện thoại trên header hội thoại.

**Cần quan sát:**

| Dấu hiệu | Ý nghĩa |
|---|---|
| Bảng gọi hiện "Đang gọi…" ở góc phải dưới | REST `POST /conversations/{id}/calls` chạy được |
| Cửa sổ kia hiện "Cuộc gọi thoại đến" | STOMP `/user/queue/calls` tới nơi |
| Bấm Nghe → cả hai thành "Đang kết nối…" rồi "Đang trong cuộc gọi" | Offer/answer/ICE qua được, peer connection lên |
| Nghe được tiếng | WebRTC chạy thật |

**Nếu đứng ở "Đang kết nối…" mãi:** mở DevTools → Console xem lỗi, và vào
`chrome://webrtc-internals` để xem trạng thái ICE. Đứng mãi thường là ICE không tìm được
đường — trên cùng một máy thì gần như không thể, nên nhiều khả năng là lỗi signalling:
xem tab Network → WS có frame nào bị bỏ không.

---

## 3. Gọi thử giữa hai máy (bắt buộc HTTPS)

`getUserMedia()` **không tồn tại** trên HTTP thường. Mở app bằng địa chỉ LAN
(`http://192.168.1.x:5173`) thì nút gọi sẽ báo *"Trình duyệt chặn micro vì trang không
chạy trên HTTPS"* — đó là thông báo đúng, không phải lỗi.

### Cách A — tunnel Cloudflare (nhanh nhất, có HTTPS sẵn)

```bash
cloudflared tunnel --url http://localhost:5173
# in ra ví dụ https://random-words-1234.trycloudflare.com
```

Thêm tên miền đó vào `.env` rồi **khởi động lại Core API**:

```
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://random-words-1234.trycloudflare.com
```

Danh sách này dùng chung cho cả CORS lẫn socket STOMP, nên chỉ cần khai một chỗ. Khai
rồi thì nó **thay thế** mặc định, nên nhớ liệt kê cả localhost.

### Cách B — chứng chỉ local bằng mkcert (dùng lại được nhiều lần)

```bash
mkcert -install
cd frontend
mkcert -key-file dev-key.pem -cert-file dev-cert.pem localhost 127.0.0.1 192.168.1.x

DEV_TLS_KEY=dev-key.pem DEV_TLS_CERT=dev-cert.pem npm run dev -- --host
```

Vite sẽ phục vụ `https://192.168.1.x:5173`. Máy thứ hai phải **cài chứng chỉ gốc của
mkcert**, nếu không trình duyệt vẫn cảnh báo và secure context không thành lập.

Nhớ thêm `https://192.168.1.x:5173` vào `CORS_ALLOWED_ORIGINS`, và mở cổng 5173 trong
Windows Firewall.

---

## 4. TURN — khi nào cần

STUN đủ cho phần lớn cuộc gọi, kể cả hai máy khác mạng. Khoảng **10–20%** trường hợp
không xuyên được NAT (NAT đối xứng, firewall công ty, một số nhà mạng di động) thì bắt
buộc relay qua TURN, và không có TURN thì những ca đó **đứng mãi ở "Đang kết nối…"**.

Dùng dịch vụ quản lý thay vì tự dựng `coturn`: tự dựng phải mở UDP 3478 cộng dải
49152–65535 trong security group, rất dễ sai và khó chẩn đoán.

```
UNICHAT_CALLS_TURN_URLS=turn:relay.example:3478
UNICHAT_CALLS_TURN_SECRET=<secret dùng chung với TURN server>
```

Server ký credential ngắn hạn (TTL 10 phút) theo cơ chế long-term credential của
RFC 5389. **Secret không bao giờ xuống trình duyệt** — nếu nó nằm trong bundle frontend
thì băng thông relay của người lạ sẽ tính vào hóa đơn của dự án.

Kiểm tra nhanh cấu hình đã vào chưa:

```bash
curl -H "Authorization: Bearer <access token>" http://localhost:8082/api/v1/calls/ice-servers
```

---

## 5. Những giới hạn đã biết

- **Chỉ 1:1.** Nút gọi không hiện ở hội thoại nhóm; gọi nhóm cần SFU và nằm ngoài phạm vi.
- **Chỉ audio.** Video là Giai đoạn 3, chỉ đổi constraint của `getUserMedia`.
- **Một instance Core API.** `WebSocketConfig` dùng `enableSimpleBroker`, là broker trong
  bộ nhớ: chạy hai instance sau load balancer thì mỗi instance chỉ thấy client của chính
  nó và signalling sẽ trượt ngẫu nhiên. Cần sticky session hoặc STOMP relay qua RabbitMQ.
- **Không có thông báo khi đóng tab.** Cuộc gọi chỉ tới được người đang mở ứng dụng;
  người offline nhận cuộc gọi nhỡ. Web Push là hạng mục riêng.
