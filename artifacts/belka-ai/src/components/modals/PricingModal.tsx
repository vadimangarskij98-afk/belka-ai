import { useState, useEffect } from "react";
import { X, Check, Zap, Building2, Sparkles, CreditCard, ArrowLeft, CheckCircle, Tag } from "lucide-react";
import { t, getLang } from "@/lib/i18n";

const planMeta: Record<string, { icon: typeof Sparkles; color: string; popular?: boolean; features: string[]; featuresRu: string[] }> = {
  free: {
    icon: Sparkles,
    color: "text-muted-foreground",
    features: ["10K requests", "BELKA CODER", "Community support"],
    featuresRu: ["10K запросов", "BELKA CODER", "Поддержка сообщества"],
  },
  pro: {
    icon: Zap,
    color: "text-primary",
    popular: true,
    features: ["500K requests", "BELKA CODER Pro", "Priority support", "MCP access"],
    featuresRu: ["500K запросов", "BELKA CODER Pro", "Приоритетная поддержка", "Доступ к MCP"],
  },
  enterprise: {
    icon: Building2,
    color: "text-secondary",
    features: ["Unlimited requests", "BELKA CODER Enterprise", "Dedicated support", "API access"],
    featuresRu: ["Безлимитные запросы", "BELKA CODER Enterprise", "Выделенная поддержка", "API доступ"],
  },
};

