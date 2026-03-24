export type VoiceAction =
  | { type: 'speak' }
  | { type: 'navigate'; path: string }
  | { type: 'openModal'; modal: 'profile' | 'settings' | 'pricing' | 'mcp' | 'github' }
  | { type: 'setMode'; mode: 'chat' | 'code' | 'multi-agent' }
  | { type: 'newChat' }
  | { type: 'writePrompt'; text: string }
  | { type: 'dictateMode' }
  | { type: 'sendChat' }
  | { type: 'logout' }
  | { type: 'toggleSidebar' }
  | { type: 'clearInput' }
  | { type: 'toggleTheme' }
  | { type: 'setTheme'; theme: 'dark' | 'light' }
  | { type: 'changeName'; name: string }
  | { type: 'changeBio'; bio: string }
  | { type: 'micOff' }
  | { type: 'sendToAgent'; text: string }
  | { type: 'webSearch'; query: string }
  | { type: 'openLocalFolder' }
  | { type: 'connectGitHub' }
  | { type: 'openFilesPanel' }
  | { type: 'closeFilesPanel' }
  | { type: 'pushToGitHub'; message?: string }
  | { type: 'saveCurrentFile' }
  | { type: 'createFile'; name?: string }
  | { type: 'clarify'; question: string }
  | { type: 'runPreview' };

export interface PhraseMatch {
  triggers: string[];
  response: string;
  action?: VoiceAction;
}

