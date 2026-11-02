# Đọc code UniChat — hướng dẫn cho người mới

Tài liệu này **đi theo đúng một request** từ lúc người dùng bấm nút cho tới khi
người nhận thấy tin nhắn, dừng lại ở từng file trên đường đi, **trích đúng đoạn
code thật** rồi giải thích từng dòng.

Giả định bạn biết lập trình cơ bản nhưng **chưa từng dùng Spring Boot**. Mọi ký
hiệu lạ đều được giải thích ngay chỗ nó xuất hiện lần đầu.

Tài liệu bạn đọc trước nếu muốn hiểu *nghiệp vụ* thay vì *code*:
[`luong-hoat-dong-chat-va-workspace.md`](luong-hoat-dong-chat-va-workspace.md).

---

## Mục lục

- [Phần A. Sáu khái niệm tối thiểu](#phần-a-sáu-khái-niệm-tối-thiểu)
- [Phần B. Theo chân một request](#phần-b-theo-chân-một-request)
  - [Chặng 1 — `SendMessageRequest`](#chặng-1--sendmessagerequest-dữ-liệu-gửi-lên)
  - [Chặng 2 — `WorkChatController`](#chặng-2--workchatcontroller-cửa-ngõ-http)
  - [Chặng 3 — `DirectMessageService`](#chặng-3--directmessageservice-nơi-chứa-quy-tắc)
  - [Chặng 4 — `ConversationAccess`](#chặng-4--conversationaccess-chốt-kiểm-tra-quyền)
  - [Chặng 5 — `DirectMessage`](#chặng-5--directmessage-entity)
  - [Chặng 6 — `DirectMessageRepository`](#chặng-6--directmessagerepository)
  - [Chặng 7 — Event và Broadcaster](#chặng-7--event-và-broadcaster)
- [Phần C. Hai kiểu file còn lại](#phần-c-hai-kiểu-file-còn-lại)
- [Phần D. Bảng tra cú pháp](#phần-d-bảng-tra-cú-pháp)
- [Phần E. Tự kiểm tra](#phần-e-tự-kiểm-tra)

---

## Phần A. Sáu khái niệm tối thiểu

Đọc hết phần này rồi hẵng sang phần B. Sáu khái niệm, không hơn.

### A1. Annotation là gì — những dòng bắt đầu bằng `@`

```java
@RestController
public class WorkChatController {
```

`@RestController` **không phải là code chạy**. Nó là một **nhãn dán** lên class.
Khi ứng dụng khởi động, Spring quét toàn bộ class, thấy nhãn nào thì xử lý theo
nhãn đó.

Hãy hình dung bạn dán giấy nhớ lên hồ sơ: *"cái này là đơn xin nghỉ"*. Tờ giấy
nhớ không tự làm gì cả, nhưng người xử lý hồ sơ đọc nó rồi biết phải làm gì.

Nhờ cơ chế này mà bạn **không phải viết** code kiểu "mở cổng 8082, lắng nghe,
phân tích URL, tìm hàm tương ứng". Bạn chỉ dán nhãn, Spring lo phần còn lại.

### A2. Dependency Injection — "khai là có"

Để ý đoạn này trong controller:

```java
private final DirectMessageService messageService;

public WorkChatController(DirectMessageService messageService,
                          ChatAttachmentService attachmentService,
                          ContactDirectory contactDirectory,
                          PresenceTracker presenceTracker) {
    this.messageService = messageService;
    ...
}
```

Ở đây **không có chỗ nào gọi `new DirectMessageService(...)`**.

Cách hoạt động: class `DirectMessageService` có nhãn `@Service`, nên lúc khởi
động Spring tự tạo sẵn **một** đối tượng của nó và giữ lại. Khi Spring tạo
`WorkChatController`, nó nhìn vào constructor, thấy cần một
`DirectMessageService`, và **tự đưa cái nó đang giữ vào**.

Cách đó gọi là **Dependency Injection** (tiêm phụ thuộc). Lợi ích thực tế: lúc
viết test, bạn truyền vào một bản giả thay vì bản thật — đó là lý do 346 test
của dự án chạy được mà không cần database.

> **`final` nghĩa là gì?** Gán một lần lúc tạo đối tượng rồi không đổi được nữa.
> Dự án yêu cầu dùng `final` cho mọi phụ thuộc, để không ai lỡ tay thay nó giữa
> chừng.

### A3. `record` — class chỉ để chứa dữ liệu

```java
public record ViDu(String body) {}
```

(Ví dụ minh hoạ, không phải file có thật — file thật xem ở
[Chặng 1](#chặng-1--sendmessagerequest-dữ-liệu-gửi-lên).)

Một dòng này tương đương vài chục dòng Java kiểu cũ: nó tự sinh constructor, hàm
đọc `body()`, `equals()`, `hashCode()` và `toString()`.

**Điểm cần nhớ:** `record` là **bất biến** — tạo xong không sửa được giá trị.
Đó chính là lý do dự án dùng nó cho dữ liệu vào/ra: một request đã nhận thì
không nên bị sửa giữa đường.

Khác biệt với class thường:

| | `class` | `record` |
|---|---|---|
| Đọc giá trị | `getBody()` | `body()` |
| Sửa được không | Có, nếu có setter | **Không** |
| Dùng cho | Entity, service | Request, Response, Event |

### A4. `interface` — bản hợp đồng, không có phần thi hành

```java
public interface DirectMessageRepository extends JpaRepository<DirectMessage, UUID> {
    Page<DirectMessage> findByConversationIdOrderByCreatedAtDesc(UUID conversationId, Pageable pageable);
}
```

Hàm trên **không có thân hàm** — không có `{ ... }`, chỉ có dấu `;`. Nó mới là
lời hứa "sẽ có hàm này", chưa phải phần làm.

Bình thường bạn phải tự viết phần làm. Nhưng với repository thì **Spring Data
đọc tên hàm và tự sinh câu SQL**. Giải thích kỹ ở [Chặng 6](#chặng-6--directmessagerepository).

### A5. Transaction — làm tất cả hoặc không làm gì

Gửi một tin nhắn phải ghi vào **hai** bảng: `direct_messages` (tin nhắn) và
`direct_conversations` (cập nhật thời điểm tin cuối).

Nếu ghi xong bảng một rồi mất điện, dữ liệu sẽ **mâu thuẫn**: có tin nhắn nhưng
danh sách hội thoại không biết.

Transaction giải quyết việc đó: hoặc **cả hai** cùng được ghi, hoặc **không cái
nào** được ghi. Trong Spring chỉ cần dán nhãn:

```java
@Transactional
public MessageResponse send(...) {
```

### A6. Exception — ném lỗi thay vì trả mã lỗi

```java
throw new ValidationError("Tin nhắn tối đa 4000 ký tự");
```

`throw` **dừng hàm ngay lập tức** và "ném" lỗi ra ngoài. Những dòng phía sau
không chạy nữa.

Trong dự án này có một lớp xử lý chung (global exception handler) bắt mọi lỗi
được ném ra và biến thành phản hồi HTTP chuẩn:

| Lỗi được ném | Client nhận |
|---|---|
| `ValidationError` | HTTP 400 — dữ liệu sai |
| `AuthorizationError` | HTTP 403 — không có quyền |
| `NotFoundError` | HTTP 404 — không tìm thấy |
| `ConflictError` | HTTP 409 — xung đột |

Nhờ vậy service **không cần biết gì về HTTP**. Nó chỉ nói "dữ liệu sai", còn
việc đó thành mã 400 là chuyện của tầng khác.

---

## Phần B. Theo chân một request

**Tình huống:** An mở Work Chat, gõ "chào Bình" rồi bấm Gửi.

Trình duyệt gửi đi:

```http
POST /api/v1/work-chat/conversations/7f3a.../messages
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json

{ "body": "chào Bình" }
```

Bảy chặng dưới đây là đường đi của request đó.

---

### Chặng 1 — `SendMessageRequest`: dữ liệu gửi lên

**File:** `core-api/src/main/java/com/unichat/core/workchat/api/SendMessageRequest.java`

Đây là file **toàn bộ**, chỉ 15 dòng:

```java
package com.unichat.core.workchat.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Text of a new message.
 *
 * @param body the message; blank is rejected rather than stored as an empty row
 */
public record SendMessageRequest(
        @NotBlank(message = "Nội dung tin nhắn không được để trống")
        @Size(max = 4000, message = "Tin nhắn tối đa 4000 ký tự")
        String body
) {}
```

**Giải thích từng phần:**

| Dòng | Ý nghĩa |
|---|---|
| `package com.unichat...` | Địa chỉ của file, **phải khớp với đường dẫn thư mục**. File nằm ở `.../workchat/api/` nên package là `...workchat.api`. |
| `import jakarta...NotBlank` | Khai báo "tôi sẽ dùng `@NotBlank`, nó nằm ở thư viện này". Giống `import` của Python. |
| `/** ... */` | Javadoc — chú thích tài liệu. Khác `//` ở chỗ IDE hiện nó lên khi bạn rê chuột vào tên class. |
| `public record SendMessageRequest(` | Khai báo một record tên `SendMessageRequest`. `public` = chỗ khác dùng được. |
| `@NotBlank(message = "...")` | Luật kiểm tra: **không được rỗng**, và nếu sai thì báo bằng câu tiếng Việt này. |
| `@Size(max = 4000, ...)` | Luật kiểm tra: tối đa 4000 ký tự. |
| `String body` | Trường duy nhất của record, kiểu chuỗi, tên `body`. |
| `) {}` | Thân record rỗng — không cần thêm hàm nào. |

**Luồng hành động:** Spring nhận JSON `{ "body": "chào Bình" }`, tự chuyển thành
một đối tượng `SendMessageRequest` với `body = "chào Bình"`, rồi **chạy các luật
kiểm tra** ở trên.

Nếu An gửi chuỗi rỗng, `@NotBlank` không qua → Spring **tự động** trả HTTP 400
kèm câu *"Nội dung tin nhắn không được để trống"*. **Controller không hề được
gọi.** Bạn không phải viết một dòng `if` nào cho việc đó.

> **Vì sao kiểm tra ở đây mà không trong service?** Vì đây là luật về *hình
> dạng dữ liệu*, không phải luật nghiệp vụ. Chặn càng sớm càng rẻ.
>
> Nhưng để ý: giới hạn 4000 ký tự **còn được kiểm tra lần nữa** trong service.
> Không thừa — xem [Chặng 3](#chặng-3--directmessageservice-nơi-chứa-quy-tắc).

---

### Chặng 2 — `WorkChatController`: cửa ngõ HTTP

**File:** `workchat/api/WorkChatController.java`

Phần đầu class:

```java
@RestController
@RequestMapping("/api/v1/work-chat")
public class WorkChatController {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int DEFAULT_PAGE_SIZE = 20;

    private final DirectMessageService messageService;
    private final ChatAttachmentService attachmentService;
    private final ContactDirectory contactDirectory;
    private final PresenceTracker presenceTracker;

    public WorkChatController(DirectMessageService messageService,
                              ChatAttachmentService attachmentService,
                              ContactDirectory contactDirectory,
                              PresenceTracker presenceTracker) {
        this.messageService = messageService;
        this.attachmentService = attachmentService;
        this.contactDirectory = contactDirectory;
        this.presenceTracker = presenceTracker;
    }
```

| Dòng | Ý nghĩa |
|---|---|
| `@RestController` | Dán nhãn: *"class này nhận request HTTP, và kết quả trả về hãy chuyển thẳng thành JSON"*. |
| `@RequestMapping("/api/v1/work-chat")` | **Tiền tố chung** cho mọi đường dẫn trong class. Khỏi phải viết lại ở từng hàm. |
| `private static final int MAX_PAGE_SIZE = 100;` | Hằng số. `static` = thuộc về class chứ không thuộc từng đối tượng. `final` = không đổi được. Viết HOA theo quy ước. |
| `private final DirectMessageService messageService;` | Phụ thuộc. Xem lại [A2](#a2-dependency-injection--khai-là-có). |
| Constructor | Spring gọi hàm này lúc khởi động và tự đưa vào 4 đối tượng. |

Và đây là hàm xử lý đúng request của An:

```java
/** Sends a message to the other participant. */
@PostMapping("/conversations/{conversationId}/messages")
public ResponseEntity<MessageResponse> send(
        @PathVariable UUID conversationId,
        @Valid @RequestBody SendMessageRequest request,
        @AuthenticationPrincipal Jwt jwt) {
    return ResponseEntity.ok(
            messageService.send(callerOf(jwt), conversationId, request.body()));
}
```

**Đây là đoạn dày đặc cú pháp nhất. Mổ từng mảnh:**

**`@PostMapping("/conversations/{conversationId}/messages")`**
Gắn hàm này với `POST /api/v1/work-chat/conversations/{conversationId}/messages`
(có tiền tố từ `@RequestMapping`). Phần trong ngoặc nhọn `{conversationId}` là
**biến đường dẫn** — nó khớp với bất kỳ giá trị nào.

**`ResponseEntity<MessageResponse>`**
Kiểu trả về. `ResponseEntity` là "phản hồi HTTP đầy đủ" — gồm mã trạng thái,
header và nội dung. Phần `<MessageResponse>` trong ngoặc nhọn gọi là
**generic**, nghĩa là *"phản hồi này chứa một `MessageResponse`"*.

Hãy nghĩ `ResponseEntity<X>` như một cái phong bì, còn `X` là lá thư bên trong.

**`@PathVariable UUID conversationId`**
Lấy đoạn `{conversationId}` trên URL, **tự chuyển từ chuỗi sang `UUID`**, rồi
đưa vào tham số. URL có `7f3a-...` thì biến này mang đúng giá trị đó.

**`@Valid @RequestBody SendMessageRequest request`**
Hai nhãn chồng lên nhau, đọc từ phải sang:
- `@RequestBody` — lấy phần thân JSON của request và chuyển thành đối tượng.
- `@Valid` — **chạy các luật kiểm tra** đã khai ở Chặng 1. Thiếu nhãn này thì
  `@NotBlank` và `@Size` **nằm đó mà không chạy**. Đây là lỗi rất hay gặp.

**`@AuthenticationPrincipal Jwt jwt`**
Lấy token đã được giải mã của người đang gọi. Spring Security đã kiểm tra chữ ký
token **trước khi** hàm này chạy, nên tới đây là token chắc chắn hợp lệ.

**`callerOf(jwt)`** — hàm phụ ở cuối file:

```java
private static UUID callerOf(Jwt jwt) {
    return UUID.fromString(jwt.getSubject());
}
```

`getSubject()` lấy trường `sub` trong token, chính là id người dùng, dạng chuỗi.
`UUID.fromString(...)` đổi chuỗi đó thành kiểu `UUID`.

> **Điểm bảo mật quan trọng nhất của cả file:** id người gửi lấy **từ token**,
> **không** lấy từ dữ liệu client gửi lên. Nếu để client tự khai "tôi là ai" thì
> bất kỳ ai cũng mạo danh được người khác.

**`ResponseEntity.ok(...)`** — đóng gói kết quả với mã HTTP 200.

**Luồng hành động của cả chặng:** controller **không quyết định gì cả**. Nó lấy
3 thứ (id người gọi, id hội thoại, nội dung) rồi chuyển hết sang service. Toàn
bộ hàm chỉ có **một câu lệnh**. Đó là ý đồ — controller phải mỏng.

---

### Chặng 3 — `DirectMessageService`: nơi chứa quy tắc

**File:** `workchat/service/DirectMessageService.java`

```java
@Service
@Transactional(readOnly = true)
public class DirectMessageService {

    /** Enforced here rather than only on the JSON request, which the
     *  multipart path does not go through. */
    private static final int MAX_BODY_LENGTH = 4000;
    private static final String UNKNOWN_NAME = "Người dùng";

    private final DirectConversationRepository conversationRepository;
    private final DirectMessageRepository messageRepository;
    ...
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;
```

| Phần | Ý nghĩa |
|---|---|
| `@Service` | Nhãn báo Spring: *"tạo sẵn một đối tượng của class này"*. Về mặt kỹ thuật giống `@Component`, nhưng tên nói rõ vai trò. |
| `@Transactional(readOnly = true)` | Mặc định **cho cả class**: mọi hàm chỉ đọc. Database tối ưu được khi biết trước là không ghi. |
| `MAX_BODY_LENGTH = 4000` | Giới hạn, kèm chú thích nói rõ vì sao phải lặp lại. |
| `private final Clock clock;` | **Đồng hồ cũng là một phụ thuộc.** Xem ghi chú bên dưới. |

> **Vì sao lại tiêm cả `Clock`?** Nếu code gọi thẳng `Instant.now()` thì test
> không kiểm soát được thời gian. Tiêm `Clock` vào thì test truyền một đồng hồ
> đứng yên ở một thời điểm cố định, và kết quả luôn lặp lại được. Đây là mẹo rất
> đáng học.

> **Vì sao kiểm tra 4000 ký tự hai lần?** Chú thích trong code trả lời: đường
> gửi kèm tệp (`multipart`) **không đi qua** `SendMessageRequest`, nên nếu chỉ
> dựa vào `@Size` thì đường đó không được bảo vệ. Quy tắc nghiệp vụ phải nằm ở
> service, chỗ **mọi** đường đi đều phải qua.

Giờ tới hàm chính:

```java
@Transactional
public MessageResponse send(UUID callerId, UUID conversationId, String body,
                            List<MultipartFile> files) {
    DirectConversation conversation =
            conversationAccess.requireParticipant(callerId, conversationId);

    String text = textOrNull(body);
    if (text != null && text.length() > MAX_BODY_LENGTH) {
        throw new ValidationError("Tin nhắn tối đa 4000 ký tự");
    }
    if (text == null && files.isEmpty()) {
        throw new ValidationError("Tin nhắn cần có nội dung hoặc tệp đính kèm");
    }
    // Checked before the message row exists, so a rejected file does not
    // leave an empty bubble behind.
    attachmentService.validateAll(files);

    Instant now = Instant.now(clock);
    DirectMessage message = new DirectMessage(
            UuidGenerator.generateV7(), conversationId, callerId, text, now);
    messageRepository.save(message);

    List<ChatAttachmentResponse> attachments = files.isEmpty()
            ? List.of()
            : attachmentService.attachAll(conversationId, message.getId(), files);

    conversation.setLastMessageAt(now);
    conversationRepository.save(conversation);

    MessageResponse response =
            MessageResponse.from(message, displayNameOf(callerId), callerId, attachments);
    // Delivery is someone else's job; this service stays free of the broker
    // so it keeps working, and keeps being testable, without one.
    eventPublisher.publishEvent(new DirectMessageSentEvent(
            conversationAccess.recipientsOf(conversationId, callerId), response));
    return response;
}
```

**Đọc theo thứ tự thực thi:**

**1. `@Transactional`** — ghi đè `readOnly = true` của class. Hàm này **có ghi**,
nên cần transaction đầy đủ. Từ đây tới khi hàm kết thúc là *một* transaction:
thành công hết hoặc huỷ hết.

**2. `requireParticipant(...)`** — kiểm tra quyền **trước tiên**, trước mọi việc
tốn kém. Nếu An không ở trong hội thoại, hàm này ném lỗi và những dòng dưới
không bao giờ chạy. Chi tiết ở [Chặng 4](#chặng-4--conversationaccess-chốt-kiểm-tra-quyền).

**3. Kiểm tra dữ liệu** — hai `if` liên tiếp, mỗi `if` ném một lỗi khác nhau.

Đây là kiểu viết **early return** (thoát sớm) mà dự án yêu cầu: gặp trường hợp
sai thì ném lỗi ra luôn, thay vì bọc phần thân vào trong `if (hợp lệ) { ... }`.
So sánh:

```java
// Dự án viết thế này — phẳng, dễ đọc
if (sai điều kiện 1) throw ...;
if (sai điều kiện 2) throw ...;
làmViệcChính();

// Thay vì thế này — thụt lề sâu dần, khó đọc
if (đúng điều kiện 1) {
    if (đúng điều kiện 2) {
        làmViệcChính();
    }
}
```

**4. `attachmentService.validateAll(files)`** — chú thích ngay trên nói rõ lý do
đặt ở đây: kiểm tra tệp **trước khi** tạo hàng tin nhắn, để một tệp bị từ chối
không để lại bong bóng rỗng.

**5. `Instant.now(clock)`** — lấy thời điểm hiện tại **từ đồng hồ đã tiêm**, chứ
không phải `Instant.now()` trần.

**6. Tạo và lưu tin nhắn**

```java
DirectMessage message = new DirectMessage(
        UuidGenerator.generateV7(), conversationId, callerId, text, now);
messageRepository.save(message);
```

`new DirectMessage(...)` tạo đối tượng trong bộ nhớ. `save(...)` mới là lệnh ghi
xuống database.

`UuidGenerator.generateV7()` sinh id. **UUID phiên bản 7** có đặc điểm: nó chứa
mốc thời gian ở đầu, nên **sắp xếp UUID theo thứ tự chuỗi cũng chính là sắp theo
thời gian tạo**. Điều này làm database đánh chỉ mục hiệu quả hơn nhiều so với
UUID ngẫu nhiên.

**7. Toán tử ba ngôi**

```java
List<ChatAttachmentResponse> attachments = files.isEmpty()
        ? List.of()
        : attachmentService.attachAll(conversationId, message.getId(), files);
```

Cú pháp `điều_kiện ? giá_trị_nếu_đúng : giá_trị_nếu_sai`. Đọc là: *"nếu không có
tệp nào thì dùng danh sách rỗng, ngược lại thì gọi `attachAll`"*.

`List.of()` tạo một danh sách rỗng **không sửa được**.

**8. Cập nhật hội thoại** — `setLastMessageAt(now)` rồi `save`. Đây là lần ghi
thứ hai, cùng transaction với lần ghi tin nhắn.

**9. Bắn sự kiện**

```java
eventPublisher.publishEvent(new DirectMessageSentEvent(
        conversationAccess.recipientsOf(conversationId, callerId), response));
```

Service **không tự đẩy tin qua WebSocket**. Nó chỉ thông báo "việc này vừa xảy
ra" rồi đi tiếp ngay, không chờ.

Chú thích trong code giải thích vì sao: để service **không phụ thuộc vào broker**
— nó vẫn chạy được, và vẫn test được, khi không có WebSocket.

**10. `return response;`** — trả về cho controller, controller gói vào
`ResponseEntity.ok(...)`, Spring chuyển thành JSON gửi cho An.

**Transaction commit ngay sau khi hàm này kết thúc.**

---

### Chặng 4 — `ConversationAccess`: chốt kiểm tra quyền

**File:** `workchat/service/ConversationAccess.java`

```java
public DirectConversation requireParticipant(UUID callerId, UUID conversationId) {
    return participationOf(callerId, conversationId).conversation();
}

public Participation participationOf(UUID callerId, UUID conversationId) {
    DirectConversation conversation = conversationRepository.findById(conversationId)
            .orElseThrow(ConversationAccess::hidden);
    ConversationParticipant participant = participantRepository
            .findByIdConversationIdAndIdUserId(conversationId, callerId)
            .orElseThrow(ConversationAccess::hidden);
    return new Participation(conversation, participant);
}

private static NotFoundError hidden() {
    return new NotFoundError("Cuộc trò chuyện không tồn tại");
}
```

**Cú pháp mới xuất hiện ở đây:**

**`findById(...)` trả về `Optional<DirectConversation>`**
`Optional` là một cái hộp **có thể rỗng**. Nó buộc bạn phải xử lý trường hợp
"không tìm thấy", thay vì nhận `null` rồi lỡ quên kiểm tra và chương trình vỡ.

**`.orElseThrow(...)`**
Đọc là: *"lấy giá trị trong hộp ra; nếu hộp rỗng thì ném lỗi"*.

**`ConversationAccess::hidden`**
Dấu `::` là **method reference** (tham chiếu phương thức). Nó có nghĩa *"đây là
hàm `hidden`, nhưng đừng gọi bây giờ — khi nào cần thì gọi"*.

Viết dài ra sẽ là `() -> hidden()`. Cả hai tương đương; `::` gọn hơn.

> Vì sao phải "đừng gọi bây giờ"? Vì nếu viết `orElseThrow(hidden())` thì hàm
> `hidden()` chạy **ngay lập tức**, kể cả khi tìm thấy dữ liệu — tức là tạo một
> đối tượng lỗi vô ích mỗi lần gọi.

**Điểm thiết kế quan trọng nhất của file này:** cả hai trường hợp —
*hội thoại không tồn tại* và *hội thoại có tồn tại nhưng bạn không ở trong đó* —
đều ném **cùng một lỗi 404 với cùng một câu**.

Vì sao không trả 403 cho trường hợp thứ hai? Vì 403 nghĩa là *"nó có tồn tại,
nhưng bạn không được vào"* — và như vậy là đã **xác nhận hội thoại đó tồn tại**
cho một người lạ chỉ cần đoán id. 404 không tiết lộ gì cả.

---

### Chặng 5 — `DirectMessage`: entity

**File:** `workchat/domain/DirectMessage.java`

```java
@Entity
@Table(name = "direct_messages")
public class DirectMessage {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "conversation_id", nullable = false, updatable = false)
    private UUID conversationId;

    @Column(name = "sender_id", nullable = false, updatable = false)
    private UUID senderId;

    /** Null in a message that is only files. Never blank. */
    @Column(name = "body")
    private String body;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected DirectMessage() {}

    public DirectMessage(UUID id, UUID conversationId, UUID senderId, String body, Instant createdAt) {
        this.id = id;
        this.conversationId = conversationId;
        this.senderId = senderId;
        this.body = body;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    ...
}
```

**Entity là gì?** Là một class **ánh xạ 1-1 với một bảng** trong database. Mỗi
đối tượng của class = một hàng trong bảng. Mỗi trường = một cột.

| Nhãn | Ý nghĩa |
|---|---|
| `@Entity` | *"Class này là một bảng."* |
| `@Table(name = "direct_messages")` | Tên bảng thật. Thiếu nhãn này thì mặc định lấy tên class, thường không khớp quy ước đặt tên của SQL. |
| `@Id` | Trường này là **khoá chính**. |
| `@Column(name = "conversation_id")` | Tên cột thật. Java viết `conversationId` (camelCase), SQL viết `conversation_id` (snake_case). Nhãn này nối hai bên lại. |
| `nullable = false` | Cột không cho phép rỗng. |
| `updatable = false` | **Ghi một lần, không bao giờ sửa.** Người gửi một tin nhắn không thể đổi. |

**Hai constructor — vì sao?**

```java
protected DirectMessage() {}
```

Constructor rỗng, `protected` (chỉ class con và cùng package gọi được). **Hibernate
bắt buộc phải có nó** để dựng lại đối tượng khi đọc từ database. Nhưng để
`public` thì code khác có thể tạo ra một tin nhắn **không có id, không có người
gửi** — một đối tượng vô nghĩa. Để `protected` là cách chặn điều đó.

```java
public DirectMessage(UUID id, UUID conversationId, ...) {
```

Constructor thật, bắt buộc truyền đủ mọi thứ. Đây là cái mà code của bạn dùng.

> **Nguyên tắc rút ra:** entity nên làm cho **trạng thái sai trở nên không tạo
> được**. Đó là lý do có hai constructor, và là lý do `DirectConversation` dùng
> hàm `between()` và `group()` thay vì `new` trực tiếp.

**`body` có thể null** — chú thích nói rõ: tin nhắn chỉ có tệp thì không có chữ.
Nhưng **không bao giờ là chuỗi rỗng** — hoặc có chữ thật, hoặc `null`. Chỉ có
một cách biểu diễn "không có chữ", nên code sau này không phải kiểm tra hai thứ.

---

### Chặng 6 — `DirectMessageRepository`

**File:** `workchat/domain/DirectMessageRepository.java`

```java
@Repository
public interface DirectMessageRepository extends JpaRepository<DirectMessage, UUID> {

    Page<DirectMessage> findByConversationIdOrderByCreatedAtDesc(UUID conversationId, Pageable pageable);
```

**`extends JpaRepository<DirectMessage, UUID>`**
Kế thừa sẵn một bộ hàm có sẵn: `save()`, `findById()`, `delete()`, `count()`...
Hai tham số trong ngoặc nhọn nghĩa là *"repository này làm việc với entity
`DirectMessage`, khoá chính kiểu `UUID`"*.

**Hàm không có thân mà vẫn chạy — bằng cách nào?**

Spring Data **đọc tên hàm như đọc một câu** và tự sinh SQL:

```
findBy ConversationId OrderBy CreatedAt Desc
  │         │              │        │      │
  │         │              │        │      └─ giảm dần
  │         │              │        └─ theo trường createdAt
  │         │              └─ sắp xếp
  │         └─ lọc theo trường conversationId
  └─ tìm kiếm
```

Tương đương `SELECT * FROM direct_messages WHERE conversation_id = ? ORDER BY created_at DESC`.

**Hệ quả cần nhớ:** đổi tên hàm là **đổi câu truy vấn**. Gõ sai tên trường thì
ứng dụng **không khởi động được** — may là lỗi hiện ra ngay chứ không âm thầm.

**`Pageable` và `Page<T>`** — phân trang. `Pageable` là câu hỏi *"cho tôi trang
số mấy, mỗi trang bao nhiêu dòng"*; `Page<T>` là câu trả lời, gồm dữ liệu **và**
tổng số dòng.

**Khi tên hàm không đủ diễn đạt thì viết SQL tay:**

```java
@Query(value = "SELECT m.conversation_id, COUNT(*) FROM direct_messages m "
        + "JOIN conversation_participants p "
        + "  ON p.conversation_id = m.conversation_id AND p.user_id = :readerId "
        + "WHERE m.conversation_id IN :conversationIds "
        + "  AND m.sender_id <> :readerId "
        + "  AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at) "
        + "GROUP BY m.conversation_id", nativeQuery = true)
List<Object[]> countUnreadByConversation(@Param("conversationIds") List<UUID> conversationIds,
                                         @Param("readerId") UUID readerId);
```

| Phần | Ý nghĩa |
|---|---|
| `@Query(value = "...")` | Câu truy vấn viết tay. |
| `nativeQuery = true` | Đây là **SQL thật** của PostgreSQL. Nếu `false` (mặc định) thì là JPQL — ngôn ngữ truy vấn theo *tên class Java* chứ không theo tên bảng. |
| `:readerId` | **Tham số**, không phải nối chuỗi. |
| `@Param("readerId")` | Nối tham số Java với `:readerId` trong câu truy vấn. |

> **Vì sao phải dùng `:tham_số` thay vì nối chuỗi?** Nối chuỗi mở đường cho
> **SQL injection** — kẻ tấn công nhét câu lệnh vào dữ liệu. Với tham số, driver
> gửi câu lệnh và dữ liệu **riêng biệt**, nên dữ liệu không bao giờ bị hiểu
> thành lệnh. `AGENTS.md` bắt buộc điều này.

**Câu truy vấn này làm gì?** Đếm số tin chưa đọc cho **nhiều hội thoại cùng một
lúc** — `IN :conversationIds`. Đó là cách tránh lỗi N+1: 20 hội thoại vẫn chỉ
một lần gọi database.

Điều kiện `m.created_at > p.last_read_at` chính là **mốc nước đã đọc**: tin nào
mới hơn mốc của bạn thì tính là chưa đọc.

---

### Chặng 7 — Event và Broadcaster

**File 1:** `workchat/domain/DirectMessageSentEvent.java` — toàn bộ nội dung:

```java
public record DirectMessageSentEvent(Set<UUID> recipientIds, MessageResponse message) {}
```

Một dòng. Nó chỉ là cái hộp chứa hai thứ: *gửi cho ai* và *gửi cái gì*.

**File 2:** `workchat/ws/WorkChatBroadcaster.java`

```java
@Component
public class WorkChatBroadcaster {

    private static final String MESSAGES = "/queue/messages";
    private static final String CONVERSATIONS = "/queue/conversations";

    private static final Logger log = LoggerFactory.getLogger(WorkChatBroadcaster.class);

    private final SimpMessagingTemplate messagingTemplate;

    public WorkChatBroadcaster(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMessageSent(DirectMessageSentEvent event) {
        event.recipientIds().forEach(recipientId -> messagingTemplate.convertAndSendToUser(
                recipientId.toString(), MESSAGES, event.message()));
        log.debug("Delivered message {} to {} recipients",
                event.message().id(), event.recipientIds().size());
    }
}
```

**`@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`**

Đây là nhãn quan trọng nhất trong cả tài liệu này. Đọc là:

> *"Khi có ai đó bắn ra một `DirectMessageSentEvent`, hãy gọi hàm này — **nhưng
> chờ cho tới khi transaction đã commit xong**."*

**Vì sao phải chờ?** Nhớ lại Chặng 3: service bắn sự kiện ở bước 9, nhưng
transaction mãi tới sau khi hàm kết thúc mới commit. Nếu đẩy tin ngay lúc bắn,
rồi transaction **rollback** vì lỗi, thì Bình đã nhìn thấy một tin nhắn **không
tồn tại trong database** — và không có sự kiện nào sau đó gỡ nó đi.

Đổi `AFTER_COMMIT` thành `@EventListener` thường là tạo ra đúng lỗi đó. Nó rất
khó phát hiện vì chỉ xảy ra khi có lỗi.

**`event.recipientIds().forEach(recipientId -> ...)`**

`forEach` lặp qua từng phần tử. Phần `recipientId -> ...` là một **lambda** — hàm
viết tắt không cần tên. Đọc là *"với mỗi `recipientId`, làm việc sau"*.

Tương đương vòng lặp quen thuộc:

```java
for (UUID recipientId : event.recipientIds()) {
    messagingTemplate.convertAndSendToUser(...);
}
```

**`convertAndSendToUser(userId, "/queue/messages", payload)`**

Đẩy dữ liệu tới **một người cụ thể**. Spring tự chuyển `payload` thành JSON và
gửi tới đích `/user/{userId}/queue/messages`.

Vì đích gắn với tên principal (= user id, do `StompAuthChannelInterceptor` đặt
lúc CONNECT), **không ai đăng ký được hàng đợi của người khác**.

**`log.debug("Delivered message {} to {} recipients", ..., ...)`**

Ghi log. Dấu `{}` là chỗ trống, hai tham số sau điền vào theo thứ tự.

> **Vì sao không viết `log.debug("... " + id + " ...")`?** Vì nối chuỗi thì phép
> nối **luôn chạy**, kể cả khi log mức debug đang tắt. Với `{}`, chuỗi chỉ được
> ghép khi thật sự ghi log. Và `AGENTS.md` cấm `console.log`/`System.out` trong
> code production — phải dùng logger có cấu trúc.

---

## Phần C. Hai kiểu file còn lại

### C1. `enum` — danh sách giá trị cố định

**File:** `workchat/domain/ParticipantRole.java` — toàn bộ:

```java
package com.unichat.core.workchat.domain;

/**
 * What someone may do to the conversation itself, as opposed to in it.
 *
 * <p>Everyone may read and write; only an owner may rename a group or change
 * who is in it. A one-to-one conversation has no owner — there is nothing to
 * administer when the membership is the pair.
 */
public enum ParticipantRole {
    /** May rename the group, add members and remove them. */
    OWNER,
    /** May read, write and leave. */
    MEMBER
}
```

`enum` khai báo một kiểu chỉ nhận **đúng những giá trị liệt kê**. Biến kiểu
`ParticipantRole` chỉ có thể là `OWNER` hoặc `MEMBER`, không gì khác.

**Vì sao không dùng `String` cho gọn?** Vì với `String`, gõ nhầm `"OWENR"` thì
chương trình vẫn biên dịch và chạy, lỗi chỉ lộ ra lúc vận hành. Với `enum`, gõ
sai là **trình biên dịch báo lỗi ngay**.

### C2. Mẫu `Request` / `Response` — vì sao không dùng thẳng entity

Ba kiểu dữ liệu cho cùng một khái niệm, mỗi kiểu một việc:

| Kiểu | Dùng ở đâu | Chứa gì |
|---|---|---|
| `SendMessageRequest` | Client **gửi lên** | Chỉ `body` — những thứ client được phép quyết định |
| `DirectMessage` (entity) | Trong database | Mọi cột, kể cả cái không được lộ |
| `MessageResponse` | Server **trả về** | Thứ client được phép thấy, cộng tên người gửi |

**Ví dụ cụ thể về việc "không được lộ":** entity `ChatAttachment` có cột
`storage_key` — đường dẫn tới file trong kho. `ChatAttachmentResponse` **cố tình
bỏ trường đó**. Javadoc của nó viết rõ: byte của file phải đi qua endpoint có
kiểm tra quyền, chứ không để client cầm đường dẫn kho mà tự mò.

Nếu trả thẳng entity ra ngoài, **mọi cột đều lộ** — và sau này thêm một cột nhạy
cảm vào bảng là nó tự động lọt ra API mà không ai nhận ra.

---

## Phần D. Bảng tra cú pháp

Gặp ký hiệu lạ thì tra ở đây.

### Nhãn Spring

| Nhãn | Dán lên | Nghĩa |
|---|---|---|
| `@RestController` | class | Nhận HTTP, trả JSON |
| `@RequestMapping("/x")` | class | Tiền tố đường dẫn chung |
| `@GetMapping` / `@PostMapping` / `@PatchMapping` / `@DeleteMapping` / `@PutMapping` | hàm | Gắn hàm với một đường dẫn và một phương thức HTTP |
| `@PathVariable` | tham số | Lấy giá trị từ `{...}` trên URL |
| `@RequestBody` | tham số | Lấy JSON trong thân request |
| `@RequestParam` | tham số | Lấy giá trị sau dấu `?` trên URL |
| `@RequestPart` | tham số | Lấy một phần của form multipart (upload tệp) |
| `@Valid` | tham số | **Chạy** các luật kiểm tra. Thiếu là luật không chạy |
| `@AuthenticationPrincipal` | tham số | Lấy token đã giải mã của người đang gọi |
| `@Service` | class | Spring tạo sẵn một đối tượng |
| `@Component` | class | Như `@Service`, dùng khi không phải tầng service |
| `@Repository` | interface | Đánh dấu tầng truy cập dữ liệu |
| `@Transactional` | class / hàm | Gộp mọi thao tác thành một đơn vị toàn-vẹn-hoặc-huỷ |
| `@TransactionalEventListener(AFTER_COMMIT)` | hàm | Chỉ chạy **sau khi** transaction commit |
| `@Query` | hàm repository | Câu truy vấn viết tay |
| `@Param("x")` | tham số | Nối với `:x` trong `@Query` |

### Nhãn JPA (ánh xạ database)

| Nhãn | Nghĩa |
|---|---|
| `@Entity` | Class này ứng với một bảng |
| `@Table(name = "...")` | Tên bảng thật |
| `@Id` | Khoá chính |
| `@Column(name = "...")` | Tên cột thật |
| `nullable = false` | Cột bắt buộc có giá trị |
| `updatable = false` | Ghi một lần, không sửa |
| `@Enumerated(EnumType.STRING)` | Lưu enum thành chữ (`"OWNER"`) thay vì số thứ tự |

### Nhãn kiểm tra dữ liệu

| Nhãn | Nghĩa |
|---|---|
| `@NotBlank` | Không null, không rỗng, không chỉ toàn khoảng trắng |
| `@NotNull` | Không được null (chuỗi rỗng vẫn qua) |
| `@Size(max = n)` | Độ dài tối đa |

### Cú pháp Java

| Ký hiệu | Tên | Nghĩa |
|---|---|---|
| `List<String>` | generic | Danh sách **chứa** `String` |
| `x -> x + 1` | lambda | Hàm ngắn không tên |
| `Class::method` | method reference | Trỏ tới hàm, chưa gọi |
| `a ? b : c` | toán tử ba ngôi | Nếu `a` thì `b`, ngược lại `c` |
| `Optional<T>` | | Hộp có thể rỗng, buộc xử lý trường hợp không có |
| `.orElseThrow(...)` | | Lấy ra, rỗng thì ném lỗi |
| `final` | | Gán một lần, không đổi |
| `static` | | Thuộc về class, không thuộc từng đối tượng |
| `record X(int a) {}` | | Class chứa dữ liệu, bất biến |
| `List.of()` | | Danh sách rỗng, không sửa được |

---

## Phần E. Tự kiểm tra

Trả lời được 5 câu này là bạn đã nắm được phần cốt lõi.

**1. Vì sao id người gửi lấy từ token mà không lấy từ JSON client gửi lên?**

<details><summary>Đáp án</summary>

Vì client nói gì cũng được. Nếu id người gửi nằm trong JSON thì ai cũng sửa được
thành id người khác để mạo danh. Token do server ký, client không giả được.
</details>

**2. Xoá nhãn `@Valid` ở controller thì chuyện gì xảy ra?**

<details><summary>Đáp án</summary>

`@NotBlank` và `@Size` trong `SendMessageRequest` **không chạy nữa**. Tin nhắn
rỗng sẽ lọt qua controller. Nhưng giới hạn 4000 ký tự vẫn bị chặn ở service, vì
service kiểm tra lại lần nữa — đó chính là lý do phải kiểm tra hai lần.
</details>

**3. Vì sao đẩy tin qua WebSocket phải chờ `AFTER_COMMIT`?**

<details><summary>Đáp án</summary>

Vì nếu đẩy trước mà transaction rollback, người nhận thấy một tin nhắn không tồn
tại trong database, và không có sự kiện nào sau đó gỡ nó đi.
</details>

**4. Vì sao `requireParticipant` ném 404 chứ không phải 403?**

<details><summary>Đáp án</summary>

403 nghĩa là "có tồn tại nhưng bạn không được vào" — tức đã xác nhận hội thoại
tồn tại cho một người lạ chỉ cần đoán id. 404 không tiết lộ gì.
</details>

**5. Thêm một cột vào bảng `direct_messages` thì phải sửa những đâu?**

<details><summary>Đáp án</summary>

Hai chỗ, bắt buộc cả hai:
1. Thêm trường và `@Column` vào entity `DirectMessage.java`.
2. **Tạo file migration mới** trong `core-api/src/main/resources/db/migration/`,
   đánh số lớn hơn mọi số đã dùng.

Thiếu bước 2 thì ứng dụng không khởi động, Hibernate báo `missing column`. Và
**không bao giờ sửa file migration đã chạy** — luôn tạo file mới.
</details>

---

## Đọc tiếp

| Cần gì | Đọc đâu |
|---|---|
| Nghiệp vụ ba luồng chính | [`luong-hoat-dong-chat-va-workspace.md`](luong-hoat-dong-chat-va-workspace.md) |
| Kiến trúc tổng thể, cây thư mục, pipeline RAG | [`kien-truc-va-luong-hoat-dong.md`](kien-truc-va-luong-hoat-dong.md) |
| Quy tắc kỹ thuật bắt buộc của dự án | [`../AGENTS.md`](../AGENTS.md) |
