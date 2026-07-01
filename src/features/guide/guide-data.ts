import type { GuideGroup, GuideSection, SetupChecklistItem } from '@/features/guide/types'

// ─── Setup Checklist ────────────────────────────────────────────────────────

export const SETUP_CHECKLIST_ITEMS: SetupChecklistItem[] = [
  { id: 'select-brand', label: 'Chọn hoặc tạo Thương hiệu', description: 'Dropdown "Thương hiệu" cuối sidebar', required: true, linkTo: '/app/brands' },
  { id: 'brand-identity', label: 'Thiết lập nhận diện thương hiệu', description: 'Thương hiệu → Nhận diện thương hiệu', required: true, linkTo: '/app/brands' },
  { id: 'add-products', label: 'Thêm sản phẩm (kèm ảnh)', description: 'Thương hiệu → tab Sản phẩm', required: true, linkTo: '/app/brands' },
  { id: 'add-research', label: 'Thêm nghiên cứu thương hiệu', description: 'Thương hiệu → Brand Intelligence', required: false, linkTo: '/app/brands' },
  { id: 'create-personas', label: 'Tạo/generate Personas', description: 'Thương hiệu → Brand Intelligence', required: false, linkTo: '/app/brands' },
  { id: 'apify-sync', label: 'Cấu hình đồng bộ Apify (Task ID)', description: 'Thương hiệu → cuối trang, phần Apify Sync — chỉ cần nếu dùng tính năng Video', required: false, linkTo: '/app/brands' },
]

// ─── Guide Groups ───────────────────────────────────────────────────────────

export const GUIDE_GROUPS: GuideGroup[] = [
  { id: 'images', label: 'Ảnh', icon: 'Sparkles' },
  { id: 'videos', label: 'Video', icon: 'Film' },
  { id: 'brands', label: 'Thương hiệu', icon: 'Palette' },
  { id: 'setting', label: 'Cài đặt', icon: 'Settings' },
]

// ─── Guide Sections ─────────────────────────────────────────────────────────

