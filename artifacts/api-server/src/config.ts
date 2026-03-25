const DEFAULT_BELKA_CODER_API_BASE_URL = "https://belka-coder-api-production.up.railway.app";
const DEFAULT_OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_DEV_JWT_SECRET = "belka-ai-dev-secret-change-me";
const DEFAULT_POLLINATIONS_API_BASE_URL = "https://gen.pollinations.ai";

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export type BelkaMode = "chat" | "code" | "multiagent";
export type VoiceProvider = "auto" | "pollinations" | "elevenlabs" | "browser";

export const NODE_ENV = readEnv("NODE_ENV") ?? "development";
export const IS_PRODUCTION = NODE_ENV === "production";
const ENV_JWT_SECRET = readEnv("JWT_SECRET");

if (IS_PRODUCTION && !ENV_JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production");
}

export const JWT_SECRET = ENV_JWT_SECRET ?? DEFAULT_DEV_JWT_SECRET;
export const BELKA_CODER_API_BASE_URL = trimTrailingSlash(
  readEnv("BELKA_CODER_API_BASE_URL") ?? DEFAULT_BELKA_CODER_API_BASE_URL,
);
export const BELKA_DEFAULT_IMAGE_MODEL = readEnv("BELKA_DEFAULT_IMAGE_MODEL") ?? "zimage";
export const OPENROUTER_API_URL = readEnv("OPENROUTER_API_URL") ?? DEFAULT_OPENROUTER_API_URL;
export const POLLINATIONS_API_KEY = readEnv("POLLINATIONS_API_KEY") ?? "";
export const POLLINATIONS_API_BASE_URL = trimTrailingSlash(
  readEnv("POLLINATIONS_API_BASE_URL") ?? DEFAULT_POLLINATIONS_API_BASE_URL,
);
export const ELEVENLABS_API_KEY = readEnv("ELEVENLABS_API_KEY") ?? "";
export const VOICE_PROVIDER_DEFAULT = (readEnv("VOICE_PROVIDER_DEFAULT") ?? "pollinations") as VoiceProvider;
export const VOICE_DEFAULT_PRESET = readEnv("VOICE_DEFAULT_PRESET") ?? "jarvis_ru";
export const MCP_DEFAULT_CWD = readEnv("MCP_DEFAULT_CWD");

export function normalizeBelkaMode(mode: string | undefined): BelkaMode {
  switch ((mode ?? "").toLowerCase()) {
    case "code":
    case "coder":
      return "code";
    case "multi-agent":
    case "multiagent":
    case "orchestrator":
      return "multiagent";
    default:
      return "chat";
  }
}
