import { useEffect, useMemo, useState } from "react";
import { X, Check, Zap, Building2, Sparkles, ArrowLeft, CheckCircle, Tag } from "lucide-react";
import { apiFetch, buildApiUrl, jsonHeaders } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";

const API = buildApiUrl();

type PlanMeta = {
  icon: typeof Sparkles;
  color: string;
  popular?: boolean;
  features: string[];
  featuresRu: string[];
};

type SubscriptionPlan = {
  planId: string;
  name?: string;
  price: number;
  tokensPerMonth?: number;
  features?: string[];
};

type DisplayPlan = PlanMeta & {
  key: string;
  price: string;
  numericPrice: number;
  tokensPerMonth?: number;
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

function getFallbackPlans(): DisplayPlan[] {
  return Object.entries(planMeta).map(([key, meta]) => ({
    ...meta,
    key,
    price: key === "free" ? "$0" : key === "pro" ? "$29" : "$99",
    numericPrice: key === "free" ? 0 : key === "pro" ? 29 : 99,
    tokensPerMonth: undefined,
  }));
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

  const displayPlans = useMemo<DisplayPlan[]>(() => {
    if (plans.length > 0) {
      return plans.map((plan) => {
        const meta = planMeta[plan.planId] || planMeta.free;
        return {
          ...meta,
          key: plan.planId,
          price: `$${plan.price}`,
          numericPrice: plan.price,
          features: plan.features?.length ? plan.features : meta.features,
          featuresRu: plan.features?.length ? plan.features : meta.featuresRu,
          tokensPerMonth: plan.tokensPerMonth,
        };
      });
    }

    return getFallbackPlans();
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
    if (!selectedPlan || !selectedPlanData) return;

    if (selectedPlanData.numericPrice > 0) {
      setError(
        isRu
          ? "Платные тарифы пока не подключены к self-service billing."
          : "Paid tiers are not connected to self-service billing yet.",
      );
      return;
    }

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
        <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-500 bg-green-500/10">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-foreground">
            {isRu ? "План обновлён" : "Plan updated"}
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
    const basePrice = selectedPlanData.numericPrice;
    const finalPrice = promoResult
      ? `$${(basePrice * (1 - promoResult.discount / 100)).toFixed(2)}`
      : selectedPlanData.price;
    const isPaidPlan = selectedPlanData.numericPrice > 0;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <button
              onClick={() => {
                setSelectedPlan(null);
                setPromoCode("");
                setPromoResult(null);
                setError(null);
              }}
              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-sm font-semibold text-foreground">
              {isRu ? "Подтверждение плана" : "Confirm plan"}
            </h2>
            <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4 p-5">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
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
                    <Check size={11} className="flex-shrink-0 text-primary" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {typeof selectedPlanData.tokensPerMonth === "number" && (
                <div className="mt-3 text-xs text-muted-foreground">
                  {isRu ? "Месячный лимит токенов" : "Monthly token limit"}:{" "}
                  <span className="font-medium text-foreground">
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
                  className="w-full rounded-xl border border-border bg-background py-2 pl-8 pr-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </div>
              <button
                onClick={handleApplyPromo}
                className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                {isRu ? "Применить" : "Apply"}
              </button>
            </div>

            {promoResult && (
              <div className="flex items-center gap-1.5 text-xs text-green-400">
                <Check size={12} />
                {isRu
                  ? `Промокод применён: -${promoResult.discount}%`
                  : `Promo applied: -${promoResult.discount}%`}
              </div>
            )}

            <div className="rounded-xl border border-border bg-background/60 p-3 text-xs text-muted-foreground">
              {isRu
                ? "Этот экран управляет активным планом внутри BELKA AI. Самостоятельная оплата пока не подключена, поэтому платные тарифы не активируются напрямую из модалки."
                : "This screen manages the active BELKA AI plan. Self-service billing is not connected yet, so paid tiers cannot be activated directly from this modal."}
            </div>

            {isPaidPlan && (
              <div className="rounded-xl border border-secondary/20 bg-secondary/10 p-3 text-xs leading-5 text-secondary">
                {isRu
                  ? "Платные тарифы пока идут через ручную активацию. Сначала подключаем billing-провайдера, и только потом открываем self-service."
                  : "Paid tiers still use a manual activation flow. Self-service will be enabled only after a real billing provider is connected."}
              </div>
            )}

            {error && <div className="text-xs text-red-400">{error}</div>}

            <button
              onClick={handleActivatePlan}
              disabled={processing || isPaidPlan}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing
                ? (isRu ? "Обновляю план..." : "Updating plan...")
                : isPaidPlan
                  ? (isRu ? "Self-service пока недоступен" : "Self-service not available yet")
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
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold text-foreground">{t("pricingTitle")}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto p-4">
          <div className="rounded-xl border border-border bg-background/60 p-3 text-xs text-muted-foreground">
            {isRu
              ? "Выберите план для текущего аккаунта. Данные о тарифах и промокодах приходят из backend, но платные тарифы пока не активируются без подключённого billing-провайдера."
              : "Choose a plan for the current account. Plan and promo data come from the backend, but paid tiers remain unavailable until billing is connected."}
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
            const isPaidPlan = plan.numericPrice > 0;

            return (
              <div key={plan.key} className={`rounded-xl border p-3 ${plan.popular ? "border-primary bg-primary/5" : "border-border"}`}>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={plan.color} />
                    <span className="text-sm font-semibold text-foreground">{getPlanLabel(plan.key)}</span>
                    {plan.popular && (
                      <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-medium text-white">
                        {t("mostPopular")}
                      </span>
                    )}
                  </div>
                  <span className="text-lg font-bold text-foreground">
                    {plan.price}
                    <span className="text-[10px] font-normal text-muted-foreground">{t("perMonth")}</span>
                  </span>
                </div>

                <div className="mb-2.5 space-y-1">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check size={11} className="flex-shrink-0 text-primary" />
                      {feature}
                    </div>
                  ))}
                </div>

                {isPaidPlan && (
                  <div className="mb-2 rounded-lg border border-secondary/20 bg-secondary/10 px-2.5 py-2 text-[11px] leading-5 text-secondary">
                    {isRu ? "Ручная активация до подключения billing" : "Manual activation until billing is connected"}
                  </div>
                )}

                <button
                  onClick={() => {
                    if (!isCurrent) {
                      setSelectedPlan(plan.key);
                      setError(null);
                    }
                  }}
                  disabled={isCurrent}
                  className={`w-full rounded-lg py-1.5 text-xs font-medium transition-colors ${isCurrent ? "cursor-default bg-muted text-muted-foreground" : "bg-primary text-white hover:bg-primary/90"}`}
                >
                  {isCurrent
                    ? (isRu ? "Текущий план" : "Current plan")
                    : isPaidPlan
                      ? (isRu ? "Посмотреть условия" : "Review access")
                      : t("choosePlan")}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
