# Tasks

Порядок внутри каждой задачи — TDD: сначала тест (красный), потом реализация (зелёный).

Пакеты:

- `R` = `packages/form/react/react`;
- `S` = `packages/form/react/shadcn`;
- `H` = `packages/form/react/heroui`;
- `D` = `apps/docs`.

Между правками — `pnpm verify:affected`.

## 1. Размонтированная нативная группа снимает свои ошибки (исправление A)

- [x] 1.1 Тест в новом `R/src/group-unmount.test.tsx`: блок адреса с `validators: { onBlur }`
      монтируется на `billing` по галочке. Шаги: ушли с пустого поля и увидели ошибки → сняли
      галочку. Ожидание: `canSubmit === true`, сабмит формы вызывает `onSubmit`. Повторная галочка
      → у блока нет ошибок до нового blur. Проверка: тест красный на текущем коде, по той же
      причине, что в спайке (`fieldMeta['billing'].errorMap` не пуст).
- [x] 1.2 Реализовать cleanup в `R/src/form-group.tsx` по design.md, «Исправление A»: эффект после
      `useTanStackFormGroup`; ничего не делать, если остался другой экземпляр с тем же `name`;
      очистить `errorMap` и `errorSourceMap` целиком (см. design.md, почему не по источнику); флаги
      взаимодействия не трогать. Проверка: тест
      1.1 зелёный.
- [x] 1.3 Добавить в тот же файл тесты из спеки: вторая группа на том же имени сохраняет ошибки;
      `isTouched` у `billing` сохраняется; очистка не зависит от источника ошибки; отложенный async-валидатор, начатый до размонтирования, не
      пишет ошибки после него; сценарий 1.1 под `StrictMode`. Проверка: `pnpm --filter
@ez-kit/form-react test` зелёный.
- [x] 1.4 Тест для `form.FormGroup` и `useFormGroup`: тот же сценарий 1.1 через каждый из них.
      Проверка: зелёный — три входа в пакет идут через одну точку.

## 2. Сабмит всей формы не запускает группы (откат R62)

- [x] 2.1 Перевернуть тесты в `R/src/group-submit.test.tsx`:
  - «runs the block on a whole-form submit, untouched (R62)» → «a whole-form submit leaves an
    untouched block alone» (`onSubmit` вызван, ошибок блока нет);
  - «runs a group's onSubmitAsync exactly once per whole-form submit» → «never runs a group's
    onSubmitAsync on a whole-form submit» (под `StrictMode`);
  - у «shows one message when the group and the form schema state the same rule» снять метку
    R62 и запустить блок по `onChange`.

  Добавить тест «an error the block already reported blocks the whole form» (blur → сабмит
  формы не проходит → исправление → проходит). Проверка: первые два красные на текущем коде.

- [x] 2.2 В `R/src/map-group.test.tsx` перевернуть T6-2: сабмит формы при незавершённой
      async-проверке сабмита блока вызывает `onSubmit` формы, а `onGroupSubmit` — нет. Добавить
      тест «a whole-form submit leaves an untouched mapped block alone». Проверка: красные на
      текущем коде.
- [x] 2.3 Удалить `afterValidateAllFields` из `coreHooksFor` (`R/src/create-form.tsx`), из
      `CoreHooks` и из обёртки `validateAllFields` в `R/src/core-hooks.ts`. Обновить докблоки,
      упоминающие R62: `create-form.tsx`, `group-registry.ts` (`validateGroups`), `map-group.ts`
      (`MapGroupCause` / slots), `group-types.ts:233`. Проверка: тесты 2.1 и 2.2 зелёные; `grep -rn
"R62" packages/form/react/react/src` находит только тесты, где метка оправдана; `pnpm --filter
@ez-kit/form-react typecheck lint` зелёный.
- [x] 2.4 Убедиться, что сабмит группы не изменился: существующие тесты R61, R63, R71, R82, R83 и
      R86 в `group-submit.test.tsx`, `map-group.test.tsx` и `field-groups.test.tsx` зелёные без
      правок. Проверка: `pnpm --filter @ez-kit/form-react test`.

## 3. Схема формы как последний барьер

