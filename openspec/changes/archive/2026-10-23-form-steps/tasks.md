# Tasks

Порядок внутри каждой задачи — TDD: сначала тест (красный), потом реализация (зелёный).

Пакеты:

- `R` = `packages/form/react/react`;
- `S` = `packages/form/react/shadcn`;
- `H` = `packages/form/react/heroui`;
- `D` = `apps/docs`.

Между правками — `pnpm verify:affected`.

## 1. Движок проходов: выделить `createValidatedScope`

- [x] 1.1 Выделить из `R/src/map-group.ts` движок проходов в `createValidatedScope({ form, errorKey,
validators, value, knows, toAbsolute, watches })` — новый модуль `R/src/validated-scope.ts`.
      `createMapGroup` становится его клиентом. Проверка: `R/src/map-group.test.tsx`,
      `R/src/group-submit.test.tsx` и `R/src/group-unmount.test.tsx` зелёные **без правок**;
      `pnpm --filter @ez-kit/form-react typecheck lint` зелёный.
- [x] 1.2 Обобщить фильтр `formErrors` в `R/src/fields/submit.tsx` на префиксы `onGroup:` и
      `onStep:` (константа рядом с `GROUP_ERROR_KEY_PREFIX`). Проверка: тест в `R/src/submit.test.tsx`
      — ошибка под ключом `onStep:x` в `errorMap` формы не попадает в `formErrors`.

## 2. Стор шагов и регистрация шагов

- [x] 2.1 Тесты в новом `R/src/steps.test.tsx`:
  - порядок шагов совпадает с JSX;
  - первый видимый шаг текущий по умолчанию;
  - рендерятся только дети текущего шага;
  - `initial` рендерится через `renderToString`;
  - контролируемый `step` / `onStepChange`;
  - `when` обходит шаг;
  - текущий шаг исчез — переход на ближайший видимый назад, без него — на первый видимый.

  Проверка: красные.

- [x] 2.2 Реализовать стор (`createStore` из `@tanstack/react-store` в `R/src/steps/controller.ts`,
      `useSteps(selector, equal)` на его `useSelector` с `compare: equal`), `form.Steps`
      (провайдер) и `form.Step` (регистрация в `useLayoutEffect`, `when` селектором, `names` со
      стабильной ссылкой). Проверка: тесты 2.1 зелёные.
- [x] 2.3 Повесить `Steps` / `Step` на инстанс (`R/src/create-form.tsx`), заменить ручной список в
      `R/src/reserved-keys.ts`, добавить типы членов в тип инстанса. Проверка: тест в
      `R/src/reserved-keys.test.tsx` — `Steps` / `Step` всё ещё зарезервированы; кейс в
      `R/src/form-types.test.tsx` — `when` получает типизированные значения, неизвестное поле в
      `when` — ошибка типа.
- [x] 2.4 Тест рендеров: при переходе со второго шага на третий из пяти рендер-функции 1, 4 и 5
      не вызываются; `useSteps((s) => s.names)` не ререндерится при вводе. Проверка: зелёные.

## 3. Регистрация полей и групп в шаге

- [x] 3.1 Тесты:
  - поля `form.X`, `group.X`, поля записи `form.ArrayField` и `form.Field` попадают в список шага;
  - `form.NativeField` не попадает;
  - поле, исчезнувшее внутри текущего шага, уходит из списка;
  - уход со шага список сохраняет;
  - под `StrictMode` список не теряет полей;
  - `form.FormGroup`, `withFieldGroup` на пути и с картой регистрируются как группы шага.

  Проверка: красные.

- [x] 3.2 Реализовать `StepContext` и регистрацию в `R/src/field-binding.tsx` (cleanup убирает имя
      только у текущего шага), регистрацию групп в `R/src/form-group.tsx` и `R/src/map-group.ts`.
      Проверка: тесты 3.1 зелёные; `pnpm --filter @ez-kit/form-react test` зелёный.

## 4. Проверка шага и навигация

- [x] 4.1 Тесты `goNext`:
  - невалидный шаг не пропускает, ошибка видна, фокус на первой ошибке;
  - ошибки схемы формы на полях следующих шагов не мешают и не видны;
  - группа шага с нетронутыми невалидными полями блокирует;
  - `onSubmitAsync` шага не вызывается при синхронной ошибке;
  - повторный клик во время проверки игнорируется.

  Проверка: красные.

- [x] 4.2 Реализовать скоуп шага на `createValidatedScope` (`errorKey` `onStep:<name>`; ошибки вне
      шага отбрасываются; подключён, пока шаг видим; в реестр сабмита формы не регистрируется) и
      `goNext` по design.md. Проверка: тесты 4.1 зелёные.
- [x] 4.3 Тесты и реализация `goTo` / `goBack` и `linear`:
  - прыжок через непройденный шаг запрещён;
  - прыжок после правки пройденного шага запрещён и показывает ошибку;
  - назад без проверки;
  - `linear={false}`: `goTo` свободен, а `goNext` блокирует.

  Проверка: зелёные.

