# Ladospice — Hướng dẫn sử dụng

> Công cụ nội bộ dùng AI để tạo ảnh quảng cáo tĩnh và xử lý video đối thủ (bóc băng → viết kịch bản thương hiệu → tạo giọng đọc).
> Nội dung này khớp với trang **Hướng dẫn** trong app (`/app/guide`, dữ liệu tại `src/features/guide/guide-data.ts`) — sửa cả hai nơi khi cập nhật.

---

## Mục lục

**Nhóm Ảnh**
1. [Tạo quảng cáo](#1-tạo-quảng-cáo)
2. [Stealth Ads](#2-stealth-ads)
3. [Concept](#3-concept)
4. [Thư viện](#4-thư-viện)

**Nhóm Video**
5. [Video Trending](#5-video-trending)
6. [Pipeline xử lý video](#6-pipeline-xử-lý-video)
7. [Voice Lab (Cấu Hình Giọng)](#7-voice-lab-cấu-hình-giọng)
8. [Thư Viện Audio](#8-thư-viện-audio)

**Nhóm Thương hiệu**
9. [Chọn & quản lý thương hiệu](#9-chọn--quản-lý-thương-hiệu)
10. [Nhận diện thương hiệu](#10-nhận-diện-thương-hiệu)
11. [Sản phẩm](#11-sản-phẩm)
12. [Brand Intelligence](#12-brand-intelligence)
13. [Đồng bộ video đối thủ (Apify)](#13-đồng-bộ-video-đối-thủ-apify)

**Nhóm Cài đặt**
14. [Đăng nhập & truy cập lần đầu](#14-đăng-nhập--truy-cập-lần-đầu)
15. [Hồ sơ cá nhân](#15-hồ-sơ-cá-nhân)
16. [Quản trị](#16-quản-trị)
17. [Phân quyền vai trò](#17-phân-quyền-vai-trò)
18. [Xử lý sự cố & mẹo hay](#18-xử-lý-sự-cố--mẹo-hay)

---

# Nhóm: Ảnh

## 1. Tạo quảng cáo

**Vị trí:** Điều hướng → Ảnh → Tạo quảng cáo (trang chủ `/app`). Workspace chính để cấu hình thông số và tạo ảnh quảng cáo tĩnh bằng AI.

### 1.1 Brand Product
- Chọn **Sản phẩm** từ dropdown (bắt buộc)
- Trạng thái dữ liệu sản phẩm hiển thị ngay bên dưới: "Đã cache dữ liệu, sẵn sàng tạo" (xanh) / "Sheet đã liên kết, chưa thu thập" / "Chưa có nguồn dữ liệu"
- Nếu sản phẩm chưa có URL trang sản phẩm, hệ thống nhắc thêm URL trong **Thương hiệu → tab Sản phẩm** để có kết quả tốt hơn

### 1.2 Chế độ tạo
- **Concept** (mặc định) — AI áp dụng các concept sáng tạo đã chọn
- **Competitor Ref** — tải lên ảnh quảng cáo đối thủ, AI phân tích layout/màu sắc/kiểu chữ rồi tái tạo với thương hiệu của bạn (xem mục 1.6)

### 1.3 Concepts (bắt buộc nếu dùng chế độ Concept)
- Tick chọn một hoặc nhiều concept để áp dụng
- Mỗi concept tạo ra ảnh với chiến lược sáng tạo khác nhau
- Concept có nhãn "Competitor" cần dữ liệu thị trường/sản phẩm đối thủ đi kèm
- Xem mục 3 (Concept) để biết cách tạo và quản lý

### 1.4 Ad Copy (Tuỳ chọn)
- **Tiêu đề** — ghi đè headline do AI tạo
- **Nội dung** — ghi đè body copy
- **Ghi chú thêm** — chỉ dẫn cụ thể cho AI
- Nút "Xoá tất cả" để reset

### 1.5 Đối tượng mục tiêu & Số lượng đầu ra
- **Đối tượng mục tiêu**: chọn một hoặc nhiều persona (mỗi persona chọn sẽ tạo ra một biến thể riêng); dùng "Tất cả profiles" để tối đa đa dạng
- **Số lượng đầu ra**: Tỷ lệ khung hình (1:1 Vuông / 4:5 Portrait / 9:16 Story), Số lượng quảng cáo (1–10 ảnh mỗi tổ hợp concept × persona)

### 1.6 Chế độ Competitor Ref
1. Tải lên hoặc kéo-thả ảnh quảng cáo đối thủ
2. AI phân tích layout, màu sắc, kiểu chữ, bố cục
3. Chọn sub-mode: **Standard** hoặc **Stealth**

**Sub-mode Standard** — tạo một ảnh tái hiện layout đối thủ, dùng sản phẩm/màu sắc/thông điệp của thương hiệu bạn; bảng màu đối thủ bị chặn hoàn toàn.

**Sub-mode Stealth** — tạo stealth ads lấy cảm hứng từ ảnh tham khảo, theo luồng 2 bước (xem mục 2); có thêm Độ nhạy sản phẩm và Độ tuổi đối tượng.

> 💡 Nếu tải lên từ 2 ảnh tham khảo trở lên, hệ thống tạo Số lượng quảng cáo × Số ảnh tham khảo ("Pack Mode"), hiển thị tiến trình dạng "Đang tạo (ref 1/3)...".

### 1.7 Tạo & Kết quả

Bấm "Tạo quảng cáo" (nút khoá tới khi đã chọn đủ Sản phẩm + Đối tượng mục tiêu + Concept hoặc ảnh tham khảo đối thủ). Trong lúc tạo, hệ thống hiển thị tiến trình từng bước.

**Thao tác trên từng ảnh kết quả:**

| Nút | Hành động |
|---|---|
| Lưu vào thư viện | Lưu ảnh vào Thư viện |
| Sao chép prompt | Copy prompt tạo ảnh đầy đủ |
| Tải ảnh | Tải file ảnh về máy |
| Xoá khỏi kết quả | Xoá ảnh khỏi danh sách kết quả hiện tại |

**Thao tác hàng loạt:** Lưu tất cả / Tải tất cả (ZIP) / Xoá.

---

## 2. Stealth Ads

**Vị trí:** Điều hướng → Ảnh → Stealth Ads. Stealth ads trông như ảnh iPhone, screenshot tin nhắn, khoảnh khắc đời thường, với sản phẩm đặt tự nhiên bên trong — người xem không nhận ra đây là quảng cáo nên tránh được "ad fatigue".

### 2.1 Luồng 2 bước
1. **Lập kế hoạch cảnh** — AI tạo mô tả cảnh chi tiết
2. **Tạo ảnh** — AI dựng ảnh photorealistic từ từng kế hoạch cảnh

### 2.2 Cấu hình

Sản phẩm & Ngôn ngữ: giống hệt mục 1.1 và 1.5.

**Chọn cảnh:**
- **AI tự chọn** (khuyến nghị) — AI tự chọn cảnh phù hợp nhất theo sản phẩm và đối tượng
- **Chọn cảnh** — duyệt thư viện cảnh, tick chọn cảnh muốn dùng

| Danh mục | Mã | Mô tả | Ví dụ cảnh |
|---|---|---|---|
| Human-Centric | HUM | Người là trung tâm, sản phẩm chỉ xuất hiện phụ | Gym Mirror Selfie, Post-Workout Glow, Beach Candid |
| Environment | ENV | Sản phẩm đặt tự nhiên trong bối cảnh đời thực | Morning Counter, Gym Bag Flat Lay, Nightstand |
| Content Format | FMT | Sản phẩm trong screenshot/nội dung số | iPhone Screenshot, Chat Bubble, Review Box |
| Story | STR | Sản phẩm lồng ghép vào câu chuyện | Daily Routine, Transformation Journey, Gifting Story |

> 💡 Có thể thêm cảnh tuỳ chỉnh: "Thêm cảnh tùy chỉnh" → điền ID, danh mục, tên, mô tả, phương pháp đặt sản phẩm, sản phẩm/đối tượng phù hợp. Có thể sửa/xoá sau.

**Tinh chỉnh đối tượng:**

| Thiết lập | Tuỳ chọn | Khi nào dùng |
|---|---|---|
| Độ nhạy sản phẩm | Bình thường / Cao (Body/Beauty) | Dùng "Cao" cho sản phẩm liên quan cơ thể, cân nặng, làm đẹp |
| Độ tuổi đối tượng | 18–25, 25–35, 35–45, 40–55, 50+ | Điều chỉnh đạo cụ, phong cách text, tính xác thực theo platform |

> ⚠️ Độ nhạy "Cao" đảm bảo: không so sánh before/after cơ thể, không dùng ngôn ngữ "cải thiện/biến đổi", không nêu công dụng trực tiếp — chỉ thể hiện sự hiện diện của sản phẩm; hình thể thể hiện dưới dạng "khát vọng khả thi" thay vì hình mẫu/vận động viên.

### 2.3 Kế hoạch cảnh & Kết quả

Bấm "Lập kế hoạch cảnh" → AI sinh các thẻ kế hoạch (tên cảnh, mức hiện diện sản phẩm, bố cục, vị trí đặt sản phẩm, nội dung text). Bấm vào từng trường để sửa trực tiếp, sắp xếp lại bằng mũi tên, xoá, tạo lại một kế hoạch, hoặc thêm cảnh từ thư viện. Sau khi rà soát, bấm "Tạo tất cả". Kết quả có nút lưu/tải/sao chép mô tả/xoá/tạo lại; hàng loạt: Tải tất cả (ZIP), Lưu tất cả.

---

## 3. Concept

**Vị trí:** Điều hướng → Cài đặt → Concept. Mọi người dùng đã đăng nhập đều tạo/sửa/xoá được concept của riêng mình. Concept hệ thống (built-in, nhãn "[System]") chỉ admin (CEO, Super Admin) mới sửa/xoá được.

Concept định nghĩa chiến lược sáng tạo dùng trong lúc tạo quảng cáo:

| Trường | Mô tả |
|---|---|
| Concept ID | Định danh duy nhất, chữ thường + gạch dưới (vd. `data_hook`), không đổi được sau khi tạo |
| Nhãn | Tên hiển thị |
| Mô tả | Chiến lược mà concept này sử dụng |
| Yêu cầu sản phẩm đối thủ | Có cần dữ liệu/ảnh đối thủ đi kèm hay không |
| Prompt | Chiến lược sáng tạo + hướng dẫn hình ảnh đầy đủ cho AI |
| Ảnh tham khảo | Tối đa 2 ảnh định hướng phong cách hình ảnh |

### 3.1 Thêm Concept
1. Bấm "Thêm concept"
2. Điền đầy đủ các trường
3. Trong Prompt, có thể chia nhiều biến thể layout bằng `### Variant A`, `### Variant B`... — AI luân phiên qua các biến thể ở mỗi lần tạo
4. Tuỳ chọn tải thêm ảnh tham khảo (tối đa 2)
5. Bấm "Lưu"

> 💡 Ảnh tham khảo chỉ định hướng phong cách — nội dung sản phẩm và màu thương hiệu không bao giờ bị copy từ ảnh tham khảo.
>
> ⚠️ Concept hệ thống (nhãn "[System]") chỉ admin sửa/xoá được. Thành viên vẫn tạo và quản lý concept riêng của mình bình thường.

---

## 4. Thư viện

**Vị trí:** Điều hướng → Ảnh → Thư viện.

### 4.1 Xem quảng cáo

| Điều khiển | Tuỳ chọn |
|---|---|
| Chế độ xem | Grid (lưới) / List (danh sách) |
| Sắp xếp | Mới nhất trước / Cũ nhất trước |
| Lọc theo ngày | Hôm nay, Tuần này, Tháng này, Tháng trước... |
| Tìm kiếm | Tìm theo tên file |

### 4.2 Thao tác

| Thao tác | Cách làm |
|---|---|
| Xem chi tiết | Bấm vào ảnh → mở modal Chi tiết ảnh |
| Tải ảnh | Icon tải trên thẻ ảnh |
| Xoá | Icon thùng rác → xác nhận |
| Chỉnh sửa quảng cáo | Trong Chi tiết ảnh, mô tả thay đổi (text, màu, logo, layout...), có thể đính kèm thêm ảnh, bấm "Áp dụng chỉnh sửa" để tạo phiên bản mới |

### 4.3 Thao tác hàng loạt

Chọn nhiều ảnh bằng checkbox → Tải ZIP hoặc Xoá hàng loạt (có xác nhận).

---

# Nhóm: Video

## 5. Video Trending

**Vị trí:** Điều hướng → Video → Video Trending. Nơi tập hợp video TikTok đối thủ để phân tích và làm nguyên liệu sản xuất nội dung (bóc băng → viết lại kịch bản → tạo giọng đọc).

### 5.1 Thêm video
- **"Sync từ Apify"** — lấy dữ liệu từ lần chạy thành công gần nhất của Apify task đã cấu hình cho thương hiệu hiện tại (xem mục 13)
- **"Thêm Video"** — dán trực tiếp URL TikTok (`https://www.tiktok.com/@handle/video/...`); hệ thống kiểm tra định dạng và trùng lặp

### 5.2 Lọc, tìm kiếm & trạng thái
- Tab lọc: Tất cả / Chờ duyệt / Winner / Đã từ chối
- Tìm theo URL hoặc tên tác giả
- Bảng: lượt xem, lượt thích, chia sẻ, bình luận, trạng thái
- Trên mỗi video: mở chi tiết để xử lý, đánh dấu Winner, Từ chối, hoặc mở trên TikTok

---

## 6. Pipeline xử lý video

**Vị trí:** bấm vào một video trong Video Trending để mở trang chi tiết. Đầu trang là trình phát video + metadata. Ngay dưới là thanh tiến trình 4 bước (bấm để nhảy nhanh): **Bóc băng → Kịch bản → Giọng đọc → Hoàn tất**. Mỗi bước chỉ mở khoá sau khi bước trước hoàn tất.

### 6.1 Bước 1 — Bóc băng (Phiên Âm)

Trạng thái: Chờ xử lý → Đang phiên âm... → Hoàn thành / Thất bại.

1. Bấm "Bắt đầu phiên âm" nếu video chưa có transcript
2. Sau khi Hoàn thành, transcript hiện trong ô văn bản có thể sửa trực tiếp
3. Sửa nội dung nếu AI nghe sai, bấm "Lưu"
4. Cần bóc lại thì bấm "Phiên âm lại" (chỉ khả dụng khi trạng thái Hoàn thành/Thất bại)

### 6.2 Bước 2 — Kịch Bản Thương Hiệu

Mở khoá khi Bóc băng ở trạng thái Hoàn thành.

**Cấu hình sản phẩm:** chọn sản phẩm từ dropdown (hoặc "Không chọn sản phẩm"); các trường Đặc tính, Đối tượng KH, Điểm bán/USP nạp sẵn từ sản phẩm nhưng sửa được riêng cho video này mà không ảnh hưởng sản phẩm gốc.

**Tham số:** Giọng điệu (Hài hước / Chân thực / Kịch tính), Ghi chú (USP, hashtag, khuyến mãi...).

1. Bấm "Tạo kịch bản ✦" — AI viết lại kịch bản theo cấu trúc/nhịp điệu transcript gốc nhưng thay hoàn toàn nội dung theo thương hiệu bạn, hiện dần theo streaming
2. Sửa trực tiếp nếu cần
3. Bấm "Lưu kịch bản" (bắt buộc trước khi sang bước Giọng đọc)

### 6.3 Bước 3 — Tạo Giọng Đọc

Mở khoá khi kịch bản đã lưu.

1. Chọn Voice Preset (tạo sẵn trong Voice Lab, mục 7)
2. Bấm "Tạo giọng đọc ♪"
3. Audio xuất hiện trong danh sách bên dưới, kèm trình phát, thông tin preset, thời lượng, nút xoá

---

## 7. Voice Lab (Cấu Hình Giọng)

**Vị trí:** Điều hướng → Video → Cấu Hình Giọng. Thử giọng đọc và lưu thành preset để dùng ở bước Tạo Giọng Đọc. Hỗ trợ 2 nhà cung cấp TTS: **Vbee** (tiếng Việt) và **ElevenLabs**.

### 7.1 Tab Vbee

**Thư Viện Giọng (trái):** lọc theo Giới tính (Tất cả/Nữ/Nam), Vùng miền (Tất cả/Bắc/Trung/Nam), sắp xếp theo Điểm viral hoặc Tên A-Z; mỗi giọng có nút "Test nhanh".

**Thử Giọng (phải):** nhập văn bản thử (≤500 ký tự, có mẫu sẵn), chỉnh Tốc độ (0.5x–2.0x) & Cao độ (0.5–2.0), bấm "▶ Nghe thử".

**Đánh giá & Lưu preset:** đánh giá viral potential (1–5 sao) + ghi chú tuỳ chọn → "Lưu rating"; đặt Tên preset → "💾 Lưu thành preset" (lưu giọng + tốc độ + cao độ để dùng nhanh trong pipeline video).

### 7.2 Tab ElevenLabs

Danh sách giọng (trái) có "Nghe thử"/"Chọn"; bên phải hiển thị giọng đã chọn + preview. Chọn Model: **v2.5 Flash** (nhanh, ổn định) hoặc **v3** (expression tags, tự nhiên nhất). Đặt tên → "Lưu thành preset".

> 💡 Model v3 hỗ trợ expression tags (vd. `[amused]`, `[excited]`) giúp giọng đọc biểu cảm hơn.

---

## 8. Thư Viện Audio

**Vị trí:** Điều hướng → Video → Thư Viện Audio.

Bảng: đoạn kịch bản (rút gọn), giọng đọc/preset, thời lượng, ngày tạo. Hành động: Tải xuống hoặc Xoá. Bấm vào một dòng để xem Chi tiết Audio (kịch bản đầy đủ, giọng đọc, nhà cung cấp, tốc độ, thời lượng, ngày tạo).

> Nếu chưa tạo audio nào: "Chưa có audio nào."

---

# Nhóm: Thương hiệu

## 9. Chọn & quản lý thương hiệu

Mỗi **Thương hiệu (Brand)** là một không gian làm việc độc lập — sản phẩm, concept, video, quảng cáo riêng. Dropdown "Thương hiệu" nằm cuối sidebar, luôn hiển thị.

| Thao tác | Cách làm |
|---|---|
| Chuyển thương hiệu | Bấm dropdown "Thương hiệu" cuối sidebar → chọn tên khác |
| Thêm thương hiệu | "Thêm thương hiệu" trong dropdown (chỉ admin) |
| Đổi tên | Icon "⋯" (Thao tác) cạnh dropdown → Đổi tên |
| Xoá thương hiệu | Icon "⋯" → Xoá (chỉ admin) |

> 💡 Thương hiệu đang chọn được ghi nhớ tự động, giữ nguyên qua các lần tải lại trang.

---

## 10. Nhận diện thương hiệu

**Vị trí:** Điều hướng → Cài đặt → Thương hiệu (`/app/brands`, phần "Nhận diện thương hiệu"). Mọi người dùng đã đăng nhập (kể cả Thành viên) đều chỉnh sửa được — chỉ việc tạo mới hoặc xoá cả Thương hiệu mới cần quyền admin (xem mục 9).

| Trường | Mô tả |
|---|---|
| Tên thương hiệu | Tên hiển thị |
| Mô tả thương hiệu | Tổng quan, định vị, thông điệp chính |
| Kiểu chữ | Chọn Google Font hoặc tải font riêng |
| Bảng màu | 6 màu: Primary 1&2, Secondary 1&2, Accent 1&2 |
| Logo (Nền sáng) | SVG/PNG/JPG, tối đa 2MB |
| Logo (Nền tối) | SVG/PNG/JPG, tối đa 2MB |

**Cách chọn font:** "Chọn font..." → hộp thoại "Chọn Font" → tab Google Fonts (tìm kiếm) hoặc tab Tải Font lên (kéo-thả file `.ttf/.otf/.woff/.woff2` cho từng biến thể Regular/Bold/Italic...).

**Cách tải logo:** bấm khu vực tải lên (viền nét đứt) → chọn file → xem trước ngay → "Xóa logo" để gỡ và tải lại.

> 💡 Bấm "Lưu Brand Kit" (góc phải trên) để lưu toàn bộ. Cột "Xem trước thương hiệu" bên phải cập nhật real-time, không cần lưu trước.

---

## 11. Sản phẩm

**Vị trí:** trang Thương hiệu → tab Sản phẩm.

### 11.1 Thêm sản phẩm
1. Bấm "Thêm sản phẩm"
2. Nhập Tên sản phẩm (bắt buộc)
3. Nhập Mô tả (nên có — tính năng chính, thành phần, lợi ích)
4. Nhập URL trang sản phẩm — AI thu thập trang để trích xuất giá/thành phần/lợi ích
5. Tải Ảnh sản phẩm (bắt buộc, tối đa 5): icon vương miện đặt ảnh chính, mũi tên sắp xếp thứ tự Trước (chính) → Sau → Bên → Chi tiết
6. (Tuỳ chọn) Mở rộng "Màu sản phẩm" để ghi đè bảng màu thương hiệu riêng cho sản phẩm này
7. Bấm "Tạo sản phẩm"

Dùng icon Chỉnh sửa / Xóa trên từng thẻ để quản lý.

> 💡 Ảnh sản phẩm ảnh hưởng trực tiếp chất lượng quảng cáo — nên dùng ảnh độ phân giải cao, chụp thật từ nhiều góc.

### 11.2 Trạng thái thu thập dữ liệu trang sản phẩm
- "Dữ liệu sản phẩm đã cache" — trang đã được AI đọc, sẵn sàng dùng
- "Chưa thu thập" — bấm "Thu thập ngay" hoặc để hệ thống tự lấy ở lần tạo quảng cáo đầu tiên

---

## 12. Brand Intelligence

**Vị trí:** trang Thương hiệu → phần Brand Intelligence. Ngữ cảnh AI dùng để tạo persona chính xác hơn và viết ad copy sát đối tượng mục tiêu.

### 12.1 Tóm tắt nghiên cứu
1. Dán nghiên cứu đối thủ, ghi chú sản phẩm, brief thương hiệu, hoặc insight thị trường vào ô văn bản lớn
2. Bấm "Lưu tóm tắt nghiên cứu"

### 12.2 Personas (đối tượng mục tiêu)

**Tự động tạo:**
1. Đảm bảo đã lưu tóm tắt nghiên cứu
2. Bấm "Tạo 10 Profiles"
3. Mỗi persona gồm: Tên, Pain (nỗi đau), Angle (góc tiếp cận), Emotion (cảm xúc)

**Thêm thủ công:** "Thêm Profile" → điền Tên Profile, Pain Point, Angle, Emotion → "Tạo Profile".

Dùng nút Chỉnh sửa / Xóa trên từng thẻ persona để quản lý.

> 💡 Persona được dùng ở bước "Đối tượng mục tiêu" khi tạo quảng cáo (mục 1.5) để cá nhân hoá thông điệp theo phân khúc.

---

## 13. Đồng bộ video đối thủ (Apify)

**Vị trí:** cuối trang Thương hiệu, phần "Apify Sync". Mọi người dùng đều bấm được "Sync ngay" và xem trạng thái — chỉ riêng việc cấu hình Task ID / bật-tắt tự động sync mới cần quyền admin (CEO, Super Admin).

### 13.1 Cấu hình (chỉ admin)
1. Dán Apify Task ID (dạng `~abc123xyz`)
2. Bật/tắt "Bật tự động sync (cron)" — khi bật, hệ thống tự chạy sync theo lịch cron định kỳ
3. Bấm "Lưu cấu hình"

> 💡 Bấm "Sync ngay" bất kỳ lúc nào để lấy dữ liệu ngay từ lần chạy thành công gần nhất — video mới xuất hiện trong Video Trending (mục 5). Nút này dùng được cho mọi người dùng, không chỉ admin.

### 13.2 Trạng thái
- "Lần cuối sync: [ngày giờ]" (xanh, thành công)
- "Lỗi lần trước: [nội dung lỗi]" (đỏ, thất bại)
- Sau sync thành công: "✓ Sync thành công (N video)"

---

# Nhóm: Cài đặt

## 14. Đăng nhập & truy cập lần đầu

> ⚠️ Không có trang đăng ký công khai. Tài khoản (email `@ladospice.com`) được quản trị viên cấp trực tiếp — nếu chưa có tài khoản, liên hệ quản trị viên của bạn.

### 14.1 Đăng nhập
1. Mở địa chỉ ứng dụng — tự chuyển tới trang đăng nhập nếu chưa đăng nhập
2. Nhập email `@ladospice.com` và mật khẩu, hoặc bấm "Tiếp tục với Google"
3. Bấm nút đăng nhập

### 14.2 Quên mật khẩu
1. Bấm "Quên mật khẩu?" trên trang đăng nhập
2. Nhập email `@ladospice.com`
3. Kiểm tra hộp thư để nhận mật khẩu tạm thời mới
4. Đăng nhập bằng mật khẩu mới rồi đổi lại trong Cài đặt (mục 15)

### 14.3 Checklist thiết lập lần đầu

| Bước | Ở đâu | Bắt buộc |
|---|---|---|
| Chọn hoặc tạo Thương hiệu | Dropdown "Thương hiệu" cuối sidebar | Có |
| Thiết lập nhận diện thương hiệu | Thương hiệu → Nhận diện thương hiệu | Có |
| Thêm sản phẩm (kèm ảnh) | Thương hiệu → tab Sản phẩm | Có |
| Thêm nghiên cứu thương hiệu | Thương hiệu → Brand Intelligence | Nên có |
| Tạo/generate Personas | Thương hiệu → Brand Intelligence | Nên có |
| Cấu hình đồng bộ Apify (Task ID) | Thương hiệu → cuối trang, phần Apify Sync (chỉ admin cấu hình được) | Chỉ cần nếu dùng tính năng Video |

---

## 15. Hồ sơ cá nhân

**Vị trí:** menu Tài khoản (avatar) → Cài đặt, hoặc Điều hướng → Cài đặt → Cài đặt.

### 15.1 Thông tin hồ sơ
Hiển thị: Họ tên, Email, Vai trò (CEO / Super Admin / Thành viên), Phòng ban, ngày tham gia, lần đăng nhập gần nhất.

### 15.2 Đổi mật khẩu
1. Nhập Mật khẩu hiện tại
2. Nhập Mật khẩu mới (tối thiểu 8 ký tự)
3. Xác nhận mật khẩu mới
4. Bấm "Đổi mật khẩu"

---

## 16. Quản trị

**Vị trí:** Tài khoản → Quản trị (icon khiên). Chỉ CEO và Super Admin nhìn thấy mục này.

### 16.1 Dashboard phân tích
- Chọn khoảng thời gian: Hôm nay / 7 ngày / 30 ngày (mặc định)
- 4 thẻ số liệu: Lượt xem trang, Khách truy cập, Tài khoản, Quảng cáo đã lưu
- Biểu đồ xu hướng lượt xem theo ngày

### 16.2 Quản lý tài khoản & API key

> ⚠️ Trang Quản trị hiện chỉ có dashboard phân tích. Việc tạo/xoá tài khoản người dùng và đổi vai trò được thực hiện trực tiếp trong hệ thống quản trị (Supabase) bởi người phụ trách hạ tầng, **không** có sẵn trên giao diện Admin.
>
> API key của các dịch vụ AI (Gemini, Claude, KIE, Apify, Vbee, ElevenLabs...) được cấu hình qua **biến môi trường trên server** (`.env` / hosting config), dùng chung cho toàn bộ tài khoản — không có giao diện tự quản lý key trong Cài đặt. Liên hệ người phụ trách hạ tầng nếu cần cập nhật key.

---

## 17. Phân quyền vai trò

### 17.1 Cấp bậc vai trò

| Vai trò | Số tài khoản tối đa | Mô tả |
|---|:---:|---|
| CEO | 1 | Quyền cao nhất. Không thể bị xoá hoặc hạ cấp. |
| Super Admin | 2 | Quản lý được mọi thứ trừ tài khoản CEO. |
| Thành viên | Không giới hạn | Nhân viên thông thường. Sửa được Nhận diện thương hiệu/Sản phẩm/Brand Intelligence và concept của riêng mình; không tạo/xoá được Thương hiệu, không sửa concept hệ thống, không cấu hình Đồng bộ Apify, không vào được trang Quản trị. |

### 17.2 Ma trận quyền hạn

| Hành động | CEO | Super Admin | Thành viên |
|---|:---:|:---:|:---:|
| Tạo quảng cáo (Ảnh) | Có | Có | Có |
| Tạo Stealth Ads | Có | Có | Có |
| Xử lý pipeline Video | Có | Có | Có |
| Xem Thư viện, Thư viện Audio | Có | Có | Có |
| Sửa Nhận diện thương hiệu, Sản phẩm, Brand Intelligence | Có | Có | Có |
| Đổi tên Thương hiệu | Có | Có | Có |
| Tạo hoặc xoá Thương hiệu | Có | Có | Không |
| Tạo/sửa/xoá Concept của riêng mình | Có | Có | Có |
| Sửa/xoá Concept hệ thống ("[System]") | Có | Có | Không |
| Bấm "Sync ngay" video từ Apify | Có | Có | Có |
| Cấu hình Task ID / bật tự động sync Apify | Có | Có | Không |
| Đổi mật khẩu của chính mình | Có | Có | Có |
| Xem trang Quản trị | Có | Có | Không |

---

## 18. Xử lý sự cố & mẹo hay

### 18.1 Lỗi thường gặp

| Vấn đề | Cách xử lý |
|---|---|
| "Email hoặc mật khẩu không đúng" | Kiểm tra email kết thúc bằng `@ladospice.com`, mật khẩu từ 8 ký tự |
| "Tài khoản đã bị vô hiệu hóa" | Liên hệ quản trị viên để kích hoạt lại |
| Không tìm thấy tài khoản | Liên hệ quản trị viên — tài khoản có thể chưa được tạo |
| Không thêm/xoá được Thương hiệu, không sửa được Concept hệ thống, không cấu hình được Đồng bộ Apify | Các thao tác này chỉ dành cho CEO/Super Admin — nhờ admin thực hiện hoặc nâng quyền |
| Không có sản phẩm trong dropdown | Vào Thương hiệu → tab Sản phẩm → thêm sản phẩm trước |
| Không có persona nào | Vào Thương hiệu → Brand Intelligence → Tạo 10 Profiles hoặc Thêm Profile |
| Tạo quảng cáo treo ở bước đọc trang sản phẩm | Kiểm tra URL trang sản phẩm còn hợp lệ và truy cập được |
| Ảnh tạo ra không như mong đợi | Đảm bảo ảnh sản phẩm chất lượng cao, đủ sáng, đúng sản phẩm thật |
| Không thấy mục Quản trị | Chỉ vai trò CEO và Super Admin nhìn thấy |
| Video không phiên âm được | Kiểm tra video còn truy cập được trên TikTok; thử "Phiên âm lại" |
| Không tạo được giọng đọc | Kiểm tra đã lưu kịch bản (Bước 2) và đã chọn Voice Preset |
| Sync Apify thất bại | Kiểm tra Apify Task ID còn đúng và task còn khả dụng trên Apify |
| Ảnh Stealth không tạo được | Kiểm tra đã hoàn tất "Lập kế hoạch cảnh" trước khi bấm "Tạo tất cả" |

### 18.2 Mẹo để có kết quả tốt nhất

1. **Ảnh sản phẩm là yếu tố quan trọng nhất** — dùng 3–5 ảnh độ phân giải cao, nhiều góc
2. **Điền đúng màu thương hiệu** — quảng cáo đồng nhất, chuyên nghiệp hơn
3. **Viết nghiên cứu đầy đủ** — càng nhiều dữ liệu, persona AI tạo càng sắc bén
4. **Kết hợp nhiều Concept** — dùng 2–3 concept cùng lúc để creative đa dạng hơn
5. **Thử cả 2 chế độ** — Concept cho quảng cáo thương hiệu, Stealth cho nội dung tự nhiên
6. **Dùng Competitor Ref** — tải ảnh quảng cáo đối thủ hiệu quả, AI tái hiện layout đó với thương hiệu bạn
7. **Điều chỉnh Độ nhạy** — sản phẩm sức khỏe/cơ thể luôn dùng độ nhạy "Cao" trong Stealth
8. **Rà soát kế hoạch cảnh** — chỉnh lại kế hoạch AI sinh ra trước khi tạo ảnh Stealth
9. **Tinh chỉnh độ tuổi đối tượng** — khớp nhóm khách hàng mục tiêu để nội dung Stealth chân thực hơn
10. **Tải ZIP cho chiến dịch lớn** — dùng "Tải tất cả" khi cần nhiều ảnh cùng lúc
11. **Video pipeline giữ nguyên nhịp điệu gốc** — AI cố tình giữ số câu/đoạn giống transcript gốc khi viết kịch bản, chỉ thay nội dung
12. **Voice Lab: lưu preset tốt để dùng lại** — một giọng/tốc độ/cao độ ưng ý nên lưu preset ngay

### 18.3 Quy tắc chất lượng text & logo (AI tự áp dụng)

**Viết hoa chữ:**
- Mọi text hiển thị dùng cách viết hoa nhất quán: Title Case hoặc VIẾT HOA TOÀN BỘ
- Không trộn lẫn kiểu chữ tuỳ tiện
- Áp dụng cho headline, body text, caption, text overlay

**Logo thương hiệu:**
- AI không bao giờ tự vẽ, bịa hoặc tạo mới logo
- Nếu đã tải logo, logo được tái hiện y nguyên — không chỉnh sửa, không thiết kế lại
- Nếu chưa có ảnh logo, chỉ logo in sẵn tự nhiên trên bao bì sản phẩm mới được phép xuất hiện

---

*Cập nhật lần cuối: 2026-07-01 — nội dung đồng bộ với `src/features/guide/guide-data.ts`.*
