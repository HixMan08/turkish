# ASYL Language School

React + TypeScript + Vite. Компоненты находятся в src/components, содержание — в src/data.ts, дизайн — в src/styles.css.

## Запуск

Требуются Node.js 22.13+ или 24+ и npm. В терминале из этой папки:

```sh
npm install
npm run dev
```

## Проверки

```sh
npm run build
npm run lint
npm run typecheck
```

## Что подключить перед запуском школы

- Подтверждённые контакты, адрес, форматы занятий, цены и расписание.
- Реальный endpoint отправки формы: сейчас она валидирует данные и сохраняет только локальный черновик с явным предупреждением.
- Реальные отзывы с согласия учеников. Выдуманных отзывов нет.
- При смене домена обновить canonical, og:url и og:image в index.html.

## Организация

- src/data.ts — типизированные программы, фразы, вопросы, преимущества и этапы.
- src/components — небольшие компоненты интерфейса.
- src/hooks/useReveal.ts — IntersectionObserver, cleanup и учёт reduced motion.
- public/istanbul.svg — локальная авторская иллюстрация; внешних фото нет.
- public/og-cover.png, favicon.svg — SEO-ресурсы.
- .openai/hosting.json — идентификатор и конфигурация текущего Site.

Включены strict TypeScript, noUnusedLocals, noUnusedParameters, noUncheckedIndexedAccess. ESLint проверяет hooks и запрещает explicit any. Анимации отключаются через prefers-reduced-motion. Шрифты хранятся локально с display=swap, поддерживают кириллицу и турецкие символы; лицензии OFL находятся рядом с файлами шрифтов.

