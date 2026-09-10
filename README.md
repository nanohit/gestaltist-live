# gestaltist.live

Лендинг онлайн-конференции «Актуальные вопросы гештальт-терапии» (Svelte 5).

## Как это устроено

Из РФ до Vercel проходит около 10 КБ на соединение, и почти 6 КБ из них уходит
на TLS-рукопожатие. Поэтому с Vercel отдаётся только самое маленькое, а всё
тяжёлое идёт через jsDelivr из этого репозитория по хэшу коммита.

- **`/` на Vercel** — HTML-загрузчик около 1–2 КБ (`src/lib/server/bootstrap.ts`):
  SEO-теги, заглушка и ссылки на jsDelivr. Отдаётся с edge-кэша (ISR).
- **Фронтенд** — SPA из `src/spa` (`npm run build:cdn` → `cdn/`). Коммит с
  `cdn/` делает GitHub Actions (`.github/workflows/publish-cdn.yml`), и только
  такие коммиты деплоит Vercel (`scripts/vercel-ignore.sh`): загрузчик ссылается
  на `cdn/` того же коммита. Если `cdn.jsdelivr.net` не отвечает, скрипт
  подгружается с `fastly.jsdelivr.net`.
- **Контент** живёт в Turso. При сохранении в админке `PUT /api/content` пишет
  его в базу и коммитит `content.json` в ветку `content`; хэш коммита попадает
  в загрузчик, и посетители получают контент с jsDelivr. Ответы API — десятки байт.
- **Картинки** грузятся напрямую с imgbb (`i.ibb.co`).

## Разработка

```bash
npm install
cp .env.example .env            # доступы к Turso
npm run build:cdn               # собрать SPA в cdn/
npx vite preview -c vite.spa.config.js --port 5200 &
CDN_BASE=http://localhost:5200/ npm run dev
```

Для деплоя достаточно запушить исходники в `main`: `cdn/` соберёт и закоммитит Actions.

## Переменные окружения (Vercel)

| Переменная | Зачем |
| --- | --- |
| `TURSO_DB_URL` | адрес базы с контентом |
| `TURSO_DB_AUTH_TOKEN` | токен доступа к базе |
| `GITHUB_CONTENT_TOKEN` | токен GitHub с правом записи в этот репозиторий — публикация `content.json` |
| `ISR_BYPASS_TOKEN` | секрет (32+ символа) для мгновенного обновления загрузчика после сохранения |
| `ADMIN_LOGIN` | логин админки (по умолчанию `admin`) |
| `ADMIN_PASSWORD` | пароль админки (по умолчанию `123456789` — поменять!) |

## Админка

Кнопка входа — в футере. Пароль проверяется на сервере (`POST /api/auth`),
сохранение требует заголовок `x-admin-token`.
