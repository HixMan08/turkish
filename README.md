# ASYL Language School — fullstack

React + TypeScript в `client`, Express + TypeScript в `server`, PostgreSQL + Prisma. Дизайн ASYL сохранён. Справочное содержание загружается через API; заявки, сессии и очередь уведомлений хранятся в БД.

## Быстрый старт с Docker

Нужен Docker Desktop / Docker Engine с Compose. Из корня проекта:

```sh
node scripts/setup-env.mjs
docker compose up --build -d
```

Первый шаг создаёт `.env` с случайными локальными секретами и не перезаписывает существующий файл. В этой рабочей копии он уже создан. Сервер ждёт PostgreSQL, применяет сохранённые миграции и запускает идемпотентный seed.

Открыть: http://localhost:3001 — сайт; http://localhost:3001/admin — админка.

Создать первого администратора, с интерактивным вводом email и скрытым вводом пароля:

```sh
docker compose exec server npm run admin:create
```

Пароль не меньше 12 символов и не больше 72 байт UTF-8. Общих учётных записей или стандартного пароля нет. Seed никогда не создаёт администратора и не сбрасывает пароли. Повторный `admin:create` с существующим email завершается ошибкой, а не меняет пользователя.

**Приём заявок по умолчанию закрыт и на сервере, и в интерфейсе.** Для проверки на вымышленных данных установите в `.env`:

```dotenv
APPLICATIONS_ENABLED=true
VITE_APPLICATIONS_ENABLED=true
```

Затем `docker compose up --build -d`. Перед приёмом настоящих заявок заполните данные оператора, проверьте юридические документы и место хранения БД. Секреты из `.env` не входят в Git и Docker build context.

## Разработка без контейнера сервера

Нужен Node.js 24+ с npm и работающий PostgreSQL (можно поднять только контейнер БД).

```sh
npm ci
npm run setup
docker compose up db -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run admin:create
npm run dev
```

Клиент: http://127.0.0.1:5173; API: http://127.0.0.1:3001. Vite проксирует `/api` на Express. Если PostgreSQL установлен отдельно, измените `DATABASE_URL`. `npm run db:migrate` применяет уже сохранённые миграции; `npm run db:migrate:dev -- --name your_change` создаёт новую миграцию в разработке. Не используйте `migrate dev` или `db push` на рабочей базе.

```sh
npm run build
npm run lint
npm run typecheck
npm test
npm start
```

Сборка: `client/dist`, `server/dist`. Express обслуживает и API, и готовый клиент на одном origin. После изменения переменных `VITE_*` клиент нужно пересобрать.

## Структура

```text
client/
  src/components/        Сохранённые публичные разделы
  src/admin/             Вход, заявки, фильтры, CSV и формы управления содержанием
  src/consent.ts         Типы, cookies и хук useConsent
  src/ConsentProvider.tsx
  src/api.ts             HTTP-клиент и единые ошибки
  src/content.ts         Контекст содержания из API
  public/                Локальные шрифты, лицензии, favicon, SVG
server/
  src/app.ts             Middleware, публичное API, авторизация
  src/admin-routes.ts    Защищённые операции
  src/security.ts        Сессии, Origin, CSRF, лимиты через БД
  src/notifications.ts   Очередь Telegram/SMTP с повторами
  prisma/schema.prisma
  prisma/migrations/
  prisma/seed.ts
  tests/integration.test.ts
scripts/                 Создание окружения и SEO-файлов
Dockerfile
docker-compose.yml
.env.example
```

Основные модели: Application, Program, Phrase, FaqItem, Review, AdminUser. Дополнительные служебные модели: AdminSession, RateLimitBucket, NotificationOutbox. Добавлены индексы по статусу/языку/времени заявки, срокам сессий и очереди. SQLite намеренно не используется: это допустимая альтернатива, но отдельная несовместимая схема здесь не нужна. Для тестов используется PGlite — изолированный PostgreSQL в WASM с PostgreSQL wire protocol, не SQLite.

## Переменные окружения

Полный список и комментарии находятся в `.env.example`.

