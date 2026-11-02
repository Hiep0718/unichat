# Luồng gọi điện 1:1 — giải thích chi tiết cho người mới

Cập nhật: 2026-10-21. Tài liệu này mô tả đúng trạng thái code trong working tree tại
thời điểm viết — bao gồm cả các bản vá lỗi và phần giao diện làm trong ngày 21/10/2026
(xem `.pipeline/decisions-log.md` các mục cùng ngày). Nếu bạn đọc tài liệu này sau khi
code đã đổi thêm, hãy đối chiếu lại với mã nguồn trước khi tin tưởng tuyệt đối.

---

## 1. Ý tưởng cốt lõi: server không nghe thấy cuộc gọi

Đây là điều quan trọng nhất cần hiểu trước tiên.

Khi A gọi B, **giọng nói đi thẳng từ máy A sang máy B**, không đi qua server của bạn.
Server chỉ đóng vai trò người mai mối: giới thiệu hai người, trao đổi địa chỉ mạng giúp
họ, rồi rút lui. Sau đó hai trình duyệt tự nói chuyện trực tiếp với nhau.

Công nghệ làm việc này gọi là **WebRTC**, có sẵn trong mọi trình duyệt hiện đại, không
cần cài thêm gì.

Lợi ích: server không tốn băng thông truyền audio, không có độ trễ tăng thêm, và quan
trọng nhất — **server không có khả năng nghe lén cuộc gọi** vì audio không bao giờ chạm
tới nó.

Đánh đổi: phức tạp hơn nhiều, vì hai máy tính nằm sau router/NAT khác nhau phải tự tìm
đường đến nhau, và việc "giới thiệu" đó cần một giao thức riêng.

---

## 2. Ba mảnh ghép tạo nên tính năng

| Mảnh | Nằm ở đâu | Nhiệm vụ |
|---|---|---|
| **REST API** | `core-api/.../call/api/CallController.java` | Vòng đời cuộc gọi: bắt đầu, nghe máy, từ chối, cúp, lấy lịch sử |
| **WebSocket relay** | `core-api/.../call/ws/CallSignalController.java` | Chuyển tiếp "thư mai mối" giữa hai trình duyệt |
| **WebRTC** | `frontend/src/features/calls/peer-connection.ts` | Chạy trong trình duyệt: mở micro, dựng kết nối, truyền âm thanh |

### Vì sao tách REST và WebSocket?

Trích nguyên văn comment trong code:

> *"Over the socket rather than REST because there are many frames per call — one
> offer, one answer, then an ICE candidate for every network path each side can see —
> and each one is worthless a second later."*

Mỗi cuộc gọi sinh ra **hàng chục mẩu tin nhỏ** trong 1–2 giây đầu. Nếu mỗi mẩu đều gọi
REST (mở kết nối HTTP, transaction, trả về) thì quá chậm. WebSocket giữ sẵn một đường
ống mở, bắn qua lại tức thì.

Còn những việc **đổi trạng thái lưu trữ** (bắt đầu gọi, nghe máy, cúp máy) thì đi qua
REST — vì mỗi hành động chỉ xảy ra một lần, cần một phản hồi rõ ràng (thành công hay
lỗi), và REST hợp với việc đó hơn.

---

## 3. Toàn bộ API hiện có

Tất cả đứng sau tiền tố `/api/v1` (giống mọi API khác trong dự án):

| Method | Đường dẫn | Việc gì |
|---|---|---|
| `POST` | `/conversations/{conversationId}/calls` | Bắt đầu gọi |
| `POST` | `/calls/{callId}/accept` | Nghe máy |
| `POST` | `/calls/{callId}/decline` | Từ chối |
| `POST` | `/calls/{callId}/end` | Cúp máy |
| `POST` | `/calls/{callId}/failed` | Trình duyệt báo kết nối WebRTC hỏng |
| `GET` | `/calls/ice-servers` | Lấy danh sách STUN/TURN server để dùng |
| `GET` | `/conversations/{conversationId}/calls` | Lịch sử cuộc gọi của một hội thoại |

---

## 4. Diễn biến một cuộc gọi, từng bước

Giả sử **A gọi B**, cả hai đều đang mở app.

### Bước 1 — A bấm nút gọi

Nút nằm trong `CallButton` (`frontend/src/features/calls/components/call-button.tsx`),
gắn trong khung chat 1:1 (`message-thread.tsx`).

