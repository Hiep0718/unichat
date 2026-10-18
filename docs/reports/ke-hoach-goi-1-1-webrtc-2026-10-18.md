# Kế hoạch triển khai gọi thoại/video 1:1 (WebRTC)

Ngày lập: 2026-10-18 · Nhánh dự kiến: `feat/direct-calls` · Phạm vi: **chỉ 1:1**

---

## 1. Kết luận ngắn

Gọi 1:1 khả thi với hạ tầng hiện có. Phần thường bị coi là khó nhất — signaling —
**đã có sẵn phần lớn**: STOMP over WebSocket, xác thực JWT trên frame CONNECT,
principal là `userId`, và user destination được Spring tự phạm vi hóa theo người nhận.

Ba thứ thật sự phải giải, xếp theo độ khó giảm dần:

1. **HTTPS** — `getUserMedia()` chỉ chạy trong secure context. Không có HTTPS thì
   không test được với máy thứ hai.
2. **Kết nối STOMP đang gắn vào một trang** — hiện chỉ sống trong `work-chat-page.tsx`,
   nên không ở đâu khác nhận được cuộc gọi đến.
3. **TURN** — khoảng 10–20% kết nối không xuyên được NAT, bắt buộc relay.

Gọi nhóm **nằm ngoài phạm vi** và không nên gộp vào.

---

## 2. Nền tảng tái sử dụng được

| Thành phần hiện có | Vai trò trong tính năng gọi |
|---|---|
| `StompAuthChannelInterceptor` | Xác thực JWT lúc CONNECT, principal = `userId`. Dùng nguyên, không sửa |
| `WebSocketConfig` — `/user` destination | Định tuyến tín hiệu đúng một người nhận. Dùng nguyên |
| `ConversationAccess.requireParticipant` | Kiểm tra hai người cùng hội thoại trước khi cho gọi. Dùng nguyên |
| `PresenceTracker.isOnline` | Biết người nhận có online không, để báo máy bận hoặc nhỡ |
| `WorkChatBroadcaster` | Mẫu để viết `CallBroadcaster`; **không** tái dùng trực tiếp vì nó bám `@TransactionalEventListener` |
| `use-work-chat-socket.ts` | Phải **nâng lên phạm vi toàn app** (Giai đoạn 0) |

---

## 3. Quyết định kiến trúc

### 3.1 P2P trực tiếp, không media server

1:1 thì hai trình duyệt nối thẳng. Không SFU, không MCU. Media **không đi qua**
Core API — server chỉ chuyển tín hiệu thiết lập.

### 3.2 Vòng đời đi REST, tín hiệu đi STOMP

Chia đôi theo tần suất và nhu cầu xử lý lỗi:

| Việc | Kênh | Lý do |
|---|---|---|
| Gọi, nhận, từ chối, cúp máy | **REST** | Thưa, cần lỗi RFC 7807, cần Jakarta Validation, cần ghi lịch sử, dễ viết integration test |
| SDP offer/answer, ICE candidate | **STOMP** | Dày (hàng chục ICE candidate mỗi cuộc), phù du, không chạm DB, cần độ trễ thấp |

### 3.3 Chỉ lưu lịch sử, không lưu tín hiệu

SDP và ICE candidate **không bao giờ vào database**. Chúng mô tả địa chỉ mạng và codec
của một phiên đã chết ngay khi kết thúc. Bảng `calls` chỉ lưu *ai gọi ai, khi nào, bao
lâu, kết thúc thế nào* — đủ để hiện "Cuộc gọi nhỡ" trong khung chat.

### 3.4 Thông tin TURN lấy qua endpoint có xác thực

Không nhúng credential TURN vào bundle frontend. `GET /calls/ice-servers` trả về
credential **ngắn hạn** (TTL khoảng 10 phút) cho người đã đăng nhập. TURN tính tiền theo
băng thông, nên credential lộ ra là hóa đơn của người khác.

### 3.5 Phân quyền dùng lại luật cũ

Theo AGENTS.md, Core API sở hữu authorization. Mọi thao tác gọi đi qua
`ConversationAccess.requireParticipant` — **không viết luật mới**. Server tự suy ra người
nhận từ hội thoại chứ không nhận `calleeId` từ client.

---

## 4. Các giai đoạn

### Giai đoạn 0 — Nâng kết nối STOMP lên toàn app

*Bắt buộc. Không thay đổi gì với người dùng.*

**Vấn đề:** `useWorkChatSocket` chỉ được mount trong `work-chat-page.tsx:109`. Đang ở
trang Workspace hay Khám phá thì socket không tồn tại, nên **không thể nhận cuộc gọi đến**.

**Việc:**

- Tách phần kết nối thành `frontend/src/lib/stomp-connection.ts` — một client dùng chung,
  cho phép nhiều subscriber đăng ký theo destination.