export const PHRASE_DB: PhraseMatch[] = [
  // ===== GREETINGS =====
  {
    triggers: ['привет', 'здравствуй', 'здравствуйте', 'приветик', 'хай', 'хелло', 'алло'],
    response: 'greeting',
  },
  {
    triggers: ['добрый день', 'добрый вечер'],
    response: 'greeting',
  },
  {
    triggers: ['доброе утро'],
    response: 'goodmorning',
  },
  {
    triggers: ['добро пожаловать'],
    response: 'welcome',
  },

  // ===== HOW ARE YOU / PERSONAL =====
  {
    triggers: ['как дела', 'как ты', 'как поживаешь', 'как жизнь', 'как настроение'],
    response: 'how_are_you',
  },
  {
    triggers: ['как тебя зовут', 'твоё имя', 'кто ты', 'ты кто'],
    response: 'my_name',
  },
  {
    triggers: ['кто тебя создал', 'кто тебя сделал', 'кто твой создатель', 'кто разработал'],
    response: 'who_created',
  },
  {
    triggers: ['сколько тебе лет', 'твой возраст', 'когда тебя создали'],
    response: 'age',
  },
  {
    triggers: ['на каком языке', 'какие языки', 'ты говоришь', 'какой язык'],
    response: 'language',
  },
  {
    triggers: ['хобби', 'чем увлекаешься', 'что любишь делать'],
    response: 'hobby',
  },
  {
    triggers: ['ты умная', 'ты умный', 'ты классная', 'ты молодец', 'ты крутая'],
    response: 'smart',
  },
  {
    triggers: ['ты устала', 'ты устал', 'не устала', 'отдохни'],
    response: 'tired',
  },
  {
    triggers: ['секрет', 'расскажи секрет', 'тайна'],
    response: 'secret',
  },
  {
    triggers: ['люблю тебя', 'я тебя люблю', 'обожаю'],
    response: 'love',
  },
  {
    triggers: ['ты красивая', 'ты милая', 'красавица', 'комплимент'],
    response: 'compliment',
  },

  // ===== PLATFORM KNOWLEDGE =====
  {
    triggers: ['что это за площадка', 'что это за платформа', 'расскажи о платформе', 'что такое белка', 'о площадке'],
    response: 'about_platform',
  },
  {
    triggers: ['что такое чат', 'зачем чат', 'как работает чат'],
    response: 'what_is_chat',
  },
  {
    triggers: ['что такое код', 'зачем код', 'как работает код'],
    response: 'what_is_code',
  },
  {
    triggers: ['что такое мультиагент', 'как работает мультиагент', 'зачем мультиагент', 'несколько агентов'],
    response: 'what_is_multiagent',
  },
  {
    triggers: ['где тарифы', 'где посмотреть тарифы', 'покажи тарифы', 'цены', 'сколько стоит', 'какие тарифы', 'стоимость'],
    response: 'where_tariffs',
    action: { type: 'openModal', modal: 'pricing' },
  },
  {
    triggers: ['бесплатный план', 'бесплатный тариф', 'что в бесплатном'],
    response: 'free_plan',
  },
  {
    triggers: ['профессиональный план', 'про план', 'про тариф', 'что в профессиональном'],
    response: 'pro_plan',
  },
  {
    triggers: ['корпоративный план', 'корпоративный тариф', 'что в корпоративном', 'энтерпрайз'],
    response: 'enterprise_plan',
  },
  {
    triggers: ['как работает mcp', 'что такое mcp', 'mcp серверы', 'где включить mcp', 'подключить mcp', 'как подключить сервер'],
    response: 'how_mcp',
  },
  {
    triggers: ['как работает платформа', 'как пользоваться', 'как тут работать'],
    response: 'how_platform_works',
  },
  {
    triggers: ['как исправить ошибку', 'ошибка в коде', 'как починить', 'как дебажить', 'дебаг'],
    response: 'how_fix_error',
  },
  {
    triggers: ['как работает голос', 'голосовой ввод', 'как включить микрофон', 'как говорить'],
    response: 'how_voice_works',
  },
  {
    triggers: ['какие агенты', 'расскажи про агентов', 'список агентов', 'агенты платформы'],
    response: 'what_agents',
  },
  {
    triggers: ['как подключить github', 'github интеграция', 'как работает github'],
    response: 'how_github',
  },
  {
    triggers: ['как запушить', 'как пушить', 'как отправить в github', 'как залить код'],
    response: 'how_push_github',
  },
  {
    triggers: ['как создать репозиторий', 'как сделать репозиторий'],
    response: 'how_create_repo',
  },
  {
    triggers: ['как сохранить файл', 'как сохранять', 'как сохранить изменения'],
    response: 'how_save_file',
  },
  {
    triggers: ['как открыть файл', 'как открывать файлы', 'как посмотреть файл'],
    response: 'how_open_file',
  },
  {
    triggers: ['как работает локальная разработка', 'локальная разработка', 'как работать локально'],
    response: 'how_local_dev',
  },
  {
    triggers: ['как добавить файлы', 'как добавить файл', 'как загрузить файлы'],
    response: 'how_add_files',
  },
  {
    triggers: ['как работают агенты', 'как агенты работают', 'принцип работы агентов'],
    response: 'how_agents_work',
  },
  {
    triggers: ['с чего начать', 'как начать работу', 'с чего мне начать', 'что делать первым', 'как начать', 'как мне начать'],
    response: 'how_to_start',
  },
  {
    triggers: ['чем белка лучше', 'почему белка лучше', 'преимущества белки', 'зачем белка', 'чем вы лучше'],
    response: 'why_belka',
  },
  {
    triggers: ['сравни с другими', 'белка vs', 'отличия от конкурентов', 'чем отличаетесь'],
    response: 'belka_vs_others',
  },
  {
    triggers: ['как скопировать код', 'как копировать код', 'скопировать код'],
    response: 'how_copy_code',
  },
  {
    triggers: ['как сменить модель', 'как поменять модель', 'выбор модели', 'какую модель выбрать'],
    response: 'how_change_model',
  },
  {
    triggers: ['что такое diff', 'что такое дифф', 'зачем diff', 'что за зелёные строки', 'что за красные строки'],
    response: 'what_is_diff',
  },
  {
    triggers: ['совместная работа', 'как работать вместе', 'работа в команде'],
    response: 'how_collaborate',
  },
  {
    triggers: ['горячие клавиши', 'шорткаты', 'клавиши', 'быстрые клавиши'],
    response: 'keyboard_shortcuts',
  },
  {
    triggers: ['подсказка', 'совет', 'дай совет', 'дай подсказку', 'лайфхак'],
    response: '_random_tip',
  },
  {
    triggers: ['какие языки программирования', 'на каких языках пишешь', 'какие языки поддерживаешь'],
    response: 'what_languages',
  },
  {
    triggers: ['как улучшить код', 'как оптимизировать', 'оптимизируй код', 'рефакторинг'],
    response: 'how_improve_code',
  },
  {
    triggers: ['какие фреймворки', 'фреймворки', 'на каких фреймворках', 'какие технологии'],
    response: 'what_frameworks',
  },
  {
    triggers: ['как задеплоить', 'деплой', 'как развернуть', 'как опубликовать сайт'],
    response: 'how_deploy',
  },
  {
    triggers: ['что такое api', 'объясни api', 'как работает api'],
    response: 'what_is_api',
  },
  {
    triggers: ['как работать с базой', 'база данных', 'как подключить базу', 'sql запросы'],
    response: 'how_database',
  },
  {
    triggers: ['что такое git', 'объясни git', 'как работает git', 'зачем git'],
    response: 'what_is_git',
  },
  {
    triggers: ['как учиться программировать', 'как выучить', 'с чего начать учить', 'как стать программистом'],
    response: 'how_learn_coding',
  },
  {
    triggers: ['что такое typescript', 'объясни typescript', 'зачем typescript'],
    response: 'what_is_typescript',
  },
  {
    triggers: ['что такое react', 'объясни react', 'зачем react', 'как работает react'],
    response: 'what_is_react',
  },
  {
    triggers: ['как дебажить', 'как отлаживать', 'отладка кода'],
    response: 'how_debug',
  },
  {
    triggers: ['адаптивный дизайн', 'адаптив', 'мобильная версия', 'респонсив'],
    response: 'what_is_responsive',
  },
  {
    triggers: ['безопасность', 'как защитить', 'уязвимости', 'как обезопасить'],
    response: 'how_secure_code',
  },
  {
    triggers: ['что такое компонент', 'объясни компоненты', 'зачем компоненты'],
    response: 'what_is_component',
  },
  {
    triggers: ['как тестировать', 'как писать тесты', 'юнит тесты', 'тестирование кода'],
    response: 'how_test_code',
  },
  {
    triggers: ['что такое css', 'объясни css', 'зачем css', 'как работает css'],
    response: 'what_is_css',
  },
  {
    triggers: ['интересный факт', 'расскажи факт', 'забавный факт', 'удиви меня'],
    response: 'funny_fact',
  },
  {
    triggers: ['почему белка', 'откуда название', 'что значит белка', 'название платформы'],
    response: 'what_is_belka_name',
  },
  {
    triggers: ['нашёл баг', 'сообщить об ошибке', 'нашла баг', 'репорт бага'],
    response: 'how_report_bug',
  },
  {
    triggers: ['что такое промт', 'как писать промт', 'объясни промт', 'как составить запрос'],
    response: 'what_is_prompt',
  },
  {
    triggers: ['советы по голосу', 'как управлять голосом', 'голосовые советы', 'как лучше говорить'],
    response: 'how_use_voice_tips',
  },

  // ===== WHAT CAN YOU DO =====
  {
    triggers: ['что ты умеешь', 'что можешь', 'чем ты можешь помочь', 'твои возможности', 'расскажи подробно', 'что можешь делать'],
    response: 'what_can',
  },
  {
    triggers: ['помоги', 'помощь', 'подскажи', 'мне нужна помощь', 'хелп'],
    response: 'help',
  },

  // ===== NAVIGATION COMMANDS =====
  {
    triggers: ['открой профиль', 'покажи профиль', 'мой профиль', 'перейди в профиль'],
    response: 'open_profile',
    action: { type: 'openModal', modal: 'profile' },
  },
  {
    triggers: ['открой настройки', 'покажи настройки', 'перейди в настройки', 'мои настройки'],
    response: 'open_settings',
    action: { type: 'openModal', modal: 'settings' },
  },
  {
    triggers: ['открой тарифы', 'покажи тарифы', 'перейди в тарифы', 'открой прайс'],
    response: 'open_pricing',
    action: { type: 'openModal', modal: 'pricing' },
  },
  {
    triggers: ['открой mcp', 'покажи mcp', 'подключи сервер', 'открой серверы'],
    response: 'open_mcp',
    action: { type: 'openModal', modal: 'mcp' },
  },
  {
    triggers: ['новый чат', 'создай чат', 'начни новый чат', 'новый диалог'],
    response: 'new_chat',
    action: { type: 'newChat' },
  },
  {
    triggers: ['переключись на чат', 'режим чат', 'включи чат'],
    response: 'mode_chat',
    action: { type: 'setMode', mode: 'chat' },
  },
  {
    triggers: ['переключись на код', 'режим код', 'включи код'],
    response: 'mode_code',
    action: { type: 'setMode', mode: 'code' },
  },
  {
    triggers: ['переключись на мультиагент', 'включи мультиагент', 'режим мультиагент'],
    response: 'mode_multiagent',
    action: { type: 'setMode', mode: 'multi-agent' },
  },
  {
    triggers: ['на главную', 'перейди на главную', 'домой', 'покажи главную', 'открой главную'],
    response: 'go_home',
    action: { type: 'navigate', path: '/chat' },
  },

  // ===== THEME CONTROL =====
  {
    triggers: ['переключи тему', 'смени тему', 'поменяй тему', 'другая тема'],
    response: '_toggle_theme',
    action: { type: 'toggleTheme' },
  },
  {
    triggers: ['тёмная тема', 'включи тёмную', 'ночная тема', 'ночной режим', 'тёмный режим'],
    response: 'dark_theme',
    action: { type: 'setTheme', theme: 'dark' },
  },
  {
    triggers: ['светлая тема', 'включи светлую', 'дневная тема', 'светлый режим'],
    response: '_light_theme',
    action: { type: 'setTheme', theme: 'light' },
  },

  // ===== PROFILE CONTROL =====
  {
    triggers: ['поменяй имя на', 'смени имя на', 'назови меня', 'моё имя'],
    response: '_change_name',
  },
  {
    triggers: ['добавь о себе', 'поменяй описание', 'обо мне', 'мой био', 'добавь биографию'],
    response: '_change_bio',
  },

  // ===== MIC CONTROL =====
  {
    triggers: ['выключи микрофон', 'выключи голос', 'отключи микрофон', 'отключи голосовой', 'микрофон выключи', 'молчи'],
    response: 'mic_off',
    action: { type: 'micOff' },
  },

  // ===== AGENT COMMANDS — SEND TO BELKA CODER =====
  {
    triggers: ['напиши код', 'написать код', 'создай код', 'сделай код', 'закодь', 'запрограммируй'],
    response: '_agent_code',
  },
  {
    triggers: ['проанализируй код', 'анализируй код', 'проверь код', 'ревью кода', 'посмотри код'],
    response: '_agent_analyze',
  },
  {
    triggers: ['найди файл', 'поиск файла', 'где файл', 'открой файл'],
    response: '_agent_find_file',
  },
  {
    triggers: ['удали файл', 'удалить файл', 'убери файл'],
    response: '_agent_delete_file',
  },
  {
    triggers: ['переделай файл', 'измени файл', 'отредактируй файл', 'перепиши файл'],
    response: '_agent_edit_file',
  },
  {
    triggers: ['создай файл', 'новый файл', 'сделай файл'],
    response: '_agent_create_file',
  },
  {
    triggers: ['создай папку', 'новая папка', 'сделай папку', 'создай директорию'],
    response: '_agent_create_folder',
  },
  {
    triggers: ['найди в интернете', 'поищи в интернете', 'загугли', 'найди информацию', 'поиск в сети', 'найди в сети'],
    response: '_agent_search_web',
  },
  {
    triggers: ['собери данные', 'собери информацию', 'анализируй данные', 'проанализируй данные'],
    response: '_agent_collect_data',
  },

  // ===== PROMPTS =====
  {
    triggers: ['промт для музыкального', 'промт для музыки', 'музыкальный сайт', 'сайт с музыкой'],
    response: 'prompt_music',
    action: { type: 'writePrompt', text: 'Создай современный лендинг для музыкального стриминг сервиса с тёмной темой. Добавь секцию героя с визуализатором звука, каталог жанров с карточками, плеер в нижней части страницы, и секцию с подписками.' },
  },
  {
    triggers: ['промт для магазина', 'промт для шопа', 'интернет магазин', 'промт для е-коммерс', 'промт для ecommerce'],
    response: 'prompt_shop',
    action: { type: 'writePrompt', text: 'Создай e-commerce платформу с каталогом товаров, фильтрацией по категориям, корзиной покупок, страницей товара с галереей фото, и чекаутом с формой оплаты. Используй минималистичный дизайн.' },
  },
  {
    triggers: ['промт для портфолио', 'промт для портфолио сайта', 'сайт портфолио'],
    response: 'prompt_portfolio',
    action: { type: 'writePrompt', text: 'Создай персональный сайт-портфолио с анимированным героем, секцией проектов с превью, страницей обо мне с таймлайном опыта, формой контактов и тёмной неоновой темой.' },
  },
  {
    triggers: ['промт для лендинга', 'сделай лендинг', 'промт для посадочной'],
    response: 'prompt_landing',
    action: { type: 'writePrompt', text: 'Создай конверсионный лендинг с секцией героя, блоком преимуществ, отзывами клиентов, тарифными планами, FAQ аккордеоном и футером с контактами. Стиль минимализм.' },
  },
  {
    triggers: ['промт для дашборда', 'промт для админки', 'промт для панели', 'админ панель'],
    response: 'prompt_dashboard',
    action: { type: 'writePrompt', text: 'Создай админ-панель с боковым меню, графиками продаж, таблицей пользователей, карточками метрик, и фильтрацией по датам. Используй тёмную тему.' },
  },
  {
    triggers: ['промт для соцсети', 'промт для социальной', 'социальная сеть'],
    response: 'prompt_social',
    action: { type: 'writePrompt', text: 'Создай социальную платформу с лентой постов, системой лайков и комментариев, профилями пользователей, мессенджером и уведомлениями. Дизайн как у современных приложений.' },
  },
  {
    triggers: ['промт для блога', 'промт для статей', 'блог платформа'],
    response: 'prompt_blog',
    action: { type: 'writePrompt', text: 'Создай блог-платформу с редактором статей, категориями, тегами, системой комментариев, поиском и адаптивным дизайном. Добавь подсветку синтаксиса для кода.' },
  },
  {
    triggers: ['промт для игры', 'промт для гейм', 'сделай игру', 'браузерная игра'],
    response: 'prompt_game',
    action: { type: 'writePrompt', text: 'Создай браузерную 2D игру с персонажем, платформами, врагами, системой здоровья и очков, анимациями и уровнями. Используй Canvas или React Three Fiber.' },
  },
  {
    triggers: ['промт для мессенджера', 'промт для чата', 'чат приложение', 'сделай мессенджер'],
    response: 'prompt_chat_app',
    action: { type: 'writePrompt', text: 'Создай чат-приложение с регистрацией, списком контактов, чатами в реальном времени, отправкой файлов, эмодзи и уведомлениями. Дизайн как у Telegram.' },
  },
  {
    triggers: ['промт для crm', 'промт для срм', 'сделай crm', 'crm система'],
    response: 'prompt_crm',
    action: { type: 'writePrompt', text: 'Создай CRM систему с карточками клиентов, воронкой продаж, задачами, календарём, аналитикой и экспортом данных. Интерфейс должен быть интуитивным.' },
  },
  {
    triggers: ['промт для ai', 'промт для нейросети', 'промт для искусственного интеллекта', 'ai приложение'],
    response: 'prompt_ai',
    action: { type: 'writePrompt', text: 'Создай интерфейс для работы с искусственным интеллектом — чат с историей, выбор модели, настройки температуры, стриминг ответов и сохранение диалогов.' },
  },

  // ===== JOKES =====
  {
    triggers: ['шутка', 'расскажи шутку', 'пошути', 'анекдот', 'смешное', 'посмеши'],
    response: '_random_joke',
  },

  // ===== RIDDLES =====
  {
    triggers: ['загадка', 'загадай', 'загадай загадку', 'загадки'],
    response: '_random_riddle',
  },

  // ===== WORK COMMANDS =====
  {
    triggers: ['окей', 'ок', 'ладно', 'понятно', 'ясно', 'угу'],
    response: 'ok',
  },
  {
    triggers: ['код готов', 'твой код готов', 'код написан', 'код сделан', 'закончил', 'выполнено', 'всё сделано'],
    response: 'code_ready',
  },
  {
    triggers: ['что-то не так', 'не работает', 'баг', 'сломалось', 'не получается', 'проблема', 'неправильно'],
    response: 'whats_wrong',
  },
  {
    triggers: ['спасибо', 'благодарю', 'спс', 'сенкс'],
    response: 'thanks',
  },
  {
    triggers: ['начинай', 'приступай', 'давай начнём', 'начни работу', 'поехали', 'старт', 'стартуй', 'начинаем', 'давай', 'вперёд'],
    response: 'start_work',
  },
  {
    triggers: ['исправь', 'поправь', 'давай поправим', 'давай исправим', 'фикс', 'починить', 'пофикси', 'почини'],
    response: 'fix',
  },
  {
    triggers: ['добавь', 'дополни', 'давай дополним', 'давай добавим', 'добавить', 'дополнить', 'расширь'],
    response: 'add',
  },
  {
    triggers: ['покажи', 'показать', 'показывай', 'продемонстрируй'],
    response: 'show',
  },
  {
    triggers: ['удали', 'убери', 'удалить', 'убрать', 'снеси', 'очисти'],
    response: 'delete',
  },
  {
    triggers: ['стоп', 'остановись', 'хватит', 'прекрати', 'стой', 'пауза'],
    response: 'stop',
  },
  {
    triggers: ['да', 'конечно', 'точно', 'верно', 'разумеется', 'именно', 'правильно'],
    response: 'yes',
  },
  {
    triggers: ['нет', 'не надо', 'не нужно', 'отмена', 'не хочу'],
    response: 'no',
  },
  {
    triggers: ['пока', 'до свидания', 'прощай', 'увидимся', 'до встречи', 'бай'],
    response: 'bye',
  },
  {
    triggers: ['какой статус', 'как продвигается', 'что нового', 'прогресс', 'как идёт'],
    response: 'status',
  },
  {
    triggers: ['подожди', 'секунду', 'минуту', 'погоди'],
    response: 'wait',
  },
  {
    triggers: ['повтори', 'скажи ещё раз', 'не расслышал', 'не понял'],
    response: 'repeat',
  },
  {
    triggers: ['отлично', 'супер', 'класс', 'круто', 'великолепно', 'молодец', 'прекрасно', 'шикарно', 'замечательно'],
    response: 'good',
  },
  {
    triggers: ['подтверди', 'подтвердить', 'согласен', 'согласна', 'утверждаю'],
    response: 'confirm',
  },
  {
    triggers: ['думай', 'подумай', 'анализируй', 'проанализируй'],
    response: 'thinking',
  },
  {
    triggers: ['сохрани', 'сохранить', 'запиши', 'записать'],
    response: 'save',
  },
  {
    triggers: ['отмени операцию', 'откати', 'верни назад', 'верни как было', 'отмени изменения'],
    response: 'cancel',
  },
  {
    triggers: ['дальше', 'далее', 'следующий', 'следующее', 'продолжай', 'продолжить'],
    response: 'next',
  },
  {
    triggers: ['назад', 'вернись', 'обратно', 'вернуться', 'предыдущий'],
    response: 'back',
  },
  {
    triggers: ['найди', 'поиск', 'ищи', 'искать', 'найти', 'поищи'],
    response: 'search',
  },
  {
    triggers: ['обнови', 'обновить', 'апдейт', 'обновление'],
    response: 'update',
  },
  {
    triggers: ['попробуй ещё', 'ещё раз', 'заново', 'снова', 'перезапусти'],
    response: 'try_again',
  },
  {
    triggers: ['объясни', 'поясни', 'объяснить', 'зачем', 'почему'],
    response: 'explain',
  },
  {
    triggers: ['отличная идея', 'хорошая идея', 'классная идея', 'давай реализуем', 'давай сделаем'],
    response: 'great_idea',
  },
  {
    triggers: ['запусти', 'запуск', 'запускай', 'выполни'],
    response: 'run',
  },
  {
    triggers: ['опубликуй', 'деплой', 'публикуй', 'задеплой', 'выложи', 'разверни'],
    response: 'deploy',
  },
  {
    triggers: ['тест', 'тесты', 'протестируй', 'проверь', 'тестируй'],
    response: 'test',
  },
  {
    triggers: ['работай', 'делай', 'выполняй', 'пиши код', 'кодь', 'программируй'],
    response: 'working',
  },
  {
    triggers: ['готово', 'всё', 'финиш', 'конец', 'завершено'],
    response: 'done',
  },
  {
    triggers: ['согласна', 'согласен', 'одобряю'],
    response: 'agree',
  },
  {
    triggers: ['не согласна', 'не согласен', 'другой подход'],
    response: 'disagree',
  },
  {
    triggers: ['быстрее', 'давай быстрее', 'скорее', 'поторопись'],
    response: 'hurry',
  },
  {
    triggers: ['успокойся', 'не волнуйся', 'спокойно', 'расслабься'],
    response: 'calm',
  },
  {
    triggers: ['скучно', 'скучаю', 'чем заняться', 'заняться нечем'],
    response: 'bored',
  },
  {
    triggers: ['доброй ночи', 'спокойной ночи', 'ложусь спать'],
    response: 'goodnight',
  },
  {
    triggers: ['мотивация', 'вдохнови', 'мотивируй', 'подбодри'],
    response: 'motivation',
  },

  // ===== MISC =====
  {
    triggers: ['который час', 'сколько времени', 'время'],
    response: 'time',
  },
  {
    triggers: ['какая погода', 'погода', 'прогноз погоды'],
    response: 'weather',
  },
  // ===== DICTATION & CHAT CONTROL =====
  {
    triggers: ['напиши в чат', 'напиши сообщение', 'продиктую', 'диктую', 'запиши в чат', 'печатай'],
    response: 'dictate',
    action: { type: 'dictateMode' },
  },
  {
    triggers: ['отправь', 'отправь сообщение', 'отправить', 'сенд', 'послать'],
    response: 'send_message',
    action: { type: 'sendChat' },
  },
  {
    triggers: ['очисти поле', 'очисти ввод', 'очисти чат', 'стереть текст', 'удали текст'],
    response: 'clear_chat',
    action: { type: 'clearInput' },
  },

  // ===== SIDEBAR =====
  {
    triggers: ['открой боковую', 'покажи панель', 'боковая панель', 'сайдбар', 'покажи сайдбар', 'разверни панель', 'раскрой меню', 'открой меню', 'открой вертикальное меню', 'раскрой боковое', 'раскрой вертикальное'],
    response: 'sidebar_open',
    action: { type: 'navigate', path: '__sidebar_open' },
  },
  {
    triggers: ['закрой боковую', 'скрой панель', 'убери панель', 'закрой сайдбар', 'сверни панель', 'сверни боковую', 'сверни меню', 'свернуть меню', 'свернуть панель', 'свернуть боковое', 'закрой меню', 'закрой вертикальное меню', 'скрой меню', 'убери меню', 'спрячь меню'],
    response: 'sidebar_close',
    action: { type: 'navigate', path: '__sidebar_close' },
  },
  {
    triggers: ['история чатов', 'покажи историю', 'мои чаты', 'предыдущие чаты'],
    response: 'history',
    action: { type: 'toggleSidebar' },
  },

  // ===== PREVIEW =====
  {
    triggers: ['запусти проект', 'запусти превью', 'превью', 'preview', 'покажи превью', 'покажи результат', 'запусти результат', 'запуск проекта', 'открой превью'],
    response: 'run_preview',
    action: { type: 'runPreview' },
  },

  // ===== LOGOUT =====
  {
    triggers: ['выйти', 'выйти из аккаунта', 'выход', 'разлогиниться', 'логаут'],
    response: 'logout',
    action: { type: 'logout' },
  },

  // ===== MCP CONNECT =====
  {
    triggers: ['подключи mcp', 'подключить сервер', 'коннект mcp'],
    response: 'connect_mcp',
    action: { type: 'openModal', modal: 'mcp' },
  },
  {
    triggers: ['отключи mcp', 'отключить сервер', 'дисконнект'],
    response: 'disconnect_mcp',
  },

  // ===== GITHUB COMMANDS =====
  {
    triggers: ['подключи гитхаб', 'подключить гитхаб', 'войди в гитхаб', 'авторизуй гитхаб', 'гитхаб авторизация', 'connect github', 'github авторизация'],
    response: 'connect_github',
    action: { type: 'connectGitHub' },
  },
  {
    triggers: ['открой гитхаб', 'покажи гитхаб', 'гитхаб панель', 'репозитории'],
    response: 'open_github',
    action: { type: 'openModal', modal: 'github' },
  },
  {
    triggers: ['залить на гитхаб', 'сохрани в гитхаб', 'запуш', 'пуш', 'push', 'отправь в репозиторий', 'закоммить', 'коммит'],
    response: 'push_github',
    action: { type: 'pushToGitHub' },
  },
  {
    triggers: ['создай репозиторий', 'новый репозиторий', 'новый реп', 'создай реп'],
    response: 'create_repo',
    action: { type: 'sendToAgent', text: 'Создай новый GitHub репозиторий для текущего проекта' },
  },

  // ===== FILE MANAGEMENT COMMANDS =====
  {
    triggers: ['открой папку', 'выбери папку', 'локальная папка', 'открыть папку', 'папка на компьютере', 'локальный проект'],
    response: 'open_folder',
    action: { type: 'openLocalFolder' },
  },
  {
    triggers: ['покажи файлы', 'открой файловую панель', 'файловая панель', 'панель файлов', 'дерево файлов'],
    response: 'open_files',
    action: { type: 'openFilesPanel' },
  },
  {
    triggers: ['скрой файлы', 'закрой файловую панель', 'спрячь файлы'],
    response: 'close_files',
    action: { type: 'closeFilesPanel' },
  },
  {
    triggers: ['сохрани файл', 'сохранить файл', 'запиши изменения'],
    response: 'save_file',
    action: { type: 'saveCurrentFile' },
  },
  {
    triggers: ['создай новый файл', 'новый файл проекта', 'добавь файл в проект'],
    response: 'create_new_file',
    action: { type: 'createFile' },
  },

  // ===== WORK PROCESS PHRASES =====
  {
    triggers: ['анализируй задачу', 'анализ', 'проанализируй задачу'],
    response: 'analyzing',
  },
  {
    triggers: ['исследуй', 'исследование', 'изучи'],
    response: 'researching',
  },
  {
    triggers: ['пиши решение', 'решение', 'напиши решение'],
    response: 'writing',
  },
  {
    triggers: ['обработай', 'обработка'],
    response: 'processing',
  },
  {
    triggers: ['генерируй', 'сгенерируй'],
    response: 'generating',
  },
  {
    triggers: ['какую модель', 'выбери модель', 'смени модель'],
    response: 'select_model',
  },
  {
    triggers: ['опиши задачу', 'какая задача', 'расскажи задачу'],
    response: 'describe_task',
  },
  {
    triggers: ['что дальше', 'что теперь', 'а дальше'],
    response: 'what_next',
  },
  {
    triggers: ['давай приступим', 'за работу', 'начинаем работу'],
    response: 'lets_go',
  },
  {
    triggers: ['не поняла', 'не понимаю', 'непонятно'],
    response: 'not_understand',
  },

  // ===== FALLBACK =====
  {
    triggers: ['напиши', 'напиши промт', 'промт для'],
    response: 'cant_do',
  },
];

