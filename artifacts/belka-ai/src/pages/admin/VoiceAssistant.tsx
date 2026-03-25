import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "./Layout";
import { BrainCircuit, CheckCircle, Loader2, Mic, Save, Volume2, Waves, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getVoiceAssistantConfig,
  saveVoiceAssistantConfig,
  type VoiceAssistantConfig,
} from "@/lib/voice-config";

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

function getAuthHeaders() {
  const token = window.localStorage.getItem("belka-token") || "";
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-all relative ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${checked ? "left-6" : "left-1"}`} />
    </button>
  );
}

export default function AdminVoiceAssistant() {
  const { toast } = useToast();
  const [config, setConfig] = useState<VoiceAssistantConfig>(() => getVoiceAssistantConfig());
  const [health, setHealth] = useState<VoiceHealthResponse | null>(null);
  const [providersData, setProvidersData] = useState<VoiceProvidersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingVoice, setTestingVoice] = useState(false);
  const [testingAgent, setTestingAgent] = useState(false);
  const [testResult, setTestResult] = useState("");

  const apiBase = useMemo(() => `${(import.meta.env.BASE_URL || "/")}api`.replace(/\/\/+/g, "/"), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [healthRes, providersRes] = await Promise.all([
          fetch(`${apiBase}/voice/health`, { headers: getAuthHeaders() }),
          fetch(`${apiBase}/voice/providers`, { headers: getAuthHeaders() }),
        ]);

        if (!cancelled) {
          const nextHealth = await healthRes.json();
          const nextProviders = await providersRes.json();
          setHealth(nextHealth);
          setProvidersData(nextProviders);
        }
      } catch (error) {
        if (!cancelled) {
          setTestResult(error instanceof Error ? error.message : "Не удалось загрузить настройки голоса");
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

  const handleSave = () => {
    saveVoiceAssistantConfig(config);
    toast({
      title: "Настройки сохранены",
      description: "Голосовой ассистент будет использовать новые параметры сразу.",
    });
  };

  const handleTestVoice = async () => {
    setTestingVoice(true);
    setTestResult("");
    try {
      const response = await fetch(`${apiBase}/voice/synthesize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          text: "BELKA готова к работе. Голосовой контур активен и ждёт команд по проекту.",
          provider: config.provider,
          preset: config.preset,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.audioUrl) {
        throw new Error(data.error || "Не удалось получить аудио");
      }

      const audio = new Audio(data.audioUrl);
      await audio.play();
      setTestResult(`Голос работает через ${data.providerUsed} / ${data.presetUsed}.`);
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : "Не удалось проверить голос");
    } finally {
      setTestingVoice(false);
    }
  };

  const handleTestAgent = async () => {
    setTestingAgent(true);
    setTestResult("");
    try {
      const response = await fetch(`${apiBase}/belka/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          message: "Кто ты и чем можешь помочь в проекте? Ответь коротко и по делу.",
          mode: "chat",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "BELKA не ответила");
      }
      setTestResult(data.reply || "BELKA ответила без текста.");
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : "Не удалось проверить ответ агента");
    } finally {
      setTestingAgent(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Голосовой ассистент</h1>
        <p className="text-muted-foreground">
          Управление голосом, защитой от самопрослушивания и тем, как BELKA озвучивает ответы в проекте.
        </p>
      </div>

      <div className="space-y-6">
        <div className="glass-panel rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Waves size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Провайдеры голоса</h3>
              <p className="text-xs text-muted-foreground">Backend проверяет реальные voice-provider endpoints, а не локальные ключи браузера.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              Загружаю состояние голосового контура...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(health?.providers || []).map((provider) => (
                <div key={provider.id} className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-foreground">{provider.name}</div>
                    <span className={`text-xs px-2 py-1 rounded-full border ${provider.configured ? "border-green-500/30 text-green-500 bg-green-500/10" : "border-amber-500/30 text-amber-500 bg-amber-500/10"}`}>
                      {provider.configured ? "Настроен" : "Не настроен"}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {provider.reachable ? "Endpoint отвечает и доступен для синтеза." : "Провайдер пока не подтверждён живым health-check."}
                  </div>
                  {provider.default && (
                    <div className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
                      <CheckCircle size={12} />
                      Провайдер по умолчанию
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Mic size={20} className="text-sky-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Профиль озвучки</h3>
              <p className="text-xs text-muted-foreground">Выбор голоса для команд, ответов и статусов. Для “JARVIS”-эффекта рекомендован профиль Jarvis RU.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(providersData?.presets || []).map((preset) => (
              <button
                key={preset.id}
                onClick={() => setConfig((prev) => ({ ...prev, preset: preset.id }))}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  config.preset === preset.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/30 bg-background/70"
                }`}
              >
                <div className="font-medium text-foreground mb-1">{preset.name}</div>
                <div className="text-sm text-muted-foreground">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck size={20} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Поведение ассистента</h3>
              <p className="text-xs text-muted-foreground">Здесь управляется озвучка шагов, финальных ответов и защита от того, чтобы ассистент не отвечал сам себе.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">Голосовые ответы</div>
                <div className="text-xs text-muted-foreground">Включает общий голосовой контур ассистента.</div>
              </div>
              <Toggle checked={config.voiceEnabled} onChange={() => setConfig((prev) => ({ ...prev, voiceEnabled: !prev.voiceEnabled }))} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">Диктовка</div>
                <div className="text-xs text-muted-foreground">Разрешает режим диктовки текста в поле ввода.</div>
              </div>
              <Toggle checked={config.dictationEnabled} onChange={() => setConfig((prev) => ({ ...prev, dictationEnabled: !prev.dictationEnabled }))} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">Озвучка шагов</div>
                <div className="text-xs text-muted-foreground">Ассистент проговаривает статусы вроде анализа, поиска и проверки.</div>
              </div>
              <Toggle checked={config.autoSpeakSteps} onChange={() => setConfig((prev) => ({ ...prev, autoSpeakSteps: !prev.autoSpeakSteps }))} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">Озвучка финального ответа</div>
                <div className="text-xs text-muted-foreground">Подходит для chat-режима и коротких ответов без длинного кода.</div>
              </div>
              <Toggle checked={config.autoSpeakReplies} onChange={() => setConfig((prev) => ({ ...prev, autoSpeakReplies: !prev.autoSpeakReplies }))} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">Неизвестные команды отправлять агенту</div>
                <div className="text-xs text-muted-foreground">Если фраза не совпала с локальной командой, она уйдёт в BELKA как полноценная задача.</div>
              </div>
              <Toggle checked={config.routeUnknownCommandsToAgent} onChange={() => setConfig((prev) => ({ ...prev, routeUnknownCommandsToAgent: !prev.routeUnknownCommandsToAgent }))} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">Echo guard</div>
                <div className="text-xs text-muted-foreground">Во время озвучки распознавание временно ставится на паузу, чтобы ассистент не слушал сам себя.</div>
              </div>
              <Toggle checked={config.echoGuardEnabled} onChange={() => setConfig((prev) => ({ ...prev, echoGuardEnabled: !prev.echoGuardEnabled }))} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Задержка перед возобновлением микрофона</span>
                <span className="text-xs text-muted-foreground">{config.echoGuardDelayMs} мс</span>
              </div>
              <input
                type="range"
                min={300}
                max={2000}
                step={50}
                value={config.echoGuardDelayMs}
                onChange={(e) => setConfig((prev) => ({ ...prev, echoGuardDelayMs: Number(e.target.value) }))}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Максимум символов для автоозвучки ответа</span>
                <span className="text-xs text-muted-foreground">{config.replyMaxChars}</span>
              </div>
              <input
                type="range"
                min={120}
                max={800}
                step={20}
                value={config.replyMaxChars}
                onChange={(e) => setConfig((prev) => ({ ...prev, replyMaxChars: Number(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <BrainCircuit size={20} className="text-violet-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Проверка контура</h3>
              <p className="text-xs text-muted-foreground">Проверяем отдельно голосовой движок и отдельно связку с BELKA-агентом.</p>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleTestVoice}
              disabled={testingVoice}
              className="px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-sm font-medium hover:bg-emerald-500/20 transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {testingVoice ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
              Тест голоса
            </button>

            <button
              onClick={handleTestAgent}
              disabled={testingAgent}
              className="px-4 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-sm font-medium hover:bg-primary/20 transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {testingAgent ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
              Тест BELKA
            </button>
          </div>

          {testResult && (
            <div className="mt-4 p-4 rounded-2xl border border-border bg-background/70 text-sm text-foreground whitespace-pre-wrap">
              {testResult}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <Save size={18} />
            Сохранить настройки
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
