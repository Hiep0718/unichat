# Ảnh nền mặc định

Thư mục này giữ ba nhóm ảnh:

- **Hai mươi ảnh `cover-*.jpg`** — nền mặc định cho workspace chưa tải ảnh riêng
  lên. `src/features/workspaces/default-covers.ts` gán ảnh, và `cover-assignment.tsx`
  đảm bảo **không hai workspace nào trên cùng một trang đội cùng một ảnh**. Băm
  riêng từng id không làm được điều đó dù có bao nhiêu ảnh đi nữa: 10 workspace
  với 20 ảnh vẫn trùng với xác suất hơn 9/10 (nghịch lý ngày sinh), và trên thực
  tế đã trùng. Không có gì được lưu xuống DB: cùng một tập workspace luôn cho ra
  cùng một cách gán.
- **Hai mươi ảnh `topics/topic-*.jpg`** — nền theo chủ đề workspace, mỗi chủ
  đề trong `WorkspaceTopic` một ảnh. Ưu tiên hơn bộ trừu tượng khi nhóm đã chọn
  chủ đề. Xem mục "Ảnh theo chủ đề" bên dưới.
- **`banner-dashboard.jpg`** — nền dải chào mừng đầu trang dashboard, dùng trong
  `welcome-banner.css`. Một ảnh cố định, không băm theo gì cả: dải này là của
  người đang đăng nhập chứ không thuộc nhóm nào.

## Nguồn và giấy phép