const JOKES = ['joke1', 'joke2', 'joke3', 'joke4', 'joke5', 'joke6', 'joke7', 'joke8'];
const RIDDLES = ['riddle1', 'riddle2', 'riddle3', 'riddle4'];
const TIPS = ['tip_voice', 'tip_prompts', 'tip_modes', 'tip_files', 'tip_diff'];

let lastJokeIdx = -1;
let lastRiddleIdx = -1;
let lastTipIdx = -1;

function getNextRandom(arr: string[], lastIdx: number): [string, number] {
  let idx = Math.floor(Math.random() * arr.length);
  if (idx === lastIdx && arr.length > 1) idx = (idx + 1) % arr.length;
  return [arr[idx], idx];
}

export interface MatchResult {
  response: string;
  action?: VoiceAction;
}

const AGENT_COMMAND_PATTERNS: { pattern: RegExp; buildAction: (match: RegExpMatchArray, full: string) => VoiceAction; response: string }[] = [
  {
    pattern: /(?:напиши|создай|сделай|написать|закодь|запрограммируй)\s+(?:код\s+)?(.+)/i,
    buildAction: (_m, full) => ({ type: 'sendToAgent', text: full }),
    response: 'start_work',
  },
  {
    pattern: /(?:проанализируй|анализируй|проверь|ревью)\s+(?:код\s+)?(.+)/i,
    buildAction: (_m, full) => ({ type: 'sendToAgent', text: full }),
    response: 'analyzing',
  },
  {
    pattern: /(?:найди|поищи|открой)\s+файл\s+(.+)/i,
    buildAction: (_m, full) => ({ type: 'sendToAgent', text: full }),
    response: 'search',
  },
  {
    pattern: /(?:удали|убери)\s+файл\s+(.+)/i,
    buildAction: (_m, full) => ({ type: 'sendToAgent', text: full }),
    response: 'delete',
  },
  {
    pattern: /(?:переделай|измени|отредактируй|перепиши)\s+(?:файл\s+)?(.+)/i,
    buildAction: (_m, full) => ({ type: 'sendToAgent', text: full }),
    response: 'fix',
  },
  {
    pattern: /(?:создай|сделай)\s+(?:папку|директорию|каталог)\s+(.+)/i,
    buildAction: (_m, full) => ({ type: 'sendToAgent', text: full }),
    response: 'start_work',
  },
  {
    pattern: /(?:создай|сделай)\s+файл\s+(.+)/i,
    buildAction: (_m, full) => ({ type: 'sendToAgent', text: full }),
    response: 'start_work',
  },
  {
    pattern: /(?:найди в интернете|поищи в интернете|загугли|найди информацию|поиск в сети)\s+(.+)/i,
    buildAction: (_m, full) => ({ type: 'sendToAgent', text: `Найди информацию в интернете: ${full}` }),
    response: 'search',
  },
  {
    pattern: /(?:собери данные|собери информацию|проанализируй данные)\s+(?:о|по|про)\s+(.+)/i,
    buildAction: (_m, full) => ({ type: 'sendToAgent', text: full }),
    response: 'analyzing',
  },
];