- Thêm `frontend/src/features/realtime/realtime-provider.tsx`, mount trong vùng đã đăng nhập.
- `use-work-chat-socket.ts` chuyển sang tiêu thụ provider thay vì tự tạo `Client`.
- **Sửa luôn một lỗi tiềm ẩn:** hook hiện gọi `getAccessToken()` một lần trong effect `[]`.
  Khi stompjs tự reconnect, nó gửi lại `connectHeaders` cũ — access token 15 phút đã hết
  hạn thì reconnect thất bại im lặng. Provider phải lấy token **tại thời điểm connect**.

**Kiểm chứng:** chat hiện tại chạy y nguyên; thêm test cho việc reconnect dùng token mới.

---

### Giai đoạn 1 — Backend: vòng đời cuộc gọi

**Migration `V44__direct_calls.sql`**

```sql
CREATE TABLE calls (
    id              UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES direct_conversations(id) ON DELETE CASCADE,
    caller_id       UUID NOT NULL REFERENCES users(id),
    callee_id       UUID NOT NULL REFERENCES users(id),
    media           VARCHAR(10) NOT NULL CHECK (media IN ('AUDIO','VIDEO')),
    status          VARCHAR(20) NOT NULL
                    CHECK (status IN ('RINGING','ACTIVE','ENDED','DECLINED','MISSED','FAILED')),
    started_at      TIMESTAMPTZ NOT NULL,
    answered_at     TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    end_reason      VARCHAR(20)
);

CREATE INDEX idx_calls_conversation ON calls (conversation_id, started_at DESC);
CREATE INDEX idx_calls_callee_missed ON calls (callee_id) WHERE status = 'MISSED';
```

Có CHECK constraint — **khác với ADR-027**, nơi chủ đề cố ý không ràng buộc vì từ vựng
còn mở rộng. Trạng thái cuộc gọi là máy trạng thái đóng, gần như không thêm giá trị mới,
nên cái giá của migration thấp còn lợi ích của ràng buộc thì cao.

**Module mới `core-api/src/main/java/com/unichat/core/workchat/call/`**

Đặt trong `workchat` vì cuộc gọi bám vào hội thoại, không phải khái niệm độc lập.

```
call/
  api/     CallController.java, StartCallRequest.java, CallResponse.java,
           IceServersResponse.java, CallHistoryEntry.java
  domain/  Call.java, CallStatus.java, CallMedia.java, CallEndReason.java,
           CallRepository.java
  service/ CallService.java, CallStateMachine.java, IceServerProvider.java
  ws/      CallSignalController.java, CallBroadcaster.java, CallSignal.java
```

**REST**

| Method | Path | Mô tả |
|---|---|---|
| POST | `/conversations/{id}/calls` | Bắt đầu gọi → 201 `{callId, media, calleeId, startedAt}` |
| POST | `/calls/{id}/accept` | Người nhận bấm nghe |
| POST | `/calls/{id}/decline` | Người nhận từ chối |
| POST | `/calls/{id}/end` | Bên nào cũng cúp được |
| GET | `/calls/ice-servers` | STUN công cộng + credential TURN ngắn hạn |
| GET | `/conversations/{id}/calls` | Lịch sử, phân trang mặc định 20 tối đa 100 |

**STOMP**

- Client gửi: `/app/calls/{callId}/signal` — `{kind: OFFER | ANSWER | ICE, payload}`
- Server đẩy: `/user/queue/calls` — `{type, callId, ...}` với `type` thuộc
  `INCOMING, ACCEPTED, DECLINED, ENDED, SIGNAL, BUSY, TIMEOUT`

**Luật phải cài**

- Mỗi người chỉ một cuộc `RINGING`/`ACTIVE` tại một thời điểm; gọi tiếp trả `BUSY`
- Người nhận offline → đánh `MISSED` ngay, không đổ chuông vô ích
- Không ai bắt máy sau **45 giây** → tự chuyển `MISSED` bằng scheduled task
- Chuyển trạng thái sai (accept một cuộc đã `ENDED`) → `ConflictError`
- Relay tín hiệu **phải kiểm tra lại** người gửi thuộc đúng cuộc gọi đó, không tin `callId` suông

---

### Giai đoạn 2 — Frontend: audio 1:1

```
frontend/src/features/calls/
  call-api.ts              REST client
  call-machine.ts          máy trạng thái thuần, không đụng DOM hay WebRTC
  peer-connection.ts       bọc RTCPeerConnection
  use-call-signaling.ts    đăng ký /user/queue/calls qua realtime provider
  call-provider.tsx        trạng thái cuộc gọi toàn app
  components/incoming-call-modal.tsx
  components/call-window.tsx
  components/call-controls.tsx
```

