# TON Casino Mini App (frontend)

Starter для Telegram Mini App на React + Vite + TON Connect.
Клиент подключается к бэкенду по WebSocket; игровая логика и выплаты — на сервере.

## Запуск

```bash
npm install
npm run dev
npm run build
```

## Переменные окружения (`.env`)

- `VITE_API_BASE` — URL бэкенда (https://...)
- `VITE_WS_URL` — WebSocket URL (wss://...)

## Деплой

Проще всего Vercel / Netlify / Cloudflare Pages — подключи GitHub-репо, build = `npm run build`, output = `dist`.
Готовый URL вставь в BotFather как Mini App URL.

## Структура

```
src/
  main.tsx          — entry
  App.tsx           — оболочка + TON Connect
  telegram.ts       — Telegram WebApp SDK
  api.ts            — клиент REST API бэкенда
  CrashGame.tsx     — UI Ракетки
  styles.css
```

## Важно

Это только фронт. Для работы нужен бэкенд:
валидация initData (HMAC по bot token), движок Crash с provably fair,
учёт баланса, TON депозиты/выводы.
