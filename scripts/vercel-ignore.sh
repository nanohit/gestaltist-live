#!/bin/sh
# Ignored Build Step для Vercel: exit 0 — пропустить сборку, exit 1 — собирать.
#
# Загрузчик ссылается на cdn/ того коммита, который деплоится, поэтому
# деплоим только коммиты GitHub Actions с готовой сборкой (chore(cdn): ...).
# Обычный пуш в main запускает workflow, а тот уже пушит коммит для Vercel.
case "$VERCEL_GIT_COMMIT_MESSAGE" in
  "chore(cdn):"*) exit 1 ;;
  "") exit 1 ;; # не git-деплой (vercel deploy из CLI) — собираем
  *)
    echo "Пропуск: жду коммит с CDN-сборкой от GitHub Actions"
    exit 0
    ;;
esac