export function matchPhrase(input: string): MatchResult | null {
  const normalized = input.toLowerCase().trim();
  if (!normalized) return null;

  for (const entry of PHRASE_DB) {
    for (const trigger of entry.triggers) {
      if (normalized.includes(trigger)) {
        let response = entry.response;

        if (response === '_random_joke') {
          const [joke, idx] = getNextRandom(JOKES, lastJokeIdx);
          lastJokeIdx = idx;
          response = joke;
        } else if (response === '_random_riddle') {
          const [riddle, idx] = getNextRandom(RIDDLES, lastRiddleIdx);
          lastRiddleIdx = idx;
          response = riddle;
        } else if (response === '_random_tip') {
          const [tip, idx] = getNextRandom(TIPS, lastTipIdx);
          lastTipIdx = idx;
          response = tip;
        } else if (response === '_toggle_theme') {
          return { response: 'dark_theme', action: { type: 'toggleTheme' } };
        } else if (response === '_light_theme') {
          return { response: 'settings_saved', action: { type: 'setTheme', theme: 'light' } };
        } else if (response === '_change_name') {
          const nameMatch = normalized.match(/(?:имя|назови меня)\s+(.+)/);
          if (nameMatch) {
            return { response: 'save', action: { type: 'changeName', name: nameMatch[1].trim() } };
          }
          return { response: 'open_profile', action: { type: 'openModal', modal: 'profile' } };
        } else if (response === '_change_bio') {
          const bioMatch = normalized.match(/(?:о себе|описание|биографию?|био)\s+(.+)/);
          if (bioMatch) {
            return { response: 'save', action: { type: 'changeBio', bio: bioMatch[1].trim() } };
          }
          return { response: 'open_profile', action: { type: 'openModal', modal: 'profile' } };
        } else if (response.startsWith('_agent_')) {
          return { response: 'start_work', action: { type: 'sendToAgent', text: input } };
        }

        return { response, action: entry.action };
      }
    }
  }

  for (const cmd of AGENT_COMMAND_PATTERNS) {
    const match = normalized.match(cmd.pattern);
    if (match) {
      return { response: cmd.response, action: cmd.buildAction(match, input) };
    }
  }

  return null;
}

export function isAgentCommand(input: string): boolean {
  const lower = input.toLowerCase();
  const agentKeywords = [
    'напиши код', 'создай', 'сделай', 'проанализируй', 'найди файл', 'удали файл',
    'переделай', 'измени', 'создай папку', 'создай файл', 'найди в интернете',
    'собери данные', 'протестируй', 'проверь', 'отладь', 'дебаг', 'рефактор',
    'оптимизируй', 'документируй', 'задокументируй', 'объясни код',
  ];
  return agentKeywords.some(kw => lower.includes(kw));
}