```
POST /conversations/{id}/calls
```

### Bước 2 — Server kiểm tra rồi mới ghi

Đây là chỗ có một bug từng xảy ra và đã được sửa — xem [Mục 8](#8-hai-bug-đã-sửa).
Thứ tự đúng (đang chạy):

1. Xác nhận A có thật sự nằm trong cuộc hội thoại này không
2. Từ chối nếu đây là hội thoại nhóm — *"Hiện chỉ hỗ trợ gọi giữa hai người"*
3. Từ chối nếu A đang có cuộc gọi khác đang sống
4. **Hỏi xem B có đang bận không** (xem Mục 5) — hỏi **trước khi** ghi dòng mới
5. Ghi một dòng mới vào bảng `calls`, trạng thái `RINGING`
6. Nếu B không nhận được chuông (bận/offline), cuộc gọi tự đóng lại ngay thành `MISSED`
7. Nếu không, gửi tín hiệu đổ chuông tới B qua WebSocket

### Bước 3 — B đổ chuông

Server đẩy một "lifecycle frame" qua kênh riêng của B:

```
/user/queue/calls
```

Trình duyệt B nhận được, đổi trạng thái UI sang `incoming`, hiện bảng gọi dạng **thẻ
đứng** (xem Mục 7) có tên A, nút Nghe/Từ chối.

### Bước 4 — B bấm Nghe

```
POST /calls/{id}/accept
```

Server đổi trạng thái dòng `calls` thành `ACTIVE`, ghi lại `answered_at`, báo ngược lại
cho A qua WebSocket.

**Quan trọng:** B **chỉ xin quyền dùng micro sau khi bấm Nghe**, không phải lúc chuông
đổ. Comment trong code giải thích rõ:

> *"The callee must not open the microphone until the call is answered. Building the
> peer connection on the offer would make the browser ask for permission while the
> phone is still ringing, which is both alarming and wrong if the call is then
> declined."*

### Bước 5 — Hai trình duyệt "trao đổi địa chỉ" (phần WebRTC thật sự)

Đây là lúc A và B tự nói chuyện với nhau qua kênh signalling (`CALL_SIGNALS =
/user/queue/calls/signal`), **server chỉ chuyển tiếp nguyên văn, không đọc nội dung**:

> *"The server never reads the payload. It checks who is allowed to send it and hands
> it to the other party unchanged."*

Ba loại tin nhắn được gửi qua lại (định nghĩa trong `call-signalling.ts`):

| Loại | Ý nghĩa |
|---|---|
| **OFFER** | A gửi: "Tôi hỗ trợ codec này, đây là thông tin kết nối của tôi" |
| **ANSWER** | B trả lời tương tự |
| **ICE** | Mỗi bên gửi hàng loạt — mỗi cái là một "đường đi khả dĩ" để tới được mình (qua wifi, 4G, router...) |

Có một thứ tự khó mà code đã xử lý (comment đầu file `peer-connection.ts`):

> *"ICE candidates arrive before the description they belong to."* — Candidate đến
> trước khi có nơi để gắn vào thì bị giữ lại (`pendingCandidates`), rồi phát lại ngay
> sau khi `setRemoteDescription` xong, vì thêm candidate trước đó sẽ ném lỗi.

### Bước 6 — Đường thông, âm thanh bắt đầu chảy

Khi hai trình duyệt tìm được một đường đi chung, `RTCPeerConnection` báo `onConnected`.
UI chuyển từ `connecting` sang `active`, bắt đầu **đếm giờ thật** từ mốc này (không phải
từ lúc bắt đầu đổ chuông).

### Bước 7 — Cúp máy

```
POST /calls/{id}/end
```

Server ghi `ended_at`, tính thời lượng, đổi trạng thái `ENDED`. Dòng này sau đó hiện
trong lịch sử cuộc gọi (xem Mục 6).

---

## 5. STUN và TURN — chỗ hay gây lỗi nhất

**Vấn đề:** máy bạn ở nhà không có địa chỉ công khai, nó nấp sau router. Vậy làm sao
người kia tìm tới?

**STUN** — một server đứng ngoài, bạn hỏi nó *"nhìn từ ngoài, tôi trông như thế nào?"*.
Nó trả lời *"bạn là 1.2.3.4 cổng 5678"*. Bạn đưa địa chỉ đó cho người kia. Rẻ, nhẹ, giải
quyết được khoảng 80% trường hợp.

**TURN** — khi hai bên không thể nào nối thẳng (mạng công ty chặn, NAT đối xứng, một
số nhà mạng di động), cần một server **trung chuyển** đứng giữa chuyển tiếp toàn bộ âm
thanh. Tốn băng thông, tốn tiền vận hành.

### Cấu hình hiện tại

```java
// IceServerProvider.java
@Value("${unichat.calls.stun-urls:stun:stun.l.google.com:19302}")
@Value("${unichat.calls.turn-urls:}")   // ← TRỐNG
```

**Chỉ có STUN (miễn phí của Google), chưa có TURN.** Hệ quả thực tế: khoảng 1/5 cuộc
gọi sẽ không kết nối được, nhất là khi hai người ở hai mạng khác biệt rõ rệt. Trong cùng
mạng LAN hoặc hotspot thì gần như luôn chạy.

### Vì sao mật khẩu TURN không nằm sẵn trong code

Code đã chuẩn bị sẵn cơ chế sinh **mật khẩu TURN tạm thời**, hết hạn sau 10 phút, ký
bằng HMAC-SHA1 theo RFC 5389 — chỉ cần điền URL TURN server thật vào là dùng được. Lý
do không hardcode mật khẩu:

> *"A static credential in the frontend bundle would be a stranger's relay bandwidth
> on this project's bill."* — Một người lạ bất kỳ cũng lấy được mật khẩu từ mã nguồn
> trình duyệt, rồi dùng băng thông relay đó, mà bạn phải trả tiền.

---

## 6. Lịch sử cuộc gọi — hiện trong khung chat

Tính năng này **mới được thêm** trong buổi làm việc ngày 21/10/2026. Trước đó endpoint
`GET /conversations/{id}/calls` đã tồn tại từ lúc dựng tính năng nhưng **chưa có nơi
nào ở frontend gọi tới nó** — lịch sử cuộc gọi tồn tại ở backend mà không hiển thị ở
đâu cả.

### Cách hoạt động bây giờ

1. `fetchCallHistory()` (`frontend/src/features/calls/call-api.ts`) gọi API lịch sử
2. `work-chat-page.tsx` nạp lịch sử **cùng lúc** với tin nhắn khi mở một hội thoại
3. `CallLogEntry` (`frontend/src/features/calls/components/call-log-entry.tsx`) vẽ
   một dòng **nằm giữa** luồng chat — không lệch trái/phải như bong bóng tin nhắn, vì
   cuộc gọi là **sự kiện của cuộc trò chuyện**, không phải lời ai đó nói
4. Tin nhắn và cuộc gọi được **trộn theo đúng thứ tự thời gian thật**, không xếp thành
   hai cụm riêng
5. Ngay khi một cuộc gọi vừa kết thúc, danh sách lịch sử được tải lại — không phải đợi
   mở lại hội thoại mới thấy

### Nội dung mỗi dòng lịch sử, theo từng kết cục

| Tình huống | Hiện ra |
|---|---|
| Gọi đi, người kia nghe máy | `↗ Cuộc gọi đi · 2:14 · 09:30` |
| Gọi đến, bạn nghe máy | `↘ Cuộc gọi đến · 2:14 · 09:30` |
| Bạn gọi, không ai bắt máy | `Cuộc gọi không trả lời` |
| Người ta gọi, bạn lỡ | `Cuộc gọi nhỡ` — **tô đỏ**, vì đây là dòng duy nhất bạn còn có thể cần làm gì đó |
| Bạn từ chối / bị từ chối | phân biệt rõ hai chiều |
| Kết nối WebRTC hỏng | `Cuộc gọi lỗi kết nối` |

Thời lượng cuộc gọi (`talkSeconds`) được **backend tính sẵn**, không phải frontend tự
trừ hai mốc thời gian — tránh trường hợp hai client tính ra hai con số khác nhau.

---

## 7. Giao diện gọi — cũng được thiết kế lại ngày 21/10

### Hai hình dạng theo trạng thái

- **Lúc đổ chuông / đang kết nối** (`incoming`, `outgoing`, `connecting`) → bảng hiện
  thành **thẻ đứng**, avatar lớn 76px với vòng sóng lan toả, tên to, hai nút Nghe/Từ
  chối **chia đều bề ngang** — lúc quyết định, không nút nào được làm cho dễ bấm hơn
- **Khi đang nói** (`active`) → thu lại thành **thanh ngang gọn**, nhường chỗ cho công
  việc, kèm đồng hồ đếm giờ chạy thật

### Vì sao panel biết tên người gọi

Trước đây panel chỉ hiện icon điện thoại chung chung — vì `CallEventMessage` (frame
gửi qua WebSocket) **chỉ mang id**, không mang tên. Server là nơi duy nhất biết đủ cả
hai phía, nên `peerName` được thêm thẳng vào đó:

```java
CallEventMessage(callId, conversationId, peerId, peerName, incoming, media, status, endReason)
```

`CallBroadcaster` tra tên qua `UserRepository` trước khi gửi, có fallback an toàn nếu
không tìm thấy (*"Người dùng"*) chứ không ném lỗi — vì lúc đó dòng `calls` đã commit
xong, một cuộc gọi không đáng bị bỏ dở chỉ vì thiếu mỗi cái tên hiển thị.

### Đồng hồ đếm giờ

Tính từ mốc `connectedAt` — tức lúc **âm thanh thật sự thông** — chứ không phải từ lúc
bắt đầu đổ chuông. Nhờ vậy con số khớp với những gì máy bên kia thấy.

---

## 8. Hai bug đã sửa

### Bug 1 — API trả 500 cho mọi hành động liên quan tới gọi

**Nguyên nhân:** `CallController` là controller **duy nhất trong cả dự án** thiếu
`@RequestMapping("/api/v1")` ở cấp class. Nó đăng ký đường dẫn
`/conversations/{id}/calls`, trong khi frontend luôn tự thêm tiền tố `/api/v1` vào mọi
request.

**Hậu quả:** Spring không tìm thấy handler nào khớp → rơi xuống bộ xử lý file tĩnh →
ném `NoResourceFoundException` → bộ bắt lỗi chung quy thành `500 INTERNAL_ERROR`. Một
lỗi 404 thực chất bị báo thành lỗi hệ thống.

**Vì sao 31 test cũ không bắt được:** toàn bộ test của tính năng gọi dừng ở tầng
domain/service, **không có test nào từng gửi một request HTTP thật**, nên không có test
nào từng chạm tới URL. Đã bổ sung `CallControllerTest` ghim cả 7 route dưới đúng prefix.

### Bug 2 — Mọi cuộc gọi đều tự báo người kia đang bận

**Nguyên nhân:** thứ tự code cũ là ghi dòng `RINGING` **trước**, rồi mới hỏi
`hasLiveCall(calleeId)` — mà câu hỏi đó tìm **mọi dòng `RINGING`/`ACTIVE` nhắc tên
người này**, kể cả dòng vừa tạo. Cuộc gọi tự nhìn thấy chính nó trong gương và kết
luận người kia đang bận.

**Sửa:** chuyển câu hỏi "có bận không" lên **trước** khi ghi dòng (xem Mục 4, bước 2).

**Vì sao test cũ không bắt được:** `CallServiceTest` mock `callRepository`, nên dòng
vừa `save()` chỉ tồn tại trong mock, `hasLiveCall` không bao giờ "nhìn thấy" nó —
self-match là chuyện chỉ xảy ra với database thật.

---

## 9. Dữ liệu được lưu, và cố tình không lưu

### Lưu vĩnh viễn (bảng `calls`)

Ai gọi ai, lúc nào, bao lâu, kết thúc kiểu gì — đủ để hiện lịch sử. Có 5 ràng buộc
`CHECK` trong database buộc các trạng thái phải hợp lý (ví dụ: không thể có cuộc gọi
`ENDED` mà thiếu `answered_at`, vì tính thời lượng từ giá trị thiếu sẽ ra **số sai chứ
không crash** — sai thầm lặng còn nguy hiểm hơn sập ứng dụng).

### Không bao giờ lưu

Toàn bộ OFFER/ANSWER/ICE candidate. Lý do trong comment gốc:

> *"The SDP and ICE candidates that set it up describe network addresses and codecs
> for a session that is dead the moment it ends, so they are relayed and never
> written down."*

### Dọn cuộc gọi bị bỏ quên

`RingingCallSweeper` chạy định kỳ, tìm các cuộc gọi `RINGING` quá lâu không ai nghe →
tự đóng thành `MISSED`. Không có nó, người tắt tab giữa chừng sẽ để lại một dòng
`RINGING` vĩnh viễn — và vì **mỗi người chỉ được có một cuộc gọi sống tại một thời
điểm**, cả hai bên sẽ kẹt, không gọi được cho ai nữa cho tới khi có người sửa database
bằng tay.

---

## 10. Trạng thái thật tính tới hôm nay

| Hạng mục | Trạng thái |
|---|---|
| Gọi 1:1 (audio) | ✅ Hoạt động, cả 2 bug đã sửa |
| Hiện tên người gọi | ✅ |
| Đồng hồ đếm giờ | ✅ |
| Lịch sử cuộc gọi trong khung chat | ✅ (mới thêm 21/10) |
| TURN server | ❌ Chưa cấu hình — ~1/5 cuộc gọi khác mạng sẽ không kết nối được |
| Gọi video | ❌ Database có cột `media` nhận `VIDEO`, nhưng code frontend khoá cứng chỉ audio |
| Gọi nhóm | ❌ Chặn chủ động, báo lỗi rõ ràng |
| Trên mobile app | ❌ Hoàn toàn chưa có |
| Test | 36/36 xanh (backend phần call), có test ghim cả 2 bug đã sửa |

---

## 11. Muốn thử ngay thì làm gì

Cách dễ nhất, không cần HTTPS: mở **hai tab trình duyệt trên cùng một máy**, đăng nhập
hai tài khoản khác nhau, vào đúng cuộc trò chuyện **1:1** (không phải nhóm) giữa hai
người đó rồi bấm gọi. `localhost` được trình duyệt miễn trừ luật bảo mật secure-context
nên micro hoạt động bình thường dù không có HTTPS.

Lưu ý quan trọng: "online" trong hệ thống này nghĩa là **ngay lúc đó có kết nối
WebSocket sống** (giữ trong RAM của Core API, mất khi restart server), không phải "có
tài khoản". Nếu người kia chưa mở app, cuộc gọi sẽ kết thúc ngay với lý do `OFFLINE`
— đó là hành vi đúng, không phải lỗi.

---

## Phụ lục: bản đồ file nguồn

```
core-api/src/main/java/com/unichat/core/workchat/call/
├── api/
│   ├── CallController.java        REST endpoints
│   ├── CallEventMessage.java      Frame gửi qua WebSocket lifecycle
│   ├── CallResponse.java          DTO trả về sau mỗi hành động
│   ├── CallHistoryEntry.java      DTO một dòng lịch sử
│   ├── StartCallRequest.java      Body của POST bắt đầu gọi
│   └── IceServersResponse.java    DTO danh sách STUN/TURN
├── domain/
│   ├── Call.java                  Entity + state transition logic
│   ├── CallStatus.java            RINGING | ACTIVE | ENDED | DECLINED | MISSED | FAILED
│   ├── CallEndReason.java         Vì sao cuộc gọi kết thúc
│   └── CallRepository.java        Query hasLiveCall, findLiveInConversation...
├── service/
│   ├── CallService.java           Logic chính: start/answer/decline/hangUp
│   ├── CallStateMachine.java      Ai được phép làm gì ở trạng thái nào
│   ├── IceServerProvider.java     Sinh cấu hình STUN/TURN + mật khẩu tạm thời
│   └── RingingCallSweeper.java    Dọn cuộc gọi bị bỏ quên
└── ws/
    ├── CallSignalController.java  Relay OFFER/ANSWER/ICE
    └── CallBroadcaster.java       Đẩy lifecycle event tới đúng người

frontend/src/features/calls/
├── call-api.ts                  REST client + các kiểu dữ liệu
├── call-machine.ts              Reducer thuần cho trạng thái UI
├── call-provider.tsx            Context, nối state machine với WebRTC + socket
├── call-signalling.ts           Gửi/nhận frame qua WebSocket
├── peer-connection.ts           Wrapper quanh RTCPeerConnection
└── components/
    ├── call-button.tsx          Nút gọi trong khung chat
    ├── call-overlay.tsx         Bảng hiện khi đang có cuộc gọi
    └── call-log-entry.tsx       Dòng lịch sử trong khung chat

core-api/src/main/resources/db/migration/
└── V44__direct_calls.sql        Bảng calls + 5 ràng buộc CHECK
```
