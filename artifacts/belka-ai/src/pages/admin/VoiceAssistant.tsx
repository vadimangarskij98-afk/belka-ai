import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "./Layout";
import { BrainCircuit, CheckCircle2, Loader2, Mic, Save, ShieldCheck, Volume2, Waves } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, buildApiUrl, jsonHeaders } from "@/lib/api";
import {
  getVoiceAssistantConfig,
  loadVoiceAssistantConfig,
  saveVoiceAssistantConfig,
  type VoiceAssistantConfig,
} from "@/lib/voice-config";
import { VOICE_TEST_SAMPLE_TEXT } from "@/lib/voice-copy";

interface VoiceProviderInfo {
  id: string;
  name: string;
  configured: boolean;
  reachable?: boolean;
  default?: boolean;
}

interface VoicePresetInfo {
  id: string;
  name: string;
  description: string;
}

interface VoiceHealthResponse {
  ok: boolean;
  defaultProvider: string;
  defaultPreset: string;
  providers: VoiceProviderInfo[];
}

interface VoiceProvidersResponse {
  defaultProvider: string;
  defaultPreset: string;
  providers: VoiceProviderInfo[];
  presets: VoicePresetInfo[];
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative h-7 w-12 rounded-full border transition-all ${
        checked ? "border-primary/40 bg-primary/20" : "border-border bg-muted/70"
      }`}
    >
      <span
        className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-background shadow-md transition-all ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

function SliderRow({
  label,
  hint,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (nextValue: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-foreground">{label}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
        <div className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {value}{suffix ?? ""}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[hsl(var(--primary))]"
      />
    </div>
  );
}

export default function AdminVoiceAssistant() {
  const { toast } = useToast();
  const [config, setConfig] = useState<VoiceAssistantConfig>(() => getVoiceAssistantConfig());
  const [health, setHealth] = useState<VoiceHealthResponse | null>(null);
  const [providersData, setProvidersData] = useState<VoiceProvidersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);
  const [testingAgent, setTestingAgent] = useState(false);
  const [testResult, setTestResult] = useState("");

  const apiBase = useMemo(() => buildApiUrl(), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const [healthRes, providersRes, settings] = await Promise.all([
          apiFetch(`${apiBase}/voice/health`),
          apiFetch(`${apiBase}/voice/providers`),
          loadVoiceAssistantConfig(true),
        ]);

        if (cancelled) {
          return;
        }

        const nextHealth = await healthRes.json();
        const nextProviders = await providersRes.json();
        setHealth(nextHealth);
        setProvidersData(nextProviders);
        setConfig(settings);
      } catch (error) {
        if (!cancelled) {
          setTestResult(error instanceof Error ? error.message : "Failed to load voice settings");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveVoiceAssistantConfig(config);
      setConfig(saved);
      toast({
        title: "Voice profile saved",
        description: "The new voice defaults are now active across the product.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Could not save voice settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestVoice = async () => {
    setTestingVoice(true);
    setTestResult("");

    try {
      const response = await apiFetch(`${apiBase}/voice/synthesize`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          text: VOICE_TEST_SAMPLE_TEXT,
          provider: config.provider,
          preset: config.preset,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.audioUrl) {
        throw new Error(data.error || "No audio returned from the provider");
      }

      const audio = new Audio(data.audioUrl);
      await audio.play();
      setTestResult(`Voice path OK via ${data.providerUsed} / ${data.presetUsed}.`);
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : "Could not run voice test");
    } finally {
      setTestingVoice(false);
    }
  };

  const handleTestAgent = async () => {
    setTestingAgent(true);
    setTestResult("");

    try {
      const response = await apiFetch(`${apiBase}/belka/chat`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          message: "Introduce yourself in one short line and say how you help inside the project.",
          mode: "chat",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "BELKA did not return a response");
      }

      setTestResult(data.reply || "BELKA replied without visible text.");
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : "Could not test BELKA response");
    } finally {
      setTestingAgent(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8 max-w-3xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Global voice profile
        </div>
        <h1 className="mb-2 text-3xl font-display font-bold text-foreground">Voice Assistant Control</h1>
        <p className="text-muted-foreground">
          Manage the shared BELKA voice profile, dictation behavior, echo guard, and the default spoken experience
          used across chat, agent updates, and project navigation.
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="glass-panel rounded-[28px] border border-border p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Waves size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Providers and health</h2>
                <p className="text-xs text-muted-foreground">
                  Backend status for remote TTS providers. No browser secrets are trusted here.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                Loading provider status...
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {(health?.providers || []).map((provider) => (
                  <div key={provider.id} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="font-medium text-foreground">{provider.name}</div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                          provider.configured
                            ? "border-primary/20 bg-primary/10 text-primary"
                            : "border-orange-500/20 bg-orange-500/10 text-orange-400"
                        }`}
                      >
                        {provider.configured ? "Configured" : "Missing key"}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {provider.reachable
                        ? "Provider endpoint is reachable and ready to synthesize."
                        : "No live health confirmation was returned from this endpoint yet."}
                    </div>
                    {provider.default && (
                      <div className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
                        <CheckCircle2 size={12} />
                        Default provider
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="glass-panel rounded-[28px] border border-border p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                <Mic size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Preset profile</h2>
                <p className="text-xs text-muted-foreground">
                  Pick the voice character BELKA should use for spoken prompts, updates, and command feedback.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {(providersData?.presets || []).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, preset: preset.id }))}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    config.preset === preset.id
                      ? "border-primary/30 bg-primary/10 shadow-[0_0_0_1px_rgba(46,160,67,0.16)]"
                      : "border-border/70 bg-background/70 hover:border-primary/20 hover:bg-background"
                  }`}
                >
                  <div className="mb-1 text-sm font-semibold text-foreground">{preset.name}</div>
                  <div className="text-xs leading-relaxed text-muted-foreground">{preset.description}</div>
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="glass-panel rounded-[28px] border border-border p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Behavior and safeguards</h2>
              <p className="text-xs text-muted-foreground">
                These settings control speaking, dictation, unknown command routing, and echo protection.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {[
              {
                key: "voiceEnabled" as const,
                title: "Voice pipeline enabled",
                hint: "Turns on the shared spoken assistant flow.",
              },
              {
                key: "dictationEnabled" as const,
                title: "Dictation mode",
                hint: "Allows speech-to-text dictation into the chat composer.",
              },
              {
                key: "autoSpeakSteps" as const,
                title: "Speak agent steps",
                hint: "Reads short status updates while BELKA is thinking, searching, or reviewing.",
              },
              {
                key: "autoSpeakReplies" as const,
                title: "Speak final replies",
                hint: "Reads final answers out loud when the interaction is concise enough.",
              },
              {
                key: "routeUnknownCommandsToAgent" as const,
                title: "Route unknown commands to BELKA",
                hint: "If no local voice phrase matches, send the spoken request into the main agent flow.",
              },
              {
                key: "echoGuardEnabled" as const,
                title: "Echo guard",
                hint: "Pauses recognition during playback so BELKA does not answer itself.",
              },
            ].map((item) => (
              <div key={item.key} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-foreground">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.hint}</div>
                  </div>
                  <Toggle
                    checked={config[item.key]}
                    onChange={() => setConfig((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <SliderRow
              label="Echo guard resume delay"
              hint="How long BELKA waits after playback before reopening the microphone."
              value={config.echoGuardDelayMs}
              min={300}
              max={2000}
              step={50}
              suffix=" ms"
              onChange={(nextValue) => setConfig((prev) => ({ ...prev, echoGuardDelayMs: nextValue }))}
            />
            <SliderRow
              label="Max reply chars for auto speech"
              hint="Longer replies stay visual-only; shorter ones can be read out loud."
              value={config.replyMaxChars}
              min={120}
              max={800}
              step={20}
              onChange={(nextValue) => setConfig((prev) => ({ ...prev, replyMaxChars: nextValue }))}
            />
          </div>
        </section>

        <section className="glass-panel rounded-[28px] border border-border p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
              <BrainCircuit size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Live checks</h2>
              <p className="text-xs text-muted-foreground">
                Validate the voice engine separately from the BELKA chat flow before you roll changes out.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTestVoice}
              disabled={testingVoice}
              className="inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/16 disabled:opacity-70"
            >
              {testingVoice ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
              Test voice output
            </button>

            <button
              onClick={handleTestAgent}
              disabled={testingAgent}
              className="inline-flex items-center gap-2 rounded-2xl border border-secondary/20 bg-secondary/10 px-4 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-secondary/16 disabled:opacity-70"
            >
              {testingAgent ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
              Test BELKA reply
            </button>
          </div>

          {testResult && (
            <div className="mt-4 rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-foreground whitespace-pre-wrap">
              {testResult}
            </div>
          )}
        </section>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-[0_14px_40px_rgba(46,160,67,0.22)] transition-all hover:translate-y-[-1px] hover:shadow-[0_18px_46px_rgba(46,160,67,0.28)] disabled:opacity-70"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save global voice settings
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
