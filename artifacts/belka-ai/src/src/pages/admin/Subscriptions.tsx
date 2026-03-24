import { useState, useEffect } from "react";
import { AdminLayout } from "./Layout";
import { Check, Edit3, Save, X, Plus, Trash2, Tag, Percent, Calendar, Hash } from "lucide-react";
import { t } from "@/lib/i18n";

interface Plan {
  id: string;
  planId: string;
  name: string;
  description: string;
  price: number;
  discountPercent: number;
  tokensPerMonth: number;
  agentsLimit: number;
  features: string[];
  isActive: boolean;
}

interface PromoCode {
  id: string;
  code: string;
  discountPercent: number;
  planId: string | null;
  usageLimit: number;
  usageCount: number;
  isActive: boolean;
  expiresAt: string | null;
}

const BASE = import.meta.env.BASE_URL || "/";
const apiBase = `${BASE}api`.replace(/\/+/g, "/");

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("belka-token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function AdminSubscriptions() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Plan>>({});
  const [saved, setSaved] = useState("");
  const [showAddPromo, setShowAddPromo] = useState(false);
  const [newPromo, setNewPromo] = useState({ code: "", discountPercent: 10, usageLimit: 100, expiresAt: "" });

  useEffect(() => {
    fetch(`${apiBase}/admin/subscriptions`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : { plans: [] })
      .then(d => setPlans(d.plans || []))
      .catch(() => {});
    fetch(`${apiBase}/admin/promo-codes`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : { promoCodes: [] })
      .then(d => setPromoCodes(d.promoCodes || []))
      .catch(() => {});
  }, []);

  const startEdit = (plan: Plan) => {
    setEditingPlan(plan.planId);
    setEditData({ ...plan, features: [...plan.features] });
  };

  const cancelEdit = () => { setEditingPlan(null); setEditData({}); };

  const savePlan = async () => {
    if (!editingPlan) return;
    const res = await fetch(`${apiBase}/admin/subscriptions/${editingPlan}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(editData),
    });
    if (res.ok) {
      const updated = await res.json();
      setPlans(prev => prev.map(p => p.planId === editingPlan ? { ...p, ...updated } : p));
      setEditingPlan(null);
      setSaved(t("planSaved"));
      setTimeout(() => setSaved(""), 2000);
    }
  };

  const addPromo = async () => {
    if (!newPromo.code) return;
    const res = await fetch(`${apiBase}/admin/promo-codes`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(newPromo),
    });
    if (res.ok) {
      const promo = await res.json();
      setPromoCodes(prev => [...prev, promo]);
      setNewPromo({ code: "", discountPercent: 10, usageLimit: 100, expiresAt: "" });
      setShowAddPromo(false);
      setSaved(t("promoSaved"));
      setTimeout(() => setSaved(""), 2000);
    }
  };

  const deletePromo = async (id: string) => {
    const res = await fetch(`${apiBase}/admin/promo-codes/${id}`, { method: "DELETE", headers: authHeaders() });
    if (!res.ok) return;
    setPromoCodes(prev => prev.filter(p => p.id !== id));
    setSaved(t("promoDeleted"));
    setTimeout(() => setSaved(""), 2000);
  };

  const togglePromo = async (promo: PromoCode) => {
    const res = await fetch(`${apiBase}/admin/promo-codes/${promo.id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ isActive: !promo.isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPromoCodes(prev => prev.map(p => p.id === promo.id ? { ...p, ...updated } : p));
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">{t("subscriptions")}</h1>
        <p className="text-muted-foreground">{t("managePlans")}</p>
        {saved && (
          <div className="mt-2 inline-block px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm animate-pulse">
            {saved}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {plans.map(plan => {
          const isEditing = editingPlan === plan.planId;
          const finalPrice = plan.discountPercent > 0 ? plan.price * (1 - plan.discountPercent / 100) : plan.price;
          return (
            <div key={plan.id} className="glass-panel p-6 rounded-3xl relative flex flex-col">
              {plan.planId === "pro" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg shadow-primary/30">
                  {t("mostPopular")}
                </div>
              )}

              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground">{t("name")}</label>
                    <input value={editData.name || ""} onChange={e => setEditData({ ...editData, name: e.target.value })}
                      className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground">{t("description")}</label>
                    <input value={editData.description || ""} onChange={e => setEditData({ ...editData, description: e.target.value })}
                      className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">{t("editPlanPrice")}</label>
                      <input type="number" step="0.01" value={editData.price ?? 0} onChange={e => setEditData({ ...editData, price: parseFloat(e.target.value) })}
                        className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">{t("discountPercent")}</label>
                      <input type="number" min="0" max="100" value={editData.discountPercent ?? 0} onChange={e => setEditData({ ...editData, discountPercent: parseInt(e.target.value) })}
                        className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">{t("editPlanTokens")}</label>
                      <input type="number" value={editData.tokensPerMonth ?? 0} onChange={e => setEditData({ ...editData, tokensPerMonth: parseInt(e.target.value) })}
                        className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">{t("editPlanAgents")}</label>
                      <input type="number" value={editData.agentsLimit ?? 0} onChange={e => setEditData({ ...editData, agentsLimit: parseInt(e.target.value) })}
                        className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground">{t("editPlanFeatures")}</label>
                    <textarea
                      value={(editData.features || []).join("\n")}
                      onChange={e => setEditData({ ...editData, features: e.target.value.split("\n").filter(Boolean) })}
                      rows={4}
                      className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground resize-none"
                      placeholder="One feature per line"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={savePlan} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90">
                      <Save size={14} /> {t("savePlan")}
                    </button>
                    <button onClick={cancelEdit} className="px-3 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground text-sm">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                    <button onClick={() => startEdit(plan)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                      <Edit3 size={14} />
                    </button>
                  </div>
                  {plan.description && <p className="text-xs text-muted-foreground mb-3">{plan.description}</p>}

                  <div className="flex items-baseline gap-1 mb-1">
                    {plan.discountPercent > 0 ? (
                      <>
                        <span className="text-lg text-muted-foreground line-through">${plan.price}</span>
                        <span className="text-4xl font-display font-bold text-foreground">${finalPrice.toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="text-4xl font-display font-bold text-foreground">${plan.price}</span>
                    )}
                    <span className="text-muted-foreground">{t("perMonth")}</span>
                  </div>
                  {plan.discountPercent > 0 && (
                    <div className="flex items-center gap-1 mb-4">
                      <Percent size={11} className="text-green-400" />
                      <span className="text-xs font-medium text-green-400">-{plan.discountPercent}% {t("discount")}</span>
                    </div>
                  )}

                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Check size={16} className="text-primary" />
                      {plan.tokensPerMonth >= 10000000 ? "Unlimited" : (plan.tokensPerMonth / 1000000).toFixed(1) + "M"} {t("tokens")}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Check size={16} className="text-primary" />
                      {plan.agentsLimit === -1 ? "Unlimited" : plan.agentsLimit} {t("agentsLimit")}
                    </div>
                    {plan.features.map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check size={16} className="text-primary/60" />
                        {f}
                      </div>
                    ))}
                  </div>

                  <button className={`w-full py-3 rounded-xl font-semibold transition-all ${plan.planId === "pro" ? "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90" : "bg-muted text-foreground hover:bg-muted/80"}`}>
                    {t("editPlan")}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Tag size={20} className="text-primary" />
              {t("promoCodes")}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{t("managePromoCodes")}</p>
          </div>
          <button
            onClick={() => setShowAddPromo(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Plus size={14} /> {t("addPromo")}
          </button>
        </div>

        {showAddPromo && (
          <div className="glass-panel p-5 rounded-2xl mb-6 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">{t("addPromo")}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1"><Hash size={9} />{t("promoCode")}</label>
                <input value={newPromo.code} onChange={e => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                  placeholder="BELKA2024" className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1"><Percent size={9} />{t("discountPercent")}</label>
                <input type="number" min="1" max="100" value={newPromo.discountPercent} onChange={e => setNewPromo({ ...newPromo, discountPercent: parseInt(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">{t("usageLimit")}</label>
                <input type="number" min="1" value={newPromo.usageLimit} onChange={e => setNewPromo({ ...newPromo, usageLimit: parseInt(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1"><Calendar size={9} />{t("expiresAt")}</label>
                <input type="date" value={newPromo.expiresAt} onChange={e => setNewPromo({ ...newPromo, expiresAt: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground mt-0.5" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAddPromo(false)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">{t("cancel")}</button>
              <button onClick={addPromo} className="px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90">{t("save")}</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {promoCodes.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl text-center text-muted-foreground text-sm">
              {t("promoCodes")} — {t("addPromo")}
            </div>
          ) : promoCodes.map(promo => (
            <div key={promo.id} className="glass-panel px-4 py-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-mono text-sm font-bold">
                  {promo.code}
                </div>
                <div className="flex items-center gap-1 text-green-400 text-sm font-medium">
                  <Percent size={12} />
                  -{promo.discountPercent}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {promo.usageCount}/{promo.usageLimit} {t("usageCount")}
                </div>
                {promo.expiresAt && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(promo.expiresAt).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePromo(promo)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${promo.isActive ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}
                >
                  {promo.isActive ? t("promoActive") : t("promoExpired")}
                </button>
                <button onClick={() => deletePromo(promo.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
