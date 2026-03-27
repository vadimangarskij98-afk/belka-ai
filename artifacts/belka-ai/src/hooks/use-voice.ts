import { useState, useCallback, useRef, useEffect } from "react";
import { apiFetch, jsonHeaders } from "@/lib/api";
import { matchPhrase, type VoiceAction } from "@/lib/voice-phrases";
import { VOICE_RESPONSES } from "@/lib/voice-responses";
import { getVoiceAssistantConfig, loadVoiceAssistantConfig } from "@/lib/voice-config";
import {
  DICTATION_SEND_PHRASES,
  DICTATION_STOP_PHRASES,
  VOICE_ACKNOWLEDGED_MESSAGE,
  VOICE_CLIP_TEXT,
  VOICE_DICTATION_DISABLED_MESSAGE,
  VOICE_DISABLED_MESSAGE,
  VOICE_FALLBACK_RESPONSES,
  VOICE_UNKNOWN_COMMAND_MESSAGE,
  VOICE_UNSUPPORTED_BROWSER_MESSAGE,
} from "@/lib/voice-copy";

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: { transcript: string };
      isFinal: boolean;
    };
    length: number;
  };
}

interface VoicePlaybackState {
  speaking: boolean;
}

interface RemoteSpeakOptions {
  preset?: string;
  provider?: "auto" | "pollinations" | "elevenlabs" | "browser";
  speed?: number;
}

const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
const ttsCache = new Map<string, string>();
const failedFiles = new Set<string>();
const playbackSubscribers = new Set<(state: VoicePlaybackState) => void>();

let currentAudio: HTMLAudioElement | null = null;
let isSpeaking = false;

function emitPlaybackState(state: VoicePlaybackState) {
  playbackSubscribers.forEach((listener) => listener(state));
}

function setSpeaking(nextValue: boolean) {
  isSpeaking = nextValue;
  emitPlaybackState({ speaking: nextValue });
}

function getLocalAudioUrl(filename: string): string {
  return `${BASE}/public/audio/${filename}.mp3`;
}

function looksBroken(text: string): boolean {
  return /Р.|С./.test(text);
}

function getResponseText(clip: string): string {
  if (VOICE_CLIP_TEXT[clip]) return VOICE_CLIP_TEXT[clip];

  const value = VOICE_RESPONSES[clip];
  const pick = Array.isArray(value)
    ? value[Math.floor(Math.random() * value.length)]
    : (typeof value === "string" ? value : "");

  if (!pick || looksBroken(pick)) {
    return VOICE_ACKNOWLEDGED_MESSAGE;
  }

  return pick;
}

function playAudioElement(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const audio = new Audio(url);
    currentAudio = audio;
    setSpeaking(true);

    audio.oncanplaythrough = () => {
      audio.play().catch(() => {
        currentAudio = null;
        setSpeaking(false);
        resolve(false);
      });
    };

    audio.onended = () => {
      currentAudio = null;
      setSpeaking(false);
      resolve(true);
    };

    audio.onerror = () => {
      currentAudio = null;
      setSpeaking(false);
      resolve(false);
    };

    audio.load();
  });
}

function playLocalFile(filename: string): Promise<boolean> {
  if (failedFiles.has(filename)) return Promise.resolve(false);
  return playAudioElement(getLocalAudioUrl(filename)).then((ok) => {
    if (!ok) failedFiles.add(filename);
    return ok;
  });
}

async function remoteSpeak(text: string, options: RemoteSpeakOptions = {}): Promise<boolean> {
  if (!text.trim()) return false;

  try {
    const config = getVoiceAssistantConfig();
    const provider = options.provider ?? config.provider;
    const preset = options.preset ?? config.preset;
    const speed = options.speed;
    const cacheKey = `${provider}|${preset}|${speed ?? "default"}|${text}`;
    const cached = ttsCache.get(cacheKey);

    if (cached) {
      return playAudioElement(cached);
    }

    const response = await apiFetch(`${BASE}/api/voice/synthesize`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        text,
        provider,
        preset,
        speed,
      }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    if (!data.audioUrl) return false;

    ttsCache.set(cacheKey, data.audioUrl);
    if (ttsCache.size > 80) {
      const firstKey = ttsCache.keys().next().value;
      if (firstKey) ttsCache.delete(firstKey);
    }

    return playAudioElement(data.audioUrl);
  } catch {
    return false;
  }
}

