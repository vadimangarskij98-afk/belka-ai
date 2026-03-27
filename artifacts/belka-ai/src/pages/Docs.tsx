import { motion } from "framer-motion";
import { ArrowLeft, Code2, Network, Mic, Github, BookOpen, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { ShinyText } from "@/components/ui-custom/ShinyText";
import { t } from "@/lib/i18n";

const sections = [
  {
    icon: BookOpen,
    color: "text-primary",
    titleKey: "docIntro" as const,
    textKey: "docIntroText" as const,
  },
  {
    icon: Zap,
    color: "text-green-400",
    titleKey: "docGettingStarted" as const,
    textKey: "docGettingStartedText" as const,
  },
  {
    icon: Network,
    color: "text-secondary",
    titleKey: "docAgents" as const,
    textKey: "docAgentsText" as const,
  },
  {
    icon: Mic,
    color: "text-orange-400",
    titleKey: "docVoice" as const,
    textKey: "docVoiceText" as const,
  },
  {
    icon: Github,
    color: "text-foreground",
    titleKey: "docGithub" as const,
    textKey: "docGithubText" as const,
  },
];

export default function DocsPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => navigate("/chat")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">{t("backToApp")}</span>
        </button>

        <div className="mb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Code2 size={32} className="text-primary" />
            <ShinyText as="h1" className="text-4xl font-display font-bold">{t("documentation")}</ShinyText>
          </div>
          <p className="text-muted-foreground">{t("docIntroText")}</p>
        </div>

        <div className="space-y-6">
          {sections.map((section, i) => (
            <motion.div
              key={section.titleKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-panel rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-muted border border-border">
                  <section.icon size={20} className={section.color} />
                </div>
                <h2 className="text-xl font-display font-bold text-foreground">{t(section.titleKey)}</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">{t(section.textKey)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
