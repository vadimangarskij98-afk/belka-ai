import { useState, useEffect } from "react";
import { AdminLayout } from "./Layout";
import { Mic, Key, Save, Volume2, Trash2, TestTube, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";

interface AssistantConfig {
  elevenLabsKey: string;
  openRouterKey: string;
  selectedModel: string;
  voiceEnabled: boolean;
  dictationEnabled: boolean;
  autoSpeak: boolean;
}

const FREE_MODELS = [
  { id: "qwen/qwen3-coder:free", name: "Qwen 3 Coder (Free)" },
  { id: "qwen/qwen3-4b:free", name: "Qwen 3 4B (Free)" },
  { id: "qwen/qwen3-next-80b-a3b-instruct:free", name: "Qwen 3 Next 80B (Free)" },
];

const PAID_MODELS = [
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash" },
  { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1" },
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" },
  { id: "qwen/qwen3-coder", name: "Qwen 3 Coder" },
  { id: "qwen/qwen3-235b-a22b", name: "Qwen 3 235B" },
];

export default function AdminVoiceAssistant() {
  const { toast } = useToast();
  const [config, setConfig] = useState<AssistantConfig>(() => {
    const saved = localStorage.getItem("belka-assistant-config");
    return saved ? JSON.parse(saved) : {
      elevenLabsKey: "",
      openRouterKey: "",
      selectedModel: "google/gemini-2.5-flash",
      voiceEnabled: true,
      dictationEnabled: true,
      autoSpeak: true,
    };
  });
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = () => {
    localStorage.setItem("belka-assistant-config", JSON.stringify(config));
    toast({ title: "Сохранено", description: "Настройки ассистента обновлены" });
  };

  const handleTestVoice = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const base = import.meta.env.BASE_URL || '/';
      const audio = new Audio(`${base}audio/voice_greeting.mp3`);
      await audio.play();
      setTestResult("Голос работает!");
    } catch (err) {
      setTestResult("Ошибка воспроизведения");
    }
    setIsTesting(false);
  };

  const handleTestAI = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const apiKey = config.openRouterKey;
      if (!apiKey) {
        setTestResult("Введите OpenRouter API ключ");
        setIsTesting(false);
        return;
      }
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
        },
        body: JSON.stringify({
          model: config.selectedModel,
          messages: [{ role: "user", content: "Ответь одним предложением: кто ты?" }],
          max_tokens: 100,
        }),
      });
      const data = await response.json();
      if (data.choices?.[0]?.message?.content) {
        setTestResult(`AI ответил: ${data.choices[0].message.content}`);
      } else {
        setTestResult(`Ошибка: ${data.error?.message || "Нет ответа"}`);
      }
    } catch (err: any) {
      setTestResult(`Ошибка: ${err.message}`);
    }
    setIsTesting(false);
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Голосовой ассистент</h1>
        <p className="text-muted-foreground">Настройка AI-модели, голоса и поведения ассистента Алиса</p>
      </div>

      <div className="space-y-6">
        <div className="glass-panel rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Key size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">API Ключи</h3>
              <p className="text-xs text-muted-foreground">Ключи для AI-моделей и голоса</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">OpenRouter API Key</label>
              <input
                type="password"
                value={config.openRouterKey}
                onChange={(e) => setConfig({ ...config, openRouterKey: e.target.value })}
                placeholder="sk-or-v1-..."
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Получите на openrouter.ai/keys. Бесплатные модели работают без оплаты.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">ElevenLabs API Key (опционально)</label>
              <input
                type="password"
                value={config.elevenLabsKey}
                onChange={(e) => setConfig({ ...config, elevenLabsKey: e.target.value })}
                placeholder="xi-..."
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Для генерации голосовых ответов на неизвестные фразы.</p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Mic size={20} className="text-violet-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">AI Модель</h3>
              <p className="text-xs text-muted-foreground">Модель для генерации кода и ответов</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Бесплатные модели</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {FREE_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setConfig({ ...config, selectedModel: model.id })}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-all ${
                    config.selectedModel === model.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {model.name}
                </button>
              ))}
            </div>

            <label className="block text-sm font-medium text-muted-foreground mb-2">Платные модели (нужен ключ с балансом)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PAID_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setConfig({ ...config, selectedModel: model.id })}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-all ${
                    config.selectedModel === model.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {model.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Volume2 size={20} className="text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Поведение</h3>
              <p className="text-xs text-muted-foreground">Настройки голоса и режимов</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-foreground">Голосовые ответы</span>
                <p className="text-xs text-muted-foreground">Ассистент озвучивает свои действия</p>
              </div>
              <button
                onClick={() => setConfig({ ...config, voiceEnabled: !config.voiceEnabled })}
                className={`w-10 h-5 rounded-full transition-all relative ${config.voiceEnabled ? "bg-primary" : "bg-muted"}`}
              >
                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${config.voiceEnabled ? "left-[22px]" : "left-[3px]"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-foreground">Режим диктовки</span>
                <p className="text-xs text-muted-foreground">Диктовка текста голосом в чат</p>
              </div>
              <button
                onClick={() => setConfig({ ...config, dictationEnabled: !config.dictationEnabled })}
                className={`w-10 h-5 rounded-full transition-all relative ${config.dictationEnabled ? "bg-primary" : "bg-muted"}`}
              >
                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${config.dictationEnabled ? "left-[22px]" : "left-[3px]"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-foreground">Авто-озвучка шагов</span>
                <p className="text-xs text-muted-foreground">Озвучивать "Анализирую...", "Пишу решение..." при работе</p>
              </div>
              <button
                onClick={() => setConfig({ ...config, autoSpeak: !config.autoSpeak })}
                className={`w-10 h-5 rounded-full transition-all relative ${config.autoSpeak ? "bg-primary" : "bg-muted"}`}
              >
                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${config.autoSpeak ? "left-[22px]" : "left-[3px]"}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Тестирование</h3>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleTestVoice}
              disabled={isTesting}
              className="px-4 py-2.5 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 text-sm font-medium hover:bg-green-500/20 transition-colors flex items-center gap-2"
            >
              <Volume2 size={16} /> Тест голоса
            </button>
            <button
              onClick={handleTestAI}
              disabled={isTesting}
              className="px-4 py-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 text-sm font-medium hover:bg-violet-500/20 transition-colors flex items-center gap-2"
            >
              <TestTube size={16} /> Тест AI модели
            </button>
          </div>
          {testResult && (
            <div className="mt-3 p-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground">
              {testResult}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <Save size={18} /> Сохранить настройки
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