function browserSpeak(text: string): Promise<boolean> {
  if (!("speechSynthesis" in window)) return Promise.resolve(false);

  return new Promise((resolve) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ru-RU";
    utter.rate = 1;
    setSpeaking(true);
    utter.onend = () => {
      setSpeaking(false);
      resolve(true);
    };
    utter.onerror = () => {
      setSpeaking(false);
      resolve(false);
    };
    window.speechSynthesis.speak(utter);
  });
}

async function speakWithFallback(text: string, options?: RemoteSpeakOptions): Promise<void> {
  const config = getVoiceAssistantConfig();
  if (!config.voiceEnabled) return;

  const remoteOk = await remoteSpeak(text, options);
  if (remoteOk) return;
  await browserSpeak(text);
}

function matchesAnyPhrase(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text === phrase || text.includes(phrase));
}

export async function playVoice(clip: string): Promise<void> {
  const config = getVoiceAssistantConfig();
  if (!config.voiceEnabled) return;

  const value = VOICE_RESPONSES[clip];

  if (Array.isArray(value)) {
    const idx = Math.floor(Math.random() * value.length);
    const indexedFile = `voice_${clip}_${idx}`;
    const singleFile = `voice_${clip}`;

    if (await playLocalFile(indexedFile)) return;
    if (await playLocalFile(singleFile)) return;

    await speakWithFallback(getResponseText(clip));
    return;
  }

  if (await playLocalFile(`voice_${clip}`)) return;
  await speakWithFallback(getResponseText(clip));
}

export async function speakAssistantReply(text: string): Promise<void> {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return;
  await speakWithFallback(cleaned);
}

export async function speakText(_text: string): Promise<void> {
  const idx = Math.floor(Math.random() * VOICE_FALLBACK_RESPONSES.length);
  await speakWithFallback(VOICE_FALLBACK_RESPONSES[idx]);
}

export function isCurrentlySpeaking(): boolean {
  return isSpeaking;
}

export function interruptVoice(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  setSpeaking(false);
}

export function stopAllVoice(): void {
  interruptVoice();
}

export function subscribeVoicePlayback(listener: (state: VoicePlaybackState) => void) {
  playbackSubscribers.add(listener);
  return () => {
    playbackSubscribers.delete(listener);
  };
}

export async function pregenerateVoices(): Promise<void> {}
export function stopPregeneration(): void {}

export type VoiceActionHandler = (action: VoiceAction) => void;

