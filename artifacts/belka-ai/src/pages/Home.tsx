import { Link } from "wouter";
import { motion, type Variants } from "framer-motion";
import { useState } from "react";
import {
  ArrowRight,
  AudioLines,
  Bot,
  Braces,
  BrainCircuit,
  Check,
  CirclePlay,
  Code2,
  Github,
  Layers3,
  Mic,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  WandSparkles,
} from "lucide-react";
import { ShinyText } from "@/components/ui-custom/ShinyText";
import { AgentAvatar } from "@/components/ui-custom/AgentAvatar";
import { BelkaLogo } from "@/components/layout/ChatSidebar";
import { SplashScreen } from "@/components/ui-custom/SplashScreen";
import { PricingModal } from "@/components/modals/PricingModal";
import { useAuth } from "@/lib/auth";
import { AgentRole } from "@workspace/api-client-react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay,
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

const partnerLogos = [
  { name: "Supabase", src: "/partners/supabase.png" },
  { name: "Pollinations", src: "/partners/pollinations.png" },
  { name: "GitHub", src: "/partners/github.svg" },
  { name: "InsForge", src: "/partners/insforge.svg" },
];

const launchModes = [
  {
    icon: Code2,
    title: "Code mode",
    description: "Single-agent execution for clean implementation, diffs, debugging, and repo work.",
    accent: "text-primary",
  },
  {
    icon: BrainCircuit,
    title: "Multi-agent mode",
    description: "Research, verification, coding, and review split across coordinated agents.",
    accent: "text-secondary",
  },
  {
    icon: AudioLines,
    title: "Voice control",
    description: "A Russian voice layer tuned for command routing, dictation, and quick project control.",
    accent: "text-accent",
  },
];

const capabilityCards = [
  {
    icon: Search,
    title: "Deep research loop",
    description: "BELKA can search, compare, verify, and surface strong engineering decisions instead of generic filler.",
  },
  {
    icon: ShieldCheck,
    title: "Safer execution",
    description: "Auth, MCP runtime, repo actions, and project tools stay routed through controlled backend paths.",
  },
  {
    icon: Mic,
    title: "Voice-first control",
    description: "Use spoken commands to navigate workspaces, send tasks, and steer the assistant without UI friction.",
  },
  {
    icon: WandSparkles,
    title: "Media-ready pipeline",
    description: "Images, voice, and prompt-driven workflows can be layered into the same product surface.",
  },
];

const techStack = [
  "React 19 UI surface",
  "Express + Drizzle backend core",
  "Postgres + Redis split infrastructure",
  "Railway agent / core separation",
  "Pollinations media + TTS layer",
  "GitHub + MCP orchestration",
];

const pricingTiers = [
  {
    key: "free",
    title: "Starter",
    price: "$0",
    description: "Good for exploring BELKA, testing voice control, and getting the product feel.",
    features: ["Daily chat usage", "Voice assistant basics", "Single workspace session", "Prompt-to-code flow"],
  },
  {
    key: "pro",
    title: "Pro",
    price: "$19",
    description: "For building real products with stronger agent orchestration and longer sessions.",
    features: ["Code + chat + image modes", "Multi-agent orchestration", "GitHub + MCP integration", "Priority runtime"],
    highlighted: true,
  },
  {
    key: "enterprise",
    title: "Studio",
    price: "$99",
    description: "For heavier teams, internal platforms, and custom deployment or governance requirements.",
    features: ["Custom agent roles", "Private infrastructure", "Extended memory strategy", "Operational support"],
  },
];

