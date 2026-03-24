import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Send } from "lucide-react";
import { ShinyText } from "./ShinyText";
import { t } from "@/lib/i18n";

interface VoiceModalProps {
  isOpen: boolean;
  isListening: boolean;
  transcript: string;
  onClose: () => void;
  onSubmit: (text: string) => void;
  onStopListening?: () => void;
}

export function VoiceModal({ isOpen, isListening, transcript, onClose, onSubmit, onStopListening }: VoiceModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        >
          <div className="absolute top-6 right-6">
            <button
              onClick={onClose}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="flex flex-col items-center max-w-2xl w-full"
          >
            <div className="relative flex items-center justify-center w-48 h-48 mb-12">
              {isListening && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-primary/30"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.2, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 }}
                    className="absolute inset-4 rounded-full bg-primary/40"
                  />
                </>
              )}
              <button
                onClick={isListening ? onStopListening : undefined}
                className="relative z-10 flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-secondary shadow-2xl shadow-primary/40 hover:scale-105 transition-transform"
              >
                {isListening ? (
                  <MicOff size={40} className="text-white" />
                ) : (
                  <Mic size={40} className="text-white" />
                )}
              </button>
            </div>

            <div className="h-32 flex flex-col items-center text-center w-full">
              {isListening ? (
                <ShinyText as="h2" className="text-3xl font-display mb-4">
                  {t("listening")}
                </ShinyText>
              ) : (
                <h2 className="text-3xl font-display text-white mb-4">
                  {t("readyToSend")}
                </h2>
              )}

              <p className="text-xl text-muted-foreground max-w-xl h-full font-light leading-relaxed">
                {transcript || (isListening ? t("speakClearly") : "")}
              </p>
            </div>

            <AnimatePresence>
              {!isListening && transcript && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 px-8 py-4 rounded-full bg-white text-black font-semibold flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
                  onClick={() => onSubmit(transcript)}
                >
                  <Send size={20} />
                  {t("sendToBelka")}
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
