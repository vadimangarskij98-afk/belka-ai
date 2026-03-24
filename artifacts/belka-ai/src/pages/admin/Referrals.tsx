import { useState, useEffect } from "react";
import { AdminLayout } from "./Layout";
import { Gift, Users, Settings, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";

const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
const API = `${BASE}/api`.replace(/\/\/+/g, "/");
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("belka-token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export default function AdminReferrals() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({ bonusRequests: 7, isActive: true });
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/admin/referral-settings`, { headers: getAuthHeaders() }).then(r => r.json()),
      fetch(`${API}/admin/referrals`, { headers: getAuthHeaders() }).then(r => r.json()),
    ]).then(([settingsData, referralsData]) => {
      setSettings(settingsData);
      setReferrals(referralsData.referrals || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSaveSettings = async () => {
    try {
      await fetch(`${API}/admin/referral-settings`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });
      toast({ title: t("referralSettings"), description: "Настройки сохранены" });
    } catch {
      toast({ variant: "destructive", title: t("error") });
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t("referralSettings")}</h1>
        <p className="text-muted-foreground">Управление реферальной программой и бонусами</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-panel p-6 rounded-2xl border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Settings size={18} className="text-primary" />
            <h3 className="font-semibold text-foreground">Настройки</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("referralBonusPerInvite")}</label>
              <input
                type="number"
                value={settings.bonusRequests}
                onChange={e => setSettings({ ...settings, bonusRequests: Number(e.target.value) })}
                min={1}
                max={100}
                className="w-full border border-border bg-background rounded-xl px-4 py-2 text-foreground focus:border-primary transition-colors"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">{t("referralActive")}</span>
              <button
                onClick={() => setSettings({ ...settings, isActive: !settings.isActive })}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.isActive ? "bg-primary" : "bg-muted"}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.isActive ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>

            <button
              onClick={handleSaveSettings}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              <Save size={16} /> Сохранить настройки
            </button>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Gift size={18} className="text-secondary" />
            <h3 className="font-semibold text-foreground">Информация</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-xl bg-muted/30">
              <span className="text-muted-foreground">Всего рефералов: </span>
              <span className="font-bold text-foreground">{referrals.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-muted/30">
              <span className="text-muted-foreground">Бонусов за приглашение: </span>
              <span className="font-bold text-foreground">{settings.bonusRequests} запросов</span>
            </div>
            <div className="p-3 rounded-xl bg-muted/30">
              <span className="text-muted-foreground">Статус: </span>
              <span className={`font-bold ${settings.isActive ? "text-green-400" : "text-red-400"}`}>
                {settings.isActive ? "Активна" : "Неактивна"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden border border-border">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Users size={18} className="text-primary" />
          <h3 className="font-semibold text-foreground">История приглашений</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
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
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Загрузка...</td></tr>
              ) : referrals.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Пока нет рефералов</td></tr>
              ) : (
                referrals.map((r, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium text-foreground">{r.referrer}</td>
                    <td className="p-4 text-foreground">{r.referred}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${r.bonusAwarded ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"}`}>
                        {r.bonusAwarded ? "Выдан" : "Ожидание"}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">{new Date(r.createdAt).toLocaleDateString()}</td>
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
