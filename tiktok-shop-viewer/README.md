# TikTok Shop Viewer (Chrome Extension)

Xem video TikTok bị chặn hiển thị trên web (kiểu "Xem trong ứng dụng TikTok" — 
thường gặp với video gắn TikTok Shop) ngay trong popup, không cần tải file về máy.

## Cách hoạt động

1. Trang `tiktok.com` chặn **hiển thị** một số video ở tầng web (đặc biệt video
   gắn TikTok Shop) cho người dùng chưa đăng nhập / không mở bằng app.
2. Việc chặn này nằm ở tầng *trang web*, không phải tầng *file*. File MP4 của
   video đó vẫn nằm công khai trên CDN của TikTok (`*.tiktokcdn-us.com`).
3. Extension gọi API của **tikwm.com** (một dịch vụ kiểu snaptik, nhận URL
   TikTok và trả về JSON chứa link CDN trực tiếp) để lấy link đó, rồi nhúng
   thẳng vào thẻ `<video>` trong modal — không qua trang `tiktok.com` nữa nên
   không bị chặn.

## Cài đặt (chế độ Developer / load unpacked)

1. Mở Chrome → vào `chrome://extensions`
2. Bật **Developer mode** (góc trên phải)
3. Bấm **Load unpacked** → chọn thư mục `tiktok-shop-viewer/` này
4. Vào bất kỳ trang `tiktok.com/@user/video/123...` → sẽ thấy nút hồng
   **"▶ Xem video (bypass block)"** nổi ở góc phải màn hình
5. Bấm nút → modal hiện ra, video phát trực tiếp

## Lưu ý kỹ thuật quan trọng

- **Link CDN có hạn**: response từ tikwm chứa tham số `x-expires` — link chỉ
  dùng được trong vài giờ. Extension gọi API mới mỗi lần bấm nút, không cache,
  nên luôn lấy link còn hiệu lực. Không lưu link cũ để dùng lại sau.
- **Fallback watermark**: nếu link không-watermark (`play`) lỗi, script tự
  chuyển sang link có watermark (`wmplay`) để đảm bảo vẫn xem được.
- **Phụ thuộc dịch vụ thứ 3 (tikwm.com)**: đây không phải API chính thức của
  TikTok, có thể đổi cấu trúc response hoặc ngừng hoạt động bất kỳ lúc nào.
  Đây là rủi ro chấp nhận được ở quy mô dùng cá nhân/nội bộ (review video để
  chọn nội dung remake), nhưng **không nên dựa vào extension này cho bất kỳ
  hệ thống production / chạy tự động ở quy mô lớn** — nếu cần ổn định lâu dài,
  nên cân nhắc trả phí một scraping API có SLA (Apify, ScraperAPI...) thay vì
  dịch vụ free không cam kết uptime.
- **Không tải/lưu file**: extension chỉ stream để xem, không lưu MP4 về máy —
  đúng mục đích "xem để quyết định chọn hay không", không phải để tái sử dụng
  footage gốc.
- **Chỉ chạy trên `tiktok.com`**: content script chỉ kích hoạt trên domain
  này, không match bất kỳ trang nào khác.

## Cấu trúc file

```
tiktok-shop-viewer/
├── manifest.json   # Manifest V3, khai báo permission + content script
├── content.js      # Logic: nút nổi + gọi tikwm API + render modal video
├── icon128.png      # Icon hiển thị trong chrome://extensions
└── README.md
```

## Khả năng mở rộng sau này

- Thêm nút "Lưu transcript" để gọi gpt-4o-mini-transcribe trực tiếp từ URL
  video đang xem, nối thẳng vào Giai đoạn 2 của workflow (Script Generation)
  mà không cần copy link sang nơi khác.
- Thêm badge/icon trên toolbar đổi màu khi phát hiện video hiện tại là
  TikTok Shop (`anchors_extras.is_ec_video`), giúp người review nhận diện
  nhanh loại video mà không cần mở modal.
