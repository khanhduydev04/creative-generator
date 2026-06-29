/**
 * Runtime environment variable validation.
 * Call validateEnv() at app startup to fail fast on missing required vars.
 */

interface EnvVar {
  name: string;
  required: boolean;
  isPublic: boolean;
  description: string;
}

const ENV_SCHEMA: EnvVar[] = [
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    required: true,
    isPublic: true,
    description: "Supabase project URL",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: true,
    isPublic: true,
    description: "Supabase anonymous key",
  },
  {
    name: "ANTHROPIC_API_KEY",
    required: true,
    isPublic: false,
    description: "Anthropic API key (Claude)",
  },
  {
    name: "GOOGLE_API_KEY",
    required: true,
    isPublic: false,
    description: "Google AI Studio API key (Gemini)",
  },
  {
    name: "KIE_API_KEY",
    required: true,
    isPublic: false,
    description: "KIE AI image generation API key",
  },
  {
    name: "VBEE_API_KEY",
    required: false,
    isPublic: false,
    description: "Vbee TTS API key (video voice generation)",
  },
  {
    name: "APIFY_TOKEN",
    required: false,
    isPublic: false,
    description: "Apify API token (pull-sync competitor videos via cron)",
  },
  {
    name: "CRON_SECRET",
    required: false,
    isPublic: false,
    description: "Shared secret Vercel Cron gửi qua Authorization header để bảo vệ /api/cron/*",
  },
  {
    name: "GOOGLE_CONSOLE_API_KEY",
    required: false,
    isPublic: false,
    description: "Google Cloud Console API key (Sheets, Fonts)",
  },
  {
    name: "SPREADSHEET_ID",
    required: false,
    isPublic: false,
    description: "Legacy competitor spreadsheet ID",
  },
];

export function validateEnv(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const v of ENV_SCHEMA) {
    const value = process.env[v.name];

    if (!value) {
      if (v.required) {
        missing.push(`  - ${v.name}: ${v.description}`);
      } else {
        warnings.push(`  - ${v.name}: ${v.description} (optional, some features disabled)`);
      }
    }
  }

  if (warnings.length > 0) {
    console.warn(`[env] Missing optional environment variables:\n${warnings.join("\n")}`);
  }

  if (missing.length > 0) {
    const message = `Missing required environment variables:\n${missing.join("\n")}\n\nCopy .env.local.template to .env.local and fill in the values.`;
    console.error(`[env] ${message}`);
    throw new Error(message);
  }
}