- `DATABASE_URL` — PostgreSQL; локально адрес `127.0.0.1`, внутри Compose переопределяется на `db`. Для пароля Compose генератор использует безопасные hex-символы; произвольные спецсимволы в URL нужно кодировать.
- `POSTGRES_PASSWORD` — пароль БД Compose. Изменение переменной не меняет пароль уже созданного тома PostgreSQL: меняйте его средствами БД, не удаляйте рабочий том.
- `SESSION_SECRET` — случайная строка от 32 символов; используется для HMAC идентификаторов лимитов и отпечатков повторных запросов.
- `ALLOWED_ORIGINS` — точные origin через запятую, без путей, `*` и завершающего `/`. Например `https://asyl.example,https://hixman08.github.io`. В production только HTTPS.
- `SITE_URL` — адрес Express-размещения. `HOST`, `PORT` — адрес и порт сервера. В production `NODE_ENV=production`, `HOST=0.0.0.0` внутри контейнера.
- `TRUST_PROXY_HOPS` — 0 по умолчанию. За одним доверенным reverse proxy укажите 1. Не публикуйте порт приложения напрямую в обход этого proxy, не включайте безусловный trust proxy.
- `SESSION_TTL_HOURS` — 8 по умолчанию, максимум 24. `SESSION_ROTATE_MINUTES` — 30. Старый идентификатор удаляется при ротации; logout удаляет сессию в БД.
- `APPLICATIONS_ENABLED` / `VITE_APPLICATIONS_ENABLED` — серверное и клиентское разрешение принимать заявки; по умолчанию false.
- `VITE_API_URL` — пусто при одном origin; при отдельном фронтенде — HTTPS origin API, без `/api`. Это публичный адрес, а не секрет.
- `VITE_SITE_URL` — полный публичный адрес клиентского сайта; для GitHub Pages `https://hixman08.github.io/turkish`.
- `VITE_BASE_PATH` — `/` или `/turkish/` для GitHub Pages.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — необязательные настройки Telegram.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `NOTIFICATION_EMAIL` — необязательные настройки email. SMTP без implicit TLS требует STARTTLS; проверка сертификатов не отключена.
- `VITE_ANALYTICS_SCRIPT_URL`, `VITE_ANALYTICS_WEBSITE_ID` — URL `script.js` и публичный website ID Umami. Пустые значения полностью отключают аналитику.
- `ANALYTICS_ORIGIN` — точный HTTPS origin внешнего Umami для CSP сервера. Для собственного скрипта на том же origin оставьте пустым.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — только для неинтерактивного `admin:create`, не для seed. Лучше используйте скрытый интерактивный ввод; не записывайте пароли в историю команд и не коммитьте их.

## API

Все успешные JSON-ответы используют `{ data: ... }`; список заявок дополнительно имеет `pagination`. Ошибки: `{ error: { code, message, fields?, requestId? } }`. Валидация — Zod; изменяющие JSON-запросы требуют корректного `Origin` и `Content-Type`.

Публичное чтение:

- `GET /api/programs` — активные программы.
- `GET /api/phrases` — фразы; `?random=true` — одна случайная фраза, без кэширования.
- `GET /api/faq`, `GET /api/reviews` — FAQ и только опубликованные отзывы.
- `GET /api/health` — проверка соединения с БД без раскрытия деталей.

Форма: `POST /api/applications` с `X-Idempotency-Key: <UUID>`. Сервер проверяет поля, honeypot `website`, обязательное `consent: true` и `consentVersion: 2026-10-31`; время согласия фиксируется сервером. Максимум 5 попыток за часовое окно с IP; лимиты переживают перезапуск. Для повторной отправки неизменённого тела клиент повторно использует UUID: потерянный ответ не создаст дубль. Другое тело под тем же UUID получает 409. Ключ и персональные данные не сохраняются в браузере.

Авторизация: `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout`. HttpOnly cookie содержит случайный токен; в БД только SHA-256 отпечаток. Secure в production, SameSite=Lax, host-only, Path=/api. CSRF-токен возвращается авторизованному клиенту и хранится только в памяти. Для изменений нужен `X-CSRF-Token` и разрешённый Origin. Попытки входа ограничиваются по IP и по паре IP/email.

Админка:

- `GET /api/admin/applications` — search, status, language, from/to (ISO), page, pageSize (до 100).
- `PATCH /api/admin/applications/:id/status`, `DELETE /api/admin/applications/:id`.
- `GET /api/admin/applications/export` — CSV, до 10 000 строк; потенциальные spreadsheet-formula значения экранируются. Для больших архивов используйте отдельный контролируемый экспорт.
- `GET/POST /api/admin/{programs,phrases,faq,reviews}`, `PUT/DELETE /api/admin/{resource}/:id`.

Роль admin может управлять содержанием, экспортировать и удалять заявки. Роль editor может читать заявки/содержание и менять статус, но не удалять и не экспортировать. `admin:create` создаёт только admin; выдача иной роли — отдельная контролируемая операция в БД. Публичных регистрации и сброса пароля нет.

## Cookies и согласия

До выбора пользователя нет функциональных cookies и запроса аналитического скрипта. `asyl_consent` содержит версию, дату и выбранные категории на 365 дней. Функциональное согласие включает запоминание направления в `asyl_program`. Интерфейс пока RU; переключатель четырёх языков не имитируется. Зарезервированный `asyl_locale` сейчас не устанавливается.