export const GUIDE_SECTIONS: GuideSection[] = [
  // ══════════════════════════════════════════════════════════════════════
  // NHÓM: ẢNH
  // ══════════════════════════════════════════════════════════════════════

  // ── 1. Tạo quảng cáo (Home) ─────────────────────────────────────────────
  {
    id: 'create-ads',
    number: 1,
    title: 'Tạo quảng cáo',
    icon: 'Sparkles',
    description: 'Tạo ảnh quảng cáo tĩnh bằng AI dựa trên Concept hoặc mẫu tham khảo',
    group: 'images',
    adminOnly: false,
    content: [
      { type: 'paragraph', text: 'Vị trí: Điều hướng → Ảnh → Tạo quảng cáo (trang chủ /app). Đây là workspace chính để cấu hình thông số và tạo ảnh quảng cáo tĩnh.' },
    ],
    subsections: [
      {
        id: '1-1-brand-product',
        title: '1.1 Brand Product',
        content: [
          { type: 'list', items: [
            'Chọn Sản phẩm từ dropdown (bắt buộc)',
            'Trạng thái dữ liệu sản phẩm hiển thị ngay bên dưới: "Đã cache dữ liệu, sẵn sàng tạo" (xanh) / "Sheet đã liên kết, chưa thu thập" / "Chưa có nguồn dữ liệu"',
            'Nếu sản phẩm chưa có URL trang sản phẩm, hệ thống nhắc thêm URL trong Thương hiệu → tab Sản phẩm để có kết quả tốt hơn',
          ]},
        ],
      },
      {
        id: '1-2-generation-mode',
        title: '1.2 Chế độ tạo',
        content: [
          { type: 'list', items: [
            'Concept (mặc định) — AI áp dụng các concept sáng tạo đã chọn',
            'Competitor Ref — tải lên ảnh quảng cáo đối thủ, AI phân tích layout/màu sắc/kiểu chữ rồi tái tạo với thương hiệu của bạn',
          ]},
          { type: 'tip', text: 'Xem mục 1.6 để biết chi tiết chế độ Competitor Ref, gồm cả sub-mode Standard và Stealth.' },
        ],
      },
      {
        id: '1-3-concepts',
        title: '1.3 Concepts (bắt buộc nếu dùng chế độ Concept)',
        content: [
          { type: 'list', items: [
            'Chọn (tick) một hoặc nhiều concept để áp dụng',
            'Mỗi concept tạo ra ảnh với chiến lược sáng tạo khác nhau',
            'Concept có nhãn "Competitor" cần dữ liệu thị trường/sản phẩm đối thủ đi kèm',
            'Bộ đếm hiển thị số concept "đã chọn"',
          ]},
          { type: 'tip', text: 'Xem mục 3 (Concept) để biết cách tạo và quản lý các concept.' },
        ],
      },
      {
        id: '1-4-ad-copy',
        title: '1.4 Ad Copy (Tuỳ chọn)',
        content: [
          { type: 'list', items: [
            'Tiêu đề — ghi đè headline do AI tạo',
            'Nội dung — ghi đè body copy',
            'Ghi chú thêm — chỉ dẫn cụ thể cho AI',
            'Nút "Xoá tất cả" để reset các override này',
          ]},
        ],
      },
      {
        id: '1-5-audience-output',
        title: '1.5 Đối tượng mục tiêu & Số lượng đầu ra',
        content: [
          { type: 'heading', level: 4, text: 'Đối tượng mục tiêu', id: 'target-audience' },
          { type: 'list', items: [
            'Chọn một hoặc nhiều persona (mỗi persona chọn sẽ tạo ra một biến thể quảng cáo riêng)',
            'Dùng "Tất cả profiles" để lấy sự đa dạng tối đa',
          ]},
          { type: 'heading', level: 4, text: 'Số lượng đầu ra', id: 'output-volume' },
          { type: 'list', items: [
            'Tỷ lệ khung hình: 1:1 (Vuông), 4:5 (Portrait), 9:16 (Story)',
            'Số lượng quảng cáo: 1–10 ảnh cho mỗi tổ hợp concept × persona',
          ]},
        ],
      },
      {
        id: '1-6-competitor-ref',
        title: '1.6 Chế độ Competitor Ref',
        content: [
          { type: 'steps', items: [
            'Tải lên hoặc kéo-thả ảnh quảng cáo đối thủ',
            'AI phân tích layout, màu sắc, kiểu chữ, bố cục',
            'Chọn sub-mode: Standard hoặc Stealth',
          ]},
          { type: 'heading', level: 4, text: 'Sub-mode Standard', id: 'submode-standard' },
          { type: 'list', items: [
            'Tạo một ảnh quảng cáo tái hiện layout của đối thủ',
            'Dùng sản phẩm, màu sắc, thông điệp của thương hiệu bạn',
            'Bảng màu của đối thủ bị chặn hoàn toàn, không copy sang',
          ]},
          { type: 'heading', level: 4, text: 'Sub-mode Stealth', id: 'submode-stealth' },
          { type: 'list', items: [
            'Tạo stealth ads lấy cảm hứng từ ảnh tham khảo, theo luồng 2 bước Lập kế hoạch cảnh → Tạo',
            'Có thêm tuỳ chọn: Độ nhạy sản phẩm (Bình thường / Cao) và Độ tuổi đối tượng',
          ]},
          { type: 'tip', text: 'Nếu tải lên từ 2 ảnh tham khảo trở lên, hệ thống sẽ tạo Số lượng quảng cáo × Số ảnh tham khảo (Pack Mode) và hiển thị tiến trình dạng "Đang tạo (ref 1/3)...".' },
        ],
      },
      {
        id: '1-7-generation-results',
        title: '1.7 Tạo & Kết quả',
        content: [
          { type: 'paragraph', text: 'Bấm "Tạo quảng cáo" (nút bị khoá tới khi đã chọn đủ Sản phẩm + Đối tượng mục tiêu + Concept hoặc ảnh tham khảo đối thủ).' },
          { type: 'paragraph', text: 'Trong lúc tạo, hệ thống hiển thị tiến trình từng bước (đọc trang sản phẩm, đọc dữ liệu đối thủ, áp dụng concept, tạo ảnh...).' },
          { type: 'heading', level: 4, text: 'Thao tác trên từng ảnh kết quả', id: 'actions-per-ad' },
          { type: 'table', headers: ['Nút', 'Hành động'], rows: [
            ['Lưu vào thư viện', 'Lưu ảnh vào Thư viện'],
            ['Sao chép prompt', 'Copy prompt tạo ảnh đầy đủ'],
            ['Tải ảnh', 'Tải file ảnh về máy'],
            ['Xoá khỏi kết quả', 'Xoá ảnh khỏi danh sách kết quả hiện tại'],
          ]},
          { type: 'heading', level: 4, text: 'Thao tác hàng loạt', id: 'bulk-actions' },
          { type: 'list', items: [
            'Lưu tất cả — lưu toàn bộ kết quả vào Thư viện',
            'Tải tất cả — tải toàn bộ ảnh dưới dạng ZIP',
            'Xoá — xoá toàn bộ kết quả hiện tại',
          ]},
        ],
      },
    ],
  },

  // ── 2. Stealth Ads ───────────────────────────────────────────────────────
  {
    id: 'stealth-ads',
    number: 2,
    title: 'Stealth Ads',
    icon: 'EyeOff',
    description: 'Tạo quảng cáo trông giống nội dung đời thường, nhắm tầng nhận thức thấp',
    group: 'images',
    adminOnly: false,
    content: [
      { type: 'paragraph', text: 'Vị trí: Điều hướng → Ảnh → Stealth Ads. Stealth ads trông như ảnh iPhone, screenshot tin nhắn, khoảnh khắc đời thường, với sản phẩm được đặt tự nhiên, khéo léo bên trong. Người xem không nhận ra đây là quảng cáo nên tránh được hiện tượng "ad fatigue".' },
    ],
    subsections: [
      {
        id: '2-1-how-it-works',
        title: '2.1 Luồng 2 bước',
        content: [
          { type: 'steps', items: [
            'Lập kế hoạch cảnh — AI tạo mô tả cảnh chi tiết',
            'Tạo ảnh — AI dựng ảnh photorealistic từ từng kế hoạch cảnh',
          ]},
        ],
      },
      {
        id: '2-2-configuration',
        title: '2.2 Cấu hình',
        content: [
          { type: 'paragraph', text: 'Sản phẩm & Ngôn ngữ: giống hệt Tạo quảng cáo (mục 1.1 và ngôn ngữ ở mục 1.5).' },
          { type: 'heading', level: 4, text: 'Chọn cảnh', id: 'scene-selection' },
          { type: 'list', items: [
            'AI tự chọn (khuyến nghị) — AI tự chọn cảnh phù hợp nhất theo sản phẩm và đối tượng',
            'Chọn cảnh — duyệt thư viện cảnh, tick chọn cảnh muốn dùng',
          ]},
          { type: 'table', headers: ['Danh mục', 'Mã', 'Mô tả', 'Ví dụ cảnh'], rows: [
            ['Human-Centric', 'HUM', 'Người là trung tâm, sản phẩm chỉ xuất hiện phụ', 'Gym Mirror Selfie, Post-Workout Glow, Beach Candid'],
            ['Environment', 'ENV', 'Sản phẩm đặt tự nhiên trong bối cảnh đời thực', 'Morning Counter, Gym Bag Flat Lay, Nightstand'],
            ['Content Format', 'FMT', 'Sản phẩm trong screenshot/nội dung số', 'iPhone Screenshot, Chat Bubble, Review Box'],
            ['Story', 'STR', 'Sản phẩm lồng ghép vào câu chuyện', 'Daily Routine, Transformation Journey, Gifting Story'],
          ]},
          { type: 'tip', text: 'Có thể thêm cảnh tuỳ chỉnh: bấm "Thêm cảnh tùy chỉnh", điền ID, danh mục, tên, mô tả, phương pháp đặt sản phẩm, sản phẩm/đối tượng phù hợp. Cảnh tuỳ chỉnh có thể sửa/xoá sau.' },
          { type: 'heading', level: 4, text: 'Tinh chỉnh đối tượng', id: 'audience-tuning' },
          { type: 'table', headers: ['Thiết lập', 'Tuỳ chọn', 'Khi nào dùng'], rows: [
            ['Độ nhạy sản phẩm', 'Bình thường / Cao (Body/Beauty)', 'Dùng "Cao" cho sản phẩm liên quan cơ thể, cân nặng, làm đẹp'],
            ['Độ tuổi đối tượng', '18–25, 25–35, 35–45, 40–55, 50+', 'Điều chỉnh đạo cụ, phong cách text, tính xác thực theo platform'],
          ]},
          { type: 'warning', text: 'Độ nhạy "Cao" đảm bảo: không so sánh before/after cơ thể, không dùng ngôn ngữ "cải thiện/biến đổi", không nêu công dụng trực tiếp — chỉ thể hiện sự hiện diện của sản phẩm, hình thể thể hiện dưới dạng "khát vọng khả thi" thay vì hình mẫu/vận động viên.' },
        ],
      },
      {
        id: '2-3-plans-results',
        title: '2.3 Kế hoạch cảnh & Kết quả',
        content: [
          { type: 'paragraph', text: 'Bấm "Lập kế hoạch cảnh" → AI sinh ra các thẻ kế hoạch, mỗi thẻ gồm: tên cảnh + danh mục, mức độ hiện diện sản phẩm (xuất hiện vật lý hay chỉ nhắc tên), bố cục (góc máy, ánh sáng, tông màu), vị trí đặt sản phẩm, nội dung text xuất hiện trong ảnh.' },
          { type: 'list', items: [
            'Bấm vào bất kỳ trường nào để chỉnh sửa trực tiếp',
            'Dùng mũi tên để sắp xếp lại thứ tự kế hoạch',
            'Xoá kế hoạch không muốn dùng',
            'Tạo lại một kế hoạch bằng icon refresh',
            'Thêm cảnh từ thư viện bằng nút "Thêm cảnh"',
          ]},
          { type: 'paragraph', text: 'Sau khi rà soát, bấm "Tạo tất cả" để tạo ảnh. Mỗi kết quả có nút lưu/tải/sao chép mô tả/xoá/tạo lại. Thao tác hàng loạt: Tải tất cả (ZIP), Lưu tất cả vào thư viện.' },
        ],
      },
    ],
  },

  // ── 3. Concept ───────────────────────────────────────────────────────────
  {
    id: 'concepts',
    number: 3,
    title: 'Concept',
    icon: 'Lightbulb',
    description: 'Chiến lược sáng tạo dùng làm nền cho việc tạo quảng cáo',
    group: 'images',
    adminOnly: false,
    content: [
      { type: 'paragraph', text: 'Vị trí: Điều hướng → Cài đặt → Concept. Mọi người dùng đã đăng nhập đều tạo/sửa/xoá được concept của riêng mình. Concept hệ thống (built-in, đánh dấu "[System]") chỉ admin (CEO, Super Admin) mới sửa/xoá được.' },
      { type: 'paragraph', text: 'Concept định nghĩa chiến lược sáng tạo dùng trong lúc tạo quảng cáo. Mỗi concept gồm:' },
      { type: 'table', headers: ['Trường', 'Mô tả'], rows: [
        ['Concept ID', 'Định danh duy nhất, chữ thường + gạch dưới (vd. data_hook), không đổi được sau khi tạo'],
        ['Nhãn', 'Tên hiển thị'],
        ['Mô tả', 'Chiến lược mà concept này sử dụng'],
        ['Yêu cầu sản phẩm đối thủ', 'Có cần dữ liệu/ảnh đối thủ đi kèm hay không'],
        ['Prompt', 'Chiến lược sáng tạo + hướng dẫn hình ảnh đầy đủ cho AI'],
        ['Ảnh tham khảo', 'Tối đa 2 ảnh định hướng phong cách hình ảnh'],
      ]},
    ],
    subsections: [
      {
        id: '3-1-add-concept',
        title: '3.1 Thêm Concept',
        content: [
          { type: 'steps', items: [
            'Bấm "Thêm concept"',
            'Điền đầy đủ các trường',
            'Trong trường Prompt, có thể chia nhiều biến thể layout bằng ### Variant A, ### Variant B, v.v. — AI sẽ luân phiên qua các biến thể này ở mỗi lần tạo',
            'Có thể tải thêm ảnh tham khảo (tối đa 2) để định hướng phong cách hình ảnh',
            'Bấm "Lưu"',
          ]},
          { type: 'tip', text: 'Bấm mũi tên mở rộng trên bất kỳ thẻ concept nào để xem toàn bộ prompt. Ảnh tham khảo chỉ định hướng phong cách — nội dung sản phẩm và màu thương hiệu không bao giờ bị copy từ ảnh tham khảo.' },
          { type: 'warning', text: 'Concept hệ thống (nhãn "[System]") chỉ admin sửa/xoá được. Thành viên vẫn tạo và quản lý concept riêng của mình bình thường.' },
        ],
      },
    ],
  },

  // ── 4. Thư viện ───────────────────────────────────────────────────────────
  {
    id: 'library',
    number: 4,
    title: 'Thư viện',
    icon: 'FolderOpen',
    description: 'Duyệt, tải và quản lý toàn bộ quảng cáo đã tạo',
    group: 'images',
    adminOnly: false,
    content: [
      { type: 'paragraph', text: 'Vị trí: Điều hướng → Ảnh → Thư viện.' },
    ],
    subsections: [
      {
        id: '4-1-viewing',
        title: '4.1 Xem quảng cáo',
        content: [
          { type: 'table', headers: ['Điều khiển', 'Tuỳ chọn'], rows: [
            ['Chế độ xem', 'Xem dạng lưới (grid) / Xem dạng danh sách (list)'],
            ['Sắp xếp', 'Mới nhất trước / Cũ nhất trước'],
            ['Lọc theo ngày', 'Hôm nay, Tuần này, Tháng này, Tháng trước...'],
            ['Tìm kiếm', 'Tìm theo tên file'],
          ]},
        ],
      },
      {
        id: '4-2-actions',
        title: '4.2 Thao tác',
        content: [
          { type: 'table', headers: ['Thao tác', 'Cách làm'], rows: [
            ['Xem chi tiết', 'Bấm vào ảnh bất kỳ → mở modal Chi tiết ảnh'],
            ['Tải ảnh', 'Bấm icon tải trên thẻ ảnh'],
            ['Xoá', 'Bấm icon thùng rác → xác nhận'],
            ['Chỉnh sửa quảng cáo', 'Trong Chi tiết ảnh, mô tả thay đổi (text, màu sắc, logo, layout...), có thể đính kèm thêm ảnh, rồi bấm "Áp dụng chỉnh sửa" để tạo phiên bản mới'],
          ]},
          { type: 'tip', text: 'Ảnh chỉnh sửa chưa lưu sẽ được đánh dấu "Ảnh chỉnh sửa chưa được lưu" — nhớ lưu lại nếu muốn giữ.' },
        ],
      },
      {
        id: '4-3-bulk',
        title: '4.3 Thao tác hàng loạt',
        content: [
          { type: 'list', items: [
            'Chọn nhiều ảnh bằng checkbox',
            'Tải các ảnh đã chọn dưới dạng ZIP',
            'Xoá hàng loạt (có xác nhận)',
          ]},
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // NHÓM: VIDEO
  // ══════════════════════════════════════════════════════════════════════

  // ── 5. Video Trending ────────────────────────────────────────────────────
  {
    id: 'video-trending',
    number: 5,
    title: 'Video Trending',
    icon: 'Film',
    description: 'Thu thập và quản lý video đối thủ từ TikTok',
    group: 'videos',
    adminOnly: false,
    content: [
      { type: 'paragraph', text: 'Vị trí: Điều hướng → Video → Video Trending. Đây là nơi tập hợp video TikTok của đối thủ để phân tích và làm nguyên liệu sản xuất nội dung (bóc băng → viết lại kịch bản → tạo giọng đọc).' },
    ],
    subsections: [
      {
        id: '5-1-adding-videos',
        title: '5.1 Thêm video',
        content: [
          { type: 'list', items: [
            'Nút "Sync từ Apify" — lấy dữ liệu từ lần chạy thành công gần nhất của Apify task đã cấu hình cho thương hiệu hiện tại (xem mục 13)',
            'Nút "Thêm Video" — dán trực tiếp một URL TikTok (dạng https://www.tiktok.com/@handle/video/...); hệ thống kiểm tra định dạng URL hợp lệ và trùng lặp',
          ]},
        ],
      },
      {
        id: '5-2-filter-status',
        title: '5.2 Lọc, tìm kiếm & trạng thái',
        content: [
          { type: 'list', items: [
            'Tab lọc trạng thái: Tất cả / Chờ duyệt / Winner / Đã từ chối',
            'Ô tìm kiếm theo URL hoặc tên tác giả',
            'Bảng hiển thị: lượt xem, lượt thích, lượt chia sẻ, bình luận, trạng thái',
          ]},
          { type: 'paragraph', text: 'Trên mỗi video có thể: mở chi tiết để xử lý, đánh dấu Winner (video tiềm năng để làm kịch bản), Từ chối, hoặc mở trực tiếp trên TikTok.' },
        ],
      },
    ],
  },

  // ── 6. Pipeline xử lý video ──────────────────────────────────────────────
  {
    id: 'video-pipeline',
    number: 6,
    title: 'Pipeline xử lý video',
    icon: 'Workflow',
    description: 'Bóc băng → Viết kịch bản thương hiệu → Tạo giọng đọc',
    group: 'videos',
    adminOnly: false,
    content: [
      { type: 'paragraph', text: 'Vị trí: bấm vào một video trong danh sách Video Trending để mở trang chi tiết. Đầu trang là trình phát video + metadata (tài khoản, lượt xem/thích/chia sẻ/bình luận, ngày thu thập).' },
      { type: 'paragraph', text: 'Ngay dưới trình phát là thanh tiến trình 4 bước, có thể bấm để nhảy nhanh tới từng phần: Bóc băng → Kịch bản → Giọng đọc → Hoàn tất. Mỗi bước chỉ mở khoá sau khi bước trước đã hoàn tất — hệ thống hiển thị "Hoàn tất bước trước để mở khóa" nếu bấm sớm.' },
    ],
    subsections: [
      {
        id: '6-1-transcribe',
        title: '6.1 Bước 1 — Bóc băng (Phiên Âm)',
        content: [
          { type: 'paragraph', text: 'Trạng thái: Chờ xử lý → Đang phiên âm... → Hoàn thành / Thất bại.' },
          { type: 'steps', items: [
            'Bấm "Bắt đầu phiên âm" nếu video chưa có transcript (AI nghe audio trong video và phiên âm sang chữ)',
            'Sau khi Hoàn thành, transcript hiển thị trong ô văn bản có thể chỉnh sửa trực tiếp',
            'Sửa nội dung nếu AI nghe sai, rồi bấm "Lưu"',
            'Nếu cần bóc lại từ đầu, bấm "Phiên âm lại" (chỉ khả dụng khi trạng thái là Hoàn thành hoặc Thất bại)',
          ]},
        ],
      },
      {
        id: '6-2-script',
        title: '6.2 Bước 2 — Kịch Bản Thương Hiệu',
        content: [
          { type: 'paragraph', text: 'Mở khoá khi Bóc băng ở trạng thái Hoàn thành.' },
          { type: 'heading', level: 4, text: 'Cấu hình sản phẩm', id: 'product-config' },
          { type: 'list', items: [
            'Chọn sản phẩm từ dropdown (hoặc để "Không chọn sản phẩm")',
            'Các trường Đặc tính, Đối tượng KH, Điểm bán / USP được nạp sẵn từ sản phẩm nhưng có thể sửa riêng cho video này mà không ảnh hưởng tới sản phẩm gốc',
          ]},
          { type: 'heading', level: 4, text: 'Tham số tạo kịch bản', id: 'script-params' },
          { type: 'list', items: [
            'Giọng điệu: Hài hước / Chân thực / Kịch tính',
            'Ghi chú (USP, hashtag, khuyến mãi...)',
          ]},
          { type: 'steps', items: [
            'Bấm "Tạo kịch bản ✦" — AI viết lại kịch bản theo cấu trúc/nhịp điệu của transcript gốc nhưng thay hoàn toàn nội dung theo thương hiệu bạn, kịch bản hiện ra dần theo thời gian thực (streaming)',
            'Chỉnh sửa trực tiếp trong ô kịch bản nếu cần',
            'Bấm "Lưu kịch bản" để lưu lại (cần lưu trước khi sang bước Giọng đọc)',
          ]},
          { type: 'tip', text: 'Nếu tạo kịch bản lỗi, hệ thống báo "Lỗi tạo kịch bản. Thử lại." — chỉ cần bấm tạo lại.' },
        ],
      },
      {
        id: '6-3-voice',
        title: '6.3 Bước 3 — Tạo Giọng Đọc',
        content: [
          { type: 'paragraph', text: 'Mở khoá khi kịch bản đã được lưu.' },
          { type: 'steps', items: [
            'Chọn Voice Preset từ dropdown (preset được tạo sẵn trong Voice Lab, xem mục 7). Nếu chưa có preset nào: "Chưa có preset. Tạo trong Voice Lab."',
            'Bấm "Tạo giọng đọc ♪"',
            'Sau khi tạo xong, audio xuất hiện trong danh sách bên dưới kèm trình phát, thông tin voice preset (tốc độ, cao độ), thời lượng, và nút xoá',
          ]},
        ],
      },
    ],
  },

  // ── 7. Voice Lab ─────────────────────────────────────────────────────────
  {
    id: 'voice-lab',
    number: 7,
    title: 'Voice Lab (Cấu Hình Giọng)',
    icon: 'Mic',
    description: 'Thử giọng, đánh giá và lưu voice preset cho Vbee & ElevenLabs',
    group: 'videos',
    adminOnly: false,
    content: [
      { type: 'paragraph', text: 'Vị trí: Điều hướng → Video → Cấu Hình Giọng (/app/video/voice-config). Đây là nơi thử giọng đọc và lưu thành preset để dùng ở bước Tạo Giọng Đọc trong pipeline video. Hỗ trợ 2 nhà cung cấp TTS: Vbee (tiếng Việt) và ElevenLabs.' },
    ],
    subsections: [
      {
        id: '7-1-vbee',
        title: '7.1 Tab Vbee',
        content: [
          { type: 'heading', level: 4, text: 'Thư Viện Giọng (bên trái)', id: 'vbee-browser' },
          { type: 'list', items: [
            'Lọc theo Giới tính: Tất cả / Nữ / Nam',
            'Lọc theo Vùng miền: Tất cả / Bắc / Trung / Nam',
            'Sắp xếp theo: Điểm viral ▼ hoặc Tên A-Z',
            'Mỗi giọng có nút "Test nhanh" để nghe thử ngay',
          ]},
          { type: 'heading', level: 4, text: 'Thử Giọng (bên phải)', id: 'vbee-panel' },
          { type: 'list', items: [
            'Nhập văn bản thử (tối đa 500 ký tự, có sẵn văn bản mẫu tiếng Việt)',
            'Điều chỉnh Tốc độ (0.5x–2.0x) và Cao độ (0.5–2.0)',
            'Bấm "▶ Nghe thử" để nghe kết quả',
          ]},
          { type: 'heading', level: 4, text: 'Đánh giá & Lưu preset', id: 'vbee-rating-preset' },
          { type: 'list', items: [
            'Đánh giá viral potential (1–5 sao) kèm ghi chú tuỳ chọn (vd. "Giọng mượt, phù hợp sản phẩm làm đẹp") — bấm "Lưu rating"',
            'Đặt Tên preset rồi bấm "💾 Lưu thành preset" — preset lưu lại giọng, tốc độ, cao độ để tái sử dụng nhanh trong pipeline video',
          ]},
        ],
      },
      {
        id: '7-2-elevenlabs',
        title: '7.2 Tab ElevenLabs',
        content: [
          { type: 'list', items: [
            'Bên trái: danh sách giọng, mỗi giọng có nút "Nghe thử" (nếu có preview) và "Chọn"/"Đã chọn"',
            'Bên phải: hiển thị giọng đã chọn + trình phát preview',
            'Chọn Model: v2.5 Flash (nhanh, ổn định) hoặc v3 (hỗ trợ expression tags, tự nhiên nhất)',
            'Đặt tên và bấm "Lưu thành preset" để dùng lại trong pipeline video',
          ]},
          { type: 'tip', text: 'Model v3 hỗ trợ expression tags (vd. [amused], [excited]) giúp giọng đọc biểu cảm hơn — script writer sẽ tự chèn tag phù hợp khi kịch bản được viết cho preset dùng v3.' },
        ],
      },
    ],
  },

  // ── 8. Thư viện Audio ────────────────────────────────────────────────────
  {
    id: 'audio-library',
    number: 8,
    title: 'Thư Viện Audio',
    icon: 'Music',
    description: 'Tổng hợp toàn bộ giọng đọc đã tạo từ pipeline video',
    group: 'videos',
    adminOnly: false,
    content: [
      { type: 'paragraph', text: 'Vị trí: Điều hướng → Video → Thư Viện Audio (/app/video/audio).' },
    ],
    subsections: [
      {
        id: '8-1-table',
        title: '8.1 Danh sách audio',
        content: [
          { type: 'paragraph', text: 'Bảng hiển thị: đoạn kịch bản (rút gọn), giọng đọc/preset, thời lượng, ngày tạo. Hành động: Tải xuống hoặc Xoá.' },
          { type: 'paragraph', text: 'Bấm vào một dòng để xem Chi tiết Audio: kịch bản đầy đủ, giọng đọc, nhà cung cấp, tốc độ, thời lượng, ngày tạo.' },
          { type: 'tip', text: 'Nếu chưa tạo audio nào, khu vực này hiển thị "Chưa có audio nào."' },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // NHÓM: THƯƠNG HIỆU
  // ══════════════════════════════════════════════════════════════════════

  // ── 9. Chọn & quản lý thương hiệu ────────────────────────────────────────
  {
    id: 'brand-selector',
    number: 9,
    title: 'Chọn & quản lý thương hiệu',
    icon: 'Building2',
    description: 'Mỗi thương hiệu là một không gian làm việc riêng biệt',
    group: 'brands',
    adminOnly: false,
    content: [
      { type: 'paragraph', text: 'Mỗi Thương hiệu (Brand) là một không gian làm việc độc lập — có sản phẩm, concept, video, quảng cáo riêng. Dropdown "Thương hiệu" nằm cuối sidebar, luôn hiển thị dù đang ở trang nào.' },
    ],
    subsections: [
      {
        id: '9-1-switching',
        title: '9.1 Chuyển đổi & quản lý',
        content: [
          { type: 'table', headers: ['Thao tác', 'Cách làm'], rows: [
            ['Chuyển thương hiệu', 'Bấm dropdown "Thương hiệu" ở cuối sidebar → chọn tên khác'],
            ['Thêm thương hiệu', 'Bấm "Thêm thương hiệu" trong dropdown (chỉ admin)'],
            ['Đổi tên', 'Bấm icon "⋯" (Thao tác) cạnh dropdown → Đổi tên'],
            ['Xoá thương hiệu', 'Bấm icon "⋯" → Xoá (chỉ admin)'],
          ]},
          { type: 'tip', text: 'Thương hiệu đang chọn được ghi nhớ tự động và giữ nguyên qua các lần tải lại trang.' },
        ],
      },
    ],
  },

  // ── 10. Nhận diện thương hiệu ────────────────────────────────────────────
  {
    id: 'brand-identity',
    number: 10,
    title: 'Nhận diện thương hiệu',
    icon: 'Palette',
    description: 'Tên, mô tả, kiểu chữ, bảng màu và logo của thương hiệu',
    group: 'brands',
    adminOnly: false,
    content: [
      { type: 'paragraph', text: 'Vị trí: Điều hướng → Cài đặt → Thương hiệu (trang /app/brands, phần "Nhận diện thương hiệu"). Mọi người dùng đã đăng nhập (kể cả Thành viên) đều chỉnh sửa được — chỉ việc tạo mới hoặc xoá cả Thương hiệu mới cần quyền admin (xem mục 9.1).' },
    ],
    subsections: [
      {
        id: '10-1-fields',
        title: '10.1 Các trường thông tin',
        content: [
          { type: 'table', headers: ['Trường', 'Mô tả'], rows: [
            ['Tên thương hiệu', 'Tên hiển thị của thương hiệu'],
            ['Mô tả thương hiệu', 'Tổng quan, định vị, thông điệp chính'],
            ['Kiểu chữ', 'Chọn Google Font hoặc tải font riêng lên'],
            ['Bảng màu', '6 màu: Primary 1&2, Secondary 1&2, Accent 1&2'],
            ['Logo (Nền sáng)', 'Dùng cho nền sáng (SVG, PNG hoặc JPG, tối đa 2MB)'],
            ['Logo (Nền tối)', 'Dùng cho nền tối'],
          ]},
          { type: 'heading', level: 4, text: 'Cách chọn font', id: 'choose-font' },
          { type: 'steps', items: [
            'Bấm "Chọn font..." → mở hộp thoại "Chọn Font"',
            'Tab Google Fonts: gõ tìm kiếm rồi chọn font',
            'Tab Tải Font lên: kéo-thả hoặc chọn file (.ttf, .otf, .woff, .woff2) cho từng biến thể (Regular, Bold, Italic...)',
          ]},
          { type: 'heading', level: 4, text: 'Cách tải logo', id: 'upload-logo' },
          { type: 'steps', items: [
            'Bấm vào khu vực tải lên (viền nét đứt)',
            'Chọn file (SVG, PNG hoặc JPG, tối đa 2MB)',
            'Ảnh xem trước hiển thị ngay lập tức',
            'Bấm "Xóa logo" để gỡ và tải lại',
          ]},
          { type: 'tip', text: 'Bấm "Lưu Brand Kit" (góc phải trên) để lưu toàn bộ thay đổi. Cột "Xem trước thương hiệu" bên phải cập nhật real-time khi bạn chỉnh sửa, không cần lưu trước.' },
        ],
      },
    ],
  },

  // ── 11. Sản phẩm ─────────────────────────────────────────────────────────
  {
    id: 'products',
    number: 11,
    title: 'Sản phẩm',
    icon: 'Package',
    description: 'Quản lý sản phẩm dùng làm nguyên liệu tạo quảng cáo',
    group: 'brands',
    adminOnly: false,
    content: [
      { type: 'paragraph', text: 'Vị trí: trang Thương hiệu → tab Sản phẩm.' },
    ],
    subsections: [
      {
        id: '11-1-add-product',
        title: '11.1 Thêm sản phẩm',
        content: [
          { type: 'steps', items: [
            'Bấm "Thêm sản phẩm"',
            'Nhập Tên sản phẩm (bắt buộc)',
            'Nhập Mô tả (không bắt buộc nhưng nên có — tính năng chính, thành phần, lợi ích)',
            'Nhập URL trang sản phẩm — AI sẽ thu thập trang này để trích xuất giá, thành phần, lợi ích... phục vụ tạo nội dung',
            'Tải Ảnh sản phẩm (bắt buộc, tối đa 5 ảnh): bấm icon vương miện để đặt ảnh chính, dùng mũi tên để sắp xếp thứ tự Trước (chính) → Sau → Bên → Chi tiết',
            '(Tuỳ chọn) Mở rộng "Màu sản phẩm" để ghi đè bảng màu thương hiệu riêng cho sản phẩm này — để trống sẽ dùng màu cấp thương hiệu',
            'Bấm "Tạo sản phẩm"',
          ]},
          { type: 'paragraph', text: 'Dùng icon Chỉnh sửa / Xóa trên từng thẻ sản phẩm để quản lý.' },
          { type: 'tip', text: 'Ảnh sản phẩm ảnh hưởng trực tiếp tới chất lượng quảng cáo — nên dùng ảnh độ phân giải cao, chụp thật sản phẩm từ nhiều góc.' },
        ],
      },
      {
        id: '11-2-scrape-status',
        title: '11.2 Trạng thái thu thập dữ liệu trang sản phẩm',
        content: [
          { type: 'list', items: [
            '"Dữ liệu sản phẩm đã cache" — trang đã được AI đọc, sẵn sàng dùng khi tạo quảng cáo',
            '"Chưa thu thập" — bấm "Thu thập ngay" để lấy dữ liệu trước, hoặc để hệ thống tự lấy ở lần tạo quảng cáo đầu tiên',
          ]},
        ],
      },
    ],
  },

  // ── 12. Brand Intelligence ───────────────────────────────────────────────
  {
    id: 'brand-intelligence',
    number: 12,
    title: 'Brand Intelligence',
    icon: 'Brain',
    description: 'Nghiên cứu thị trường và persona đối tượng mục tiêu',
    group: 'brands',
    adminOnly: false,
    content: [
      { type: 'paragraph', text: 'Vị trí: trang Thương hiệu → phần Brand Intelligence. Đây là ngữ cảnh AI dùng để tạo persona chính xác hơn và viết ad copy sát với đối tượng mục tiêu.' },
    ],
    subsections: [
      {
        id: '12-1-research',
        title: '12.1 Tóm tắt nghiên cứu',
        content: [
          { type: 'steps', items: [
            'Dán nghiên cứu đối thủ, ghi chú sản phẩm, brief thương hiệu, hoặc insight thị trường vào ô văn bản lớn',
            'Bấm "Lưu tóm tắt nghiên cứu"',
            'Nội dung này giúp AI tạo persona và ad copy sát thực tế hơn',
          ]},
        ],
      },
      {
        id: '12-2-personas',
        title: '12.2 Personas (đối tượng mục tiêu)',
        content: [
          { type: 'heading', level: 4, text: 'Tự động tạo', id: 'auto-generate-personas' },
          { type: 'steps', items: [
            'Đảm bảo đã lưu tóm tắt nghiên cứu ở trên',
            'Bấm "Tạo 10 Profiles"',
            'AI phân tích thương hiệu + nghiên cứu để tạo 10 persona',
            'Mỗi persona gồm: Tên, Pain (nỗi đau), Angle (góc tiếp cận), Emotion (cảm xúc)',
          ]},
          { type: 'heading', level: 4, text: 'Thêm thủ công', id: 'manual-add-persona' },
          { type: 'steps', items: [
            'Bấm "Thêm Profile"',
            'Điền: Tên Profile, Pain Point, Angle, Emotion',
            'Bấm "Tạo Profile"',
          ]},
          { type: 'paragraph', text: 'Dùng nút Chỉnh sửa / Xóa trên từng thẻ persona để quản lý.' },
          { type: 'tip', text: 'Persona được dùng ở bước "Đối tượng mục tiêu" khi tạo quảng cáo (mục 1.5) để cá nhân hoá thông điệp theo từng phân khúc.' },
        ],
      },
    ],
  },

  // ── 13. Đồng bộ video đối thủ (Apify) ────────────────────────────────────
  {
    id: 'apify-sync',
    number: 13,
    title: 'Đồng bộ video đối thủ (Apify)',
    icon: 'RefreshCw',
    description: 'Cấu hình Apify task để tự động kéo video TikTok đối thủ',
    group: 'brands',
    adminOnly: false,
    content: [
      { type: 'paragraph', text: 'Vị trí: cuối trang Thương hiệu, phần "Apify Sync". Mọi người dùng đều bấm được "Sync ngay" và xem trạng thái — chỉ riêng việc cấu hình Task ID / bật-tắt tự động sync mới cần quyền admin (CEO, Super Admin).' },
    ],
    subsections: [
      {
        id: '13-1-config',
        title: '13.1 Cấu hình (chỉ admin)',
        content: [
          { type: 'steps', items: [
            'Dán Apify Task ID (dạng ~abc123xyz) vào ô tương ứng',
            'Bật/tắt "Bật tự động sync (cron)" — khi bật, hệ thống tự động chạy sync theo lịch cron định kỳ',
            'Bấm "Lưu cấu hình"',
          ]},
          { type: 'tip', text: 'Bấm "Sync ngay" bất kỳ lúc nào để lấy dữ liệu ngay lập tức từ lần chạy thành công gần nhất của task Apify đã cấu hình — video mới sẽ xuất hiện trong danh sách Video Trending (mục 5). Nút này dùng được cho mọi người dùng, không chỉ admin.' },
        ],
      },
      {
        id: '13-2-status',
        title: '13.2 Trạng thái',
        content: [
          { type: 'list', items: [
            '"Lần cuối sync: [ngày giờ]" — hiển thị xanh khi thành công',
            '"Lỗi lần trước: [nội dung lỗi]" — hiển thị đỏ nếu lần sync gần nhất thất bại',
            'Sau khi sync thành công: "✓ Sync thành công (N video)"',
          ]},
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // NHÓM: CÀI ĐẶT
  // ══════════════════════════════════════════════════════════════════════

  // ── 14. Đăng nhập & truy cập lần đầu ─────────────────────────────────────
  {
    id: 'getting-started',
    number: 14,
    title: 'Đăng nhập & truy cập lần đầu',
    icon: 'Rocket',
    description: 'Đăng nhập, quên mật khẩu, và checklist thiết lập ban đầu',
    group: 'setting',
    adminOnly: false,
    content: [
      { type: 'warning', text: 'Không có trang đăng ký công khai. Tài khoản (email @ladospice.com) được quản trị viên cấp trực tiếp — nếu chưa có tài khoản, liên hệ quản trị viên của bạn.' },
    ],
    subsections: [
      {
        id: '14-1-login',
        title: '14.1 Đăng nhập',
        content: [
          { type: 'steps', items: [
            'Mở địa chỉ ứng dụng trên trình duyệt — hệ thống tự chuyển tới trang đăng nhập nếu chưa đăng nhập',
            'Nhập email @ladospice.com và mật khẩu, hoặc bấm "Tiếp tục với Google"',
            'Bấm nút đăng nhập',
          ]},
        ],
      },
      {
        id: '14-2-forgot-password',
        title: '14.2 Quên mật khẩu',
        content: [
          { type: 'steps', items: [
            'Bấm "Quên mật khẩu?" trên trang đăng nhập',
            'Nhập email @ladospice.com',
            'Kiểm tra hộp thư để nhận mật khẩu tạm thời mới',
            'Đăng nhập bằng mật khẩu mới rồi đổi lại trong Cài đặt (mục 15)',
          ]},
        ],
      },
      {
        id: '14-3-checklist',
        title: '14.3 Checklist thiết lập lần đầu',
        content: [
          { type: 'paragraph', text: 'Trước khi tạo quảng cáo, cần hoàn tất các bước sau (checklist này cũng hiển thị ngay đầu trang Hướng dẫn):' },
          { type: 'table', headers: ['Bước', 'Ở đâu', 'Bắt buộc'], rows: [
            ['Chọn hoặc tạo Thương hiệu', 'Dropdown "Thương hiệu" cuối sidebar', 'Có'],
            ['Thiết lập nhận diện thương hiệu', 'Thương hiệu → Nhận diện thương hiệu', 'Có'],
            ['Thêm sản phẩm (kèm ảnh)', 'Thương hiệu → tab Sản phẩm', 'Có'],
            ['Thêm nghiên cứu thương hiệu', 'Thương hiệu → Brand Intelligence', 'Nên có'],
            ['Tạo/generate Personas', 'Thương hiệu → Brand Intelligence', 'Nên có'],
            ['Cấu hình đồng bộ Apify (Task ID)', 'Thương hiệu → cuối trang, phần Apify Sync (chỉ admin cấu hình được)', 'Chỉ cần nếu dùng tính năng Video'],
          ]},
        ],
      },
    ],
  },

  // ── 15. Hồ sơ cá nhân ────────────────────────────────────────────────────
  {
    id: 'settings-profile',
    number: 15,
    title: 'Hồ sơ cá nhân',
    icon: 'Settings',
    description: 'Xem thông tin tài khoản và đổi mật khẩu',
    group: 'setting',
    adminOnly: false,
    content: [
      { type: 'paragraph', text: 'Vị trí: menu Tài khoản (avatar) → Cài đặt, hoặc Điều hướng → Cài đặt → Cài đặt.' },
    ],
    subsections: [
      {
        id: '15-1-profile',
        title: '15.1 Thông tin hồ sơ',
        content: [
          { type: 'paragraph', text: 'Hiển thị: Họ tên, Email, Vai trò (CEO / Super Admin / Thành viên), Phòng ban, ngày tham gia và lần đăng nhập gần nhất.' },
        ],
      },
      {
        id: '15-2-change-password',
        title: '15.2 Đổi mật khẩu',
        content: [
          { type: 'steps', items: [
            'Nhập Mật khẩu hiện tại',
            'Nhập Mật khẩu mới (tối thiểu 8 ký tự)',
            'Xác nhận mật khẩu mới',
            'Bấm "Đổi mật khẩu"',
          ]},
        ],
      },
    ],
  },

  // ── 16. Quản trị ─────────────────────────────────────────────────────────
  {
    id: 'admin-panel',
    number: 16,
    title: 'Quản trị',
    icon: 'Shield',
    description: 'Dashboard phân tích lượt dùng — chỉ dành cho CEO & Super Admin',
    group: 'setting',
    adminOnly: true,
    content: [
      { type: 'paragraph', text: 'Vị trí: Tài khoản → Quản trị (icon khiên). Chỉ CEO và Super Admin nhìn thấy mục này.' },
    ],
    subsections: [
      {
        id: '16-1-dashboard',
        title: '16.1 Dashboard phân tích',
        content: [
          { type: 'list', items: [
            'Chọn khoảng thời gian: Hôm nay / 7 ngày / 30 ngày (mặc định)',
            '4 thẻ số liệu: Lượt xem trang, Khách truy cập, Tài khoản, Quảng cáo đã lưu',
            'Biểu đồ xu hướng lượt xem theo từng ngày trong khoảng đã chọn',
          ]},
        ],
      },
      {
        id: '16-2-account-and-keys',
        title: '16.2 Quản lý tài khoản & API key',
        content: [
          { type: 'warning', text: 'Trang Quản trị hiện chỉ có dashboard phân tích. Việc tạo/xoá tài khoản người dùng và đổi vai trò được thực hiện trực tiếp trong hệ thống quản trị bởi người phụ trách hạ tầng, không có sẵn trên giao diện Admin.' },
          { type: 'warning', text: 'API key của các dịch vụ AI (Gemini, Claude, KIE, Apify, Vbee, ElevenLabs...) được cấu hình qua biến môi trường trên server, dùng chung cho toàn bộ tài khoản — không có giao diện tự quản lý key trong Cài đặt. Liên hệ người phụ trách hạ tầng nếu cần cập nhật key.' },
        ],
      },
    ],
  },

  // ── 17. Phân quyền vai trò ───────────────────────────────────────────────
  {
    id: 'role-permissions',
    number: 17,
    title: 'Phân quyền vai trò',
    icon: 'Lock',
    description: 'Cấp bậc vai trò và quyền hạn tương ứng',
    group: 'setting',
    adminOnly: false,
    content: [],
    subsections: [
      {
        id: '17-1-role-hierarchy',
        title: '17.1 Cấp bậc vai trò',
        content: [
          { type: 'table', headers: ['Vai trò', 'Số tài khoản tối đa', 'Mô tả'], rows: [
            ['CEO', '1', 'Quyền cao nhất. Không thể bị xoá hoặc hạ cấp.'],
            ['Super Admin', '2', 'Quản lý được mọi thứ trừ tài khoản CEO.'],
            ['Thành viên', 'Không giới hạn', 'Nhân viên thông thường. Sửa được Nhận diện thương hiệu/Sản phẩm/Brand Intelligence và concept của riêng mình; không tạo/xoá được Thương hiệu, không sửa concept hệ thống, không cấu hình Đồng bộ Apify, không vào được trang Quản trị.'],
          ]},
        ],
      },
      {
        id: '17-2-permission-matrix',
        title: '17.2 Ma trận quyền hạn',
        content: [
          { type: 'table', headers: ['Hành động', 'CEO', 'Super Admin', 'Thành viên'], rows: [
            ['Tạo quảng cáo (Ảnh)', 'Có', 'Có', 'Có'],
            ['Tạo Stealth Ads', 'Có', 'Có', 'Có'],
            ['Xử lý pipeline Video (bóc băng/kịch bản/giọng đọc)', 'Có', 'Có', 'Có'],
            ['Xem Thư viện, Thư viện Audio', 'Có', 'Có', 'Có'],
            ['Sửa Nhận diện thương hiệu, Sản phẩm, Brand Intelligence', 'Có', 'Có', 'Có'],
            ['Đổi tên Thương hiệu', 'Có', 'Có', 'Có'],
            ['Tạo hoặc xoá Thương hiệu', 'Có', 'Có', 'Không'],
            ['Tạo/sửa/xoá Concept của riêng mình', 'Có', 'Có', 'Có'],
            ['Sửa/xoá Concept hệ thống ("[System]")', 'Có', 'Có', 'Không'],
            ['Bấm "Sync ngay" video từ Apify', 'Có', 'Có', 'Có'],
            ['Cấu hình Task ID / bật tự động sync Apify', 'Có', 'Có', 'Không'],
            ['Đổi mật khẩu của chính mình', 'Có', 'Có', 'Có'],
            ['Xem trang Quản trị', 'Có', 'Có', 'Không'],
          ]},
        ],
      },
    ],
  },

  // ── 18. Xử lý sự cố & mẹo hay ────────────────────────────────────────────
  {
    id: 'troubleshooting',
    number: 18,
    title: 'Xử lý sự cố & mẹo hay',
    icon: 'Wrench',
    description: 'Lỗi thường gặp và mẹo để có kết quả tạo ảnh tốt nhất',
    group: 'setting',
    adminOnly: false,
    content: [],
    subsections: [
      {
        id: '18-1-common-issues',
        title: '18.1 Lỗi thường gặp',
        content: [
          { type: 'table', headers: ['Vấn đề', 'Cách xử lý'], rows: [
            ['"Email hoặc mật khẩu không đúng"', 'Kiểm tra email kết thúc bằng @ladospice.com, mật khẩu từ 8 ký tự trở lên'],
            ['"Tài khoản đã bị vô hiệu hóa"', 'Liên hệ quản trị viên để kích hoạt lại'],
            ['Không tìm thấy tài khoản', 'Liên hệ quản trị viên — tài khoản có thể chưa được tạo'],
            ['Không thêm/xoá được Thương hiệu, không sửa được Concept hệ thống, không cấu hình được Đồng bộ Apify', 'Các thao tác này chỉ dành cho CEO/Super Admin — nhờ admin thực hiện hoặc nâng quyền'],
            ['Không có sản phẩm trong dropdown', 'Vào Thương hiệu → tab Sản phẩm → thêm sản phẩm trước'],
            ['Không có persona nào', 'Vào Thương hiệu → Brand Intelligence → Tạo 10 Profiles hoặc Thêm Profile'],
            ['Tạo quảng cáo bị treo ở bước đọc trang sản phẩm', 'Kiểm tra URL trang sản phẩm còn hợp lệ và truy cập được'],
            ['Ảnh tạo ra không như mong đợi', 'Đảm bảo ảnh sản phẩm chất lượng cao, đủ sáng, chụp đúng sản phẩm thật'],
            ['Không thấy mục Quản trị', 'Chỉ vai trò CEO và Super Admin nhìn thấy mục này'],
            ['Video không phiên âm được', 'Kiểm tra video còn truy cập được trên TikTok; thử "Phiên âm lại"'],
            ['Không tạo được giọng đọc', 'Kiểm tra đã lưu kịch bản (Bước 2) và đã chọn Voice Preset trước khi bấm Tạo giọng đọc'],
            ['Sync Apify thất bại', 'Kiểm tra Apify Task ID còn đúng và task vẫn đang chạy/khả dụng trên Apify'],
            ['Ảnh Stealth không tạo được', 'Kiểm tra đã hoàn tất "Lập kế hoạch cảnh" trước khi bấm "Tạo tất cả"'],
          ]},
        ],
      },
      {
        id: '18-2-tips',
        title: '18.2 Mẹo để có kết quả tốt nhất',
        content: [
          { type: 'steps', items: [
            'Ảnh sản phẩm là yếu tố quan trọng nhất — dùng 3–5 ảnh độ phân giải cao, chụp từ nhiều góc',
            'Điền đúng màu thương hiệu — màu chính xác giúp quảng cáo đồng nhất, chuyên nghiệp',
            'Viết nghiên cứu đầy đủ — càng nhiều dữ liệu đối thủ/thị trường, persona AI tạo càng sắc bén',
            'Kết hợp nhiều Concept — dùng 2–3 concept cùng lúc để có bộ creative đa dạng hơn',
            'Thử cả 2 chế độ — Concept cho quảng cáo thương hiệu, Stealth cho nội dung trông tự nhiên',
            'Dùng Competitor Ref — tải ảnh quảng cáo đối thủ mà bạn thấy hiệu quả, AI sẽ tái hiện layout đó với thương hiệu bạn',
            'Điều chỉnh Độ nhạy — với sản phẩm sức khỏe/cơ thể, luôn dùng độ nhạy "Cao" trong Stealth mode',
            'Rà soát kế hoạch cảnh — trước khi tạo ảnh Stealth, xem và chỉnh lại kế hoạch AI sinh ra để có kết quả sát ý hơn',
            'Tinh chỉnh độ tuổi đối tượng — khớp với nhóm khách hàng mục tiêu để nội dung Stealth chân thực hơn',
            'Tải ZIP cho chiến dịch lớn — dùng "Tải tất cả" khi cần nhiều ảnh cùng lúc',
            'Video pipeline: giữ nguyên nhịp điệu gốc — khi viết kịch bản thương hiệu, AI cố tình giữ số câu/đoạn giống transcript gốc, chỉ thay nội dung — đừng ngạc nhiên nếu độ dài kịch bản khớp với video gốc',
            'Voice Lab: lưu preset tốt để dùng lại — một giọng đọc/tốc độ/cao độ ưng ý nên lưu thành preset ngay để dùng nhanh ở các video sau',
          ]},
        ],
      },
      {
        id: '18-3-quality-rules',
        title: '18.3 Quy tắc chất lượng text & logo (AI tự áp dụng)',
        content: [
          { type: 'heading', level: 4, text: 'Viết hoa chữ', id: 'text-capitalization' },
          { type: 'list', items: [
            'Mọi text hiển thị dùng cách viết hoa nhất quán: Title Case (Viết Hoa Đầu Mỗi Từ) hoặc VIẾT HOA TOÀN BỘ',
            'Không bao giờ trộn lẫn kiểu chữ tuỳ tiện (kiểu "vIếT hOa NgẫU nHiêN")',
            'Áp dụng cho headline, body text, caption và mọi text overlay trên ảnh',
          ]},
          { type: 'heading', level: 4, text: 'Logo thương hiệu', id: 'brand-logo' },
          { type: 'list', items: [
            'AI không bao giờ tự vẽ, bịa hoặc tạo mới logo thương hiệu',
            'Nếu đã tải logo trong Nhận diện thương hiệu, logo sẽ được tái hiện y nguyên — không chỉnh sửa, không thiết kế lại',
            'Nếu chưa có ảnh logo, chỉ logo in sẵn tự nhiên trên bao bì sản phẩm mới được phép xuất hiện',
          ]},
        ],
      },
    ],
  },
]
