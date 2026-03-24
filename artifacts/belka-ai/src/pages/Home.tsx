import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { useRef, lazy, Suspense, useState } from "react";
import { ArrowRight, Code2, Network, Mic, Brain, Zap, Shield, Terminal, Check, Star, Crown } from "lucide-react";
import { ShinyText } from "@/components/ui-custom/ShinyText";
import { AgentAvatar } from "@/components/ui-custom/AgentAvatar";
import { BelkaLogo } from "@/components/layout/ChatSidebar";
import { CodeBackground } from "@/components/ui-custom/CodeBackground";
import { PricingModal } from "@/components/modals/PricingModal";
import { t } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { AgentRole } from "@workspace/api-client-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" } }),
} as const;

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <CodeBackground />

      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-200px] left-1/4 w-[800px] h-[800px] bg-primary/8 rounded-full blur-[180px] animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-[-200px] right-1/4 w-[700px] h-[700px] bg-secondary/8 rounded-full blur-[180px] animate-pulse" style={{ animationDuration: "12s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/3 rounded-full blur-[200px]" />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <BelkaLogo size={32} />
          <span className="font-display font-bold text-xl tracking-tight">BELKA AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href={user ? "/chat" : "/auth"}>
            <div className="px-4 py-2 rounded-full belka-gradient text-white text-sm font-medium transition-all cursor-pointer shadow-lg shadow-primary/20">
              {user ? t("launchApp") : t("login")}
            </div>
          </Link>
        </div>
      </nav>

      <section className="relative z-10 max-w-5xl mx-auto px-4 pt-12 pb-16 text-center">
        <motion.div initial="hidden" animate="visible" className="space-y-6">
          <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/50 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t("introducing")}</span>
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight leading-[1.1]">
            {t("heroTitle")} <br />
            <ShinyText>{t("heroTitleAccent")}</ShinyText>
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {t("heroSubtitle")}
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={user ? "/chat" : "/auth"}>
              <div className="px-6 py-3 rounded-full belka-gradient text-white font-medium flex items-center gap-2 hover:shadow-xl hover:shadow-primary/30 transition-all cursor-pointer text-sm">
                {t("startCoding")} <ArrowRight size={16} />
              </div>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-12 max-w-2xl mx-auto"
        >
          <ChatPreview />
        </motion.div>
      </section>

      <StatsSection />
      <FeaturesSection />
      <PricingSection />
      <HowItWorksSection />

      <section className="relative z-10 py-20 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-md mx-auto"
        >
          <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3">{t("readyToStart")}</h2>
          <p className="text-sm text-muted-foreground mb-6">{t("readyToStartDesc")}</p>
          <Link href={user ? "/chat" : "/auth"}>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full belka-gradient text-white font-medium hover:shadow-xl hover:shadow-primary/30 transition-all cursor-pointer text-sm">
              {t("startCoding")} <ArrowRight size={16} />
            </div>
          </Link>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        BELKA AI &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function ChatPreview() {
  return (
    <div className="glass-panel rounded-xl overflow-hidden border border-border shadow-2xl">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/50">
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/30" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/30" />
        </div>
        <span className="text-[10px] text-muted-foreground font-mono ml-2">BELKA CODER</span>
      </div>
      <div className="p-4 space-y-3 text-left">
        <div className="flex justify-end">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="bg-primary text-white px-3 py-2 rounded-2xl rounded-tr-sm text-sm max-w-[280px]"
          >
            {t("chatExample1")}
          </motion.div>
        </div>
        <div className="flex gap-2">
          <AgentAvatar role={AgentRole.coder} className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.9 }}
            className="glass-panel px-3 py-2 rounded-2xl rounded-tl-sm max-w-[320px]"
          >
            <ShinyText className="text-sm">{t("chatReply1")}</ShinyText>
            <div className="mt-2 rounded-lg bg-[#1a1b26] border border-white/10 overflow-hidden">
              <div className="flex items-center px-2 py-1 border-b border-white/5">
                <Terminal size={10} className="text-muted-foreground mr-1.5" />
                <span className="text-[10px] font-mono text-muted-foreground">server.ts</span>
              </div>
              <pre className="p-2 text-[10px] font-mono text-green-400/80 leading-relaxed">
{`import express from 'express';
const app = express();
app.use(authMiddleware());`}
              </pre>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function StatsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  const stats = [
    { value: "∞", label: t("statsCapabilities") },
    { value: "6", label: t("statsAgents") },
    { value: "50K+", label: t("statsMessages") },
    { value: "99.9%", label: t("statsUptime") },
  ];

  return (
    <section ref={ref} className="relative z-10 py-12 border-y border-border/30">
      <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <div className="text-2xl sm:text-3xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    { icon: Code2, color: "text-primary", title: t("featureBelka"), desc: t("featureBelkaDesc") },
    { icon: Network, color: "text-secondary", title: t("featureMulti"), desc: t("featureMultiDesc") },
    { icon: Mic, color: "text-green-400", title: t("featureVoice"), desc: t("featureVoiceDesc") },
    { icon: Brain, color: "text-orange-400", title: t("featureMemory"), desc: t("featureMemoryDesc") },
  ];

  return (
    <section className="relative z-10 py-16 max-w-5xl mx-auto px-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="glass-panel p-5 rounded-xl hover:-translate-y-1 transition-transform duration-300"
          >
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center mb-3 border border-border">
              <f.icon size={18} className={f.color} />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">{f.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function PricingSection() {
  const { user } = useAuth();
  const [pricingOpen, setPricingOpen] = useState(false);

  const plans = [
    {
      name: "Free",
      nameRu: t("pricingFree"),
      price: "$0",
      period: t("pricingMonth"),
      desc: t("pricingFreeDesc"),
      features: [
        "5 " + t("conversations") + "/" + t("pricingDay"),
        "BELKA CODER",
        t("featureVoice"),
        t("pricingBasicSupport"),
      ],
      icon: Code2,
      color: "border-border",
      btnClass: "bg-muted text-foreground hover:bg-muted/80",
      key: "free",
    },
    {
      name: "Pro",
      nameRu: t("pricingPro"),
      price: "$19",
      period: t("pricingMonth"),
      desc: t("pricingProDesc"),
      features: [
        t("pricingUnlimited") + " " + t("conversations"),
        "BELKA CODER Pro",
        t("featureMulti"),
        t("featureMemory"),
        "GitHub " + t("pricingIntegration"),
        t("pricingPrioritySupport"),
      ],
      icon: Star,
      color: "border-primary",
      btnClass: "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20",
      key: "pro",
      popular: true,
    },
    {
      name: "Enterprise",
      nameRu: t("pricingEnterprise"),
      price: "$99",
      period: t("pricingMonth"),
      desc: t("pricingEnterpriseDesc"),
      features: [
        t("pricingUnlimited") + " " + t("pricingEverything"),
        "BELKA CODER Enterprise",
        t("pricingCustomAgents"),
        "API " + t("pricingAccess"),
        t("pricingDedicatedSupport"),
        "SLA 99.99%",
      ],
      icon: Crown,
      color: "border-secondary",
      btnClass: "bg-secondary text-white hover:bg-secondary/90 shadow-lg shadow-secondary/20",
      key: "enterprise",
    },
  ];

  const handleChoose = () => {
    if (!user) {
      window.location.href = import.meta.env.BASE_URL + "auth";
      return;
    }
    setPricingOpen(true);
  };

  return (
    <section className="relative z-10 py-20 max-w-5xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-2xl sm:text-3xl font-display font-bold mb-3">{t("pricingTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("pricingSubtitle")}</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, i) => {
          const PlanIcon = plan.icon;
          return (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className={`relative glass-panel rounded-2xl p-6 border-2 ${plan.color} ${plan.popular ? "scale-[1.02] md:scale-105" : ""} transition-transform flex flex-col`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wider">
                  {t("pricingPopular")}
                </div>
              )}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border">
                  <PlanIcon size={16} className={plan.popular ? "text-primary" : "text-muted-foreground"} />
                </div>
                <h3 className="text-lg font-bold text-foreground">{plan.nameRu}</h3>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground ml-1">/ {plan.period}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-5">{plan.desc}</p>
              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f, fi) => (
                  <li key={fi} className="flex items-start gap-2 text-xs text-foreground">
                    <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleChoose}
                className={`w-full py-2.5 rounded-xl text-center text-sm font-semibold transition-all cursor-pointer mt-6 ${plan.btnClass}`}
              >
                {t("choosePlan")}
              </button>
            </motion.div>
          );
        })}
      </div>

      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { icon: Terminal, title: t("step1Title"), desc: t("step1Desc") },
    { icon: Zap, title: t("step2Title"), desc: t("step2Desc") },
    { icon: Shield, title: t("step3Title"), desc: t("step3Desc") },
  ];

  return (
    <section className="relative z-10 py-16 max-w-4xl mx-auto px-4">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-2xl sm:text-3xl font-display font-bold text-center mb-10"
      >
        {t("howItWorks")}
      </motion.h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.4 }}
            className="text-center"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
              <s.icon size={20} className="text-primary" />
            </div>
            <div className="text-xs font-bold text-primary mb-1">0{i + 1}</div>
            <h3 className="text-sm font-semibold text-foreground mb-1">{s.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