- [x] 3.1 Тест в `R/src/group-submit.test.tsx` (или новом `form-schema-barrier.test.tsx`): схема
      формы `intersection` + `discriminatedUnion` по `billingDiffers`. Проверить:
  - один сабмит даёт ошибки на `email`, `shipping.*` и, при галочке, на `billing.*`, и ничего
    на `billing` и в корне;
  - снятая галочка пропускает сабмит;
  - ошибка схемы на размонтированном поле (`account.name` скрытой части) блокирует сабмит и
    видна после монтирования.

  Проверка: зелёный (фиксирует поведение TanStack, на которое опирается M2).

- [x] 3.2 Показ ошибок: поле, смонтированное после попытки сабмита, показывает ошибки схемы формы,
      хотя не тронуто (`shownFieldErrors` в `R/src/field-render-props.ts`, тот же гейт в
      `R/src/fields/array-field.tsx`). Без этого форма заблокирована без видимой причины. Проверка:
      юнит-кейс в `R/src/field-render-props.test.ts` и сценарий «несмонтированное поле» в
      `R/src/form-schema-barrier.test.tsx` — оба красные при `attempted = false`.

## 4. Реэкспорт `revalidateLogic`

- [x] 4.1 Тест в `R/src/form-schema-barrier.test.tsx` (там фикстура чекаута; задача называла `create-form.test.tsx`): форма с `validationLogic: revalidateLogic()` и
      `validators: { onDynamic: schema }`, где `revalidateLogic` импортирован из `../index`.
      Проверить:
  - до сабмита ошибок нет и `canSubmit` равен `true`;
  - после неудачного сабмита галочка сразу показывает ошибки billing;
  - исправленный email перестаёт показывать ошибку.

  Проверка: красный (нет экспорта).

- [x] 4.2 Добавить `export { revalidateLogic } from '@tanstack/react-form'` в `R/src/index.ts`
      рядом с `useSelector`, с тем же обоснованием в комментарии. Добавить его в реэкспорт из
      `@ez-kit/form-react` в `S/src/index.ts` и `H/src/index.ts`. Проверка: тест 4.1 зелёный;
      кейс в `R/src/composition-types.test.tsx` (или `form-types` по месту): `<Form
validationLogic={revalidateLogic()} validators={{ onDynamic: schema }}>` компилируется, а
      `onDynamic` у `withFieldGroup` — ошибка (`@ts-expect-error`). Плюс `pnpm --filter
@ez-kit/form-shadcn --filter @ez-kit/form-heroui build typecheck` зелёный.
- [x] 4.3 Если `D/test/tree-shaking.test.ts` перечисляет экспорты форм-пакетов, обновить
      ожидаемые наборы. Проверка: `pnpm --filter @ez-kit/docs exec vitest run
test/tree-shaking.test.ts` зелёный; `pnpm size` по форм-пакетам в бюджете.

## 5. Предупреждение о префиксе без разделителя

- [x] 5.1 Тесты в новом `R/src/group-prefix.test.tsx`:
  - поле `billingDiffers` и блок на `billing` дают один `console.error` с текстом
    `prefixClashMessage('billing', 'billingDiffers')`;
  - повторный рендер не даёт второго сообщения;
  - `billing.street` и `billing[0]` не дают сообщений;
  - в production (`NODE_ENV=production`) сообщений нет.

  Проверка: красные.

- [x] 5.2 Реализовать `prefixClashMessage` и `warnOnPrefixClash` в `R/src/group-registry.ts`,
      вызвать их из development-эффекта в `R/src/form-group.tsx`. Сообщение называет оба имени,
      советует переименовать и ссылается на TanStack #2337. Проверка: тесты 5.1 зелёные.

## 6. Документация и примеры

- [x] 6.1 Переписать `D/shared/form/examples/components/composition-checkout-rules.tsx` по
      design.md, «Рецепт схемы формы»:
  - `addressSchema` и `cardSchema` — константы, общие для блоков и схемы формы;
  - схема формы — `intersection` + `discriminatedUnion`;
  - `<Form validationLogic={revalidateLogic()} validators={{ onDynamic: checkoutSchema }}>`;
  - `revalidateLogic` импортируется из того же модуля, что и `Form` (через `shared/form/FormKit`,
    если он реэкспортирует кит, иначе добавить туда);
  - внутренних комментариев нет.

  Проверка: `pnpm --filter @ez-kit/docs typecheck`; пример в обоих китах на
  `http://localhost:3613/docs/form/composition`:
  - пустой сабмит → ошибки email, shipping и card;
  - галочка → сразу ошибки billing;
  - снятие галочки → ошибки billing уходят, «Place order» снова доступна.

