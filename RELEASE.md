Список команд по шагам

1. Убедись, что всё чисто и собирается (CI)
   pnpm ci # lint + typecheck + test + build + size

2. Создай changeset (опиши изменения, выбери bump: patch/minor/major)
   pnpm changeset
   В интерактиве: выбери @ez-kit/zu-store (пробел), укажи тип версии, напиши описание.

3. Примени версии из changeset (поднимет version в package.json + обновит CHANGELOG)
   pnpm version-packages

4. Закоммить bump версии
   git add -A
   git commit -m "chore: release @ez-kit/zu-store"

5. Залогинься в npm (если ещё не залогинен) — выполни сам в терминале:
   ! npm whoami # проверить
   ! npm login # если нужно

6. Опубликуй
   pnpm release # changeset publish — соберёт и запушит в npm

▎ ⚠️ changeset publish не запускает build сам — собери пакеты заранее (pnpm build, входит в pnpm ci на шаге 1), иначе опубликуется без dist/.

7. Запушь коммит и теги
   git push --follow-tags
