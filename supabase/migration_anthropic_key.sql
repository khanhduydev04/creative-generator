-- Seed Anthropic (Claude) API key into app_settings for runtime key management.
-- The actual key value is set via Admin → API Keys UI.

INSERT INTO app_settings (key, label, value)
VALUES ('anthropic_api_key', 'Anthropic (Claude)', '')
ON CONFLICT (key) DO NOTHING;
