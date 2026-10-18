# Ảnh nền mặc định

Thư mục này giữ hai nhóm ảnh:

- **Hai mươi ảnh `cover-*.jpg`** — nền mặc định cho workspace chưa tải ảnh riêng
  lên. `src/features/workspaces/default-covers.ts` gán ảnh, và `cover-assignment.tsx`
  đảm bảo **không hai workspace nào trên cùng một trang đội cùng một ảnh**. Băm
  riêng từng id không làm được điều đó dù có bao nhiêu ảnh đi nữa: 10 workspace
  với 20 ảnh vẫn trùng với xác suất hơn 9/10 (nghịch lý ngày sinh), và trên thực
  tế đã trùng. Không có gì được lưu xuống DB: cùng một tập workspace luôn cho ra
  cùng một cách gán.
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
