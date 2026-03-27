import { useEffect, useMemo, useState } from "react";
import { X, Check, Zap, Building2, Sparkles, ArrowLeft, CheckCircle, Tag } from "lucide-react";
import { apiFetch, buildApiUrl, jsonHeaders } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t, getLang } from "@/lib/i18n";

const API = buildApiUrl();

type PlanMeta = {
  icon: typeof Sparkles;
  color: string;
  popular?: boolean;
  features: string[];
  featuresRu: string[];
};

const planMeta: Record<string, PlanMeta> = {
  free: {
    icon: Sparkles,
    color: "text-muted-foreground",
    features: ["Starter access", "BELKA CODER", "Community support"],
    featuresRu: ["Стартовый доступ", "BELKA CODER", "Поддержка сообщества"],
  },
  pro: {
    icon: Zap,
    color: "text-primary",
    popular: true,
    features: ["Extended usage limits", "BELKA CODER Pro", "Priority support", "MCP access"],
    featuresRu: ["Расширенные лимиты", "BELKA CODER Pro", "Приоритетная поддержка", "Доступ к MCP"],
  },
  enterprise: {
    icon: Building2,
    color: "text-secondary",
    features: ["Advanced usage limits", "BELKA CODER Enterprise", "Dedicated support", "API access"],
    featuresRu: ["Продвинутые лимиты", "BELKA CODER Enterprise", "Выделенная поддержка", "API доступ"],
  },
};

type SubscriptionPlan = {
  planId: string;
  name?: string;
  price: number;
  tokensPerMonth?: number;
  features?: string[];
};

function getPlanLabel(planId: string): string {
  switch (planId) {
    case "free":
      return t("free");
    case "pro":
      return t("pro");
    case "enterprise":
      return t("enterprise");
    default:
      return planId;
  }
}

