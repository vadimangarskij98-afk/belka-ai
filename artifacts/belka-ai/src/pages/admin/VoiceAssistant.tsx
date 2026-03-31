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
          {value}
          {suffix ?? ""}
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
          setTestResult(error instanceof Error ? error.message : "Не удалось загрузить настройки голоса.");
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
        title: "Профиль голоса сохранён",
        description: "Новые голосовые настройки уже применены по всему продукту.",
      });
    } catch (error) {
      toast({
        title: "Не удалось сохранить профиль",
        description: error instanceof Error ? error.message : "Попробуйте снова через несколько секунд.",
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
        throw new Error(data.error || "Провайдер не вернул аудио.");
      }

      const audio = new Audio(data.audioUrl);
      await audio.play();
      setTestResult(`Голосовой контур исправен: ${data.providerUsed} / ${data.presetUsed}.`);
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : "Не удалось запустить голосовой тест.");
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
          message: "Представься одной короткой строкой и скажи, чем помогаешь внутри проекта.",
          mode: "chat",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "BELKA не вернула ответ.");
      }

      setTestResult(data.reply || "BELKA ответила без видимого текста.");
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : "Не удалось проверить ответ BELKA.");
    } finally {
      setTestingAgent(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8 max-w-3xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Общий голосовой профиль
        </div>
        <h1 className="mb-2 text-3xl font-display font-bold text-foreground">Голосовой ассистент</h1>
        <p className="text-muted-foreground">
          Управляйте общим голосовым профилем BELKA, поведением диктовки, echo guard и тем, как система говорит в
          чате, во время шагов агента и при навигации по проекту.
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
                <h2 className="text-lg font-semibold text-foreground">Провайдеры и состояние</h2>
                <p className="text-xs text-muted-foreground">
                  Статус backend-провайдеров TTS. Браузерные секреты здесь не используются и не считаются доверенными.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                Загружаю состояние провайдеров...
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
                        {provider.configured ? "Настроен" : "Ключ не найден"}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {provider.reachable
                        ? "Провайдер доступен и готов синтезировать речь."
                        : "Живое подтверждение доступности от этого endpoint пока не получено."}
                    </div>
                    {provider.default && (
                      <div className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
                        <CheckCircle2 size={12} />
                        Провайдер по умолчанию
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
                <h2 className="text-lg font-semibold text-foreground">Профиль голоса</h2>
                <p className="text-xs text-muted-foreground">
                  Выберите характер речи, который BELKA должна использовать для подсказок, статусов и командной
                  обратной связи.
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
                      ? "border-primary/30 bg-primary/10 shadow-[0_0_0_1px_rgba(44,143,70,0.16)]"
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
              <h2 className="text-lg font-semibold text-foreground">Поведение и защита</h2>
              <p className="text-xs text-muted-foreground">
                Эти настройки управляют озвучкой, диктовкой, маршрутизацией неизвестных команд и защитой от
                самопрослушивания.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {[
              {
                key: "voiceEnabled" as const,
                title: "Голосовой контур включён",
                hint: "Активирует общий spoken assistant flow.",
              },
              {
                key: "dictationEnabled" as const,
                title: "Режим диктовки",
                hint: "Разрешает speech-to-text диктовку прямо в composer чата.",
              },
              {
                key: "autoSpeakSteps" as const,
                title: "Озвучивать шаги агента",
                hint: "Читает короткие статусы, пока BELKA думает, ищет или проверяет решение.",
              },
              {
                key: "autoSpeakReplies" as const,
                title: "Озвучивать финальные ответы",
                hint: "Читает итоговые ответы вслух, если они остаются достаточно короткими.",
              },
              {
                key: "routeUnknownCommandsToAgent" as const,
                title: "Отправлять неизвестные команды в BELKA",
                hint: "Если локальная голосовая фраза не совпала, запрос уходит в основной агентный поток.",
              },
              {
                key: "echoGuardEnabled" as const,
                title: "Echo guard",
                hint: "Ставит распознавание на паузу во время воспроизведения, чтобы BELKA не отвечала самой себе.",
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
              label="Задержка повторного включения микрофона"
              hint="Сколько BELKA ждёт после воспроизведения, прежде чем снова открыть микрофон."
              value={config.echoGuardDelayMs}
              min={300}
              max={2000}
              step={50}
              suffix=" мс"
              onChange={(nextValue) => setConfig((prev) => ({ ...prev, echoGuardDelayMs: nextValue }))}
            />
            <SliderRow
              label="Максимальная длина ответа для автоозвучки"
              hint="Длинные ответы остаются только визуальными, короткие можно читать вслух автоматически."
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
              <h2 className="text-lg font-semibold text-foreground">Живые проверки</h2>
              <p className="text-xs text-muted-foreground">
                Проверьте voice engine отдельно от chat-flow BELKA, прежде чем выкатывать изменения дальше.
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
              Проверить голосовой вывод
            </button>

            <button
              onClick={handleTestAgent}
              disabled={testingAgent}
              className="inline-flex items-center gap-2 rounded-2xl border border-secondary/20 bg-secondary/10 px-4 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-secondary/16 disabled:opacity-70"
            >
              {testingAgent ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
              Проверить ответ BELKA
            </button>
          </div>

          {testResult && (
            <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-foreground">
              {testResult}
            </div>
          )}
        </section>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-[0_14px_40px_rgba(44,143,70,0.22)] transition-all hover:translate-y-[-1px] hover:shadow-[0_18px_46px_rgba(44,143,70,0.28)] disabled:opacity-70"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Сохранить глобальные голосовые настройки
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