- [x] 6.2 В `D/shared/form/examples/components/composition.tsx`:
  - профиль получает схему формы с `security: passwordPairSchema`;
  - sign-up получает `z.intersection(z.object({ login }), passwordPairSchema)` вместо списка
    полей без правил.

  Оба на `onDynamic` + `revalidateLogic()`. Проверка: typecheck; в браузере «Save profile» на
  пустой паре не отправляет и фокусирует `security.password`.

- [x] 6.3 `D/content/docs/form/composition.mdx`:
  - «One form, taken apart»: таблица «Rule | Lives in | Why there» — схема формы держит все
    правила данных, блоки — раннюю обратную связь; строка про billing — «the form's schema, a
    union on `billingDiffers`»;
  - абзац про двухстадийную проверку заменить описанием `onDynamic`;
  - «Its own submit» и абзац про сабмит всей формы (сейчас строка 222): сабмит формы групп не
    запускает, показанная группой ошибка блокирует;
  - «Where a rule goes»: схема формы — источник правды, рецепт union / `superRefine`, `onSubmit`
    для форм без условных частей с ограничением, «не ставить одну схему на оба триггера»;
  - абзац sign-up: про составную схему.

  Проверка: `pnpm --filter @ez-kit/docs exec vitest run test/docs-option-names.test.ts` зелёный;
  если таблицы изменились, обновить `D/test/docs-options/page-type-map.ts`.

- [x] 6.4 `D/content/docs/form/validation.mdx`, раздел «When validation runs»: добавить
      `onDynamic` с `validationLogic: revalidateLogic()` — что делает, когда выбирать — и ссылку
      на composition. Проверка: страница рендерится на dev-сервере; docs-option-names зелёный.
- [x] 6.5 e2e в `D/e2e/packages/form/composition.spec.ts`:
  - «"Save profile" runs the block too» → «"Save profile" checks the pair through the form's
    schema»;
  - новые сценарии чекаута: пустой «Place order» показывает email, shipping и card; галочка
    сразу показывает billing; снятие галочки после ошибок billing возвращает «Place order»
    (регрессия бага); «Save card» проверяет только карту.

  Проверка: `pnpm --filter @ez-kit/docs exec playwright test e2e/packages/form/composition.spec.ts`
  зелёный для shadcn и heroui; `D/test/e2e-slots.test.ts` зелёный.

## 7. Спека 009 и changeset

- [x] 7.1 `specs/009-form-composition/design.md`:
  - D7 «Где ставить правило»: схема формы — источник правды на `onDynamic` (или `onSubmit` без
    условных частей), группы — ранняя обратная связь и граница сабмита;
  - D18 «Финальный сабмит»: группы неактивных шагов не запускаются; правила блоков внутри шагов
    должны быть и в схеме формы; судьбу валидаторов `form.Step` на финальном сабмите отметить
    как вопрос к обсуждению Steps;
  - «Дубли сообщений»: обновить триггеры.

  Проверка: `grep -n "Последний барьер — схема формы на \`onSubmit\`" specs/009-form-composition/design.md`
  ничего не находит.

- [x] 7.2 Поправить на месте `.changeset/form-composition-helpers.md`:
  - фразу «A whole-form submit now runs every mounted group's validators…» заменить на M2: сабмит
    формы групп не запускает, правила, которые держат форму, — в её схеме, ссылка на рецепт;
  - добавить: размонтированная группа снимает свои ошибки; реэкспорт `revalidateLogic`;
    предупреждение о префиксе.

  Проверка: `node scripts/check-changesets.mjs` и `pnpm lint` (включая `check-site-url.mjs`)
  зелёные.

## 8. Интеграционная проверка

- [x] 8.1 Полный прогон последовательно: `pnpm build`, `pnpm lint`, `pnpm typecheck`,
      `pnpm test`, `pnpm size` — каждый отдельным `turbo run`. Проверка: все зелёные.
- [x] 8.2 Ручная проверка в браузере, оба кита, страницы `form/composition` и `form/validation`:
      каждый пример ведёт себя так, как описано в тексте над ним. Проверка: сценарии 6.1 и 6.2
      проходят вручную в shadcn и heroui.

## Workflow follow-up

- После этого change — обсуждение `form.Steps` / `form.Step` (D18) на модели M2.
- Следить за TanStack #2296 (семантика размонтирования) и #2337 (`startsWith`). Когда upstream
  исправит, убрать cleanup из 1.2 и предупреждение из 5.2; тесты 1.x и 5.x подскажут, когда.
