import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, usersTable, voiceAssistantSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ELEVENLABS_API_KEY,
  POLLINATIONS_API_BASE_URL,
  POLLINATIONS_API_KEY,
  VOICE_DEFAULT_PRESET,
  VOICE_PROVIDER_DEFAULT,
  type VoiceProvider,
} from "../config";
import { createBelkaRateLimiter } from "../lib/rate-limit";

const router: IRouter = Router();
const VOICE_SETTINGS_SCOPE = "global";
const voiceSynthesisLimiter = createBelkaRateLimiter({
  prefix: "voice-synthesize",
  windowMs: 60_000,
  max: 18,
  message: { error: "Too many voice synthesis requests" },
});

type ConcreteVoiceProvider = Exclude<VoiceProvider, "auto" | "browser">;
type VoicePresetId = "jarvis_ru" | "operator_ru" | "warm_ru" | "calm_ru";

interface VoicePreset {
  id: VoicePresetId;
  name: string;
  description: string;
  provider: ConcreteVoiceProvider;
  model: string;
  voice: string;
  speed: number;
}

interface VoiceSynthesizeBody {
  text?: string;
  input?: string;
  provider?: VoiceProvider;
  preset?: string;
  voiceId?: string;
  model?: string;
  speed?: number;
  responseFormat?: string;
  format?: string;
}

interface VoiceResult {
  audioUrl: string;
  contentType: string;
  providerUsed: ConcreteVoiceProvider;
  voiceUsed: string;
  modelUsed: string;
  presetUsed: string;
  duration: number;
}

interface ProviderStatus {
  id: ConcreteVoiceProvider;
  name: string;
  configured: boolean;
  reachable: boolean;
  default: boolean;
}

