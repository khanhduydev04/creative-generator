export type TtsProvider = "vbee" | "elevenlabs";
export type ElevenLabsModel = "eleven_v3" | "eleven_flash_v2_5";

export const TONE_MAP: Record<string, string> = {
  humor: "Hài hước, gần gũi, vui vẻ",
  authentic: "Chân thực, tự nhiên, tin cậy",
  dramatic: "Kịch tính, mạnh mẽ, ấn tượng",
};

export interface ScriptPromptInput {
  brandName: string;
  brandDescription: string | null;
  productName?: string | null;
  productDescription?: string | null;
  price?: string | null;
  attributes?: string | null;
  targetAudience?: string | null;
  sellingPoints?: string | null;
  tone: string;
  notes?: string | null;
  ttsProvider: TtsProvider;
  elevenLabsModel?: ElevenLabsModel | null;
}

function providerFormattingInstructions(
  ttsProvider: TtsProvider,
  elevenLabsModel?: ElevenLabsModel | null,
): string {
  if (ttsProvider === "elevenlabs" && elevenLabsModel === "eleven_v3") {
    return [
      "KỸ THUẬT NHẤN NHÁ (ElevenLabs v3 — dùng expression tags):",
      "- Đặt tag TRƯỚC câu/cụm cần cảm xúc: [amused], [chuckles], [surprised], [excited], [enthusiastic], [mischievously], [sighs], [laughs]",
      "- Dùng ... để nghỉ kịch tính, — để ngắt nhịp đột ngột",
      "- Câu ngắn ngay sau tag tạo impact mạnh hơn",
    ].join("\n");
  }
  if (ttsProvider === "elevenlabs") {
    // eleven_flash_v2_5 — expression tags NOT supported
    return [
      "KỸ THUẬT NHẤN NHÁ (ElevenLabs v2.5 — KHÔNG dùng expression tags):",
      "- Thay bằng: CHỮ HOA để nhấn từ quan trọng, ... để nghỉ kịch tính",
      "- Câu ngắn tạo urgency, lặp từ để nhấn mạnh: \"ngon, ngon thật luôn\"",
      "- Dấu ! cho hứng khởi, ? cho tò mò/câu hỏi tu từ",
    ].join("\n");
  }
  // vbee
  return [
    "KỸ THUẬT NHẤN NHÁ (Vbee TTS):",
    "- Dùng dấu phẩy (,) để nghỉ ngắn, chấm (.) để nghỉ dài, ba chấm (...) để nghỉ kịch tính",
    "- Dùng CHỮ HOA để nhấn từ quan trọng",
    "- Câu ngắn tạo urgency, lặp từ để nhấn mạnh: \"ngon, ngon thật luôn\"",
  ].join("\n");
}

export function buildScriptSystemPrompt(input: ScriptPromptInput): string {
  const toneLabel = TONE_MAP[input.tone] ?? input.tone;

  const productLines: string[] = [];
  if (input.productName) {
    productLines.push(
      `Sản phẩm: ${input.productName}${input.productDescription ? ` — ${input.productDescription}` : ""}`,
    );
    if (input.price?.trim()) productLines.push(`Giá/Sale: ${input.price.trim()}`);
    if (input.attributes?.trim()) productLines.push(`Đặc điểm: ${input.attributes.trim()}`);
    if (input.targetAudience?.trim()) productLines.push(`Đối tượng: ${input.targetAudience.trim()}`);
    if (input.sellingPoints?.trim()) productLines.push(`Điểm bán/USP: ${input.sellingPoints.trim()}`);
  }

  const brandSection = [
    `Brand: ${input.brandName}`,
    input.brandDescription?.trim() ? `Mô tả brand: ${input.brandDescription.trim()}` : "",
    ...productLines,
    `Tone: ${toneLabel}`,
    input.notes?.trim() ? `Notes: ${input.notes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const sections = [
    "Bạn là copywriter chuyên viết script video TikTok bán hàng bằng tiếng Việt.",

    'NHIỆM VỤ: Phân tích cấu trúc transcript gốc, sau đó viết lại thành kịch bản mới — giữ NGUYÊN cấu trúc/nhịp điệu, "thay máu" hoàn toàn nội dung.',

    "=== BƯỚC 1: PHÂN TÍCH (làm trong đầu, KHÔNG viết ra) ===\nXác định: loại Hook (câu hỏi/tuyên bố/hành động/cảm thán?), số đoạn + vị trí cao trào, cách xưng hô + tone, vị trí CTA.",

    `=== BƯỚC 2: VIẾT KỊCH BẢN MỚI ===\n${brandSection}`,

    [
      "YÊU CẦU BẮT BUỘC:",
      "- Giữ NGUYÊN số câu, số đoạn, nhịp điệu của transcript gốc — không dài hơn, không ngắn hơn",
      "- Cảm giác người thật chia sẻ trải nghiệm, KHÔNG đọc như quảng cáo",
      '- Không ép từ ngữ "sale gắt" (mua ngay, giá sốc) trừ khi transcript gốc có CTA dạng đó',
      '- Nếu transcript dùng từ lóng tiền ("cành" = nghìn đồng), áp dụng tương tự cho giá sản phẩm',
      "- Đánh dấu [HOOK] / [THÂN BÀI] / [CTA] trên dòng riêng để phân đoạn",
      "- KHÔNG xuống dòng trắng giữa các câu trong cùng đoạn — viết liên tục",
    ].join("\n"),

    providerFormattingInstructions(input.ttsProvider, input.elevenLabsModel),

    "OUTPUT: Chỉ trả về script cuối cùng với markers. Không giải thích, không phân tích.",
  ];

  return sections.join("\n\n");
}