Настройки доступны в футере и на /cookies. Отзыв функционального согласия удаляет функциональные cookies; отзыв аналитики перезагружает страницу для остановки уже загруженного кода. Do Not Track учитывается. Старый локальный демо-черновик с именем/телефоном удаляется при первом открытии новой версии.

`/privacy`, /cookies и /terms — явно помеченные юридические заготовки. Владелец должен заполнить реквизиты, контакты, фактических обработчиков, сроки хранения и резервного копирования; юрист должен проверить применимость норм РК. По статье 12 закона РК требуется размещение базы и/или цифрового объекта хранения персональных данных на территории Казахстана. Выбор зарубежного облака сам по себе не решает это требование.

## Уведомления

Заявка и outbox-запись создаются одной транзакцией. Ошибка Telegram/SMTP не отменяет уже принятую заявку. Worker забирает задачи с lease, повторяет с увеличением интервала до 10 попыток. Состояние каждого канала сохраняется отдельно. После 10 неудач записи остаются в БД для разбора; исправьте настройки и сбросьте attempts/nextAttemptAt уполномоченным оператором. Возможны повторные уведомления при сбое между отправкой и фиксацией результата у провайдера — внешние каналы не обеспечивают exactly-once.

Если каналы не настроены, очередь сохраняется и ничего никуда не отправляется. Сообщения содержат номер заявки и язык, без контактов и комментария. Перед подключением внешних обработчиков оцените правовые основания и трансграничную передачу. Реальная доставка проверяется отдельно с рабочими настройками владельца.

## Размещение

### Рекомендуемый вариант: VPS в Казахстане, один origin

Установить Docker, закрыть публичный доступ к БД, настроить домен и HTTPS reverse proxy (Caddy/Nginx). Compose публикует порты только на loopback; наружу отдаётся только HTTPS proxy. Установить production-переменные и точные разрешённые origin. `VITE_API_URL` оставить пустым. Сайт и `/admin` обслуживаются Express на одном домене. Установить ограничение тела и таймауты также на proxy. Регулярно обновлять пакеты и образы, настроить мониторинг ошибок и резервные копии PostgreSQL с проверкой восстановления.

Перед обновлением сделать резервную копию, затем:

```sh
docker compose up --build -d
```

Compose применяет только сохранённые миграции через migrate deploy. Не используйте `docker compose down -v` на рабочей базе: это удалит том с данными.

### GitHub Pages + отдельный API

Pages размещает только `client/dist`; Express и PostgreSQL требуют отдельного размещения. В Settings → Secrets and variables → Actions → Variables задать `ASYL_API_URL` (HTTPS origin API), и после готовности правовых условий `ASYL_APPLICATIONS_ENABLED=true`. Workflow учитывает новую папку client и /turkish/. Без ASYL_API_URL публикация останавливается, сохраняя прежний сайт.

Админку открывать на домене API: `https://<API_HOST>/admin`. На GitHub Pages /admin показывает ссылку туда. Не ослабляйте SameSite до None ради сторонних cookies. В production-сборке сервера `VITE_API_URL` должен быть пустым, иначе админка будет пытаться обратиться к другому origin. В CORS сервера добавить точный origin GitHub Pages: `https://hixman08.github.io`.

### Render/Railway + Vercel

Технически сервер можно развернуть на Node/Docker-сервисе Render/Railway с PostgreSQL: root directory — корень репозитория, build `npm ci && npm run build`, predeploy `npm run db:migrate`, start `npm start`; начальный seed запускается один раз. Для Vercel root directory `client`, build `npm run build`, output `dist`, API URL задать через VITE_API_URL. Учтите доступ к корневому scripts/build-seo.mjs при использовании monorepo: проще запускать build `npm run build:client` из корня и output `client/dist`. Для маршрутов настроить SPA rewrite на index.html или использовать сгенерированные route entrypoints. Фактические возможности и размещение данных провайдера проверить до загрузки реальных заявок; зарубежные регионы не являются готовым решением требований РК.

Старые публикации в Sites и GitHub Pages не переключаются на новую архитектуру автоматически. Новую версию нужно размещать после готовности сервера и окружения. Код бэкенда не совместим с ограничениями Cloudflare Workers для raw TCP; не пытайтесь опубликовать Express/PostgreSQL как статический Site.

## Тестирование

`npm test` запускает настоящую сохранённую SQL-миграцию через Prisma migrate deploy (дважды для проверки повторного применения) на изолированном PostgreSQL/PGlite. Рабочая DATABASE_URL не используется тестовой БД. Тесты покрывают валидацию, запись заявки и outbox, idempotency, rate limit, Origin, admin login/logout, CSRF, смену статуса, CSV и CRUD отзывов. Seed применяется дважды без перезаписи пользовательских правок. PGlite не заменяет финальный smoke-test на целевом PostgreSQL 17; Docker-среду нужно проверить на машине с Docker.