interface VoiceAssistantConfigPayload {
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

const ELEVENLABS_FALLBACK_VOICE = "EXAVITQu4vr4xnSDxMaL";

const VOICE_PRESETS: Record<VoicePresetId, VoicePreset> = {
  jarvis_ru: {
    id: "jarvis_ru",
    name: "Jarvis RU",
    description: "Dense cinematic voice for commands, status updates, and short high-confidence replies.",
    provider: "pollinations",
    model: "elevenlabs",
    voice: "onyx",
    speed: 0.94,
  },
  operator_ru: {
    id: "operator_ru",
    name: "Operator RU",
    description: "Sharper interface voice for navigation, confirmations, and quick task routing.",
    provider: "pollinations",
    model: "elevenlabs",
    voice: "nova",
    speed: 1,
  },
  warm_ru: {
    id: "warm_ru",
    name: "Warm RU",
    description: "Softer delivery for explanations, onboarding, and longer spoken answers.",
    provider: "pollinations",
    model: "elevenlabs",
    voice: "rachel",
    speed: 0.98,
  },
  calm_ru: {
    id: "calm_ru",
    name: "Calm RU",
    description: "Balanced long-session voice for reviews, debugging, and focused work.",
    provider: "pollinations",
    model: "elevenlabs",
    voice: "sage",
    speed: 0.96,
  },
};

function sanitizeText(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function clampSpeed(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(1.2, Math.max(0.75, value));
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function buildAudioUrl(buffer: Buffer, contentType: string): string {
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

function getAudioContentType(headerValue: string | null | undefined): string {
  if (!headerValue) return "audio/mpeg";
  const clean = headerValue.split(";")[0]?.trim();
  return clean || "audio/mpeg";
}

function getDefaultPreset(): VoicePreset {
  return VOICE_PRESETS[VOICE_DEFAULT_PRESET as VoicePresetId] ?? VOICE_PRESETS.jarvis_ru;
}

function resolvePreset(presetId: string | undefined): VoicePreset {
  if (!presetId) return getDefaultPreset();
  return VOICE_PRESETS[presetId as VoicePresetId] ?? getDefaultPreset();
}

function getDefaultSettings(): VoiceAssistantConfigPayload {
  return {
    provider: VOICE_PROVIDER_DEFAULT,
    preset: getDefaultPreset().id,
    voiceEnabled: true,
    dictationEnabled: true,
    autoSpeakSteps: true,
    autoSpeakReplies: true,
    routeUnknownCommandsToAgent: true,
    echoGuardEnabled: true,
    echoGuardDelayMs: 900,
    replyMaxChars: 360,
  };
}

function normalizeSettingsPayload(input: Partial<VoiceAssistantConfigPayload> | null | undefined): VoiceAssistantConfigPayload {
  const defaults = getDefaultSettings();
  const provider = typeof input?.provider === "string"
    ? input.provider.trim().toLowerCase() as VoiceProvider
    : defaults.provider;
  const normalizedPreset = typeof input?.preset === "string" && input.preset.trim()
    ? input.preset.trim()
    : defaults.preset;
  const preset = resolvePreset(normalizedPreset).id;
  const allowedProviders = new Set<VoiceProvider>(["auto", "pollinations", "elevenlabs", "browser"]);

  return {
    provider: allowedProviders.has(provider) ? provider : defaults.provider,
    preset,
    voiceEnabled: input?.voiceEnabled ?? defaults.voiceEnabled,
    dictationEnabled: input?.dictationEnabled ?? defaults.dictationEnabled,
    autoSpeakSteps: input?.autoSpeakSteps ?? defaults.autoSpeakSteps,
    autoSpeakReplies: input?.autoSpeakReplies ?? defaults.autoSpeakReplies,
    routeUnknownCommandsToAgent: input?.routeUnknownCommandsToAgent ?? defaults.routeUnknownCommandsToAgent,
    echoGuardEnabled: input?.echoGuardEnabled ?? defaults.echoGuardEnabled,
    echoGuardDelayMs: clampInteger(input?.echoGuardDelayMs, 300, 3000, defaults.echoGuardDelayMs),
    replyMaxChars: clampInteger(input?.replyMaxChars, 120, 1400, defaults.replyMaxChars),
  };
}

async function ensureVoiceSettingsRecord() {
  const existing = await db.select()
    .from(voiceAssistantSettingsTable)
    .where(eq(voiceAssistantSettingsTable.scope, VOICE_SETTINGS_SCOPE))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const defaults = getDefaultSettings();
  const inserted = await db.insert(voiceAssistantSettingsTable)
    .values({
      scope: VOICE_SETTINGS_SCOPE,
      ...defaults,
    })
    .returning();

  return inserted[0];
}

async function getStoredVoiceSettings(): Promise<VoiceAssistantConfigPayload> {
  const row = await ensureVoiceSettingsRecord();

  return normalizeSettingsPayload({
    provider: row.provider as VoiceProvider,
    preset: row.preset,
    voiceEnabled: row.voiceEnabled,
    dictationEnabled: row.dictationEnabled,
    autoSpeakSteps: row.autoSpeakSteps,
    autoSpeakReplies: row.autoSpeakReplies,
    routeUnknownCommandsToAgent: row.routeUnknownCommandsToAgent,
    echoGuardEnabled: row.echoGuardEnabled,
    echoGuardDelayMs: row.echoGuardDelayMs,
    replyMaxChars: row.replyMaxChars,
  });
}

async function saveStoredVoiceSettings(req: Request, payload: Partial<VoiceAssistantConfigPayload>) {
  const normalized = normalizeSettingsPayload(payload);

  const updated = await db.insert(voiceAssistantSettingsTable)
    .values({
      scope: VOICE_SETTINGS_SCOPE,
      ...normalized,
      updatedByUserId: req.userId ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: voiceAssistantSettingsTable.scope,
      set: {
        ...normalized,
        updatedByUserId: req.userId ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  const row = updated[0];

  return normalizeSettingsPayload({
    provider: row.provider as VoiceProvider,
    preset: row.preset,
    voiceEnabled: row.voiceEnabled,
    dictationEnabled: row.dictationEnabled,
    autoSpeakSteps: row.autoSpeakSteps,
    autoSpeakReplies: row.autoSpeakReplies,
    routeUnknownCommandsToAgent: row.routeUnknownCommandsToAgent,
    echoGuardEnabled: row.echoGuardEnabled,
    echoGuardDelayMs: row.echoGuardDelayMs,
    replyMaxChars: row.replyMaxChars,
  });
}

function getConfiguredProviders(): ConcreteVoiceProvider[] {
  const providers: ConcreteVoiceProvider[] = [];
  if (POLLINATIONS_API_KEY) providers.push("pollinations");
  if (ELEVENLABS_API_KEY) providers.push("elevenlabs");
  return providers;
}

function resolveProviderOrder(requestedProvider: VoiceProvider | undefined, preset: VoicePreset): ConcreteVoiceProvider[] {
  if (requestedProvider === "pollinations") return ["pollinations"];
  if (requestedProvider === "elevenlabs") return ["elevenlabs"];

  const configured = new Set(getConfiguredProviders());
  const preferred = requestedProvider === "auto"
    ? (configured.has(VOICE_PROVIDER_DEFAULT as ConcreteVoiceProvider)
      ? (VOICE_PROVIDER_DEFAULT as ConcreteVoiceProvider)
      : preset.provider)
    : preset.provider;

  const ordered: ConcreteVoiceProvider[] = [];
  if (configured.has(preferred)) ordered.push(preferred);
  if (configured.has("pollinations") && !ordered.includes("pollinations")) ordered.push("pollinations");
  if (configured.has("elevenlabs") && !ordered.includes("elevenlabs")) ordered.push("elevenlabs");
  return ordered;
}

async function safeJson(response: globalThis.Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function safeText(response: globalThis.Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

async function synthesizeWithPollinations(text: string, preset: VoicePreset, body: VoiceSynthesizeBody): Promise<VoiceResult> {
  if (!POLLINATIONS_API_KEY) {
    throw new Error("Pollinations API key is not configured");
  }

  const model = body.model?.trim() || preset.model;
  const voice = body.voiceId?.trim() || preset.voice;
  const responseFormat = body.responseFormat || body.format || "mp3";

  const response = await fetch(`${POLLINATIONS_API_BASE_URL}/v1/audio/speech`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${POLLINATIONS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: text,
      voice,
      response_format: responseFormat,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const errorText = await safeText(response);
    throw new Error(`Pollinations TTS failed (${response.status}): ${errorText || "unknown error"}`);
  }

  const contentType = getAudioContentType(response.headers.get("content-type"));
  const buffer = Buffer.from(await response.arrayBuffer());

  return {
    audioUrl: buildAudioUrl(buffer, contentType),
    contentType,
    providerUsed: "pollinations",
    voiceUsed: String(response.headers.get("x-tts-voice") || voice),
    modelUsed: String(response.headers.get("x-model-used") || model),
    presetUsed: preset.id,
    duration: 0,
  };
}

async function synthesizeWithElevenLabs(text: string, preset: VoicePreset, body: VoiceSynthesizeBody): Promise<VoiceResult> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API key is not configured");
  }

  const voice = body.voiceId?.trim() || ELEVENLABS_FALLBACK_VOICE;
  const speed = clampSpeed(body.speed, preset.speed);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: "POST",
    headers: {
      "Accept": "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.58,
        similarity_boost: 0.82,
        style: 0.32,
        use_speaker_boost: true,
        speed,
      },
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const errorText = await safeText(response);
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${errorText || "unknown error"}`);
  }

  const contentType = getAudioContentType(response.headers.get("content-type"));
  const buffer = Buffer.from(await response.arrayBuffer());

  return {
    audioUrl: buildAudioUrl(buffer, contentType),
    contentType,
    providerUsed: "elevenlabs",
    voiceUsed: voice,
    modelUsed: "eleven_multilingual_v2",
    presetUsed: preset.id,
    duration: 0,
  };
}

async function synthesizeVoice(text: string, body: VoiceSynthesizeBody): Promise<VoiceResult> {
  const preset = resolvePreset(body.preset);
  const providers = resolveProviderOrder(body.provider, preset);

  if (providers.length === 0) {
    throw new Error("No remote voice provider is configured");
  }

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      if (provider === "pollinations") {
        return await synthesizeWithPollinations(text, preset, body);
      }
      return await synthesizeWithElevenLabs(text, preset, body);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(errors.join(" | "));
}

async function probeProvider(url: string, headers: Record<string, string>): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function buildProviderStatuses(pollinationsReachable: boolean, elevenlabsReachable: boolean): ProviderStatus[] {
  return [
    {
      id: "pollinations",
      name: "Pollinations",
      configured: Boolean(POLLINATIONS_API_KEY),
      reachable: pollinationsReachable,
      default: VOICE_PROVIDER_DEFAULT === "pollinations",
    },
    {
      id: "elevenlabs",
      name: "ElevenLabs",
      configured: Boolean(ELEVENLABS_API_KEY),
      reachable: elevenlabsReachable,
      default: VOICE_PROVIDER_DEFAULT === "elevenlabs",
    },
  ];
}

async function isAdminUser(userId: number | undefined): Promise<boolean> {
  if (!userId) return false;
  const users = await db.select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  return users[0]?.role === "admin";
}

router.get("/health", async (_req, res) => {
  const [pollinationsReachable, elevenlabsReachable] = await Promise.all([
    POLLINATIONS_API_KEY
      ? probeProvider(`${POLLINATIONS_API_BASE_URL}/v1/models`, {
          Authorization: `Bearer ${POLLINATIONS_API_KEY}`,
        })
      : Promise.resolve(false),
    ELEVENLABS_API_KEY
      ? probeProvider("https://api.elevenlabs.io/v1/voices", {
          "xi-api-key": ELEVENLABS_API_KEY,
        })
      : Promise.resolve(false),
  ]);

  res.json({
    ok: true,
    defaultProvider: VOICE_PROVIDER_DEFAULT,
    defaultPreset: getDefaultPreset().id,
    providers: buildProviderStatuses(pollinationsReachable, elevenlabsReachable),
  });
});

router.get("/providers", async (_req, res) => {
  res.json({
    defaultProvider: VOICE_PROVIDER_DEFAULT,
    defaultPreset: getDefaultPreset().id,
    providers: [
      { id: "pollinations", name: "Pollinations", configured: Boolean(POLLINATIONS_API_KEY) },
      { id: "elevenlabs", name: "ElevenLabs", configured: Boolean(ELEVENLABS_API_KEY) },
    ],
    presets: Object.values(VOICE_PRESETS),
  });
});

router.get("/settings", async (_req, res) => {
  const settings = await getStoredVoiceSettings();
  res.json({
    settings,
    defaultProvider: VOICE_PROVIDER_DEFAULT,
    defaultPreset: getDefaultPreset().id,
  });
});

router.put("/settings", async (req, res) => {
  if (!await isAdminUser(req.userId)) {
    res.status(403).json({ error: "Forbidden: admin access required" });
    return;
  }

  try {
    const settings = await saveStoredVoiceSettings(req, req.body ?? {});
    res.json({
      settings,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    req.log.error({ err: error }, "Voice settings save error");
    res.status(500).json({ error: "Failed to save voice settings" });
  }
});

router.get("/voices", async (req, res) => {
  let elevenlabsVoices: Array<{ voice_id: string; name: string }> = [];

  if (ELEVENLABS_API_KEY) {
    try {
      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) {
        const data = await safeJson(response) as { voices?: Array<{ voice_id: string; name: string }> } | null;
        elevenlabsVoices = data?.voices?.map((voice) => ({
          voice_id: voice.voice_id,
          name: voice.name,
        })) ?? [];
      }
    } catch (error) {
      req.log.warn({ err: error }, "Failed to fetch ElevenLabs voices");
    }
  }

  res.json({
    defaultPreset: getDefaultPreset().id,
    presets: Object.values(VOICE_PRESETS),
    remoteVoices: {
      elevenlabs: elevenlabsVoices,
      pollinations: [
        { voice_id: "onyx", name: "Onyx" },
        { voice_id: "nova", name: "Nova" },
        { voice_id: "rachel", name: "Rachel" },
        { voice_id: "sage", name: "Sage" },
      ],
    },
  });
});

router.post("/synthesize", voiceSynthesisLimiter, async (req, res) => {
  const body = (req.body ?? {}) as VoiceSynthesizeBody;
  const text = sanitizeText(body.text ?? body.input);

  if (!text) {
    res.status(400).json({ error: "Text is required", audioUrl: "" });
    return;
  }

  if (text.length > 1_500) {
    res.status(400).json({ error: "Text must be under 1500 characters", audioUrl: "" });
    return;
  }

  try {
    const result = await synthesizeVoice(text, body);
    res.json(result);
  } catch (error) {
    req.log.error({ err: error }, "Voice synthesis error");
    res.status(500).json({
      error: error instanceof Error ? error.message : "Voice synthesis failed",
      audioUrl: "",
    });
  }
});

export default router;