export default function Home() {
  const { user } = useAuth();
  const [pricingOpen, setPricingOpen] = useState(false);
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

  return (
    <SplashScreen>
      <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
        <div className="pointer-events-none absolute inset-0 hero-noise" />
        <div className="pointer-events-none absolute inset-0 surface-grid opacity-[0.18]" />

        <nav className="relative z-10 mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.05, rotateZ: 5 }}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-card/80 shadow-[0_14px_40px_rgba(0,0,0,0.08)]"
            >
              <BelkaLogo size={32} />
            </motion.div>
            <div>
              <div className="font-display text-lg font-bold tracking-tight">BELKA AI</div>
              <div className="text-xs text-muted-foreground">Multi-mode agent workspace</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link href={user ? "/chat" : "/auth"}>
              <div className="hidden rounded-full border border-border/70 bg-card/80 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary sm:inline-flex">
                {user ? "Open workspace" : "Sign in"}
              </div>
            </Link>
            <button
              onClick={() => setPricingOpen(true)}
              className="inline-flex items-center gap-2 rounded-full belka-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(46,160,67,0.18)]"
            >
              Launch BELKA
              <ArrowRight size={15} />
            </button>
          </div>
        </nav>

        <section className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-4 pb-14 pt-8 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:pt-14">
          <div className="max-w-2xl">
            <motion.div initial="hidden" animate="visible" className="space-y-7">
              <motion.div
                variants={fadeUp}
                custom={0}
                className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-primary"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Agent workspace for real builds
              </motion.div>

              <motion.div variants={fadeUp} custom={0.08} className="space-y-4">
                <h1 className="max-w-3xl text-5xl font-bold leading-[0.98] tracking-[-0.05em] sm:text-6xl xl:text-7xl">
                  Build with
                  <br />
                  <ShinyText className="block">voice, code, and coordinated agents</ShinyText>
                </h1>
                <p className="max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                  BELKA turns chat, coding, MCP tooling, media generation, and voice control into one clean product
                  surface. It is built to look premium, think precisely, and hold up during real project work.
                </p>
              </motion.div>

              <motion.div variants={fadeUp} custom={0.16} className="flex flex-col gap-3 sm:flex-row">
                <Link href={user ? "/chat" : "/auth"}>
                  <div className="inline-flex items-center justify-center gap-2 rounded-2xl belka-gradient px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(46,160,67,0.18)] transition-transform hover:translate-y-[-1px]">
                    Enter workspace
                    <ArrowRight size={16} />
                  </div>
                </Link>

                <a
                  href={`${base}/promo-video.mp4`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/80 px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                >
                  <CirclePlay size={16} />
                  Watch the product
                </a>
              </motion.div>

              <motion.div variants={fadeUp} custom={0.24} className="grid gap-3 sm:grid-cols-3">
                {launchModes.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="brand-shell rounded-[24px] p-4">
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-card/80">
                        <Icon size={18} className={item.accent} />
                      </div>
                      <div className="mb-1 text-sm font-semibold text-foreground">{item.title}</div>
                      <p className="text-xs leading-6 text-muted-foreground">{item.description}</p>
                    </div>
                  );
                })}
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.28, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <HeroStage />
          </motion.div>
        </section>

        <section className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-8">
          <div className="section-shell overflow-hidden px-5 py-5 sm:px-8">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Works with the stack you already use</div>
                <div className="mt-1 text-sm text-foreground">Original partner logos from official sources</div>
              </div>
              <div className="hidden rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs text-muted-foreground sm:inline-flex">
                Supabase, Pollinations, GitHub, InsForge
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {partnerLogos.map((partner, index) => (
                <motion.div
                  key={partner.name}
                  className="partner-logo flex min-h-[88px] items-center justify-center gap-3 rounded-2xl border border-border/70 bg-card/70 px-6 py-4"
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ delay: index * 0.08, duration: 0.45 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                >
                  <img
                    src={`${base}${partner.src}`}
                    alt={partner.name}
                    className={`h-7 w-auto object-contain ${partner.name === "GitHub" ? "dark:invert" : ""}`}
                  />
                  <span className="text-sm font-medium text-foreground/90">{partner.name}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto mt-8 grid w-full max-w-7xl gap-6 px-4 sm:px-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="section-shell p-6 sm:p-8">
            <SectionHeading
              eyebrow="Execution surface"
              title="One interface for code, search, tools, voice, and review"
              description="The product is structured so the assistant can move from prompt understanding into action without looking like a toy IDE or a generic chatbot."
            />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {capabilityCards.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    whileHover={{ scale: 1.03, y: -5, rotateX: 3, rotateY: 3 }}
                    style={{ perspective: 1000 }}
                    className="rounded-[24px] border border-border/70 bg-card/70 p-5 transition-colors hover:border-primary/40 will-change-transform"
                  >
                    <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-muted/80 text-primary">
                      <Icon size={18} />
                    </div>
                    <div className="mb-2 text-base font-semibold text-foreground">{item.title}</div>
                    <p className="text-sm leading-7 text-muted-foreground">{item.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="section-shell p-6 sm:p-8">
            <SectionHeading
              eyebrow="3D-flavored product shell"
              title="A visual system that feels engineered"
              description="Perspective, layered surfaces, and structured motion keep the brand premium without falling into generic neon-blue AI styling."
            />

            <div className="relative mt-8 grid gap-4">
              {techStack.map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ delay: index * 0.06, duration: 0.45 }}
                  whileHover={{ scale: 1.04, zIndex: 10, transition: { duration: 0.2 } }}
                  className="brand-shell rounded-[26px] p-[1px] transform-gpu will-change-transform"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <motion.div
                    animate={{ y: [0, index % 2 === 0 ? -5 : 5, 0] }}
                    transition={{ duration: 4 + index * 0.5, repeat: Infinity, ease: "easeInOut" }}
                    className="rounded-[25px] border border-border/70 bg-card/80 px-5 py-4 transition-colors hover:border-primary/50"
                    style={{
                      transform: `perspective(1400px) rotateX(${6 - index}deg) rotateY(${index % 2 === 0 ? -6 : 5}deg) translateZ(10px)`,
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <div className="flex items-center gap-3" style={{ transform: "translateZ(10px)" }}>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl belka-gradient text-white shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
                        <Layers3 size={16} />
                      </div>
                      <div className="text-sm font-semibold text-foreground drop-shadow-sm">{item}</div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto mt-8 w-full max-w-7xl px-4 sm:px-8">
          <div className="section-shell p-6 sm:p-8">
            <SectionHeading
              eyebrow="Chat, code, multi-agent"
              title="Three modes with three different interaction promises"
              description="Chat stays conversational. Code mode stays execution-focused. Multi-agent mode coordinates multiple specialists and surfaces the work clearly."
            />

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {[
                {
                  title: "Chat mode",
                  icon: Sparkles,
                  text: "Fast answers, stack choices, architecture ideas, and concise product guidance with a clean assistant rhythm.",
                },
                {
                  title: "Code mode",
                  icon: Braces,
                  text: "Structured task execution, file work, diffs, validation, and clearer tool feedback during implementation.",
                },
                {
                  title: "Multi-agent mode",
                  icon: Bot,
                  text: "Research, verification, review, and coding split into visible roles so heavy requests do not collapse into one blob.",
                },
              ].map((card, index) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08, duration: 0.45 }}
                    whileHover={{ scale: 1.03, y: -6, rotateX: 2, rotateY: -2 }}
                    style={{ perspective: 1000 }}
                    className="brand-shell rounded-[28px] p-[1px] will-change-transform"
                  >
                    <div className="rounded-[27px] border border-border/70 bg-card/80 p-5 transition-colors hover:border-primary/40 h-full flex flex-col">
                      <div className="mb-4 flex items-center gap-3">
                        <motion.div 
                          whileHover={{ rotate: 10, scale: 1.1 }}
                          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted/80 text-primary transition-transform"
                        >
                          <Icon size={18} />
                        </motion.div>
                        <div className="text-base font-semibold text-foreground">{card.title}</div>
                      </div>
                      <p className="text-sm leading-7 text-muted-foreground grow">{card.text}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto mt-8 w-full max-w-7xl px-4 pb-24 sm:px-8">
          <div className="section-shell p-6 sm:p-8">
            <SectionHeading
              eyebrow="Plans"
              title="Start lean, scale into the full BELKA surface"
              description="The pricing is presented honestly: clear mode access, clean feature tiers, and no fake payment steps."
            />

            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {pricingTiers.map((tier, index) => (
                <motion.div
                  key={tier.key}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.02, y: -8, rotateX: 2, rotateY: -2 }}
                  style={{ perspective: 1000 }}
                  className={`relative rounded-[28px] border p-6 will-change-transform ${
                    tier.highlighted
                      ? "border-primary/30 bg-primary/10 shadow-[0_22px_48px_rgba(46,160,67,0.14)]"
                      : "border-border/70 bg-card/70"
                  }`}
                >
                  {tier.highlighted && (
                    <motion.div 
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -top-3 left-5 inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white shadow-lg"
                    >
                      <Star size={12} />
                      Most practical
                    </motion.div>
                  )}
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-foreground">{tier.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{tier.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-foreground">{tier.price}</div>
                      <div className="text-xs text-muted-foreground">per month</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {tier.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2 text-sm text-foreground">
                        <Check size={15} className="mt-0.5 flex-shrink-0 text-primary" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setPricingOpen(true)}
                    className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                      tier.highlighted
                        ? "belka-gradient text-white hover:opacity-90 hover:scale-[1.02]"
                        : "border border-border/70 bg-card/80 text-foreground hover:border-primary/30 hover:text-primary hover:scale-[1.02]"
                    }`}
                  >
                    Choose {tier.title}
                    <ArrowRight size={15} />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <footer className="relative z-10 border-t border-border/50 px-4 py-6 text-center text-xs text-muted-foreground sm:px-8">
          BELKA AI © {new Date().getFullYear()} · Crafted for serious product work
        </footer>

        <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />
      </div>
    </SplashScreen>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl">
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</div>
      <h2 className="mt-2 text-3xl font-bold leading-tight tracking-[-0.04em] text-foreground">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{description}</p>
    </div>
  );
}

function HeroStage() {
  return (
    <div className="relative mx-auto w-full max-w-full sm:max-w-[620px] overflow-hidden sm:overflow-visible">
      <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute -left-6 top-8 h-36 w-36 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <motion.div animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} className="absolute -right-6 top-16 h-40 w-40 rounded-full bg-secondary/25 blur-3xl pointer-events-none" />
      <motion.div animate={{ scale: [1, 1.15, 1], y: [0, -20, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-0 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[#F97316]/20 blur-3xl pointer-events-none" />

      <div className="brand-shell rounded-[34px] p-[1px]">
        <div className="rounded-[33px] border border-border/70 bg-card/80 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-4 rounded-[24px] border border-border/70 bg-background/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <AgentAvatar role={AgentRole.orchestrator} className="h-11 w-11" isPulsing />
              <div>
                <div className="text-sm font-semibold text-foreground">BELKA orchestration</div>
                <div className="text-xs text-muted-foreground">Voice, code, search, tools, and review in one loop</div>
              </div>
            </div>
            <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
              Live workspace
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[28px] border border-border/70 bg-background/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Command deck</div>
                  <div className="mt-1 text-base font-semibold text-foreground">Voice-first composer in motion</div>
                </div>
                <div className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">Jarvis RU</div>
              </div>

              <div className="composer-shell rounded-[26px] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-xs text-muted-foreground">
                    <Mic size={14} className="text-primary" />
                    Voice command ready
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-xs text-muted-foreground">
                    <Search size={14} className="text-accent" />
                    Research path
                  </div>
                </div>

                <div className="rounded-[24px] border border-border/70 bg-background/80 p-4">
                  <div className="text-sm leading-7 text-foreground">
                    "Open the project, inspect the auth flow, fix the session edge cases, and tell me what still looks risky."
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      { label: "Chat", color: "bg-secondary/12 text-secondary" },
                      { label: "Code", color: "bg-primary/12 text-primary" },
                      { label: "Multi-agent", color: "bg-accent/18 text-accent-foreground" },
                    ].map((chip) => (
                      <span key={chip.label} className={`rounded-full px-3 py-1 text-[11px] font-medium ${chip.color}`}>
                        {chip.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Analyze", icon: BrainCircuit, tone: "text-secondary" },
                    { label: "Verify", icon: ShieldCheck, tone: "text-accent" },
                    { label: "Ship", icon: Github, tone: "text-primary" },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-[22px] border border-border/70 bg-card/80 px-3 py-3">
                        <div className="mb-2 flex items-center gap-2">
                          <Icon size={15} className={item.tone} />
                          <span className="text-xs font-semibold text-foreground">{item.label}</span>
                        </div>
                        <div className="text-[11px] leading-5 text-muted-foreground">
                          Clean, visible motion instead of noisy AI clutter.
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut" }}
                whileHover={{ scale: 1.03, rotateX: 0, rotateY: 0, zIndex: 10 }}
                className="rounded-[28px] border border-border/70 bg-card/80 p-4 transition-all duration-300"
                style={{ transform: "perspective(1200px) rotateX(10deg) rotateY(-12deg)", transformStyle: "preserve-3d" }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-foreground">Agent roster</div>
                  <div className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">3 active</div>
                </div>
                <div className="space-y-3">
                  {[
                    { role: AgentRole.coder, name: "Coder", note: "Implementing auth refactor" },
                    { role: AgentRole.researcher, name: "Researcher", note: "Checking runtime docs" },
                    { role: AgentRole.reviewer, name: "Reviewer", note: "Validating edge cases" },
                  ].map((agent) => (
                    <div key={agent.name} className="flex items-center gap-3 rounded-[22px] border border-border/70 bg-background/70 p-3">
                      <AgentAvatar role={agent.role} className="h-10 w-10" isPulsing />
                      <div>
                        <div className="text-sm font-semibold text-foreground">{agent.name}</div>
                        <div className="text-xs text-muted-foreground">{agent.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 6.4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                whileHover={{ scale: 1.03, rotateX: 0, rotateY: 0, zIndex: 10 }}
                className="rounded-[28px] border border-border/70 bg-card/80 p-4 transition-all duration-300"
                style={{ transform: "perspective(1200px) rotateX(8deg) rotateY(10deg)", transformStyle: "preserve-3d" }}
              >
                <div className="mb-3 text-sm font-semibold text-foreground">Premium design system</div>
                <div className="grid gap-3">
                  <div className="rounded-[22px] belka-gradient p-4 text-white">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/70">Palette</div>
                    <div className="mt-2 flex gap-2">
                      {["#2EA043", "#8AC234", "#C084FC", "#F97316", "#F5F0E8"].map((color) => (
                        <span key={color} className="h-8 w-8 rounded-full border border-white/25" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[22px] border border-border/70 bg-background/70 p-3">
                      <div className="mb-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">Typography</div>
                      <div className="text-sm font-semibold text-foreground">Space Grotesk + Manrope</div>
                    </div>
                    <div className="rounded-[22px] border border-border/70 bg-background/70 p-3">
                      <div className="mb-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">Motion</div>
                      <div className="text-sm font-semibold text-foreground">Structured, readable, calm</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
