#!/bin/bash

echo "🔄 Auto-pull запущен!"
echo "Буду проверять изменения каждые 10 секунд..."
echo ""

while true; do
  # Fetch changes from remote
  git fetch origin claude/study-codebase-011haoU4bVB92vk9PETxELQ3 --quiet 2>/dev/null

  # Check if there are changes
  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse origin/claude/study-codebase-011haoU4bVB92vk9PETxELQ3)

  if [ "$LOCAL" != "$REMOTE" ]; then
    echo "⬇️  Найдены новые изменения! Пуллю..."
    git pull origin claude/study-codebase-011haoU4bVB92vk9PETxELQ3
    echo "✅ Обновлено! $(date '+%H:%M:%S')"
    echo ""
  fi

  sleep 10
done