export function useVoiceAssistant(onAction?: VoiceActionHandler) {
  const [isActive, setIsActive] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isActiveRef = useRef(false);
  const isDictatingRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProcessedRef = useRef("");
  const onActionRef = useRef(onAction);
  const turnOffRef = useRef<() => void>(() => {});
  const processTranscriptRef = useRef<(text: string) => void>(() => {});

  useEffect(() => { onActionRef.current = onAction; }, [onAction]);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { isDictatingRef.current = isDictating; }, [isDictating]);
  useEffect(() => {
    void loadVoiceAssistantConfig();
  }, []);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
  }, []);

  const startRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || recognitionRef.current || !isActiveRef.current) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "ru-RU";
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText = event.results[i][0].transcript;
        }
      }

      if (finalText.trim()) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        processTranscriptRef.current(finalText);
      }
    };

    recognition.onerror = () => {
      stopRecognition();
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (isActiveRef.current) {
        const delay = getVoiceAssistantConfig().echoGuardDelayMs;
        restartTimerRef.current = setTimeout(() => {
          if (isActiveRef.current && !isCurrentlySpeaking()) {
            startRecognition();
          }
        }, delay);
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (isActiveRef.current && !isCurrentlySpeaking()) {
        const delay = getVoiceAssistantConfig().echoGuardDelayMs;
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (isActiveRef.current && !recognitionRef.current && !isCurrentlySpeaking()) {
            startRecognition();
          }
        }, delay);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [stopRecognition]);

  const processTranscript = useCallback(async (text: string) => {
    const trimmed = text.trim();
    const config = getVoiceAssistantConfig();

    if (!trimmed || trimmed === lastProcessedRef.current) return;
    lastProcessedRef.current = trimmed;
    setIsProcessing(true);
    setLastTranscript(trimmed);

    if (isCurrentlySpeaking()) {
      setIsProcessing(false);
      return;
    }

    if (isDictatingRef.current) {
      const lower = trimmed.toLowerCase();

      if (matchesAnyPhrase(lower, DICTATION_STOP_PHRASES)) {
        setIsDictating(false);
        isDictatingRef.current = false;
        await playVoice("dictate_done");
      } else if (matchesAnyPhrase(lower, DICTATION_SEND_PHRASES)) {
        setIsDictating(false);
        isDictatingRef.current = false;
        await playVoice("send_message");
        onActionRef.current?.({ type: "sendChat" });
      } else {
        onActionRef.current?.({ type: "writePrompt", text: trimmed });
        await playVoice("typing");
      }

      setIsProcessing(false);
      return;
    }

    const match = matchPhrase(trimmed);

    if (match) {
      if (match.action?.type === "dictateMode") {
        if (!config.dictationEnabled) {
          await speakWithFallback(VOICE_DICTATION_DISABLED_MESSAGE);
          setIsProcessing(false);
          return;
        }
        setIsDictating(true);
        isDictatingRef.current = true;
      }

      if (match.action?.type === "micOff") {
        await playVoice("mic_off");
        setTimeout(() => turnOffRef.current(), 300);
        setIsProcessing(false);
        return;
      }

      await playVoice(match.response);
      if (match.action && match.action.type !== "dictateMode") {
        onActionRef.current?.(match.action);
      }
    } else if (config.routeUnknownCommandsToAgent && onActionRef.current) {
      await speakText(trimmed);
      onActionRef.current({ type: "sendToAgent", text: trimmed });
    } else {
      await speakWithFallback(VOICE_UNKNOWN_COMMAND_MESSAGE);
    }

    setIsProcessing(false);
  }, []);

  useEffect(() => {
    processTranscriptRef.current = (text: string) => {
      void processTranscript(text);
    };
  }, [processTranscript]);

  useEffect(() => {
    return subscribeVoicePlayback(({ speaking }) => {
      const config = getVoiceAssistantConfig();
      if (!config.echoGuardEnabled || !isActiveRef.current) return;

      if (speaking) {
        stopRecognition();
        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
          restartTimerRef.current = null;
        }
        return;
      }

      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        if (isActiveRef.current && !recognitionRef.current && !isCurrentlySpeaking()) {
          startRecognition();
        }
      }, config.echoGuardDelayMs);
    });
  }, [startRecognition, stopRecognition]);

  const toggle = useCallback(() => {
    const config = getVoiceAssistantConfig();

    if (isActive) {
      stopRecognition();
      stopAllVoice();
      setIsActive(false);
      setIsDictating(false);
      isDictatingRef.current = false;
      setLastTranscript("");
      lastProcessedRef.current = "";
      void playVoice("mic_off");
      return;
    }

    if (!config.voiceEnabled) {
      void speakWithFallback(VOICE_DISABLED_MESSAGE);
      return;
    }

    setIsActive(true);
    setLastTranscript("");
    lastProcessedRef.current = "";
    void playVoice("mic_on").finally(() => {
      const delay = getVoiceAssistantConfig().echoGuardDelayMs;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        if (isActiveRef.current && !recognitionRef.current && !isCurrentlySpeaking()) {
          startRecognition();
        }
      }, delay);
    });
  }, [isActive, startRecognition, stopRecognition]);

  const turnOff = useCallback(() => {
    stopRecognition();
    stopAllVoice();
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    setIsActive(false);
    setIsDictating(false);
    isDictatingRef.current = false;
    setLastTranscript("");
    lastProcessedRef.current = "";
  }, [stopRecognition]);

  useEffect(() => { turnOffRef.current = turnOff; }, [turnOff]);

  const stopDictation = useCallback(() => {
    setIsDictating(false);
    isDictatingRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      stopRecognition();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, [stopRecognition]);

  return {
    isActive,
    isDictating,
    lastTranscript,
    isProcessing,
    toggle,
    turnOff,
    stopDictation,
  };
}

export function useVoiceModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscript(VOICE_UNSUPPORTED_BROWSER_MESSAGE);
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ru-RU";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += `${event.results[i][0].transcript} `;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      setTranscript((finalTranscript + interimTranscript).trim());
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const openModal = useCallback(() => {
    setIsOpen(true);
    setTranscript("");
    void playVoice("listen");
    startTimerRef.current = setTimeout(() => {
      startRecognition();
    }, 1_200);
  }, [startRecognition]);

  const closeModal = useCallback(() => {
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
    stopAllVoice();
    stopRecognition();
    setIsOpen(false);
    setIsListening(false);
  }, [stopRecognition]);

  const stopListening = useCallback(() => {
    stopRecognition();
  }, [stopRecognition]);

  return {
    isOpen,
    isListening,
    transcript,
    openModal,
    closeModal,
    stopListening,
  };
}
