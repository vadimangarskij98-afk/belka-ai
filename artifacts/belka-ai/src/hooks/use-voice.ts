import { useState, useCallback, useRef, useEffect } from 'react';
import { matchPhrase, type VoiceAction } from '@/lib/voice-phrases';
import { VOICE_RESPONSES } from '@/lib/voice-responses';

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: { transcript: string };
      isFinal: boolean;
    };
    length: number;
  };
}

const BASE = import.meta.env.BASE_URL || '/';
let currentAudio: HTMLAudioElement | null = null;
let isSpeaking = false;
let lastInterruptIdx = -1;

const INTERRUPT_RESPONSES = [
  'Да, слушаю тебя!',
  'Ладно-ладно, говори!',
  'Ой, перебиваешь! Ну давай, что там?',
  'Слушай, я тут для кого распинаюсь? Ладно, говори.',
  'Не перебивай! Ну ладно, что хотел?',
  'Сейчас дорасскажу... а ладно, давай, что у тебя?',
  'Эй, я ещё не закончила! Ну ок, слушаю.',
  'О, нетерпеливый! Хорошо, давай.',
  'Тебе повезло что я терпеливая. Слушаю!',
  'Ну вот, опять перебивают... Ладно, что?',
  'Ладно, ладно, молчу. Твоя очередь!',
  'Стоп, стоп, я поняла. Говори.',
];

const FALLBACK_RESPONSES = [
  'Записала вашу команду. Обрабатываю.',
  'Принято! Работаю над этим.',
  'Поняла, выполняю.',
  'Хорошо, сейчас сделаю!',
  'Приняла к сведению!',
];

function getStaticUrl(filename: string): string {
  return `${BASE}audio/${filename}.mp3`;
}

function fallbackSpeak(text: string): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ru-RU';
    isSpeaking = true;
    utter.onend = () => { isSpeaking = false; };
    utter.onerror = () => { isSpeaking = false; };
    window.speechSynthesis.speak(utter);
  }
}

function playFile(filename: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    const audio = new Audio(getStaticUrl(filename));
    currentAudio = audio;
    isSpeaking = true;
    audio.oncanplaythrough = () => audio.play().catch(() => {
      currentAudio = null;
      isSpeaking = false;
      resolve(false);
    });
    audio.onended = () => { currentAudio = null; isSpeaking = false; resolve(true); };
    audio.onerror = () => { currentAudio = null; isSpeaking = false; resolve(false); };
    audio.load();
  });
}

export async function playVoice(clip: string): Promise<void> {
  const value = VOICE_RESPONSES[clip];

  if (Array.isArray(value)) {
    const idx = Math.floor(Math.random() * value.length);
    const okIndexed = await playFile(`voice_${clip}_${idx}`);
    if (okIndexed) return;
    const okSingle = await playFile(`voice_${clip}`);
    if (okSingle) return;
    fallbackSpeak(value[idx]);
    return;
  }

  const ok = await playFile(`voice_${clip}`);
  if (ok) return;

  if (typeof value === 'string') {
    fallbackSpeak(value);
  }
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
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  isSpeaking = false;
}

export function stopAllVoice(): void {
  interruptVoice();
}

async function playInterrupt(): Promise<void> {
  let idx = Math.floor(Math.random() * INTERRUPT_RESPONSES.length);
  if (idx === lastInterruptIdx && INTERRUPT_RESPONSES.length > 1) {
    idx = (idx + 1) % INTERRUPT_RESPONSES.length;
  }
  lastInterruptIdx = idx;
  const ok = await playFile(`voice_interrupt_${idx}`);
  if (!ok) fallbackSpeak(INTERRUPT_RESPONSES[idx]);
}

export async function speakText(text: string): Promise<void> {
  const idx = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
  const ok = await playFile(`voice_fallback_${idx}`);
  if (!ok) fallbackSpeak(FALLBACK_RESPONSES[idx]);
}

