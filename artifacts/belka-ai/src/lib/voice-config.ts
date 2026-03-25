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

export function getVoiceAssistantConfig(): VoiceAssistantConfig {
  if (typeof window === "undefined") {
    return DEFAULT_VOICE_ASSISTANT_CONFIG;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VOICE_ASSISTANT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<VoiceAssistantConfig>;
    return {
      ...DEFAULT_VOICE_ASSISTANT_CONFIG,
      ...parsed,
      echoGuardDelayMs: typeof parsed.echoGuardDelayMs === "number"
        ? parsed.echoGuardDelayMs
        : DEFAULT_VOICE_ASSISTANT_CONFIG.echoGuardDelayMs,
      replyMaxChars: typeof parsed.replyMaxChars === "number"
        ? parsed.replyMaxChars
        : DEFAULT_VOICE_ASSISTANT_CONFIG.replyMaxChars,
    };
  } catch {
    return DEFAULT_VOICE_ASSISTANT_CONFIG;
  }
}

export function saveVoiceAssistantConfig(config: VoiceAssistantConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