Tách `call-machine.ts` thành hàm thuần là chủ ý: logic chuyển trạng thái test được bằng
Vitest mà không cần giả lập `RTCPeerConnection` — thứ jsdom không có.

Giai đoạn này **chỉ audio**. Nút gọi đặt ở header hội thoại trong Work Chat.

---

### Giai đoạn 3 — Video

Thêm video track, bật/tắt camera, đảo camera trước/sau, khung hình nhỏ của chính mình.
Tách riêng vì audio chạy được đã là mốc có giá trị độc lập, và thêm video **không** đổi
signaling — chỉ đổi constraint của `getUserMedia`.

---

### Giai đoạn 4 — Lịch sử trong khung chat

Dòng "Cuộc gọi thoại · 3:42" hoặc "Cuộc gọi nhỡ" chèn vào `message-thread.tsx`, trộn theo
thời gian với tin nhắn. Huy hiệu cuộc gọi nhỡ trên `conversation-list.tsx`.

---

### Giai đoạn 5 — Hạ tầng để chạy thật

- **HTTPS local:** `mkcert` cho cert tin cậy, hoặc tunnel Cloudflare (có HTTPS sẵn, nhanh hơn)
- **TURN:** dùng dịch vụ quản lý (Cloudflare Calls hoặc Metered, đều có free tier) thay vì
  tự dựng `coturn`. Tự dựng phải mở UDP 3478 cộng dải 49152–65535 trong security group —
  chỗ rất dễ sai và khó chẩn đoán
- `unichat.frontend-origin` hiện chỉ nhận **một** giá trị; cần nhận danh sách khi test qua
  LAN hoặc tunnel

---

## 5. Kiểm thử

| Lớp | Nội dung |
|---|---|
| JUnit unit | `CallStateMachine` — mọi chuyển trạng thái hợp lệ và không hợp lệ |
| JUnit + Testcontainers | 6 endpoint REST, gồm ca người lạ gọi vào hội thoại không thuộc về mình |
| JUnit | Relay tín hiệu từ chối người không thuộc cuộc gọi |
| Vitest | `call-machine.ts` thuần; `peer-connection.ts` với `RTCPeerConnection` giả |
| Playwright | Hai browser context, Chromium chạy `--use-fake-device-for-media-stream` và `--use-fake-ui-for-media-stream`; xác nhận bắt tay xong và `connectionState === 'connected'` |

Playwright phần gọi là **khó nhất**: cần hai context song song và media giả. Nếu quá tốn
thời gian, hạ xuống kiểm thử thủ công có ghi chép và nêu rõ trong báo cáo, thay vì để một
test E2E giả vờ xanh.

---

## 6. Rủi ro

| Rủi ro | Mức | Xử lý |
|---|---|---|
| Không có HTTPS nên không test được | **Cao** | Giai đoạn 5 phải làm sớm, không để cuối |
| `enableSimpleBroker` chỉ một JVM | Trung bình | Deploy một instance, hoặc sticky session ở ALB. Đã ghi là hạn chế trong `WebSocketConfig` |
| Token 15 phút hết giữa cuộc gọi | Trung bình | Giai đoạn 0 xử lý; WebRTC đã nối rồi thì không phụ thuộc token nữa |
| Chi phí băng thông TURN | Thấp ở quy mô đồ án | Free tier là đủ; theo dõi nếu demo nhiều |
| Phình phạm vi sang gọi nhóm | **Cao** | Ghi rõ ngoài phạm vi; gọi nhóm cần SFU, là một đồ án riêng |

---

## 7. Việc không làm

- Gọi nhóm (cần SFU)
- Ghi âm hoặc ghi hình cuộc gọi (hệ quả pháp lý và lưu trữ)
- Chia sẻ màn hình
- Gọi trong Community Chat (hội thoại ở đó không phải quan hệ 1:1)
- Thông báo đẩy khi đóng tab (cần Web Push và service worker, là hạng mục riêng)

---

## 8. Thứ tự thực hiện

```
Giai đoạn 0  →  1  →  2  →  5 (HTTPS + TURN)  →  3  →  4
                            ↑
                   không có bước này thì
                   không kiểm chứng được gì
```

Giai đoạn 5 đặt ngay sau giai đoạn 2 chứ không để cuối: audio chạy xong mà chưa có HTTPS
thì vẫn chưa biết nó có thật sự hoạt động giữa hai máy hay không.

---

## 9. Chốt trước khi viết code

- ADR-028 sẽ được viết khi Giai đoạn 1 hoàn thành, không viết trước — ADR ghi quyết định
  đã thực hiện chứ không ghi dự định.
- `api-contracts.md` và `data-model.md` cập nhật cùng Giai đoạn 1.
- `file-plan.md` cập nhật thêm feature `frontend/src/features/calls/`.