const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
const API = `${BASE}/api`.replace(/\/\/+/g, "/");

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("belka-token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export function PricingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [cardData, setCardData] = useState(() => {
    const saved = localStorage.getItem("belka-card");
    return saved ? JSON.parse(saved) : { number: "", expiry: "", cvv: "", holder: "" };
  });
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<{ valid: boolean; discount: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetch(`${API}/subscriptions/plans`)
        .then(r => r.json())
        .then(d => setPlans(d.plans || []))
        .catch(() => {});
    }
  }, [open]);

  if (!open) return null;

  const isRu = getLang() === "ru";
  const currentUserPlan = (() => { try { return JSON.parse(localStorage.getItem("belka-user") || "{}").plan; } catch { return null; } })() || localStorage.getItem("belka-plan") || "free";
  const hasCard = !!localStorage.getItem("belka-card");
  const maskedCard = hasCard && cardData.number
    ? "•••• •••• •••• " + cardData.number.replace(/\s/g, "").slice(-4)
    : null;

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    try {
      const res = await fetch(`${API}/subscriptions/apply-promo`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setPromoResult(null);
        setError(data.error || (isRu ? "Промокод не найден" : "Promo code not found"));
        return;
      }
      const data = await res.json();
      setPromoResult({ valid: true, discount: data.discount });
      setError(null);
    } catch {
      setError(isRu ? "Ошибка при проверке промокода" : "Error checking promo code");
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    setProcessing(true);
    setError(null);

    const { cvv, ...safeData } = cardData;
    if (cardData.number) {
      localStorage.setItem("belka-card", JSON.stringify(safeData));
    }

    try {
      const res = await fetch(`${API}/subscriptions/subscribe`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          planId: selectedPlan,
          promoCode: promoResult?.valid ? promoCode.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (isRu ? "Ошибка оплаты" : "Payment error"));
        setProcessing(false);
        return;
      }

      localStorage.setItem("belka-plan", selectedPlan);
      const storedUser = localStorage.getItem("belka-user");
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          userData.plan = selectedPlan;
          localStorage.setItem("belka-user", JSON.stringify(userData));
        } catch {}
      }
      setProcessing(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedPlan(null);
        setPromoCode("");
        setPromoResult(null);
        onClose();
        window.location.reload();
      }, 2000);
    } catch {
      setError(isRu ? "Ошибка соединения" : "Connection error");
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">{isRu ? "Оплата прошла успешно!" : "Payment Successful!"}</h3>
          <p className="text-sm text-muted-foreground">{isRu ? "Ваш план обновлён" : "Your plan has been updated"}</p>
        </div>
      </div>
    );
  }

  if (selectedPlan) {
    const meta = planMeta[selectedPlan] || planMeta.free;
    const planData = plans.find(p => p.planId === selectedPlan);
    const price = planData ? `$${planData.price}` : "$0";
    const finalPrice = promoResult?.valid ? `$${(planData?.price || 0) * (1 - promoResult.discount / 100)}` : price;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <button onClick={() => { setSelectedPlan(null); setPromoResult(null); setPromoCode(""); setError(null); }} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-sm font-semibold text-foreground">{isRu ? "Оплата" : "Payment"} — {selectedPlan || ""} {price}/{isRu ? "мес" : "mo"}</h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {hasCard && maskedCard && (
              <div className="p-3 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-primary" />
                    <span className="text-sm font-mono text-foreground">{maskedCard}</span>
                  </div>
                  <button
                    onClick={handleSubscribe}
                    disabled={processing}
                    className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    {processing ? (isRu ? "Обработка..." : "Processing...") : (isRu ? "Оплатить" : "Pay")}
                  </button>
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground text-center">{hasCard ? (isRu ? "или введите новую карту" : "or enter a new card") : (isRu ? "Введите данные карты" : "Enter card details")}</div>

            <div className="space-y-2">
              <input
                value={cardData.number}
                onChange={(e) => setCardData({ ...cardData, number: e.target.value.replace(/\D/g, "").replace(/(\d{4})/g, "$1 ").trim().slice(0, 19) })}
                placeholder={t("cardNumber")}
                maxLength={19}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors font-mono"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={cardData.expiry}
                  onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                  placeholder={t("cardExpiry")}
                  maxLength={5}
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                />
                <input
                  value={cardData.cvv}
                  onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                  placeholder={t("cardCvv")}
                  maxLength={4}
                  type="password"
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                />
                <input
                  value={cardData.holder}
                  onChange={(e) => setCardData({ ...cardData, holder: e.target.value.toUpperCase() })}
                  placeholder={t("cardHolder")}
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={promoCode}
                  onChange={e => { setPromoCode(e.target.value); setPromoResult(null); }}
                  placeholder={isRu ? "Промокод" : "Promo code"}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:border-primary transition-colors"
                />
              </div>
              <button
                onClick={handleApplyPromo}
                className="px-3 py-2 rounded-xl border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                {isRu ? "Применить" : "Apply"}
              </button>
            </div>

            {promoResult?.valid && (
              <div className="flex items-center gap-1.5 text-xs text-green-400">
                <Check size={12} />
                {isRu ? `Скидка ${promoResult.discount}%! Итого: ${finalPrice}/мес` : `${promoResult.discount}% off! Total: ${finalPrice}/mo`}
              </div>
            )}

            {error && (
              <div className="text-xs text-red-400 text-center">{error}</div>
            )}

            <button
              onClick={handleSubscribe}
              disabled={processing || !cardData.number || !cardData.expiry || !cardData.holder}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
            >
              {processing ? (isRu ? "Обработка..." : "Processing...") : (isRu ? `Оплатить ${promoResult?.valid ? finalPrice : price}/мес` : `Pay ${promoResult?.valid ? finalPrice : price}/mo`)}
            </button>

            <p className="text-[10px] text-muted-foreground text-center">{isRu ? "Безопасная оплата. Можно отменить в любое время." : "Secure payment. Cancel anytime."}</p>
          </div>
        </div>
      </div>
    );
  }

  const displayPlans = plans.length > 0
    ? plans.map(p => ({ key: p.planId, price: `$${p.price}`, ...planMeta[p.planId] || planMeta.free, dbPlan: p }))
    : Object.entries(planMeta).map(([key, meta]) => ({ key, price: key === "free" ? "$0" : key === "pro" ? "$29" : "$99", ...meta }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">{t("pricingTitle")}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-2.5 overflow-y-auto">
          {displayPlans.map((plan) => {
            const Icon = plan.icon;
            const features = isRu ? plan.featuresRu : plan.features;
            return (
              <div key={plan.key} className={`rounded-xl border p-3 ${plan.popular ? "border-primary bg-primary/5" : "border-border"}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={plan.color} />
                    <span className="text-sm font-semibold text-foreground">{t(plan.key)}</span>
                    {plan.popular && <span className="text-[9px] px-1.5 py-0.5 bg-primary text-white rounded-full font-medium">{t("mostPopular")}</span>}
                  </div>
                  <span className="text-lg font-bold text-foreground">{plan.price}<span className="text-[10px] text-muted-foreground font-normal">{t("perMonth")}</span></span>
                </div>
                <div className="space-y-1 mb-2.5">
                  {features.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check size={11} className="text-primary flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => plan.key === currentUserPlan ? null : setSelectedPlan(plan.key)}
                  disabled={plan.key === currentUserPlan}
                  className={`w-full py-1.5 rounded-lg text-xs font-medium transition-colors ${plan.key === currentUserPlan ? "bg-muted text-muted-foreground cursor-default" : "bg-primary text-white hover:bg-primary/90"}`}
                >
                  {plan.key === currentUserPlan ? (isRu ? "Текущий план" : "Current Plan") : t("choosePlan")}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
