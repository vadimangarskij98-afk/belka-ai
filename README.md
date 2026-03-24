# BELKA AI — Multi-Agent AI Platform

**BELKA AI** — полнофункциональная мультиагентная платформа для работы с искусственным интеллектом. Включает чат с несколькими AI-агентами, генерацию кода, изображений, голосовой ассистент, встроенную IDE с терминалом, интеграцию с GitHub и систему подписок.

---

## Содержание

1. [Технологический стек](#технологический-стек)
2. [Структура проекта](#структура-проекта)
3. [База данных](#база-данных)
4. [API маршруты](#api-маршруты)
5. [Система AI-агентов](#система-ai-агентов)
6. [Фронтенд](#фронтенд)
7. [Голосовой ассистент](#голосовой-ассистент)
8. [Безопасность и аутентификация](#безопасность-и-аутентификация)
9. [Переменные окружения](#переменные-окружения)
10. [Запуск](#запуск)
11. [Визуальные ресурсы](#визуальные-ресурсы)

---

## Технологический стек

| Компонент | Технология |
|-----------|-----------|
| **Монорепозиторий** | pnpm workspaces |
| **Node.js** | v24+ |
| **Фронтенд** | React 19 + Vite 7 + TypeScript |
| **UI библиотека** | Tailwind CSS 4 + shadcn/ui |
| **Роутинг (клиент)** | wouter |
| **Состояние** | TanStack React Query |
| **API сервер** | Express 5 |
| **База данных** | PostgreSQL 16 + Drizzle ORM |
| **Валидация** | Zod v4 + drizzle-zod |
| **API спецификация** | OpenAPI 3.0 + Orval (кодогенерация) |
| **Сборка сервера** | esbuild (CJS bundle) |
| **Аутентификация** | JWT (jsonwebtoken) + bcrypt |
| **AI провайдеры** | OpenRouter, Anthropic (Claude), Google (Gemini), OpenAI |
| **Голос** | ElevenLabs TTS + Web Speech API |
| **Изображения** | Pollinations.ai |

---

## Структура проекта

```
workspace/
├── artifacts/
│   ├── belka-ai/                    # React фронтенд
│   │   ├── src/
│   │   │   ├── pages/               # Страницы приложения
│   │   │   │   ├── Home.tsx          # Лендинг
│   │   │   │   ├── Auth.tsx          # Авторизация
│   │   │   │   ├── Docs.tsx          # Документация
│   │   │   │   ├── Profile.tsx       # Профиль пользователя
│   │   │   │   ├── Settings.tsx      # Настройки
│   │   │   │   ├── chat/Chat.tsx     # Основной чат и IDE
│   │   │   │   ├── shared/SharedChat.tsx  # Публичный чат
│   │   │   │   └── admin/            # Админ-панель
│   │   │   │       ├── Layout.tsx
│   │   │   │       ├── Dashboard.tsx
│   │   │   │       ├── Agents.tsx
│   │   │   │       ├── Models.tsx
│   │   │   │       ├── Users.tsx
│   │   │   │       ├── Subscriptions.tsx
│   │   │   │       ├── Referrals.tsx
│   │   │   │       └── VoiceAssistant.tsx
│   │   │   ├── components/
│   │   │   │   ├── layout/           # ChatSidebar, UserMenu
│   │   │   │   ├── modals/           # DocsModal, GitHubModal, PricingModal, McpModal
│   │   │   │   ├── ui/              # shadcn/ui компоненты
│   │   │   │   └── ui-custom/       # Кастомные компоненты
│   │   │   │       ├── AgentAvatar.tsx
│   │   │   │       ├── CodeBlock.tsx
│   │   │   │       ├── CodeEditor.tsx
│   │   │   │       ├── CodeBackground.tsx
│   │   │   │       ├── DiffViewer.tsx
│   │   │   │       ├── FileExplorer.tsx
│   │   │   │       ├── TerminalPanel.tsx
│   │   │   │       ├── VoiceModal.tsx
│   │   │   │       ├── WorkspacePicker.tsx
│   │   │   │       ├── SplashScreen.tsx
│   │   │   │       └── ShinyText.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── use-voice.ts      # Голосовой ассистент
│   │   │   │   ├── use-mobile.tsx    # Детект мобильного
│   │   │   │   └── use-toast.ts     # Уведомления
│   │   │   └── lib/
│   │   │       ├── auth.ts           # Контекст аутентификации
│   │   │       ├── i18n.ts           # Интернационализация (RU/EN)
│   │   │       ├── local-fs.ts       # File System Access API
│   │   │       ├── theme.ts          # Тема (светлая/тёмная)
│   │   │       ├── voice-phrases.ts  # 900+ голосовых команд
│   │   │       └── voice-responses.ts # Словарь ответов
│   │   └── public/
│   │       ├── belka-logo.png        # Иконка (3D белка)
│   │       ├── belka-mascot-original.png  # Полный маскот
│   │       ├── promo-video.mp4       # Промо-видео
│   │       └── public/audio/         # 233 предзаписанных голосовых файла
│   │
│   └── api-server/                   # Express API сервер
│       └── src/
│           ├── index.ts              # Точка входа сервера
│           ├── routes/               # Все маршруты API
│           │   ├── index.ts          # Роутер + middleware
│           │   ├── auth.ts           # Аутентификация
│           │   ├── conversations.ts  # Чаты и сообщения (SSE)
│           │   ├── agents.ts         # Управление агентами
│           │   ├── admin.ts          # Админ-панель
│           │   ├── voice.ts          # Голосовой синтез
│           │   ├── memory.ts         # Память агентов
│           │   ├── repositories.ts   # Репозитории
│           │   ├── search.ts         # Веб-поиск
│           │   ├── github.ts         # GitHub OAuth + CRUD
│           │   ├── code-runner.ts    # Запуск кода
│           │   ├── subscriptions.ts  # Подписки
│           │   ├── workspace.ts      # Рабочее пространство
│           │   ├── terminal.ts       # Терминал
│           │   ├── git.ts            # Git операции
│           │   ├── preview.ts        # Сервер превью
│           │   ├── referrals.ts      # Реферальная система
│           │   ├── uploads.ts        # Загрузка файлов
│           │   ├── shared.ts         # Общие маршруты
│           │   └── health.ts         # Health check
│           └── agent/                # AI система
│               ├── core.ts           # BelkaAgent — ядро
│               ├── system-prompts.ts # Системные промпты агентов
│               ├── memory.ts         # Менеджер памяти
│               ├── web-search.ts     # Веб-поиск (Brave/Serper/DDG)
│               ├── external-agents.ts # Claude/Gemini/OpenAI
│               ├── orchestrator.ts   # Мультиагентный брейнсторминг
│               ├── mcp-client.ts     # Model Context Protocol
│               └── error-monitor.ts  # Логгер + AutoFixer
│
├── lib/
│   ├── api-spec/                    # OpenAPI спецификация
│   ├── api-client-react/            # Сгенерированные React Query хуки
│   ├── api-zod/                     # Сгенерированные Zod схемы
│   └── db/                          # Drizzle ORM схема + подключение
│       └── src/schema/
│           ├── users.ts
│           ├── conversations.ts
│           ├── agents.ts
│           ├── models.ts
│           ├── memory.ts
│           └── subscriptions.ts
│
├── database-schema.sql              # Полный SQL дамп схемы БД
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

---

## База данных

PostgreSQL 16 с Drizzle ORM. Полная SQL схема в файле `database-schema.sql`.

### Таблица `users` — Пользователи

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | serial PK | Уникальный ID |
| `email` | varchar(255) | Email (уникальный) |
| `username` | varchar(100) | Имя пользователя (уникальное) |
| `password_hash` | text | Хеш пароля (bcrypt, cost 12) |
| `role` | varchar(20) | Роль: `user` / `admin` |
| `plan` | varchar(20) | Подписка: `free` / `pro` / `business` / `enterprise` |
| `github_token` | text | GitHub OAuth токен |
| `github_username` | varchar(255) | GitHub логин |
| `referral_code` | varchar(20) | Реферальный код (уникальный) |
| `referred_by` | integer | ID пригласившего пользователя |
| `bonus_requests` | integer | Бонусные запросы от рефералов |
| `created_at` | timestamp | Дата регистрации |

### Таблица `conversations` — Разговоры

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | serial PK | Уникальный ID |
| `user_id` | integer FK | Владелец (users.id) |
| `title` | varchar(500) | Заголовок |
| `agent_id` | varchar(100) | Привязанный агент |
| `mode` | varchar(50) | Режим: `chat` / `code` / `multi-agent` / `image` |
| `repository_id` | varchar(100) | Привязанный репозиторий |
| `is_archived` | boolean | Архивирован ли |
| `archived_at` | timestamp | Дата архивации |
| `created_at` | timestamp | Дата создания |
| `updated_at` | timestamp | Последнее обновление |

### Таблица `messages` — Сообщения

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | serial PK | Уникальный ID |
| `conversation_id` | integer FK | ID разговора |
| `role` | varchar(50) | Роль: `user` / `assistant` |
| `content` | text | Текст сообщения |
| `agent_name` | varchar(100) | Имя агента (для мультиагент) |
| `agent_avatar` | varchar(255) | Аватар агента |
| `metadata` | text | JSON метаданные (изображения, файлы) |
| `created_at` | timestamp | Дата создания |

### Таблица `agents` — AI-агенты

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | serial PK | Уникальный ID |
| `name` | varchar(100) | Название агента |
| `description` | text | Описание |
| `avatar` | varchar(255) | URL аватара |
| `role` | varchar(50) | Роль: `coder` / `reviewer` / `researcher` / `planner` / `designer` |
| `model_id` | varchar(100) | Модель AI |
| `system_prompt` | text | Системный промпт |
| `capabilities` | text | JSON: возможности агента |
| `is_active` | boolean | Активен ли |
| `memory_enabled` | boolean | Использует память |
| `created_at` | timestamp | Дата создания |

### Таблица `ai_models` — AI-модели

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | serial PK | Уникальный ID |
| `name` | varchar(100) | Название модели |
| `provider` | varchar(50) | Провайдер (openai, anthropic, google) |
| `model_id` | varchar(100) | ID модели в API |
| `api_key` | text | API ключ |
| `capabilities` | text | Возможности |
| `context_window` | integer | Размер контекстного окна |
| `cost_per_token` | double | Стоимость за токен |
| `is_active` | boolean | Активна ли |
| `created_at` | timestamp | Дата добавления |

### Таблица `memory` — Память агентов

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | serial PK | Уникальный ID |
| `agent_id` | varchar(100) | ID агента |
| `user_id` | integer FK | ID пользователя |
| `key` | varchar(255) | Ключ факта |
| `value` | text | Значение |
| `category` | varchar(50) | Категория: `fact` / `preference` / `task` |
| `created_at` | timestamp | Дата создания |

### Таблица `repositories` — Репозитории

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | serial PK | Уникальный ID |
| `user_id` | integer FK | Владелец |
| `name` | varchar(255) | Название |
| `full_name` | varchar(255) | Полное имя (owner/repo) |
| `description` | text | Описание |
| `url` | text | URL репозитория |
| `branch` | varchar(100) | Основная ветка |
| `is_local` | text | Локальный ли |
| `local_path` | text | Путь на диске |
| `created_at` | timestamp | Дата добавления |

### Таблица `subscription_plans` — Планы подписки

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | serial PK | Уникальный ID |
| `plan_id` | varchar(50) | Идентификатор плана (уникальный) |
| `name` | varchar(100) | Название плана |
| `description` | text | Описание |
| `price` | real | Цена в рублях |
| `discount_percent` | integer | Скидка (%) |
| `tokens_per_month` | integer | Лимит запросов в месяц |
| `agents_limit` | integer | Макс. кол-во агентов |
| `features` | text | JSON: список функций |
| `is_active` | boolean | Активен ли |
| `created_at` | timestamp | Дата создания |
| `updated_at` | timestamp | Обновление |

### Таблица `promo_codes` — Промокоды

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | serial PK | Уникальный ID |
| `code` | varchar(50) | Код (уникальный) |
| `discount_percent` | integer | Скидка (%) |
| `plan_id` | varchar(50) | Привязка к плану |
| `usage_limit` | integer | Макс. использований |
| `usage_count` | integer | Текущее кол-во использований |
| `is_active` | boolean | Активен ли |
| `expires_at` | timestamp | Срок действия |
| `created_at` | timestamp | Дата создания |

### Таблица `token_usage` — Использование токенов

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | serial PK | Уникальный ID |
| `user_id` | integer FK | Пользователь |
| `tokens_used` | integer | Использовано за день |
| `date` | varchar(10) | Дата (YYYY-MM-DD) |
| `created_at` | timestamp | Запись создана |

### Таблица `referrals` — Реферальная система

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | serial PK | Уникальный ID |
| `referrer_id` | integer FK | Пригласивший |
| `referred_id` | integer FK | Приглашённый |
| `bonus_awarded` | boolean | Бонус выдан |
| `created_at` | timestamp | Дата |

### Таблица `referral_settings` — Настройки реферальной программы

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | serial PK | Уникальный ID |
| `bonus_requests` | integer | Кол-во бонусных запросов |
| `is_active` | boolean | Активна ли программа |
| `updated_at` | timestamp | Обновление |

### Таблица `api_requests` — Логирование API запросов

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | serial PK | Уникальный ID |
| `user_id` | integer FK | Пользователь |
| `endpoint` | varchar(255) | URL эндпоинта |
| `method` | varchar(10) | HTTP метод |
| `status_code` | integer | Код ответа |
| `created_at` | timestamp | Дата |

---

## API маршруты

Все маршруты имеют префикс `/api`. Middleware `requireAuth` проверяет JWT из `Authorization: Bearer <token>`. Middleware `requireAdmin` дополнительно проверяет роль `admin`.

### Аутентификация (`/api/auth`)

| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| POST | `/auth/register` | — | Регистрация (email, username, password) |
| POST | `/auth/login` | — | Вход (email, password) → JWT токен |
| POST | `/auth/logout` | — | Выход |
| GET | `/auth/me` | requireAuth | Текущий пользователь |
| GET | `/auth/token-usage` | requireAuth | Статистика использования за сегодня |
| POST | `/auth/token-usage` | requireAuth | Обновить счётчик токенов |

### Разговоры (`/api/conversations`)

| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| GET | `/conversations` | requireAuth | Список разговоров (?archived=true) |
| POST | `/conversations` | requireAuth | Создать разговор (title, agentId, mode) |
| GET | `/conversations/:id` | requireAuth | Детали разговора |
| DELETE | `/conversations/:id` | requireAuth | Удалить разговор и сообщения |
| PATCH | `/conversations/:id/archive` | requireAuth | Архивировать |
| PATCH | `/conversations/:id/unarchive` | requireAuth | Разархивировать |
| GET | `/conversations/:id/messages` | requireAuth | Сообщения разговора |
| POST | `/conversations/:id/messages` | requireAuth | Отправить сообщение (SSE стриминг) |

SSE стриминг события:
- `thinking_start` / `thinking_end` — индикатор «думает»
- `status` — статус обработки
- `web_search` — результаты веб-поиска
- `image` — сгенерированное изображение
- `agent_response` — ответ от агента (Coder/Reviewer/Researcher)
- `chunk` — текстовый чанк ответа
- `done` — завершение

### Агенты (`/api/agents`)

| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| GET | `/agents` | — | Список всех агентов |
| POST | `/agents` | — | Создать агента |
| GET | `/agents/:id` | — | Конкретный агент |
| PUT | `/agents/:id` | — | Обновить агента |
| DELETE | `/agents/:id` | — | Удалить агента |

### Админ-панель (`/api/admin`)

| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| GET | `/admin/stats` | requireAdmin | Общая статистика платформы |
| GET | `/admin/analytics` | requireAdmin | Аналитика за 7 дней |
| GET | `/admin/models` | requireAdmin | Список AI моделей |
| POST | `/admin/models` | requireAdmin | Добавить модель |
| PUT | `/admin/models/:id` | requireAdmin | Обновить модель |
| DELETE | `/admin/models/:id` | requireAdmin | Удалить модель |
| GET | `/admin/users` | requireAdmin | Все пользователи |
| PUT | `/admin/users/:id/role` | requireAdmin | Изменить роль |
| PUT | `/admin/users/:id/plan` | requireAdmin | Изменить подписку |
| DELETE | `/admin/users/:id` | requireAdmin | Удалить пользователя |
| GET | `/admin/subscriptions` | requireAdmin | Планы подписки |
| PUT | `/admin/subscriptions/:planId` | requireAdmin | Обновить план |
| GET | `/admin/promo-codes` | requireAdmin | Промокоды |
| POST | `/admin/promo-codes` | requireAdmin | Создать промокод |
| PUT | `/admin/promo-codes/:id` | requireAdmin | Обновить промокод |
| DELETE | `/admin/promo-codes/:id` | requireAdmin | Удалить промокод |
| POST | `/admin/promo-codes/validate` | requireAdmin | Проверить промокод |
| GET | `/admin/token-usage/:userId` | requireAdmin | Использование пользователем |
| GET | `/admin/referral-settings` | requireAdmin | Настройки рефералов |
| PUT | `/admin/referral-settings` | requireAdmin | Обновить настройки |
| GET | `/admin/referrals` | requireAdmin | Все реферальные транзакции |

### Голос (`/api/voice`)

| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| GET | `/voice/voices` | — | Список голосов ElevenLabs |
| POST | `/voice/synthesize` | rate limit (30/мин) | Синтез речи → Base64 audio |

### Память (`/api/memory`)

| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| GET | `/memory` | requireAuth | Факты и воспоминания |
| POST | `/memory` | requireAuth | Сохранить факт |

### Репозитории (`/api/repositories`)

| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| GET | `/repositories` | requireAuth | Список репозиториев |
| POST | `/repositories` | requireAuth | Добавить репозиторий |
| GET | `/repositories/:id/files` | requireAuth | Файлы (GitHub API) |

### Веб-поиск (`/api/search`)

| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| POST | `/search/web` | requireAuth | Поиск через DuckDuckGo |
| POST | `/search/fetch-page` | requireAuth | Извлечение текста из URL |

### GitHub интеграция (`/api/github`)

| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| GET | `/github/auth/url` | requireAuth | URL для OAuth |
| POST | `/github/auth/callback` | requireAuth | Обмен кода на токен |
| GET | `/github/status` | requireAuth | Статус подключения |
| DELETE | `/github/disconnect` | requireAuth | Отключить GitHub |
| GET | `/github/repos` | requireAuth | Список репозиториев |
| GET | `/github/repos/:owner/:repo/contents` | requireAuth | Файлы в репо |
| GET | `/github/repos/:owner/:repo/file` | requireAuth | Содержимое файла |
| PUT | `/github/repos/:owner/:repo/file` | requireAuth | Создать/обновить файл |
| DELETE | `/github/repos/:owner/:repo/file` | requireAuth | Удалить файл |
| POST | `/github/repos/:owner/:repo/create` | requireAuth | Создать репозиторий |
| POST | `/github/repos/:owner/:repo/push` | requireAuth | Пакетный пуш файлов |
| GET | `/github/repos/:owner/:repo/branches` | requireAuth | Список веток |

### Запуск кода (`/api/code`)

| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| POST | `/code/run` | requireAuth | JS/TS/Python в sandbox (10с, 100KB) |
| POST | `/code/preview` | requireAuth | Сборка HTML для превью |

### Подписки (`/api/subscriptions`)

| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| GET | `/subscriptions/plans` | — | Публичные планы |
| POST | `/subscriptions/subscribe` | requireAuth | Сменить план |
| GET | `/subscriptions/usage` | requireAuth | Статистика |
| POST | `/subscriptions/track-usage` | requireAuth | Учёт использования |
| POST | `/subscriptions/apply-promo` | requireAuth | Применить промокод |

### Рабочее пространство (`/api/workspace`)

| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| GET | `/workspace` | requireAuth | Текущий путь |
| POST | `/workspace/set` | requireAuth | Сменить workspace |
| GET | `/workspace/files` | requireAuth | Дерево файлов |
| GET | `/workspace/file/content` | requireAuth | Содержимое файла |
| POST | `/workspace/file` | requireAuth | Создать файл |
| PUT | `/workspace/file` | requireAuth | Обновить (с бэкапом) |
| DELETE | `/workspace/file` | requireAuth | Удалить (с бэкапом) |
| POST | `/workspace/file/restore` | requireAuth | Восстановить |
| POST | `/workspace/directory` | requireAuth | Создать директорию |

### Терминал (`/api/terminal`)

| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| POST | `/terminal/exec` | requireAuth | Bash-команда |
| POST | `/terminal/create` | requireAuth | Сессия терминала |
| POST | `/terminal/:id/write` | requireAuth | Команда в сессии |
| DELETE | `/terminal/:id` | requireAuth | Завершить сессию |

### Git (`/api/git`)

| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| POST | `/git/clone` | requireAuth | git clone |
| GET | `/git/status` | requireAuth | git status |
| POST | `/git/init` | requireAuth | git init |
| POST | `/git/commit` | requireAuth | git add + commit |
| POST | `/git/push` | requireAuth | git push |
| GET | `/git/log` | requireAuth | git log |
| POST | `/git/remote/add` | requireAuth | Добавить remote |

### Превью-сервер (`/api/preview`)

| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| POST | `/preview/start` | requireAuth | Запустить dev-сервер |
| POST | `/preview/stop` | requireAuth | Остановить |
| GET | `/preview/status` | requireAuth | Статус + логи |

### Рефералы (`/api/referrals`)

| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| GET | `/referrals/my-code` | requireAuth | Мой код + статистика |
| POST | `/referrals/apply` | requireAuth | Применить чужой код |
| GET | `/referrals/stats` | requireAuth | Приглашённые |

### Прочие

| Метод | Путь | Middleware | Описание |
|-------|------|-----------|----------|
| GET | `/healthz` | — | Health check |
| GET | `/status` | — | `{ status: "ok" }` |
| POST | `/belka/chat` | requireAuth | Прокси к Belka Coder API |

---

## Система AI-агентов

### Архитектура

Ядро — класс `BelkaAgent` в `agent/core.ts`:

1. **Классификация намерения** — веб-поиск, брейншторм, память или генерация кода
2. **Получение контекста** — релевантные воспоминания из БД
3. **Построение промпта** — системный промпт для выбранного режима
4. **Выполнение** — `runDirect`, `runWithWebSearch` или `runBrainStorm`
5. **Извлечение фактов** — сохранение новой информации о пользователе

### Агенты и роли

| Агент | Роль | Описание |
|-------|------|----------|
| **BELKA CODER** | Кодер | Основной. Пишет код: Анализ → Реализация → Результат |
| **CODE REVIEWER** | Ревьюер | Проверка на безопасность, производительность, типизацию |
| **RESEARCHER** | Исследователь | Синтез информации из нескольких источников |
| **PLANNER** | Планировщик | Дорожные карты, оценка сроков, зависимости |
| **DESIGNER** | Дизайнер | UI/UX: Tailwind, Framer Motion, mobile-first |
| **ORCHESTRATOR** | Оркестратор | Декомпозиция задач, синтез результатов |

### Мультиагентный брейншторм

1. **Параллельная генерация** — Claude (инновации) + Gemini (практика)
2. **Веб-контекст** — глубокое исследование через поиск
3. **Синтез** — мета-оркестратор формирует лучшую идею + 5 шагов

### AI провайдеры

| Провайдер | Модели | Использование |
|-----------|--------|--------------|
| **OpenRouter** | Gemini 2.5 Flash | Стандартные запросы |
| **Anthropic** | Claude Sonnet 4 | Мультиагент, кодирование |
| **Google** | Gemini 1.5 Flash | Фоллбэк (бесплатный) |
| **OpenAI** | GPT-4 | Специальные задачи |
| **Pollinations.ai** | — | Генерация изображений |

### Веб-поиск (каскад)

1. **Brave Search** → 2. **Serper** (Google) → 3. **DuckDuckGo** (без ключа)

---

## Фронтенд

### Страницы

| Путь | Компонент | Описание |
|------|-----------|----------|
| `/` | Home | Лендинг: герой, функции, тарифы, видео |
| `/auth` | AuthPage | Логин / Регистрация |
| `/docs` | DocsPage | Документация |
| `/chat` | ChatPage | Основной чат и IDE |
| `/chat/:id` | ChatPage | Конкретный разговор |
| `/shared/:token` | SharedChat | Публичная ссылка |
| `/admin` | AdminDashboard | Статистика |
| `/admin/models` | AdminModels | Управление моделями |
| `/admin/agents` | AdminAgents | Конфигурация агентов |
| `/admin/users` | AdminUsers | Пользователи |
| `/admin/subscriptions` | AdminSubscriptions | Подписки |
| `/admin/referrals` | AdminReferrals | Рефералы |
| `/admin/voice` | AdminVoiceAssistant | Голосовые команды |

### Режимы чата

| Режим | Описание |
|-------|----------|
| **Код** | Генерация кода, diff-просмотр, запуск |
| **Чат** | Обычный диалог |
| **Мультиагент** | Параллельная работа агентов |
| **Изображение** | Генерация через Pollinations.ai |

### IDE функции

- **Файловый менеджер** — File System Access API + GitHub
- **Редактор кода** — номера строк, табуляция, Ctrl+S
- **Терминал** — bash через WebSocket
- **Diff Viewer** — сравнение версий
- **Превью** — iframe с live-сервером
- **Git** — clone, commit, push из интерфейса
- **Запуск кода** — JS, TS, Python в sandbox

---

## Голосовой ассистент

### Приоритет воспроизведения

1. **Локальные MP3** — 233 предзаписанных файла
2. **ElevenLabs API** — фоллбэк (4 ключа без файлов)
3. **Browser speechSynthesis** — крайний фоллбэк

### 900+ голосовых команд

| Категория | Примеры | Действие |
|-----------|---------|----------|
| **Навигация** | «Открой настройки», «Домой» | Переход |
| **Тема** | «Тёмная тема», «Светлая тема» | Переключение |
| **Режимы** | «Режим кода», «Мультиагент» | Смена режима |
| **Чат** | «Новый чат», «Очисти», «Отправь» | Управление |
| **IDE** | «Открой терминал», «Запусти превью» | IDE |
| **GitHub** | «Подключи гитхаб», «Запушь» | Git |
| **Диктовка** | «Диктуй», «Стоп диктовка» | Голосовой ввод |
| **Информация** | «Что такое React?» | Справка |
| **Шутки** | «Расскажи шутку» | Развлечение |

### Специальные аудио

- `voice_interrupt_0..11.mp3` — 12 вариантов при перебивании
- `voice_fallback_0..4.mp3` — 5 вариантов для нераспознанных
- `voice_joke1..8.mp3` — шутки
- `voice_funny_fact_0..2.mp3` — интересные факты

---

## Безопасность и аутентификация

### JWT

- Заголовок: `Authorization: Bearer <token>`
- Алгоритм: HS256
- Пароли: bcrypt (cost 12)

### Роли

| Роль | Доступ |
|------|--------|
| `user` | Чат, IDE, GitHub, подписки |
| `admin` | + управление пользователями, моделями, агентами, промокоды, аналитика |

### Безопасность

- Sandbox код: 10с таймаут, 100KB лимит, без process.env
- Rate limiting голоса: 30 запросов/минуту
- Бэкапы при редактировании файлов
- `.replit` и `replit.nix` в `.gitignore`

---

## Переменные окружения

| Переменная | Обязательна | Описание |
|-----------|-------------|----------|
| `DATABASE_URL` | Да | PostgreSQL |
| `OPENROUTER_API_KEY` | Да | OpenRouter |
| `JWT_SECRET` | Нет | JWT секрет |
| `GITHUB_CLIENT_ID` | Нет | GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | Нет | GitHub OAuth |
| `ELEVENLABS_API_KEY` | Нет | ElevenLabs TTS |
| `BRAVE_API_KEY` | Нет | Brave Search |
| `SERPER_API_KEY` | Нет | Serper |
| `ANTHROPIC_API_KEY` | Нет | Anthropic Claude |
| `OPENAI_API_KEY` | Нет | OpenAI GPT |

---

## Запуск

```bash
pnpm install
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run seed:agents
pnpm --filter @workspace/api-spec run codegen
PORT=8080 pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/belka-ai run dev
```

---

## Визуальные ресурсы

- **belka-logo.png** — 3D киберпанк белка (favicon)
- **belka-mascot-original.png** — Полный маскот
- **promo-video.mp4** — Промо-видео
- **SplashScreen** — 8с анимация загрузки
- **CodeBackground** — Canvas-анимация с частицами
- **233 MP3 файла** — Предзаписанные голоса

---

## Внешние сервисы

| Сервис | URL | Назначение |
|--------|-----|-----------|
| **Belka Coder API** | `https://belka-coder-api-production.up.railway.app` | AI прокси |
| **GitHub** | `github.com/vadimangarskij98-afk/belka-ai` | Основной репо |
| **GitHub** | `github.com/vadimangarskij98-afk/belka-coder-api` | API агент |

---

Проприетарный проект. Все права защищены.
