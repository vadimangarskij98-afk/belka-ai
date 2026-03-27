import { useState, useEffect } from "react";
import { AdminLayout } from "./Layout";
import { Gift, Users, Settings, Save } from "lucide-react";
import { apiFetch, buildApiUrl, jsonHeaders } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";

const API = buildApiUrl();

export default function AdminReferrals() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({ bonusRequests: 7, isActive: true });
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [settingsResponse, referralsResponse] = await Promise.all([
          apiFetch(`${API}/admin/referral-settings`),
          apiFetch(`${API}/admin/referrals`),
        ]);

        if (!settingsResponse.ok || !referralsResponse.ok) {
          throw new Error("Не удалось загрузить реферальные данные");
        }

        const [settingsData, referralsData] = await Promise.all([
          settingsResponse.json(),
          referralsResponse.json(),
        ]);

        setSettings(settingsData);
        setReferrals(referralsData.referrals || []);
      } catch (err) {
        setSettings({ bonusRequests: 7, isActive: true });
        setReferrals([]);
        setError(err instanceof Error ? err.message : "Не удалось загрузить реферальные данные");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleSaveSettings = async () => {
    try {
      const response = await apiFetch(`${API}/admin/referral-settings`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Не удалось сохранить настройки");
      }

      toast({ title: t("referralSettings"), description: "Настройки сохранены" });
    } catch {
      toast({ variant: "destructive", title: t("error"), description: "Не удалось сохранить настройки" });
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-display font-bold text-foreground">{t("referralSettings")}</h1>
        <p className="text-muted-foreground">Управление реферальной программой и бонусами</p>
        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-2xl border border-border p-6">
          <div className="mb-4 flex items-center gap-2">
            <Settings size={18} className="text-primary" />
            <h3 className="font-semibold text-foreground">Настройки</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">{t("referralBonusPerInvite")}</label>
              <input
                type="number"
                value={settings.bonusRequests}
                onChange={(e) => setSettings({ ...settings, bonusRequests: Number(e.target.value) })}
                min={1}
                max={100}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-foreground transition-colors focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("referralActive")}</span>
              <button
                onClick={() => setSettings({ ...settings, isActive: !settings.isActive })}
                className={`relative h-6 w-12 rounded-full transition-colors ${settings.isActive ? "bg-primary" : "bg-muted"}`}
              >
                <div
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    settings.isActive ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            <button
              onClick={handleSaveSettings}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-medium text-white transition-colors hover:bg-primary/90"
            >
              <Save size={16} /> Сохранить настройки
            </button>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-border p-6">
          <div className="mb-4 flex items-center gap-2">
            <Gift size={18} className="text-secondary" />
            <h3 className="font-semibold text-foreground">Информация</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-muted/30 p-3">
              <span className="text-muted-foreground">Всего рефералов: </span>
              <span className="font-bold text-foreground">{referrals.length}</span>
            </div>
            <div className="rounded-xl bg-muted/30 p-3">
              <span className="text-muted-foreground">Бонус за приглашение: </span>
              <span className="font-bold text-foreground">{settings.bonusRequests} запросов</span>
            </div>
            <div className="rounded-xl bg-muted/30 p-3">
              <span className="text-muted-foreground">Статус: </span>
              <span className={`font-bold ${settings.isActive ? "text-primary" : "text-red-400"}`}>
                {settings.isActive ? "Активна" : "Неактивна"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel overflow-hidden rounded-2xl border border-border">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Users size={18} className="text-primary" />
          <h3 className="font-semibold text-foreground">История приглашений</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-4 text-sm font-medium text-muted-foreground">Пригласил</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">Приглашённый</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">Бонус</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">Дата</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    Загрузка...
                  </td>
                </tr>
              ) : referrals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    Пока нет рефералов
                  </td>
                </tr>
              ) : (
                referrals.map((r, i) => (
                  <tr key={i} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                    <td className="p-4 font-medium text-foreground">{r.referrer}</td>
                    <td className="p-4 text-foreground">{r.referred}</td>
                    <td className="p-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                          r.bonusAwarded
                            ? "border-primary/20 bg-primary/10 text-primary"
                            : "border-[#F97316]/20 bg-[#F97316]/10 text-[#F97316]"
                        }`}
                      >
                        {r.bonusAwarded ? "Выдан" : "Ожидание"}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