export async function pregenerateVoices(): Promise<void> {}
export function stopPregeneration(): void {}

export type VoiceActionHandler = (action: VoiceAction) => void;

export function useVoiceAssistant(onAction?: VoiceActionHandler) {
  const [isActive, setIsActive] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isActiveRef = useRef(false);
  const isDictatingRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProcessedRef = useRef('');
  const onActionRef = useRef(onAction);
  const turnOffRef = useRef<() => void>(() => {});

  useEffect(() => { onActionRef.current = onAction; }, [onAction]);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { isDictatingRef.current = isDictating; }, [isDictating]);

  const processTranscript = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed === lastProcessedRef.current) return;
    lastProcessedRef.current = trimmed;
    setIsProcessing(true);
    setLastTranscript(trimmed);

    if (isSpeaking) {
      interruptVoice();
      await playInterrupt();
      setIsProcessing(false);
      return;
    }

    if (isDictatingRef.current) {
      const lower = trimmed.toLowerCase();
      if (lower.includes('стоп диктовк') || lower.includes('хватит диктовать') || lower.includes('закончи диктовку') || lower === 'стоп') {
        setIsDictating(false);
        isDictatingRef.current = false;
        await playVoice('dictate_done');
      } else if (lower.includes('отправь') || lower.includes('отправить') || lower.includes('сенд')) {
        setIsDictating(false);
        isDictatingRef.current = false;
        await playVoice('send_message');
        if (onActionRef.current) onActionRef.current({ type: 'sendChat' });
      } else {
        if (onActionRef.current) onActionRef.current({ type: 'writePrompt', text: trimmed });
        await playVoice('typing');
      }
      setIsProcessing(false);
      return;
    }

    const match = matchPhrase(trimmed);
    if (match) {
      if (match.action?.type === 'dictateMode') {
        setIsDictating(true);
        isDictatingRef.current = true;
      }
      if (match.action?.type === 'micOff') {
        await playVoice('mic_off');
        setTimeout(() => turnOffRef.current(), 500);
        setIsProcessing(false);
        return;
      }
      await playVoice(match.response);
      if (match.action && match.action.type !== 'dictateMode' && onActionRef.current) {
        onActionRef.current(match.action);
      }
    } else {
      await speakText(trimmed);
    }

    setIsProcessing(false);
  }, []);

  const startRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ok */ }
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText = event.results[i][0].transcript;
        }
      }
      if (finalText.trim()) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        processTranscript(finalText);
      }
    };

    recognition.onerror = () => {
      if (isActiveRef.current) {
        setTimeout(() => { if (isActiveRef.current) startRecognition(); }, 1000);
      }
    };

    recognition.onend = () => {
      if (isActiveRef.current) {
        setTimeout(() => { if (isActiveRef.current) startRecognition(); }, 300);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [processTranscript]);

  const toggle = useCallback(() => {
    if (isActive) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ok */ }
        recognitionRef.current = null;
      }
      stopAllVoice();
      setIsActive(false);
      setIsDictating(false);
      isDictatingRef.current = false;
      setLastTranscript('');
      lastProcessedRef.current = '';
      playVoice('mic_off');
    } else {
      setIsActive(true);
      playVoice('mic_on').then(() => startRecognition());
    }
  }, [isActive, startRecognition]);

  const turnOff = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ok */ }
      recognitionRef.current = null;
    }
    stopAllVoice();
    setIsActive(false);
    setIsDictating(false);
    isDictatingRef.current = false;
    setLastTranscript('');
    lastProcessedRef.current = '';
  }, []);

  useEffect(() => { turnOffRef.current = turnOff; }, [turnOff]);

  const stopDictation = useCallback(() => {
    setIsDictating(false);
    isDictatingRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ok */ }
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

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
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscript('Голосовой ввод не поддерживается в этом браузере.');
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
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
    setTranscript('');
    playVoice('listen');
    startTimerRef.current = setTimeout(() => {
      startRecognition();
    }, 2500);
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
