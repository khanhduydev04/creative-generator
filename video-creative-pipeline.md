# Tổng quan Kiến trúc Pipeline (Workflow Architecture)

Hệ thống có thể chia làm 5 module chính, chạy xuyên suốt từ khâu thu thập dữ liệu thô đến khi ra thành phẩm âm thanh cuối cùng.

## 🗺️ Lưu đồ Pipeline tổng thể (End-to-end Flow)

## Giai đoạn 1: Data Acquisition (Thu thập & Lưu trữ)

- **Công cụ:** Apify (TikTok Scraper/Profile Scraper).
- **Quy trình:**
  - Thiết lập Cronjob trên hệ thống để trigger Apify chạy định kỳ (ví dụ: mỗi tuần 2 lần) cào video từ các hashtag hoặc kênh đối thủ cụ thể.
  - Dữ liệu thu về bao gồm: Video URL, metadata (lượt view, like, share, comment) để đánh giá mức độ viral.
  - Lưu trữ toàn bộ metadata này vào cơ sở dữ liệu (ví dụ: **PostgreSQL/Supabase**). Chỉ lưu TikTok_URL gốc và thumbnail/cover (không tải file video/audio thô về Storage Bucket ngay) — vì đa số video sẽ bị Rejected ở Giai đoạn 2, tải hết gây tốn chi phí lưu trữ/băng thông không cần thiết. File thật chỉ được tải về Storage Bucket khi nhân sự đã chọn "Winner" ở Giai đoạn 2.

## Giai đoạn 2: Human-in-the-Loop (Kiểm duyệt & Lựa chọn)

- **Công cụ:** Giao diện Dashboard nội bộ (có thể xây dựng nhanh bằng **Next.js, Tailwind CSS và Shadcn UI**).
- **Quy trình:**
  - Hệ thống hiển thị danh sách các video đã cào, sắp xếp theo các chỉ số tương tác (Views, Engagement Rate).
  - Nhân sự xem trực tiếp video trên Dashboard. Với video TikTok Shop bị chặn hiển thị trên web, Dashboard lazy-fetch link CDN trực tiếp qua tikwm.com (API dạng snaptik) tại thời điểm xem — không lưu link cố định vì link CDN có hạn.
  - Nhân sự bấm nút **"Select as Winner"** cho những video có hook tốt, phù hợp để chuyển đổi. Thao tác này sẽ trigger API kích hoạt Giai đoạn 3.

## Giai đoạn 3: Transcription (Bóc băng tự động)

- **Công cụ:** OpenAI Whisper API hoặc các dịch vụ Speech-to-Text tương đương.
- **Quy trình:**
  - Hệ thống trích xuất luồng âm thanh (audio stream) từ video "Winner" bằng ffmpeg (miễn phí, chạy <1 giây) — giữ tách riêng bước này thay vì gửi thẳng file video vào Whisper, vì gửi mp4 trực tiếp có rủi ro parse sai và dễ chạm giới hạn 25MB của API.
  - Gửi file âm thanh qua Whisper API để chuyển đổi thành văn bản (Raw Transcript).
  - Lưu đoạn text thô này vào database, ghim cùng ID của video gốc.
  - **[Human-in-the-Loop]** Hiển thị Raw Transcript trên UI cho nhân sự sửa tay trước khi đưa sang Giai đoạn 4 — tránh trường hợp Whisper nghe sai từ khóa/số liệu khiến LLM rewrite dựa trên thông tin sai mà không ai biết để sửa.

## Giai đoạn 4: Script Adaptation (Biến thể kịch bản)

- **Công cụ:** LLM API (Claude 4.6 Sonnet hoặc GPT-5.5).
- **Quy trình:**
  - Trên giao diện Dashboard, cung cấp một **System Prompt UI**. Tại đây, nhân sự có thể cấu hình trước các tham số của sản phẩm: *Đặc tính sản phẩm (VD: độ cay xé lưỡi, nguyên liệu chân ái, freeship), đối tượng khách hàng, tone & mood (hài hước, review chân thực, kịch tính).*
  - Hệ thống gửi Raw Transcript cùng System Prompt sang LLM.
  - **Yêu cầu LLM:** Giữ nguyên nhịp điệu (pacing), cấu trúc hook và điểm nhấn của video đối thủ, nhưng "thay máu" hoàn toàn nội dung để nói về sản phẩm của bạn.
  - Nhân sự review lại kịch bản đã generate trên UI, chỉnh sửa tay những từ ngữ chưa ưng ý và chốt bản cuối (Final Script).

## Giai đoạn 5: Voice Generation (Sản xuất Audio)

- **Công cụ:** Vbee API (Text-to-Speech / Voice Cloning).
- **Quy trình:**
  - Gửi Final Script qua Vbee API cùng với voice_preset được chọn từ trang Settings (lưu sẵn Voice_Code, Speed, Pitch, cấu hình ngắt nghỉ) — thay vì hard-code 1 Voice Clone cố định, vì các sản phẩm/campaign khác nhau cần linh hoạt đổi giọng.
  - Nhận lại file Audio (MP3/WAV) chất lượng cao.
  - Lưu file Audio vào Storage và hiển thị nút "Download" hoặc đồng bộ thẳng vào folder làm việc chung (Google Drive/Lark) để team Video Editor (CapCut/Premiere) ghép hình ảnh sản phẩm vào là xong.

## 💡 Gợi ý thiết kế Database (Data Flow)

Để tracking hiệu quả, dữ liệu nên được cấu trúc có tính liên kết chặt chẽ:

- **Bảng `competitor_videos`:** ID, TikTok_URL, Views, Likes, Scraping_Date, Status (Pending, Winner, Rejected), Scrape_Status (Success, Failed, Retry_Count) — để phát hiện sớm khi Apify/tikwm bị đổi format hoặc rate-limit.
- **Bảng `transcripts`:** ID, Video_ID, Raw_Text, Edited_Text (sau khi nhân sự hiệu đính).
- **Bảng `brand_scripts`:** ID, Transcript_ID, Prompt_Config_Used, Final_Text.
- **Bảng `generated_audios`:** ID, Script_ID, Vbee_Audio_URL, Created_At.
- **Bảng `voice_presets`:** ID, Voice_Code_Vbee, Display_Name, Speed, Pitch, Pause_Config (JSON), Is_Default — cho phép lưu nhiều preset giọng để chọn nhanh khi generate ở Giai đoạn 5, thay vì hard-code 1 giọng cố định.

---

Với workflow này, bạn đã tự động hóa được khoảng 80% thời gian research và viết kịch bản, chỉ giữ lại sự tinh tế của con người ở bước **Chọn Video** và **Duyệt Kịch Bản**, đảm bảo nội dung sản xuất ra vừa có tính công nghiệp, vừa giữ được "hồn" của thương hiệu.