export function PricingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const auth = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<{ discount: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRu = getLang() === "ru";
  const currentUserPlan = auth.user?.plan || localStorage.getItem("belka-plan") || "free";

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void apiFetch(`${API}/subscriptions/plans`)
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load plans");
        }

        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        setPlans(Array.isArray(data.plans) ? data.plans : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load plans");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSelectedPlan(null);
      setPromoCode("");
      setPromoResult(null);
      setProcessing(false);
      setSuccess(false);
      setError(null);
    }
  }, [open]);

  const displayPlans = useMemo(() => {
    if (plans.length > 0) {
      return plans.map((plan) => {
        const meta = planMeta[plan.planId] || planMeta.free;
        return {
          ...meta,
          key: plan.planId,
          price: `$${plan.price}`,
          features: plan.features?.length ? plan.features : meta.features,
          featuresRu: plan.features?.length ? plan.features : meta.featuresRu,
          tokensPerMonth: plan.tokensPerMonth,
        };
      });
    }

    return Object.entries(planMeta).map(([key, meta]) => ({
      ...meta,
      key,
      price: key === "free" ? "$0" : key === "pro" ? "$29" : "$99",
      tokensPerMonth: undefined,
    }));
  }, [plans]);

  const selectedPlanData = displayPlans.find((plan) => plan.key === selectedPlan) ?? null;

  async function handleApplyPromo() {
    if (!promoCode.trim()) return;

    try {
      const response = await apiFetch(`${API}/subscriptions/apply-promo`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setPromoResult(null);
        setError(data.error || (isRu ? "Промокод не найден" : "Promo code not found"));
        return;
      }

      setPromoResult({ discount: data.discount });
      setError(null);
    } catch {
      setError(isRu ? "Не удалось проверить промокод" : "Could not validate promo code");
    }
  }

  async function handleActivatePlan() {
    if (!selectedPlan) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await apiFetch(`${API}/subscriptions/subscribe`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          planId: selectedPlan,
          promoCode: promoResult ? promoCode.trim() : undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || (isRu ? "Не удалось активировать план" : "Could not activate plan"));
        return;
      }

      localStorage.setItem("belka-plan", selectedPlan);
      setSuccess(true);

      window.setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);
    } catch {
      setError(isRu ? "Ошибка соединения" : "Connection error");
    } finally {
      setProcessing(false);
    }
  }

  if (!open) return null;

  if (success && selectedPlanData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            {isRu ? "План обновлен" : "Plan updated"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isRu
              ? `Активирован план ${getPlanLabel(selectedPlanData.key)}.`
              : `${getPlanLabel(selectedPlanData.key)} is now active.`}
          </p>
        </div>
      </div>
    );
  }

  if (selectedPlanData) {
    const basePrice = Number(selectedPlanData.price.replace("$", ""));
    const finalPrice = promoResult
      ? `$${(basePrice * (1 - promoResult.discount / 100)).toFixed(2)}`
      : selectedPlanData.price;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <button
              onClick={() => {
                setSelectedPlan(null);
                setPromoCode("");
                setPromoResult(null);
                setError(null);
              }}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-sm font-semibold text-foreground">
              {isRu ? "Подтверждение плана" : "Confirm plan"}
            </h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <div className="text-sm font-semibold text-foreground">{getPlanLabel(selectedPlanData.key)}</div>
                  <div className="text-xs text-muted-foreground">
                    {isRu ? "Смена активного плана BELKA AI" : "Switch active BELKA AI plan"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground">{finalPrice}</div>
                  <div className="text-[10px] text-muted-foreground">{t("perMonth")}</div>
                </div>
              </div>

              <div className="space-y-1">
                {(isRu ? selectedPlanData.featuresRu : selectedPlanData.features).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check size={11} className="text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {typeof selectedPlanData.tokensPerMonth === "number" && (
                <div className="mt-3 text-xs text-muted-foreground">
                  {isRu ? "Месячный лимит токенов" : "Monthly token limit"}:{" "}
                  <span className="text-foreground font-medium">
                    {selectedPlanData.tokensPerMonth.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value);
                    setPromoResult(null);
                  }}
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

            {promoResult && (
              <div className="flex items-center gap-1.5 text-xs text-green-400">
                <Check size={12} />
                {isRu
                  ? `Промокод применен: -${promoResult.discount}%`
                  : `Promo applied: -${promoResult.discount}%`}
              </div>
            )}

            <div className="rounded-xl border border-border bg-background/60 p-3 text-xs text-muted-foreground">
              {isRu
                ? "Этот экран меняет активный план внутри BELKA AI. Платежный провайдер в этом окружении не подключен отдельно."
                : "This screen changes the active BELKA AI plan. A separate external billing provider is not connected in this environment."}
            </div>

            {error && <div className="text-xs text-red-400">{error}</div>}

            <button
              onClick={handleActivatePlan}
              disabled={processing}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
            >
              {processing
                ? (isRu ? "Обновляю план..." : "Updating plan...")
                : (isRu ? `Активировать ${getPlanLabel(selectedPlanData.key)}` : `Activate ${getPlanLabel(selectedPlanData.key)}`)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">{t("pricingTitle")}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <div className="rounded-xl border border-border bg-background/60 p-3 text-xs text-muted-foreground">
            {isRu
              ? "Выберите план для текущего аккаунта. Интерфейс использует реальные данные планов и промокодов из backend."
              : "Choose a plan for the current account. This screen uses real plan and promo data from the backend."}
          </div>

          {loading && (
            <div className="text-sm text-muted-foreground">
              {isRu ? "Загружаю планы..." : "Loading plans..."}
            </div>
          )}

          {error && !loading && (
            <div className="text-sm text-red-400">{error}</div>
          )}

          {displayPlans.map((plan) => {
            const Icon = plan.icon;
            const features = isRu ? plan.featuresRu : plan.features;
            const isCurrent = plan.key === currentUserPlan;

            return (
              <div key={plan.key} className={`rounded-xl border p-3 ${plan.popular ? "border-primary bg-primary/5" : "border-border"}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={plan.color} />
                    <span className="text-sm font-semibold text-foreground">{getPlanLabel(plan.key)}</span>
                    {plan.popular && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-primary text-white rounded-full font-medium">
                        {t("mostPopular")}
                      </span>
                    )}
                  </div>
                  <span className="text-lg font-bold text-foreground">
                    {plan.price}
                    <span className="text-[10px] text-muted-foreground font-normal">{t("perMonth")}</span>
                  </span>
                </div>

                <div className="space-y-1 mb-2.5">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check size={11} className="text-primary flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (!isCurrent) {
                      setSelectedPlan(plan.key);
                      setError(null);
                    }
                  }}
                  disabled={isCurrent}
                  className={`w-full py-1.5 rounded-lg text-xs font-medium transition-colors ${isCurrent ? "bg-muted text-muted-foreground cursor-default" : "bg-primary text-white hover:bg-primary/90"}`}
                >
                  {isCurrent ? (isRu ? "Текущий план" : "Current plan") : t("choosePlan")}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
