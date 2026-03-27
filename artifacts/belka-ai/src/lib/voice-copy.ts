export const VOICE_CLIP_TEXT: Record<string, string> = {
  mic_on: "Голосовой режим включен. Слушаю вас.",
  mic_off: "Голосовой режим выключен.",
  listen: "Слушаю внимательно.",
  dictate: "Режим диктовки включен. Говорите, я записываю.",
  dictate_done: "Диктовка завершена.",
  send_message: "Отправляю задачу.",
  typing: "Записываю команду.",
  analyzing: "Анализирую запрос.",
  researching: "Проверяю информацию.",
  writing: "Формирую ответ.",
  checking: "Проверяю результат.",
  start_work: "Принято. Начинаю работу.",
  save: "Сохранено.",
  open_terminal: "Открываю терминал.",
  open_files: "Открываю файловую панель.",
  close_files: "Закрываю файловую панель.",
  run_preview: "Запускаю предпросмотр.",
  settings_saved: "Настройки сохранены.",
  sidebar_open: "Открываю боковую панель.",
  sidebar_close: "Закрываю боковую панель.",
};

export const VOICE_FALLBACK_RESPONSES = [
  "Принято. Передаю задачу агенту.",
  "Команда принята, выполняю.",
  "Хорошо, начинаю обработку.",
  "Понял, беру это в работу.",
];

export const DICTATION_STOP_PHRASES = [
  "стоп диктовку",
  "хватит диктовать",
  "закончи диктовку",
  "стоп",
];

export const DICTATION_SEND_PHRASES = [
  "отправь",
  "отправить",
  "send",
];

export const VOICE_DICTATION_DISABLED_MESSAGE = "Диктовка сейчас отключена в настройках.";
export const VOICE_UNKNOWN_COMMAND_MESSAGE = "Не до конца понял команду. Перефразируйте, пожалуйста.";
export const VOICE_UNSUPPORTED_BROWSER_MESSAGE = "Голосовой ввод не поддерживается в этом браузере.";
export const VOICE_ACKNOWLEDGED_MESSAGE = "Принято.";
export const VOICE_DISABLED_MESSAGE = "Голосовое управление отключено в текущих настройках BELKA.";
export const VOICE_TEST_SAMPLE_TEXT =
  "BELKA на связи. Голосовой контур активен и готов к командам по проекту.";
