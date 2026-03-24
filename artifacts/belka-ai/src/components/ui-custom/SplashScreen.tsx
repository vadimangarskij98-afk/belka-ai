import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LETTERS = "BELKACODER".split("");
const COLORS = [
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#6366f1",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316", "#eab308",
];

const SPLASH_KEY = "belka_splash_seen";

export function SplashScreen({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem(SPLASH_KEY);
  });
  const [phase, setPhase] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!show) return;

    const delays = [
      500,
      600,
      600,
      600,
      600,
      500,
      500,
      500,
      500,
      500,
      800,
    ];

    let total = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 0; i < delays.length; i++) {
      total += delays[i];
      const t = setTimeout(() => setPhase(i + 1), total);
      timers.push(t);
    }

    timerRef.current = setTimeout(() => {
      sessionStorage.setItem(SPLASH_KEY, "1");
      setShow(false);
    }, total + 400);

    return () => {
      timers.forEach(clearTimeout);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [show]);

  const skip = () => {
    sessionStorage.setItem(SPLASH_KEY, "1");
    setShow(false);
  };

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0a0f] cursor-pointer"
            onClick={skip}
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: Math.random() * 4 + 2,
                    height: Math.random() * 4 + 2,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    background: COLORS[i % COLORS.length],
                  }}
                  animate={{
                    opacity: [0, 0.6, 0],
                    scale: [0, 1.5, 0],
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 3,
                  }}
                />
              ))}
            </div>

            <div className="relative mb-8">
              <motion.img
                src={`${(import.meta.env.BASE_URL || "/").replace(/\/$/, "")}/belka-mascot-original.png`}
                alt="BELKA"
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-cover"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                style={{
                  filter: "drop-shadow(0 0 30px rgba(99, 102, 241, 0.5)) drop-shadow(0 0 60px rgba(139, 92, 246, 0.3))",
                }}
              />
            </div>

            <div className="flex gap-1.5 sm:gap-2 mb-6">
              {LETTERS.map((letter, i) => {
                const isSpace = i === 5;
                const visible = phase > i;
                return (
                  <div key={i} className={`relative ${isSpace ? "ml-3 sm:ml-4" : ""}`}>
                    <AnimatePresence>
                      {visible && (
                        <motion.div
                          initial={{ y: -60, opacity: 0, rotateX: 90 }}
                          animate={{ y: 0, opacity: 1, rotateX: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 20,
                          }}
                          className="relative"
                        >
                          <div
                            className="w-9 h-11 sm:w-12 sm:h-14 rounded-lg flex items-center justify-center text-white font-bold text-lg sm:text-2xl font-mono select-none"
                            style={{
                              background: `linear-gradient(135deg, ${COLORS[i]}, ${COLORS[(i + 1) % COLORS.length]})`,
                              boxShadow: `0 4px 20px ${COLORS[i]}40, 0 0 40px ${COLORS[i]}20, inset 0 1px 0 rgba(255,255,255,0.2)`,
                              textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                            }}
                          >
                            {letter}
                          </div>
                          <motion.div
                            initial={{ opacity: 0.8 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0 rounded-lg"
                            style={{
                              background: `radial-gradient(circle, ${COLORS[i]}60, transparent)`,
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {!visible && (
                      <div
                        className="w-9 h-11 sm:w-12 sm:h-14 rounded-lg border border-white/5 bg-white/[0.02]"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {phase >= 10 && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-white/40 font-mono"
              >
                AI-powered development platform
              </motion.p>
            )}

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ delay: 1 }}
              className="absolute bottom-6 text-xs text-white/30"
            >
              tap to skip
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