Tất cả lấy từ [Unsplash](https://unsplash.com) theo [Unsplash License](https://unsplash.com/license):
dùng được miễn phí cho cả mục đích thương mại lẫn phi thương mại, **không bắt
buộc ghi công**. Giấy phép cấm bán lại ảnh ở dạng nguyên bản và cấm dựng dịch
vụ ảnh cạnh tranh với Unsplash — dùng làm nền trong ứng dụng không thuộc hai
trường hợp đó.

Ghi công ở đây là tự nguyện, giữ lại để truy nguyên khi cần.

Lưu ý: nghĩa vụ ghi công **chỉ phát sinh khi tích hợp Unsplash API**. Các ảnh
này được tải sẵn về kho, ứng dụng không gọi API của Unsplash lúc chạy.

| Tệp | Ảnh gốc |
| --- | --- |
| `cover-ink.jpg` | https://unsplash.com/photos/1608501821300-4f99e58bba77 |
| `cover-azure.jpg` | https://unsplash.com/photos/1597773150796-e5c14ebecbf5 |
| `cover-teal.jpg` | https://unsplash.com/photos/1710438399422-2fca27686bcd |
| `cover-slate.jpg` | https://unsplash.com/photos/1614292253389-bd2c1f89cd0e |
| `cover-iris.jpg` | https://unsplash.com/photos/1620121692029-d088224ddc74 |
| `cover-prism.jpg` | https://unsplash.com/photos/1573655349936-de6bed86f839 |
| `cover-amber.jpg` | https://unsplash.com/photos/1709377195538-5522ed0f9e10 |
| `cover-copper.jpg` | https://unsplash.com/photos/1708457753320-02e52a276a80 |
| `cover-stone.jpg` | https://unsplash.com/photos/1529753253655-470be9a42781 |
| `cover-onyx.jpg` | https://unsplash.com/photos/1650954316166-c3361fefcc87 |
| `cover-ash.jpg` | https://unsplash.com/photos/1637142375182-2c378fcbe061 |
| `cover-silk.jpg` | https://unsplash.com/photos/1709377058964-929af7f2d02f |
| `cover-orchid.jpg` | https://unsplash.com/photos/1654198340681-a2e0fc449f1b |
| `cover-moss.jpg` | https://unsplash.com/photos/1645724298070-c30a506ec96f |
| `cover-dawn.jpg` | https://unsplash.com/photos/1679193559894-5e27935d00c5 |
| `cover-magenta.jpg` | https://unsplash.com/photos/1614854262340-ab1ca7d079c7 |
| `cover-violet.jpg` | https://unsplash.com/photos/1614852206732-6728910dc175 |
| `cover-lilac.jpg` | https://unsplash.com/photos/1620641788421-7a1c342ea42e |
| `cover-nebula.jpg` | https://unsplash.com/photos/1566410824233-a8011929225c |
| `cover-ember.jpg` | https://unsplash.com/photos/1719365233220-3d9cbdc65b00 |
| `banner-dashboard.jpg` | https://unsplash.com/photos/1663970206579-c157cba7edda |

## Tiêu chí chọn

Thẻ workspace viết tên, nhãn quyền riêng tư và số liệu bằng **chữ trắng đè lên
ảnh**, nên mọi ảnh đều phải tối và gần với trừu tượng. Ảnh sáng hoặc nhiều chi
tiết làm chìm chữ, và thứ đó đắt hơn phần thẩm mỹ mà ảnh mang lại. Lớp scrim
trong `workspace-cover.css` là nửa còn lại của bảo đảm đó.

Ảnh banner thêm một ràng buộc nữa: dải này rất rộng và thấp (~10:1), chữ dồn hết
về **bên trái**, nên nửa trái của ảnh phải tối và phẳng. Scrim của banner cũng
nghiêng ngang chứ không nghiêng xuống đáy như của thẻ.

Mỗi ảnh đều được dựng thử với đúng dòng chữ trắng mà giao diện sẽ vẽ lên, ở đúng
tỉ lệ hiển thị, rồi mới chọn — vài ảnh đẹp nhưng đã bị loại vì chữ chìm.

Bộ ảnh cũng cố giữ **đa dạng màu**, không chỉ đa dạng ảnh: nhiều ảnh gần-như-đen
khác nhau vẫn cho ra những tấm thẻ trông giống nhau, mà phân biệt được thẻ mới là
mục đích. Vì vậy chỉ giữ bốn ảnh trung tính (khác hẳn chất liệu: đá, lụa, tường,
nếp gấp) bên cạnh các ảnh có màu rõ rệt.

Thứ tự khai báo trong `DEFAULT_COVERS` cũng có chủ đích: khi ảnh ưu tiên của một
workspace đã bị lấy, thuật toán đi tiếp xuống danh sách, nên hai ảnh cạnh nhau
không nên cùng tông.

## Thay hoặc thêm ảnh

Ảnh bìa cắt sẵn **1200×400** (tỉ lệ 3:1, gấp đôi khung ~600×200 trên thẻ), JPEG
chất lượng 72. Thêm tệp vào đây rồi khai báo tên trong `DEFAULT_COVERS`. Số ảnh
càng lớn thì số workspace tối đa không trùng càng cao — hiện là 20.

Ảnh banner cắt **2400×240** (10:1), chất lượng 74. Thay thì ghi đè đúng tên tệp
`banner-dashboard.jpg`, không cần sửa code.

Cắt ở đúng tỉ lệ đích thay vì để CSS cắt giúp: `object-fit`/`background-size:
cover` sẽ khoét mất phần trên dưới, nên ảnh tải về ở tỉ lệ khác sẽ hiện ra một
vùng ảnh khác với vùng đã xem khi chọn.

## Ảnh theo chủ đề

Hai mươi ảnh trong `topics/`, mỗi chủ đề trong `WorkspaceTopic` một ảnh. Bộ
ảnh trừu tượng ở trên phân biệt được các thẻ — đúng mục đích của nó — nhưng
không nói lên điều gì: một nhóm về cơ sở dữ liệu và một nhóm về dinh dưỡng chỉ
là một vệt xanh ngọc và một vệt hổ phách. Khi nhóm đã chọn chủ đề, thẻ có thể
cho thấy nhóm đó chứa gì.

`src/features/workspaces/topic-covers.ts` giữ ánh xạ, và `useAssignedCover`
ưu tiên ảnh chủ đề; nhóm chưa chọn chủ đề vẫn rơi về bộ trừu tượng. Bản mobile
đặt tại `mobile/src/features/workspaces/topic-covers.ts`, giữ nguyên từ vựng,
thứ tự và accent để một nhóm trông giống nhau trên cả hai client.

**Đánh đổi có chủ ý:** bảo đảm "không hai thẻ nào cùng ảnh" ở trên **không**
còn đúng với ảnh chủ đề. Hai nhóm cùng chủ đề Lập trình đội cùng một ảnh, cố
tình như vậy — vì ảnh giờ mang nghĩa chứ không chỉ để phân biệt. Tên nhóm và
các số liệu viết đè lên vẫn tách chúng ra. Bảo đảm cũ vẫn nguyên vẹn trong bộ
trừu tượng, nơi ảnh không mang nghĩa gì.

Nhóm mang nhiều chủ đề (tối đa ba) lấy chủ đề **đứng trước nhất trong từ
vựng**, không phải phần tử đầu mảng: API không hứa hẹn thứ tự, nên lấy phần tử
đầu sẽ khiến thẻ đổi ảnh chỉ vì các dòng dữ liệu trả về khác thứ tự.

### Cách chọn

Mỗi ảnh ứng viên được **đo bằng số** trước khi xem bằng mắt: tải bản thu nhỏ
dạng PNG, tính độ sáng cảm nhận trung bình, độ sáng **một phần ba phía dưới**
(nơi thẻ viết tên và số liệu bằng chữ trắng) và độ lệch chuẩn — chỉ số "rối".
Ngưỡng: đáy dưới 110 và độ lệch dưới 70. Khoảng 90 ứng viên đã bị loại theo
cách này trước khi có ai nhìn vào chúng.

Phép đo chỉ nói ảnh **đủ tối**, không nói ảnh **chụp gì**, nên cả hai mươi ảnh
còn lại đều được xem tận mắt. Bước này loại thêm nhiều ảnh đạt chỉ số nhưng sai
nội dung, và loại cả những ảnh mang **chữ tiếng Anh cỡ lớn** — một tấm có chữ
"PROJECTS" chạy ngang và một tấm giấy nhớ "Done / Doing" đều đụng với chữ của
chính thẻ.

Vài chủ đề khó bất ngờ. Ảnh y tế gần như luôn trắng sáng, phải tìm tới vòng thứ
ba mới có ảnh đạt. Ảnh "quản lý dự án" đẹp thì hầu hết là ảnh chụp màn hình
code hoặc bảng chữ tiếng Anh.

Accent được **lấy mẫu từ chính ảnh** như bộ trừu tượng: trọng số theo độ bão
hòa và độ sáng, không phải trung bình phẳng — trung bình phẳng trên ảnh tối cho
ra màu bùn. Sau đó các hue được giãn ra cách nhau tối thiểu 14°, vì các chủ đề
kỹ thuật gần như đều được chụp trong tông xanh lam và bảy ô dấu xanh gần giống
nhau là bảy ô không ai phân biệt nổi. Hai ảnh không có hue để lấy mẫu — dàn
server và bộ vest — nhận màu trung tính khác nhau về độ sáng và nhiệt độ.

### Nguồn và số đo

Cùng giấy phép Unsplash như trên. Cột `đáy` là độ sáng trung bình một phần ba
phía dưới (thang 0–255, càng thấp chữ trắng càng rõ); `rối` là độ lệch chuẩn.

| Chủ đề | Tệp | Ảnh gốc | đáy | rối |
| --- | --- | --- | --- | --- |
| Lập trình | `topics/topic-programming.jpg` | https://unsplash.com/photos/1555066931-4365d14bab8c | 40 | 20 |
| Cơ sở dữ liệu | `topics/topic-database.jpg` | https://unsplash.com/photos/1558494949-ef010cbdcc31 | 49 | 32 |
| Mạng và hệ thống | `topics/topic-network-systems.jpg` | https://unsplash.com/photos/1451187580459-43490279c0fa | 45 | 30 |
| An toàn thông tin | `topics/topic-information-security.jpg` | https://unsplash.com/photos/1614064641938-3bbee52942c7 | 50 | 38 |
| Khoa học dữ liệu | `topics/topic-data-science.jpg` | https://unsplash.com/photos/1639322537228-f710d846310a | 10 | 19 |
| Trí tuệ nhân tạo | `topics/topic-artificial-intelligence.jpg` | https://unsplash.com/photos/1644088379091-d574269d422f | 57 | 35 |
| Thiết kế và sáng tạo | `topics/topic-design.jpg` | https://unsplash.com/photos/1600132806370-bf17e65e942f | 44 | 19 |
| Kinh tế và quản trị | `topics/topic-business.jpg` | https://unsplash.com/photos/1507679799987-c73779587ccf | 78 | 56 |
| Khởi nghiệp | `topics/topic-entrepreneurship.jpg` | https://unsplash.com/photos/1758873272412-7166447a94ae | 74 | 41 |
| Quản lý dự án | `topics/topic-project-management.jpg` | https://unsplash.com/photos/1768055105012-4c53791b2877 | 66 | 62 |
| Lãnh đạo và nhân sự | `topics/topic-leadership.jpg` | https://unsplash.com/photos/1522071820081-009f0129c71c | 72 | 48 |
| Năng suất và kỹ năng | `topics/topic-productivity.jpg` | https://unsplash.com/photos/1518281361980-b26bfd556770 | 45 | 44 |
| Quy chế và hành chính | `topics/topic-regulations.jpg` | https://unsplash.com/photos/1575505586569-646b2ca898fc | 22 | 57 |
| Sức khỏe và y học | `topics/topic-health.jpg` | https://unsplash.com/photos/1628595351029-c2bf17511435 | 80 | 45 |
| Tâm lý và phát triển bản thân | `topics/topic-psychology.jpg` | https://unsplash.com/photos/1506126613408-eca07ce68773 | 79 | 29 |
| Ngoại ngữ | `topics/topic-languages.jpg` | https://unsplash.com/photos/1507842217343-583bb7270b66 | 83 | 39 |
| Nghệ thuật và văn hóa | `topics/topic-arts-culture.jpg` | https://unsplash.com/photos/1577720643272-265f09367456 | 86 | 43 |
| Lịch sử và xã hội | `topics/topic-history-society.jpg` | https://unsplash.com/photos/1461360370896-922624d12aa1 | 85 | 63 |
| Đồ án và nghiên cứu | `topics/topic-research.jpg` | https://unsplash.com/photos/1576086213369-97a306d36557 | 12 | 21 |
| Khác | `topics/topic-other.jpg` | https://unsplash.com/photos/1541746972996-4e0b0f43e02a | 76 | 35 |
