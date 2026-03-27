import { apiFetch, buildApiUrl, jsonHeaders } from "./api";

export type VoiceProvider = "auto" | "pollinations" | "elevenlabs" | "browser";

export interface VoiceAssistantConfig {
  provider: VoiceProvider;
  preset: string;
  voiceEnabled: boolean;
  dictationEnabled: boolean;
  autoSpeakSteps: boolean;
  autoSpeakReplies: boolean;
  routeUnknownCommandsToAgent: boolean;
  echoGuardEnabled: boolean;
  echoGuardDelayMs: number;
  replyMaxChars: number;
}

export const DEFAULT_VOICE_ASSISTANT_CONFIG: VoiceAssistantConfig = {
  provider: "pollinations",
  preset: "jarvis_ru",
  voiceEnabled: true,
  dictationEnabled: true,
  autoSpeakSteps: true,
  autoSpeakReplies: true,
  routeUnknownCommandsToAgent: true,
  echoGuardEnabled: true,
  echoGuardDelayMs: 900,
  replyMaxChars: 360,
};

const STORAGE_KEY = "belka-voice-assistant-config";
const listeners = new Set<(config: VoiceAssistantConfig) => void>();

let currentConfig = readLocalConfig();
let loadPromise: Promise<VoiceAssistantConfig> | null = null;

function readLocalConfig(): VoiceAssistantConfig {
  if (typeof window === "undefined") {
    return DEFAULT_VOICE_ASSISTANT_CONFIG;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_VOICE_ASSISTANT_CONFIG;
    }

    const parsed = JSON.parse(raw) as Partial<VoiceAssistantConfig>;
    return normalizeVoiceAssistantConfig(parsed);
  } catch {
    return DEFAULT_VOICE_ASSISTANT_CONFIG;
  }
}

function persistLocalConfig(config: VoiceAssistantConfig) {
  currentConfig = config;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  listeners.forEach((listener) => listener(config));
}

export function normalizeVoiceAssistantConfig(config: Partial<VoiceAssistantConfig> | null | undefined): VoiceAssistantConfig {
  const provider = typeof config?.provider === "string"
    ? config.provider.toLowerCase() as VoiceProvider
    : DEFAULT_VOICE_ASSISTANT_CONFIG.provider;
  const allowedProviders = new Set<VoiceProvider>(["auto", "pollinations", "elevenlabs", "browser"]);

  return {
    ...DEFAULT_VOICE_ASSISTANT_CONFIG,
    ...config,
    provider: allowedProviders.has(provider) ? provider : DEFAULT_VOICE_ASSISTANT_CONFIG.provider,
    preset: typeof config?.preset === "string" && config.preset.trim()
      ? config.preset.trim()
      : DEFAULT_VOICE_ASSISTANT_CONFIG.preset,
    echoGuardDelayMs: typeof config?.echoGuardDelayMs === "number"
      ? Math.min(3000, Math.max(300, Math.round(config.echoGuardDelayMs)))
      : DEFAULT_VOICE_ASSISTANT_CONFIG.echoGuardDelayMs,
    replyMaxChars: typeof config?.replyMaxChars === "number"
      ? Math.min(1400, Math.max(120, Math.round(config.replyMaxChars)))
      : DEFAULT_VOICE_ASSISTANT_CONFIG.replyMaxChars,
  };
}

export function getVoiceAssistantConfig(): VoiceAssistantConfig {
  return currentConfig;
}

export function setVoiceAssistantConfig(config: VoiceAssistantConfig) {
  persistLocalConfig(normalizeVoiceAssistantConfig(config));
}

export async function loadVoiceAssistantConfig(force = false): Promise<VoiceAssistantConfig> {
  if (typeof window === "undefined") {
    return currentConfig;
  }

  if (!force && loadPromise) {
    return loadPromise;
  }

  loadPromise = apiFetch(buildApiUrl("/voice/settings"))
    .then(async (response) => {
      if (!response.ok) {
        return currentConfig;
      }

      const data = await response.json().catch(() => ({}));
      const normalized = normalizeVoiceAssistantConfig(data.settings);
      persistLocalConfig(normalized);
      return normalized;
    })
    .catch(() => currentConfig)
    .finally(() => {
      loadPromise = null;
    });

  return loadPromise;
}

export async function saveVoiceAssistantConfig(config: VoiceAssistantConfig): Promise<VoiceAssistantConfig> {
  const normalized = normalizeVoiceAssistantConfig(config);

  const response = await apiFetch(buildApiUrl("/voice/settings"), {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify(normalized),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Failed to save voice settings");
  }

  const saved = normalizeVoiceAssistantConfig(data.settings ?? normalized);
  persistLocalConfig(saved);
  return saved;
}

export function subscribeVoiceAssistantConfig(listener: (config: VoiceAssistantConfig) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
