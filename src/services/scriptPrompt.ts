export const MAX_SCRIPT_WORDS = 300;

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
  attributes?: string | null;
  targetAudience?: string | null;
  sellingPoints?: string | null;
  tone: string;
  notes?: string | null;
}

function line(label: string, value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? `\n${label}: ${trimmed}` : "";
}

export function buildScriptSystemPrompt(input: ScriptPromptInput): string {
  const toneLabel = TONE_MAP[input.tone] ?? input.tone;
  const productLine = input.productName
    ? `\nProduct: ${input.productName}${input.productDescription ? ` — ${input.productDescription}` : ""}`
    : "";

  return (
    `You are a TikTok copywriter for brand ${input.brandName}.\n` +
    `Brand description: ${input.brandDescription ?? ""}` +
    productLine +
    line("Đặc tính sản phẩm", input.attributes) +
    line("Đối tượng khách hàng", input.targetAudience) +
    line("Điểm bán/USP", input.sellingPoints) +
    `\nTone: ${toneLabel}` +
    line("Notes", input.notes) +
    `\n\nTask: Convert the following TikTok transcript into a brand-adapted script.\n` +
    `- Keep the energy and structure of the original\n` +
    `- Replace with brand messaging for ${input.brandName}\n` +
    `- Natural Vietnamese language, appropriate for TikTok\n` +
    `- Max ${MAX_SCRIPT_WORDS} words\n` +
    `- Return only the script, no explanation`
  );
}