- [x] 4.4 Тест «сабмит формы не запускает валидаторы шагов» (`onSubmitAsync` шага не вызывается на
      финальном сабмите) и «сообщённая ошибка шага блокирует `canSubmit`». Проверка: зелёные.
- [x] 4.5 Тест сброса: `form.reset()` очищает `visited` / `passed` и возвращает на `initial` или
      первый видимый. Проверка: зелёный.

## 5. Части для вёрстки

- [x] 5.1 Тесты:
  - `Steps.List` отдаёт `steps` (`name`, `invalid`, `visited`), `current`, `goTo`;
  - `invalid` ложно у непосещённого шага и истинно после неудачной попытки уйти;
  - после финального сабмита ошибка схемы на посещённом шаге делает его `invalid`;
  - `Steps.Item` и `useStep` отдают срез одного шага;
  - `Steps.Controls` отдаёт `canGoBack`, `isLast`, `isValidating`, `stepErrors` (только ошибки шага
    без пути), `formErrors`, `goBack`, `goNext`;
  - ошибка группы без пути не попадает в `stepErrors`;
  - `Steps.Subscribe` и `useSteps(selector, equal)` уважают `equal`;
  - вне `form.Steps` хуки бросают именованную ошибку.

  Проверка: красные.

- [x] 5.2 Реализовать части и собрать `Steps` одним `/* @__PURE__ */ Object.assign` с плоским
      литералом. Экспортировать `useStep`, `useSteps` и типы из `R/src/index.ts`, `S/src/index.ts`,
      `H/src/index.ts`. Проверка: тесты 5.1 зелёные; `pnpm --filter @ez-kit/form-shadcn --filter
@ez-kit/form-heroui build typecheck` зелёный.
- [x] 5.3 Размер и tree-shaking. Проверка: `pnpm --filter @ez-kit/form-react size` в бюджете (если
      бюджет поднят — в том же изменении записать измерение); `D/test/tree-shaking.test.ts` зелёный, при
      необходимости дополнить кейсом «импорт `useSteps` не тянет весь `createForm`».

## 6. Документация и примеры

- [x] 6.1 Пять примеров в `D/shared/form/examples/components/steps*.tsx`, без внутренних
      комментариев, зарегистрированных в `manifest.json` и `registry.ts`:
  - базовый поток;
  - условный шаг с union и `schema.parse` в `onSubmit`;
  - блоки внутри шага;
  - `linear={false}`;
  - свой степпер на `Steps.Item`.

  Проверка: `pnpm --filter @ez-kit/docs typecheck`; каждый пример в обоих китах на dev-сервере ведёт
  себя как описано на странице.

- [x] 6.2 Страница `D/content/docs/form/steps.mdx`:
  - анатомия;
  - регистрация по монтированию, `when` вместо условного рендера;
  - «Далее» как сабмит шага, `linear`;
  - что держит отправку (M2);
  - `stepErrors` и `formErrors`;
  - данные пропущенных шагов и `schema.parse`;
  - правило селекторов.

  Добавить её в `meta.json`, классифицировать таблицы в `D/test/docs-options/page-type-map.ts`.
  Проверка: `docs-option-names.test.ts` зелёный; страница открывается.

- [x] 6.3 Ссылка на шаги из `form/composition.mdx` («Choosing») и из `form/schema.mdx` (визард
      остаётся схемным, JSX-поток — на странице шагов). Проверка: ссылки открываются.
- [x] 6.4 e2e в `D/e2e/packages/form/steps.spec.ts`: базовый поток (невалидный шаг не пропускает,
      валидный проходит, финальный сабмит отправляет); условный шаг (пропуск и DTO без пропущенного
      шага); свободный режим. Проверка: `pnpm exec playwright test e2e/packages/form/steps.spec.ts`
      зелёный в shadcn и heroui; `D/test/e2e-slots.test.ts` зелёный.

## 7. Спека 009 и changeset

- [x] 7.1 D18 в `specs/009-form-composition/design.md`:
  - удалить `stripSkippedSteps` и `verifyCard` на шаге (перенести в `onSubmitAsync` формы);
  - добавить `linear` и `passed`;
  - `stepErrors` — только шаг, плюс `formErrors`;
  - правило «текущий шаг исчез»;
  - закрыть открытый вопрос о валидаторах шага на финальном сабмите.

  Проверка: `grep -n "stripSkippedSteps\|открытый вопрос обсуждения Steps"
specs/009-form-composition/design.md` пуст.

- [x] 7.2 Minor-changeset для `@ez-kit/form-react`, `@ez-kit/form-shadcn`, `@ez-kit/form-heroui`.
      Проверка: `node scripts/check-changesets.mjs` зелёный.

## 8. Интеграционная проверка

- [x] 8.1 Полный прогон последовательно: `pnpm build`, `pnpm lint`, `pnpm typecheck`,
      `pnpm test`, `pnpm size` — каждый отдельным `turbo run`. Проверка: все зелёные.
- [x] 8.2 Ручная проверка страницы шагов в обоих китах на dev-сервере. Проверка: каждый пример
      ведёт себя, как описано в тексте над ним.

## Workflow follow-up

- Отдельный change: перевод схемного визарда и `Wizard` китов на стор `form.Steps`.
