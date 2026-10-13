# Form composition — stage 5: composition helpers

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the three composition helpers spec 009's D7 shape. `withForm` takes its `form` from
context when the prop is omitted. `withFieldGroup` gets the bundle's flat fields (`group.TextField`
relative to the block), its own `validators`, its own submit (`group.handleSubmit()` /
`onGroupSubmit`) and `group.errors`, with a string `fields` and with a field map. `form.FormGroup`
gets the flat fields too. A whole-form submit runs every mounted group's rules. Also in this stage:
fix R57 — server errors are cleared on **every** submit and reset path, including the core
`formApi` TanStack hands to callbacks — and define how a group submit treats server errors.

**Architecture:** Everything lives in `@ez-kit/form-react`.

- **Core hooks.** TanStack hands its core `FormApi` to `onSubmit`, listeners and validators, and to
  every field as `field.form`. The instance `useForm` returns is only a spread copy of it. The package
  captures the core through `listeners.onMount` and wraps three of its own members:
  - `_handleSubmit`: clears server errors.
  - `reset`: clears server errors.
  - `validateAllFields('submit')`: runs every mounted group after the fields.
- **Flat group fields.** A group's flat fields re-bind the instance's own field components with
  `name` resolved relative to the group. This is the mechanism array entries already use; the member
  set is shared through `scopedMemberKeys`.
- **String `fields`.** The block mounts TanStack's native `FormGroupApi` on the branch.
- **A field map.** The block is run by a small per-block controller (`map-group.ts`) that writes
  errors under a package-owned `errorMap` key.

**Tech Stack:** pnpm + Turborepo, TypeScript 5.9 (`strict`, `exactOptionalPropertyTypes`,
`noUncheckedIndexedAccess`), React 18/19, TanStack Form 1.33.2 (`@tanstack/store` 0.11), tsup,
Vitest + Testing Library, Next.js 16.3 docs app, Playwright, changesets.

**Spec:** `specs/009-form-composition/design.md`:

- D7 (l. 181–264), all of it;
- §4 scenario 2 (l. 715–818);
- §7 — the only D7-related row ("`path` у узла `step` удалён") is stage 6;
- §8 bullets "Типы", "`withFieldGroup` сабмит", "Группы", and the `withForm` dev error under "Рантайм".

D18 (`stepErrors`) is stage 6. This stage only keeps group errors reachable for it (R75).

Read alongside this plan:

- the stage 4 plan, for the format and R33–R47: `docs/superpowers/plans/2026-10-13-form-composition-stage-4.md`;
- the stage 4 ledger, for R48–R59: `.superpowers/sdd/2026-10-13-form-composition-stage-4/rulings.md`;
- the stage 3 plan, for R16–R24: `docs/superpowers/plans/2026-10-12-form-composition-stage-3.md`;
- the stage 3 ledger, for R25–R32: `.superpowers/sdd/2026-10-12-form-composition-stage-3/rulings.md`.

## Stages of spec 009

All stages land on branch `form-check` in **one PR into `develop`**. The user reviews after each
stage; nothing is merged or pushed between stages.

1. Graph and names — **done**.
2. Factory and context — **done**.
3. Field primitives — **done**.
4. Behaviour (D13, D14, D16, D17, D15) — **done**.
5. **Composition** (this plan): D7 and R57.
6. Steps: D18 and the schema wizard on `form.Steps`.
7. Docs sweep: `custom-fields.mdx`, a second pass over stale claims, the stage 3/4 leftovers.

## Global Constraints

- **English, no attribution.** Code, comments, docblocks and commit messages are in English. No agent
  attribution anywhere in git (`AGENTS.md`): no `Co-Authored-By`, and no Claude, agent or session
  mention, even if a harness asks.
- **Commits.** Conventional Commits, with commit body lines ≤ 100 characters (commitlint).
  Pre-commit runs Prettier + ESLint on staged files. `--max-warnings=0`. Never use `--no-verify`.
- **Imports and lint.**
  - Type imports use `import type`.
  - `import/order` is enforced: value imports are packages, then a blank line, then relative; type
    imports come after them — relative, then `@…` packages, then `react`.
  - Inline `import('…')` type annotations are forbidden.
  - `require-await` is on.
  - `@typescript-eslint/no-unnecessary-type-parameters` rejects a type parameter that is used once.
- **Constants.** A closed set is a `const` object plus a same-named union, never a TS `enum`. No magic
  literals: a meaningful number or string is a named `UPPER_SNAKE_CASE` constant.
- **Negative type tests.** Never read a member of an error-typed value. Either assert absence with
  `expectTypeOf<…>().not.toHaveProperty('…')`, or put `// @ts-expect-error -- <reason>` on the
  offending **attribute** line of a multi-line JSX element.
- **Changesets.**
  - Every breaking change is a **minor** bump in each package it touches (pre-1.0).
  - A changeset names only the packages whose source the task changed (R12).
  - A pending changeset that a task makes wrong is edited in place.
  - A new changeset is created only when no pending one covers the change: this stage's is
    `.changeset/form-composition-helpers.md`.
  - `@ez-kit/docs` changes go into the pending `.changeset/form-docs-stage-2.md`.
- **Checks.**
  - Between edits, run `pnpm verify:affected`. If it selects nothing after a commit, run
    `pnpm turbo run lint typecheck test --filter='...[HEAD~1]' --concurrency=2`.
  - Only the last task runs the full gate, **sequentially**, each its own command: `pnpm build`,
    `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm size`, then
    `pnpm --filter @ez-kit/form-react test:react18`.
- **Built packages.** Kit tests and docs tests read **built** packages. Run
  `pnpm build --filter=...@ez-kit/form-core` before a kit's or the docs app's vitest.
  `expectTypeOf` / `@ts-expect-error` are enforced by `pnpm --filter <pkg> typecheck`, not by vitest.
- **Kit exports.** Both kits keep identical value and type exports
  (`apps/docs/test/kit-exports-parity.test.ts`). A kit's built `.d.ts` names neither `@tanstack/*` nor
  `@ez-kit/form-core` (`apps/docs/test/form-package-graph.test.ts`).
- **Where behaviour is tested.** Every runtime behaviour is tested through the test kit in
  `form-react`. Where a kit renders something new (a group field), it is also tested in **both**
  kits' suites. A docs or e2e case is written for both kits.
- **`validate` vs `validators` (R18/R22, R65).** Bound fields — `form.X`, `group.X`, `item.X`,
  `form.Field`, `group.Field` — take only `validate`. TanStack-shaped `validators` exist on the form,
  on `form.NativeField`, on `form.FormGroup` and on `withFieldGroup`; the last two are group-level
  options.
- **New top-level code.** New modules add no impure top-level expression: no `.join`/`.map` on a
  literal, no spread inside a top-level object or array, and `/* @__PURE__ */` only on a call without
  spread arguments. `new WeakMap()` / `new WeakSet()` with no argument is allowed (measured pure in
  stage 4, R56). `apps/docs/test/tree-shaking.test.ts` gains a marker for the new runtime (Task 6).
- **Do not touch:**
  - `specs/`;
  - any `CHANGELOG.md`;
  - `packages/form/react/shadcn/src/components/ui/**`;
  - `docs/superpowers/plans/` other than this file;
  - the user's uncommitted edits under `.agents/skills/openspec-*` and
    `.claude/{skills,commands}/opsx*` — never stage them (`git add` named paths only, never `-A`).
- **Docs.** Docs examples (`apps/docs/shared/form/examples/**`) are shown verbatim, so they carry no
  internal comments. Before writing Next.js code in `apps/docs`, read the relevant guide under
  `apps/docs/node_modules/next/dist/docs/`.
- **Git.** No `git stash`, no `pnpm up -r`, never push, never merge.
- **Prototypes.** A type decision the plan does not spell out is prototyped with `tsc` on a throwaway
  file in the package's `src`; a TanStack runtime assumption with a throwaway vitest file. Delete both
  afterwards and record them in the task report.
- **Binding rulings.** R1–R59 and R60–R76 below are binding.

## Rulings carried into this plan

Each ruling settles something the spec leaves open. Unless marked _unmeasured_, it was measured on
TanStack Form 1.33.2 with throwaway vitest / `tsc` files in `packages/form/react/react/src` (deleted).

An _unmeasured_ ruling is confirmed by the first RED test of the task that relies on it. If that test
shows otherwise, the implementer stops and reports; they do not adapt silently.

- **R60 — R57 is fixed on TanStack's core `FormApi`, captured through `listeners.onMount`.**
  - _Measured:_
    - `listeners.onMount({ formApi })` receives the core (`formApi !== instance`) in TanStack's own
      mount layout effect, before any effect of ours and before a user can submit.
    - StrictMode calls it twice, with the same core.
    - `_handleSubmit`, `reset` and `validateAllFields` are own properties of the core.
    - The instance's `handleSubmit` calls `core._handleSubmit` at call time, and the core's prototype
      `handleSubmit` calls `this._handleSubmit`. So one wrap on `core._handleSubmit` covers
      `form.handleSubmit()`, `formApi.handleSubmit()` in a listener and `field.form.handleSubmit()`.
  - The instance's `reset` is a copy taken when TanStack spread the core, so the instance wrap from
    stage 4 stays for `reset`. The instance-level `handleSubmit` wrap is removed, because it would
    clear twice.
  - Hooking is idempotent per core (a `WeakSet`). The author's own `listeners.onMount` still runs,
    after ours.
  - _Rejected:_ detecting a submit from `submissionAttempts` covers submit but not reset, and a reset
    cannot be told apart in the store from TanStack's own blur-clearing of a slot.
  - _Cost if wrong:_ after a `formId` change, TanStack builds a core it never mounts (its mount effect
    has `[]` deps). That core's submits do not clear server errors — no worse than today.
- **R61 — a group submit clears the server errors inside the group, and only those.**
  `group.handleSubmit` (on `form.FormGroup`, `useFormGroup` and `withFieldGroup`) first clears the
  server errors of fields at or under the branch (for a map: under any mapped path). Form-level
  messages and other fields' errors stay.
  - _Measured:_ a field server error makes a group submit invalid (`onGroupSubmit` not called). Left
    there, it is a dead end until the field is edited — the R37 situation.
  - _Why form messages stay:_ a group submit does not send the form.
  - _Cost if wrong:_ a form-level message about the section stays after the section's own save, until
    the next whole submit.
- **R62 — a whole-form submit runs every mounted group's validators.**
  - _Measured:_ TanStack's form submit runs no group validator at all — not `onChange`, not even the
    group's own `onSubmit`. An untouched failing group still lets `onSubmit` run. §4 scenario 2 relies
    on the opposite ("пароли проверяет блок"), and D18's final submit assumes it too.
  - _Mechanism:_ the core's `validateAllFields` is wrapped. After TanStack has validated the fields
    for `'submit'`:
    - every native group in `formGroupApis` runs
      `validate('submit', { skipFormValidation: true, skipRelatedFieldValidation: true })`;
    - every map group runs its own submit pass (R67).
  - _After, not before (measured):_ the field-level submit pass clears a group-distributed error from a
    field whose own `validate` passes. With this order a failing untouched group blocks the submit and
    a valid one does not.
  - A group's `onChange` runs at submit too (TanStack's submit logic runs change, blur and submit
    validators). One rule written on both the group and the form schema shows one message, because
    `formatFieldErrors` de-duplicates by text.
  - _Cost if wrong:_ a group rule meant only for the group's own submit (an `onSubmitAsync` server
    check) now also runs on the whole-form submit. The docs say a group's rules are part of the
    form's barrier.
- **R63 — a group submit also runs the groups mounted inside it.** §4 scenario 2 nests
  `<PasswordPair fields='security' />` inside a `form.FormGroup name='security'` with no validators
  ("правило придёт из блока").
  - _Measured:_ without this, the outer `group.handleSubmit` calls `onGroupSubmit` while the block's
    rule fails on untouched fields.
  - _Mechanism:_ the real `FormGroupApi` (`group.getInfo().instance`) gets its `validateAllFields`
    wrapped in the same "after the fields" order as R62. Its nested native groups (name within, not
    itself) and map groups (every mapped path within) then run.
  - `getInfo().instance` is still `null` in a child's layout effect (measured), so the hook is applied
    lazily, on the first submit.
  - _Cost if wrong:_ none known.
- **R64 — `group.errors: string[]` on every group, and one normaliser for "own" errors.**
  - _Measured:_ a native group's own `errorMap` slot holds one of two things:
    - the record of **all** issues by relative path (`{ password: [issue] }`) when there is no
      pathless issue;
    - the array of pathless issues when there is one (the `''` distribution overwrites the slot).
  - So `group.state.meta.errors` can hold a record, which `formatFieldErrors` prints as
    `[object Object]`. The same happens today in `form.Submit`'s `formErrors` for a form-level
    standard schema: measured `['[object Object]']`, an existing defect.
  - `formatOwnErrors` normalises: arrays are flattened, a record contributes its `''` entry only, and
    anything else is one message.
  - _Where it applies:_ `group.errors` on `withFieldGroup` blocks (spec), on `form.FormGroup` and on
    `useFormGroup`, and in `form.Submit`'s `formErrors`.
  - _Deviation:_ the spec names `group.state.meta.errors` for `form.FormGroup`. It stays, raw and
    TanStack's; `errors` is added because the raw one cannot be displayed. `specs/` is not edited.
  - _Cost if wrong:_ an additive member.
- **R65 — group `validators`, and why it does not contradict R18/R22.** `validators` is a
  **group-level** option, on `withFieldGroup` and `form.FormGroup`. Bound fields still take only
  `validate`, consistent with R18 ("a rule that needs a standard schema or a function lives on the
  form's or a group's `validators`").
  - `GroupValidators<TGroup>` has these slots: `onMount`, `onChange`, `onChangeAsync`,
    `onChangeAsyncDebounceMs`, `onBlur`, `onBlurAsync`, `onBlurAsyncDebounceMs`, `onSubmit`,
    `onSubmitAsync`.
  - Each slot is either a Standard Schema over `TGroup`, or a function
    `({ value }) => error | { fields?, group? } | undefined` (async: `({ value, signal })`).
  - `onDynamic*` is left out: it needs TanStack's `revalidateLogic`. `form.FormGroup` keeps TanStack's
    own prop type, which still has it.
  - _Cost if wrong:_ adding `onDynamic` later is additive.
- **R66 — a string `fields` mounts TanStack's `FormGroupApi` on the branch, always.** It is mounted
  through `useFormGroup`, even without validators, so `handleSubmit` and `errors` behave the same on
  every block.
  - The block's `defaultValues` is **not** passed as the native group's `defaultValue`.
    `FormGroupApi.update` (read in `FormGroupApi.js`) writes that value into the form's values while
    the group is untouched, which would overwrite the form's own defaults.
  - _Cost if wrong:_ `form.state.fieldMeta` gains a default meta entry for the branch.
- **R67 — a field map is run by the package (`map-group.ts`).** TanStack's field group has no
  validators and no submit, and its own `handleSubmit` submits the whole form (read in
  `FieldGroupApi.js`).
  - **Errors with a path** go into the mapped field's meta under a package-owned key,
    `errorMap['onGroup:<block id>']`.
    - _Measured:_ TanStack keeps an unknown key through a field's change, blur and submit validation.
      It counts the key in `meta.errors`, so the kit shows the message, `isValid` is `false` and the
      submit is blocked. `reset` clears it.
    - TanStack's own slots are not used: a field's own validation rewrites them and drops a group
      error.
  - **Pathless errors** go into the **form-level** `errorMap` under the same key. _Measured:_ it is
    kept through form validation and submit, and it blocks the submit. `form.Submit` leaves `onGroup:`
    keys out of `formErrors`, and the block reads its own key as `group.errors`.
  - **Triggers:**
    - mount → `onMount`;
    - a change of any mapped value (store subscription, `Object.is` per key) → `onChange`;
    - a blur of a mapped field → `onBlur`. The form-level `listeners.onBlur` is composed by `useForm`.
      _Measured:_ it runs on every blur, after the field's own blur validation, with `fieldApi.name`.
    - a group submit or a whole-form submit → the submit cause (`onChange` + `onBlur` + `onSubmit`,
      then async if sync passed — TanStack's order).
  - **Standard schemas** run through TanStack's exported `standardSchemaValidators`. _Measured
    output:_ `{ form, fields }` keyed by relative path, `''` for pathless issues, `rows[0].x` for an
    array path. A relative path becomes a real one through the field group's own
    `getFormFieldName`.
  - **Unmount** removes the block's keys.
  - _Unmeasured, confirmed by Task 6's first RED test:_ writing these keys from inside a store
    subscription (the server-errors controller does the same for `onServer`) does not loop.
  - _Cost if wrong:_ `form.state.errorMap` and a field's `errorMap` show `onGroup:*` keys to whoever
    reads them raw.
- **R68 — `withForm` and `withFieldGroup` take `form` from context when it is omitted.**
  - `withFieldGroup`'s block is two overloads (prototyped with `tsc`):
    - **with `form`:** `fields` is checked against the form, as today. `fields='email'` on a
      non-`TGroup` branch and a map naming a non-matching path are still rejected.
    - **without `form`:** `fields: string | { [K in keyof TGroup]: string }`, unchecked — the D6
      "cast, not a check" trade. A map missing a key is still rejected.
  - With neither a `form` prop nor a provider, the block throws a named error in **every**
    environment. `useFormContext` does too, and a production build would otherwise crash on `form.X`
    with an undefined-component message. D7's "dev-ошибка" is read as "an error the developer sees at
    once".
  - _Cost if wrong:_ a block rendered under another form's provider compiles, and writes wherever its
    paths resolve.
- **R69 — the flat group members are the array entry's member set, relative to the group.**
  - **The set (`scopedMemberKeys`):** every registered field, `ArrayField` when registered, `Array`,
    `Field` and `NativeField`. `Submit` is not in it.
  - **How names are resolved:** `form.FormGroup` scopes with `scopeFieldProps(props, name)`;
    `withFieldGroup` scopes with the field group's `getFormFieldOptions`, which covers both a string
    and a map, and the listen-to lists.
  - **Identity:** members are built once per (form, name) or per field group, so component
    identities are stable and inputs never remount.
  - **The scope object:** the group object handed to `render` / `children` is a new object whose
    prototype is TanStack's group (`Object.create`). TanStack's object is not mutated, which is safe
    under StrictMode's double memo.
  - **Key collisions:** a registry key the TanStack group already has (`name`, `form`, `state`,
    `validate`, …) throws at the group's first render, naming the key. A reserved-key list would cost
    bytes in every bundle for a case only a lowercase registry key can hit.
  - **The hooks:** `useFieldGroup` and `useFormGroup` stay as they were ("реэкспортируются как
    раньше"), plus `errors` (R64) and the submit semantics on `useFormGroup` (R61/R63/R71). They get
    no flat fields.
  - `withFieldGroup` moves into `createFormInternals`, as R23 promised.
- **R70 — `withFieldGroup`'s `group.handleSubmit` submits the block only.** This is **breaking**:
  TanStack's field-group `handleSubmit` was `this.form.handleSubmit(meta)`. Minor bump; the old
  behaviour is `form.handleSubmit()`.
- **R71 — an invalid group submit focuses the group's first error (D13 extended).**
  - It honours the form's `focusOnError`. `useForm` registers the flag per instance in
    `focus-first-error.ts`.
  - The walk takes a name filter, so only fields inside the group are candidates.
  - _Cost if wrong:_ none known.
- **R72 — coordinates come from the object a field is called through (D7).** `form.X` stays absolute
  inside a group, with no implicit prefix. A test pins that
  `form.TextField name='security.password'` inside `form.FormGroup name='security'` writes
  `security.password`. The docs show it as the anti-pattern.
- **R73 — size.**
  - _Current figures:_ `form-react` is at 11.47 / 12 kB; its `helpers` entry is 509 / 570 B (the R56
    baseline).
  - _What this stage adds:_ core hooks, flat members, group submit, the map-group controller and
    `withForm` from context — estimated +1.8–2.6 kB.
  - _Retune rule:_ an entry over its limit gets `ceil(measured × 1.15)`, in 0.5 kB steps (expected
    ~16 KB), with the figures in the commit body. This applies to `form-react`'s main entry only.
  - _Must not move:_ the `helpers` entry (509 B); both kits and `form-core`, since kits `ignore`
    `@ez-kit/form-react` and only add type exports. If any of these moves, it is a defect, not a
    retune.
- **R74 — the docs example runs under both kits through `FormKit` delegators.**
  - `apps/docs/shared/form/FormKit.tsx` gains `withForm` and `withFieldGroup`. Each returns a
    component that resolves the active kit at render time and caches the kit's real block in a
    `WeakMap` keyed by the kit bundle. A block is declared at module scope in an example, but the kit
    is only known at render.
  - Both kits' `form-kit-provider.tsx` pass the two helpers.
  - The source panel's import rewrite already maps `shared/form/FormKit` to the kit package.
- **R75 — group errors stay reachable for D18.**
  - Native groups are the instance's `formGroupApis` (the same `Set` as the core's). Map groups are
    registered in `group-registry.ts`.
  - `validateGroups(form, accept)` and `formatOwnErrors` are the two entry points stage 6 builds step
    verdicts and `stepErrors` on.
  - Nothing here reads steps.
- **R76 — changesets.**
  - `form-react` and both kits get a minor bump. The kits re-export new types, and `withFieldGroup`'s
    behaviour reaches users through them.
  - New: `.changeset/form-composition-helpers.md`.
  - `.changeset/form-behaviour.md` is edited in place where it says the core `formApi` does not clear
    server errors (R60).
  - Docs go into `.changeset/form-docs-stage-2.md`.

## Review Focus

1. **Scenario 2, sign-up.** `<PasswordPair fields={{ password: 'password', confirm: 'confirm' }} />`
   with a mismatch schema, and a form schema checking only `login`. Expected:
   - an untouched submit is blocked and focuses `password`;
   - a mismatch shows on `confirm` (the real path);
   - a valid pair submits values with no group artefacts in them.

   Pinned in Task 6.

2. **Scenario 2, profile.** A `form.FormGroup name='security'` without validators wraps
   `<PasswordPair fields='security' />`. Expected:
   - "Change password" while untouched is blocked by the block's rule;
   - once valid, `onGroupSubmit` gets `{ password, confirm }`, and the form's `onSubmit` is not
     called;
   - "Save profile" submits everything and also runs the block.

   Pinned in Task 5.

3. **Server errors around groups.** `setServerErrors({ fields: { 'security.password': 'Reused', email: 'Taken' }, form: 'Down' })`,
   then a group submit. Expected: `Reused` goes, while `Taken` and `Down` stay. And `formApi.reset()`
   inside `onSubmit` clears `Down` (R60). Pinned in Tasks 1 and 5.
4. **Typing into `group.TextField` while the parent re-renders on every keystroke.** Expected: the same
   `<input>` keeps focus and the whole text. Pinned in Task 4.
5. **A block placed without `form`** — under `<Form>`, under `FormProvider` with no `<form>`, and with
   no provider. Expected: the first two render and write the right paths; the third throws the named
   error, for `withForm` and for `withFieldGroup`. Pinned in Tasks 3 and 4.

---

### Task 1: R57 — server errors clear on every submit and reset path

**Files:**

- Create: `packages/form/react/react/src/core-hooks.ts`
- Modify: `packages/form/react/react/src/create-form.tsx` (compose `listeners.onMount`)
- Modify: `packages/form/react/react/src/server-errors.ts`. Drop the instance `handleSubmit` wrap
  and `handleSubmit` from `ServerErrorsHost`; keep `reset`.
- Modify: `packages/form/react/react/src/kit-form.ts`. In the `setServerErrors` docblock, drop
  "The core `formApi` … does not clear them".
- Test: `packages/form/react/react/src/server-errors.test.tsx`
- Modify: `apps/docs/content/docs/form/submission.mdx`. Rewrite the R57 bullet (l.~144) and the note
  under the reset recipe (l.~230).
- Modify: `.changeset/form-behaviour.md` (in place), `.changeset/form-docs-stage-2.md`

**Interfaces:**

- Produces (`core-hooks.ts`):

  ```ts
  export type CoreFormApi
  export type CoreHooks
  export function hookCore(core: CoreFormApi, hooks: CoreHooks): void
  ```

- Task 5 adds `afterValidateAllFields` to `CoreHooks`.

- [ ] **Step 1: Write the failing tests**

Append to `server-errors.test.tsx`. Add `StrictMode` to the `react` import and `FormApi` to the
type imports:

```tsx
type CoreLike = { reset: () => void; handleSubmit: () => Promise<void> }

/** A form whose core `formApi` the test can reach — captured by the author's own `listeners.onMount`. */
function CoreHarness({
	onForm,
	onCore,
	onSubmit,
}: {
	onForm: (form: Instance) => void
	onCore: (core: CoreLike) => void
	onSubmit?: () => void
}): ReactNode {
	const form = useForm({
		defaultValues: DEFAULT_VALUES,
		onSubmit: () => onSubmit?.(),
		listeners: { onMount: ({ formApi }) => onCore(formApi as unknown as CoreLike) },
	})
	useEffect(() => {
		onForm(form)
	}, [form, onForm])
	return (
		<Form form={form}>
			<form.TextField
				name='email'
				label='Email'
			/>
			<form.NativeField name='name'>
				{(field) => (
					<button
						type='button'
						onClick={() => {
							void field.form.handleSubmit()
						}}
					>
						Field submit
					</button>
				)}
			</form.NativeField>
			<form.Submit>{({ formErrors }) => <output data-testid='form-errors'>{formErrors.join('|')}</output>}</form.Submit>
		</Form>
	)
}

function renderCore(onSubmit?: () => void) {
	let instance: Instance | undefined
	let core: CoreLike | undefined
	render(
		<CoreHarness
			onForm={(form) => {
				instance = form
			}}
			onCore={(next) => {
				core = next
			}}
			onSubmit={onSubmit}
		/>,
	)
	if (instance === undefined || core === undefined) throw new Error('the form has not mounted')
	return { form: instance, core }
}

describe('server errors and the core formApi (R60)', () => {
	it("still calls the author's listeners.onMount, with the core rather than the instance", () => {
		const { form, core } = renderCore()
		expect(core).not.toBe(form)
	})

	it('clears them on a reset of the core', () => {
		const { form, core } = renderCore()
		apply(form, { fields: { email: 'Taken' }, form: 'Down' })

		act(() => {
			core.reset()
		})

		expect(screen.queryByText('Taken')).not.toBeInTheDocument()
		expect(screen.getByTestId('form-errors')).toHaveTextContent('')
	})

	it('clears them before a submit through the core runs', async () => {
		const seen: string[] = []
		const { form, core } = renderCore(() => {
			seen.push(screen.getByTestId('form-errors').textContent ?? '')
		})
		apply(form, { form: 'Down' })

		await act(async () => {
			await core.handleSubmit()
		})

		expect(seen).toEqual([''])
	})

	it("clears them on a submit through a field's own form", async () => {
		const user = userEvent.setup()
		const { form } = renderCore()
		apply(form, { form: 'Down' })

		await user.click(screen.getByRole('button', { name: 'Field submit' }))

		expect(screen.getByTestId('form-errors')).toHaveTextContent('')
	})
})

describe('server errors under StrictMode', () => {
	it('releases the slot of a field that unmounts, and shows the error again when it comes back', () => {
		let instance: Instance | undefined
		const onForm = (form: Instance): void => {
			instance = form
		}
		const { rerender } = render(
			<StrictMode>
				<Harness
					onForm={onForm}
					showLater
				/>
			</StrictMode>,
		)
		act(() => {
			instance?.setServerErrors({ fields: { later: 'Taken' } })
		})
		expect(screen.getByTestId('can-submit')).toHaveTextContent('false')

		rerender(
			<StrictMode>
				<Harness onForm={onForm} />
			</StrictMode>,
		)
		expect(screen.getByTestId('can-submit')).toHaveTextContent('true')

		rerender(
			<StrictMode>
				<Harness
					onForm={onForm}
					showLater
				/>
			</StrictMode>,
		)
		expect(screen.getByText('Taken')).toBeInTheDocument()
	})
})
```

(`FormApi` is not needed if the cast through `CoreLike` type-checks; drop the import then.)

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/server-errors.test.tsx`.

Expected: the three "clears them" cases FAIL — the core is not wrapped. The `onMount` and StrictMode
cases pass, which pins today's behaviour.

- [ ] **Step 3: `core-hooks.ts`**

```ts
import type { ValidationCause } from '@tanstack/form-core'

/**
 * TanStack's core `FormApi`, at the members this package wraps.
 *
 * The instance `useForm` returns is a spread copy of the core, but TanStack hands the **core** to
 * `onSubmit`, listeners, validators and every field (`field.form`), so a wrapper on the copy is
 * invisible there. Every path reaches these three own properties of the core: the copy's
 * `handleSubmit` calls `core._handleSubmit` at call time, the core's own `handleSubmit` calls
 * `this._handleSubmit`, and `_handleSubmit` calls `this.validateAllFields`.
 */
export type CoreFormApi = {
	_handleSubmit: (...args: never[]) => Promise<void>
	reset: (...args: never[]) => void
	validateAllFields: (cause: ValidationCause) => Promise<unknown[]>
}

/** What runs around the core's members — see {@link hookCore}. */
export type CoreHooks = {
	/** Before every submit, whoever starts it. */
	beforeSubmit: () => void
	/** Before every reset of the core. */
	beforeReset: () => void
}

const hookedCores = new WeakSet<object>()

/**
 * Wrap the core's submit and reset, once per core.
 *
 * Called from `listeners.onMount`, which TanStack runs in its own mount layout effect — the first
 * moment the core is reachable, and before anyone can submit. StrictMode runs it twice with the same
 * core, hence the `WeakSet`.
 */
export function hookCore(core: CoreFormApi, hooks: CoreHooks): void {
	if (hookedCores.has(core)) return
	hookedCores.add(core)
	const { _handleSubmit: submit, reset } = core
	Object.assign(core, {
		_handleSubmit: (...args: Parameters<typeof submit>) => {
			hooks.beforeSubmit()
			return submit(...args)
		},
		reset: (...args: Parameters<typeof reset>) => {
			hooks.beforeReset()
			reset(...args)
		},
	})
}
```

Check that `ValidationCause` is exported from `@tanstack/form-core`'s `types.d.ts` (it is in 1.33.2).
If lint's naming rule rejects the `_handleSubmit` key, add a scoped
`// eslint-disable-next-line @typescript-eslint/naming-convention -- TanStack's own member name`.

- [ ] **Step 4: Wire it in, and drop the instance submit wrap**

`create-form.tsx`, in `useForm`:

```tsx
const form = useAppForm({
	...tanstackOptions,
	onSubmitInvalid: (props) => {
		if (focusOnError) focusFirstFieldWithErrors(form)
		tanstackOptions.onSubmitInvalid?.(props)
	},
	// The core `FormApi` is only ever handed to callbacks; `onMount` is the first of them, run in
	// TanStack's mount layout effect. The author's own listener runs after ours.
	listeners: {
		...tanstackOptions.listeners,
		onMount: (props) => {
			hookCore(props.formApi as unknown as CoreFormApi, coreHooksFor(form))
			tanstackOptions.listeners?.onMount?.(props)
		},
	},
})
```

And, module-level below `focusFirstFieldWithErrors`:

```ts
/** What the core's members do for this instance: every submit and reset clears its server errors. */
function coreHooksFor(form: object): CoreHooks {
	const clear = (): void => {
		serverErrorsOf(form)?.clear()
	}
	return { beforeSubmit: clear, beforeReset: clear }
}
```

`server-errors.ts`:

- `ServerErrorsHost` loses `handleSubmit`.
- The final `Object.assign(host, …)` keeps only `reset`, under this comment: "The instance's `reset`
  is a copy TanStack took when it spread the core, so the core's own wrap (`core-hooks.ts`) does not
  reach it; its `handleSubmit` delegates to the core's `_handleSubmit`, which does."
- Update the controller docblock accordingly.

`kit-form.ts`: the `setServerErrors` docblock now says every server error goes "on the form's next
submit or reset, whichever API starts it".

- [ ] **Step 5: Run the tests and the package**

Run, in order:

1. `pnpm --filter @ez-kit/form-react exec vitest run src/server-errors.test.tsx src/focus-on-error.test.tsx src/submit.test.tsx src/dirty-state.test.tsx`
2. `pnpm --filter @ez-kit/form-react typecheck`
3. `pnpm --filter @ez-kit/form-react test:react18`
4. `pnpm verify:affected`

Expected: PASS. `dirty-state.test.tsx` runs `formApi.reset(value)` in `onSubmit`, so it proves the core
reset wrap preserves arguments.

- [ ] **Step 6: Docs, changesets, commit**

`submission.mdx`:

- The bullet at l.~144 becomes: "**Every server error goes on the next submit or reset**, whichever
  API starts it — `form.handleSubmit`, `form.reset`, or the `formApi` TanStack hands to `onSubmit`,
  listeners and validators."
- Delete the sentence at l.~230 ("The `formApi.reset` there is TanStack's core instance, which leaves
  server errors alone; …"). The recipe is now plainly correct.

`.changeset/form-behaviour.md`: replace "Every server error goes on the next `form.handleSubmit()` or
`form.reset()` of the instance `useForm` returns; the core `formApi` TanStack passes to `onSubmit`,
listeners and validators does not clear them." with "Every server error goes on the form's next
submit or reset, whichever API starts it — the instance `useForm` returns, or the `formApi` TanStack
passes to `onSubmit`, listeners and validators."

Append to `.changeset/form-docs-stage-2.md`: "Submission no longer warns that `formApi.reset()` keeps
server errors: every submit and reset clears them."

```bash
git add packages/form/react/react/src/core-hooks.ts packages/form/react/react/src/create-form.tsx packages/form/react/react/src/server-errors.ts packages/form/react/react/src/kit-form.ts packages/form/react/react/src/server-errors.test.tsx apps/docs/content/docs/form/submission.mdx .changeset/form-behaviour.md .changeset/form-docs-stage-2.md
git commit -m "fix(form): clear server errors on every submit and reset, through the core formApi too" -m "TanStack hands its core FormApi to callbacks and fields; the instance is a spread copy.
The core is captured in listeners.onMount and its _handleSubmit and reset are wrapped."
```

---

### Task 2: one normaliser for group and form errors; `group.errors` on form groups

**Files:**

- Create: `packages/form/react/react/src/own-errors.ts`
- Create: `packages/form/react/react/src/test-schema.ts` (test helper, like `test-kit.tsx`)
- Modify: `packages/form/react/react/src/fields/submit.tsx` (`formErrors` through `formatOwnErrors`)
- Modify: `packages/form/react/react/src/form-group.tsx` (`useFormGroup` adds `errors`)
- Modify: `packages/form/react/react/src/group-types.ts` (`FormGroupInstance` gains `errors: string[]`)
- Test: `packages/form/react/react/src/submit.test.tsx`, `packages/form/react/react/src/field-groups.test.tsx`
- Modify: `.changeset/form-composition-helpers.md` (create)

**Interfaces:**

- Produces `formatOwnErrors(values: readonly unknown[]): string[]` and
  `testSchema<T>(check): StandardSchemaV1<T>`.
- `FormGroupInstance` gains `errors`.

- [ ] **Step 1: The test helper**

`test-schema.ts`:

```ts
import type { StandardSchemaV1 } from '@tanstack/form-core'

/** One issue a {@link testSchema} reports; `path` is relative to the value it was handed. */
export type TestIssue = { message: string; path?: readonly (string | number)[] }

/**
 * A Standard Schema built from a plain check — what a zod or valibot schema is to TanStack, without
 * a dependency this package does not have.
 */
export function testSchema<TValue>(check: (value: TValue) => readonly TestIssue[]): StandardSchemaV1<TValue> {
	return {
		'~standard': {
			version: 1,
			vendor: 'ez-kit-test',
			validate: (value: unknown) => {
				const issues = check(value as TValue)
				return issues.length > 0 ? { issues } : { value: value as TValue }
			},
		},
	}
}
```

If `StandardSchemaV1` is not exported from `@tanstack/form-core`'s index in 1.33.2 (it is declared in
`standardSchemaValidator.d.ts`, which the index re-exports), type the return as the object literal's
type and record it.

- [ ] **Step 2: Write the failing tests**

Add to `submit.test.tsx`:

```tsx
it('lists only the pathless issues of a form-level standard schema in formErrors (R64)', async () => {
	const user = userEvent.setup()
	const rootSchema = testSchema<{ a: string }>((values) => [
		{ message: 'Root problem' },
		...(values.a === '' ? [{ message: 'A is required', path: ['a'] }] : []),
	])
	render(
		<Form
			defaultValues={{ a: '' }}
			validators={{ onSubmit: rootSchema }}
		>
			{(form) => (
				<form.Submit>
					{({ formErrors, submit }) => (
						<>
							<output data-testid='form-errors'>{formErrors.join('|')}</output>
							<button
								type='button'
								onClick={() => void submit()}
							>
								Go
							</button>
						</>
					)}
				</form.Submit>
			)}
		</Form>,
	)

	await user.click(screen.getByRole('button', { name: 'Go' }))

	expect(screen.getByTestId('form-errors')).toHaveTextContent(/^Root problem$/)
})
```

Add to `field-groups.test.tsx`:

```tsx
type Pair = { password: string; confirm: string }
type PairValues = { security: Pair }
const PAIR_DEFAULTS: PairValues = { security: { password: '', confirm: '' } }
const MISMATCH = 'Passwords do not match'
const SAME_AS_NAME = 'Must differ from the name'
const pairSchema = testSchema<Pair>((pair) => [
	...(pair.password !== pair.confirm ? [{ message: MISMATCH, path: ['confirm'] }] : []),
	...(pair.password === 'ann' ? [{ message: SAME_AS_NAME }] : []),
])

describe('form.FormGroup — group.errors (R64)', () => {
	it('holds only the pathless issues; a path issue lands on its field', async () => {
		const user = userEvent.setup()
		const seen: string[][] = []
		function Case(): ReactNode {
			const form = useForm({ defaultValues: PAIR_DEFAULTS })
			return (
				<Form form={form}>
					<form.FormGroup
						name='security'
						validators={{ onChange: pairSchema }}
					>
						{(group) => {
							seen.push(group.errors)
							return <group.NativeField name='password'>{(field) => <NativeInput field={field} />}</group.NativeField>
						}}
					</form.FormGroup>
				</Form>
			)
		}
		render(<Case />)

		await user.type(screen.getByLabelText('security.password'), 'x')
		expect(seen.at(-1)).toEqual([])

		await user.clear(screen.getByLabelText('security.password'))
		await user.type(screen.getByLabelText('security.password'), 'ann')
		expect(seen.at(-1)).toEqual([SAME_AS_NAME])
	})
})
```

Run `pnpm --filter @ez-kit/form-react exec vitest run src/submit.test.tsx src/field-groups.test.tsx`
and `pnpm --filter @ez-kit/form-react typecheck`.

Expected: FAIL. `formErrors` is `[object Object]`, and `group.errors` does not exist.

- [ ] **Step 3: `own-errors.ts`**

```ts
import { formatFieldErrors } from '@ez-kit/form-core'

/** The key under which a standard schema reports the issues that name no path. */
const PATHLESS_KEY = ''

function isPathRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value) && !('message' in value)
}

function ownErrorsOf(value: unknown): readonly unknown[] {
	if (Array.isArray(value)) return value
	if (isPathRecord(value)) return value[PATHLESS_KEY] === undefined ? [] : ownErrorsOf(value[PATHLESS_KEY])
	return [value]
}

/**
 * The messages that belong to a group or a form itself, from the values of its `errorMap`.
 *
 * A standard schema on a form or a group reports **every** issue there as a record by relative path
 * — `{ password: [issue], '': [issue] }` — and TanStack hands the paths on to the fields. What stays
 * the owner's own is the `''` entry. A group's slot holds either that record (no pathless issue) or
 * the pathless issues alone (TanStack's `''` distribution overwrites it), so a record contributes its
 * `''` entry and an array its items; anything else is one message, formatted as a field's would be.
 */
export function formatOwnErrors(values: readonly unknown[]): string[] {
	return formatFieldErrors(values.flatMap(ownErrorsOf))
}
```

- [ ] **Step 4: Use it**

- `fields/submit.tsx`: `formErrors: formatOwnErrors([...errors, ...serverFormErrors])`. Server
  messages are strings, which pass through unchanged.
- `form-group.tsx`, in `useFormGroup`:
  `Object.assign(group, members, { errors: formatOwnErrors(Object.values(groupMeta(group).errorMap)) })`,
  where `groupMeta` narrows `group` to `{ state: { meta: { errorMap: Record<string, unknown> } } }`.
  The memo already depends on `group`, which TanStack rebuilds whenever its `errorMap` changes.
- `group-types.ts`: `FormGroupInstance` gains
  `/** The group's own messages — those its validators report with no path (R64). */ errors: string[]`.

- [ ] **Step 5: Run, changeset, commit**

Run the two files, then `src/field-groups.test.tsx src/server-errors.test.tsx`, the package
typecheck, `test:react18`, and `pnpm verify:affected`. Expected: PASS.

Create `.changeset/form-composition-helpers.md`:

```md
---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

`form.Submit`'s `formErrors` lists the issues a form-level standard schema reports without a path;
it used to print the whole issue record as `[object Object]`. A group from `form.FormGroup` or
`useFormGroup` gains `errors`: the messages its own validators report with no path (issues with a
path show on their fields). `group.state.meta.errors` stays TanStack's raw value.
```

The kits are named because Task 4 adds type exports to them in the same changeset. If a reviewer
objects that this commit touches no kit, move the two kit lines into Task 4's commit.

```bash
git add packages/form/react/react/src/own-errors.ts packages/form/react/react/src/test-schema.ts packages/form/react/react/src/fields/submit.tsx packages/form/react/react/src/form-group.tsx packages/form/react/react/src/group-types.ts packages/form/react/react/src/submit.test.tsx packages/form/react/react/src/field-groups.test.tsx .changeset/form-composition-helpers.md
git commit -m "fix(form): report a schema's pathless issues as form and group errors" -m "formErrors printed a standard schema's issue record as [object Object]; groups gain errors."
```

---

### Task 3: `withForm` takes its form from context

**Files:**

- Modify: `packages/form/react/react/src/form-context.tsx`. Add `useOptionalFormContext` and
  `missingFormMessage` — exported from the module, not from `index.ts`.
- Modify: `packages/form/react/react/src/composition.ts`. Add `KitFormBlockRender` (`form` required:
  the `render` option); `KitFormBlock`'s `form` becomes optional.
- Modify: `packages/form/react/react/src/create-form.tsx`. `withForm` gets its own body;
  `tanstackWithForm` is no longer used.
- Test: create `packages/form/react/react/src/with-form.test.tsx`; extend `composition-types.test.tsx`
- Modify: `.changeset/form-composition-helpers.md`

**Interfaces:** produces `useOptionalFormContext(): AnyFormInstance | null` and
`missingFormMessage(helper: string): string` (both reused in Task 4).

- [ ] **Step 1: Write the failing tests**

`with-form.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { ReactNode } from 'react'

const { Form, FormProvider, useForm, withForm } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

type SignUp = { login: string; email: string }
const SIGN_UP: SignUp = { login: '', email: '' }

const LoginPart = withForm({
	defaultValues: SIGN_UP,
	render: ({ form }) => (
		<>
			<form.TextField
				name='login'
				label='Login'
			/>
			<form.Subscribe selector={(state) => state.values.login}>{(login) => <output>{login}</output>}</form.Subscribe>
		</>
	),
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe('withForm without a form prop (D7)', () => {
	it('takes the form of the <Form> above it', async () => {
		const user = userEvent.setup()
		render(<Form defaultValues={SIGN_UP}>{() => <LoginPart />}</Form>)

		await user.type(screen.getByLabelText('Login'), 'ann')

		expect(screen.getByRole('status')).toHaveTextContent('ann')
	})

	it('takes the form of a FormProvider with no <form>', async () => {
		const user = userEvent.setup()
		function Case(): ReactNode {
			const form = useForm({ defaultValues: SIGN_UP })
			return (
				<FormProvider form={form}>
					<LoginPart />
				</FormProvider>
			)
		}
		render(<Case />)

		await user.type(screen.getByLabelText('Login'), 'bob')

		expect(screen.getByRole('status')).toHaveTextContent('bob')
	})

	it('prefers the form prop over the one in context', async () => {
		const user = userEvent.setup()
		function Case(): ReactNode {
			const outer = useForm({ defaultValues: SIGN_UP })
			const inner = useForm({ defaultValues: SIGN_UP })
			return (
				<FormProvider form={outer}>
					<LoginPart form={inner} />
					<outer.Subscribe selector={(state) => state.values.login}>
						{(login) => <p data-testid='outer'>{login}</p>}
					</outer.Subscribe>
				</FormProvider>
			)
		}
		render(<Case />)

		await user.type(screen.getByLabelText('Login'), 'x')

		expect(screen.getByRole('status')).toHaveTextContent('x')
		expect(screen.getByTestId('outer')).toHaveTextContent('')
	})

	it('throws a named error with neither a form prop nor a provider (R68)', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})

		expect(() => render(<LoginPart />)).toThrow(/withForm\(\): the block needs a form/)
	})
})
```

Add to `composition-types.test.tsx`:

```tsx
describe('withForm — the form prop is optional (D7)', () => {
	it('compiles without form, and still checks a form that is passed', () => {
		const Block = withForm({
			defaultValues: { login: '' },
			render: ({ form }) => (
				<form.TextField
					name='login'
					label='Login'
				/>
			),
		})
		function Parent(): ReactNode {
			const other = useForm({ defaultValues: { amount: 0 } })
			return (
				<>
					<Block />
					<Block
						// @ts-expect-error -- a form of another shape is still rejected
						form={other}
					/>
				</>
			)
		}
		expectTypeOf(Parent).toBeFunction()
	})
})
```

(Use the `withForm` / `useForm` this file already builds. If it builds none, add a
`createForm({ fields: testFields })` at the top.)

Run `pnpm --filter @ez-kit/form-react exec vitest run src/with-form.test.tsx` and the package
typecheck.

Expected: FAIL. TanStack's `withForm` passes `form: undefined`, so `form.TextField` throws a
TypeError rather than the named error, and `<Block />` is a type error.

- [ ] **Step 2: Implement**

`form-context.tsx`:

```tsx
/** The nearest form, or `null` — for the helpers that also take one as a prop. Not exported from the package. */
export function useOptionalFormContext(): AnyFormInstance | null {
	return useContext(FormContext)
}

/** The error a composition helper throws when it has no form to work on (R68). */
export function missingFormMessage(helper: string): string {
	return `${helper}(): the block needs a form — pass \`form\`, or render it inside <Form>, <SchemaForm> or <FormProvider>.`
}
```

`composition.ts`:

- Rename today's `KitFormBlock` body to `KitFormBlockRender` (`form` required); `KitWithFormProps.render`
  uses it.
- `KitFormBlock` becomes the same with `form?: KitFormApi<…> | undefined`.
- The docblock says the form comes from context when it is omitted, and that it is then a cast, as
  `useFormContext<TValues>()` is.

`create-form.tsx`, the body of `withForm`:

```tsx
const { render, props } = options
// TanStack's own `withForm` hands `form` through as given; a block placed without one reads the
// form above it instead (D7). The hook is unconditional, so a block may switch between the two.
function FormBlock(blockProps: { form?: AnyFormInstance | undefined }): ReactNode {
	const contextForm = useOptionalFormContext()
	const form = blockProps.form ?? contextForm
	if (form === null) throw new Error(missingFormMessage('withForm'))
	return render({ ...props, ...blockProps, form } as never)
}
return FormBlock as unknown as KitFormBlock<
	TFormData,
	TOnMount,
	TOnChange,
	TOnChangeAsync,
	TOnBlur,
	TOnBlurAsync,
	TOnSubmit,
	TOnSubmitAsync,
	TOnDynamic,
	TOnDynamicAsync,
	TOnServer,
	TSubmitMeta,
	TRenderProps,
	TFields,
	TComponents
>
```

`render` is a `FunctionComponent` and is called as a function — exactly what TanStack's `withForm`
does (`createFormHook.js`). Drop `withForm: tanstackWithForm` from the `createFormHook` destructure,
and update `withForm`'s docblock: no longer "zero runtime".

- [ ] **Step 3: Run, changeset, commit**

Run, in order:

1. `pnpm --filter @ez-kit/form-react exec vitest run src/with-form.test.tsx src/composition-types.test.tsx src/create-form.test.tsx`
2. the package typecheck
3. `test:react18`
4. `pnpm verify:affected`

Expected: PASS. The existing type case "keeps the option shape assignable to TanStack's
WithFormProps" must still pass, because `render` keeps its shape.

Append to `.changeset/form-composition-helpers.md`: "`withForm`'s `form` prop is optional: a block
placed without one takes the form above it (`<Form>`, `<SchemaForm>` or `FormProvider`), typed by
the block's own options — a cast, as `useFormContext<V>()` is. With neither, it throws a named error."

```bash
git add packages/form/react/react/src/form-context.tsx packages/form/react/react/src/composition.ts packages/form/react/react/src/create-form.tsx packages/form/react/react/src/with-form.test.tsx packages/form/react/react/src/composition-types.test.tsx .changeset/form-composition-helpers.md
git commit -m "feat(form): let a withForm block take its form from context"
```

---

### Task 4: flat fields on groups; `withFieldGroup` in the factory, form from context

**Files:**

- Create: `packages/form/react/react/src/group-fields.tsx`
- Modify: `packages/form/react/react/src/build-field-components.tsx`. Export `scopedMemberKeys`;
  `entryKeys` uses it.
- Modify: `packages/form/react/react/src/form-group.tsx`. `createFormGroup(form, memberKeys)` scopes
  the members.
- Modify: `packages/form/react/react/src/field-groups.tsx`. `createWithFieldGroup(memberKeys)`, with
  `BranchBlock` / `MappedBlock` (identical for now).
- Modify: `packages/form/react/react/src/group-types.ts`. New: `GroupFields`, `FieldGroupScope`,
  `FormGroupScope`, `FieldGroupPlacementProps`, `UncheckedFieldGroupPlacementProps`,
  `WithFieldGroupOptions`, `FieldGroupBlock`. Changed: `FormGroupProps` / `FormGroupComponentOf` gain
  `TFields`.
- Modify: `packages/form/react/react/src/kit-form.ts`. `BoundForm` uses
  `FormGroupComponentOf<TFormData, TFields>`.
- Modify: `packages/form/react/react/src/create-form.tsx`. Wire `memberKeys`; the bundle's
  `withFieldGroup` comes from the factory.
- Modify: `packages/form/react/react/src/index.ts`, `packages/form/react/{shadcn,heroui}/src/index.ts`
  (the new types).
- Test: `packages/form/react/react/src/field-groups.test.tsx`, `composition-types.test.tsx`,
  `custom-field.test.tsx` (the deferred schema-mounted `data-form-id` case)
- Test: create `packages/form/react/{shadcn,heroui}/src/groups.test.tsx`
- Modify: `.changeset/form-composition-helpers.md`

**Interfaces:**

```ts
// build-field-components.tsx
export function scopedMemberKeys(fields: FormFieldRegistry): readonly string[]

// group-fields.tsx
export function scopeGroupMembers(
	source: object,
	keys: readonly string[],
	toAbsolute: <TProps extends { name: string }>(props: TProps) => TProps,
): Record<string, (props: { name: string }) => ReactNode>
export function withMembers<TBase extends object>(base: TBase, members: object): TBase

// group-types.ts
export type GroupFields<TGroup, TFields extends FormFieldRegistry> = Omit<
	FormFieldComponents<TGroup, TFields> & FormPrimitives<TGroup, TFields>,
	'Submit'
> & { NativeField: LensFieldComponent<TGroup, Open> }
export type FieldGroupScope<TGroup, TFields extends FormFieldRegistry, TSubmitMeta = never> = Omit<
	FieldGroupInstance<TGroup, TSubmitMeta>,
	keyof GroupFields<TGroup, TFields>
> &
	GroupFields<TGroup, TFields>
export type FormGroupScope<TFormData, TName extends DeepKeys<TFormData>, TFields extends FormFieldRegistry> = Omit<
	FormGroupInstance<TFormData, TName>,
	keyof GroupFields<DeepValue<TFormData, TName>, TFields>
> &
	GroupFields<DeepValue<TFormData, TName>, TFields>
export type FieldGroupPlacementProps<TFormData, TGroup> = {
	form: FormInstance<TFormData, NoRegistry, NoRegistry>
	fields: DeepKeysOfType<TFormData, TGroup | null | undefined> | FieldsMap<TFormData, TGroup>
}
export type UncheckedFieldGroupPlacementProps<TGroup> = {
	form?: undefined
	fields: string | { [TKey in keyof TGroup]: string }
}
export type WithFieldGroupOptions<
	TGroup,
	TSubmitMeta = never,
	TRenderProps extends object = Record<never, never>,
	TFields extends FormFieldRegistry = AllFormFieldSlots,
> = {
	defaultValues?: TGroup
	props?: TRenderProps
	render: (
		props: PropsWithChildren<NoInfer<TRenderProps> & { group: FieldGroupScope<TGroup, TFields, TSubmitMeta> }>,
	) => ReactNode
}
export type FieldGroupBlock<TGroup, TRenderProps extends object> = {
	<TFormData>(props: PropsWithChildren<NoInfer<TRenderProps> & FieldGroupPlacementProps<TFormData, TGroup>>): ReactNode
	(props: PropsWithChildren<NoInfer<TRenderProps> & UncheckedFieldGroupPlacementProps<TGroup>>): ReactNode
}
```

The two placement types and `FieldGroupBlock` gain `TSubmitMeta` and `onGroupSubmit` in Task 5.
The overload shape was prototyped with `tsc` (R68).

- [ ] **Step 1: Write the failing tests**

Add to `field-groups.test.tsx`. Import `useSelector` from `@tanstack/react-form`; take `FormProvider`
from the bundle's destructure.

```tsx
type Places = { email: string; address: { city: string }; billingCity: string; tags: { label: string }[] }
const PLACES: Places = { email: '', address: { city: '' }, billingCity: '', tags: [{ label: '' }] }

const PlaceBlock = withFieldGroup({
	defaultValues: { city: '' },
	props: { label: 'City' },
	render: ({ group, label }) => (
		<group.TextField
			name='city'
			label={label}
		/>
	),
})

function PlacesOutput({ form }: { form: FormInstance<Places, NoRegistry, NoRegistry> }): ReactNode {
	return (
		<form.Subscribe selector={(state) => JSON.stringify(state.values)}>
			{(json) => <output>{json}</output>}
		</form.Subscribe>
	)
}

describe('flat fields on groups (D7)', () => {
	it('form.FormGroup: group.TextField writes the path relative to the group', async () => {
		const user = userEvent.setup()
		function Case(): ReactNode {
			const form = useForm({ defaultValues: PLACES })
			return (
				<Form form={form}>
					<form.FormGroup name='address'>
						{(group) => (
							<group.TextField
								name='city'
								label='Town'
							/>
						)}
					</form.FormGroup>
					<PlacesOutput form={form} />
				</Form>
			)
		}
		render(<Case />)

		await user.type(screen.getByLabelText('Town'), 'x')

		expect(screen.getByRole('status')).toHaveTextContent('"address":{"city":"x"}')
		expect(screen.getByLabelText('Town').closest('[data-field]')).toHaveAttribute('data-field', 'address.city')
	})

	it('withFieldGroup: writes through a path and through a map, with the form from context', async () => {
		const user = userEvent.setup()
		render(
			<Form defaultValues={PLACES}>
				{(form) => (
					<>
						<PlaceBlock
							fields='address'
							label='Shipping city'
						/>
						<PlaceBlock
							fields={{ city: 'billingCity' }}
							label='Billing city'
						/>
						<PlacesOutput form={form} />
					</>
				)}
			</Form>,
		)

		await user.type(screen.getByLabelText('Shipping city'), 'a')
		await user.type(screen.getByLabelText('Billing city'), 'b')

		expect(screen.getByRole('status')).toHaveTextContent('"address":{"city":"a"},"billingCity":"b"')
	})

	it('withFieldGroup under a FormProvider with no <form>', async () => {
		const user = userEvent.setup()
		function Case(): ReactNode {
			const form = useForm({ defaultValues: PLACES })
			return (
				<FormProvider form={form}>
					<PlaceBlock fields='address' />
					<PlacesOutput form={form} />
				</FormProvider>
			)
		}
		render(<Case />)

		await user.type(screen.getByLabelText('City'), 'z')

		expect(screen.getByRole('status')).toHaveTextContent('"address":{"city":"z"}')
	})

	it('withFieldGroup throws a named error with no form at all (R68)', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})

		expect(() => render(<PlaceBlock fields='address' />)).toThrow(/withFieldGroup\(\): the block needs a form/)
		vi.restoreAllMocks()
	})

	it('keeps the same input while the parent re-renders on every keystroke (Review Focus 4)', async () => {
		const user = userEvent.setup()
		function Case(): ReactNode {
			const form = useForm({ defaultValues: PLACES })
			const city = useSelector(form.store, (state) => state.values.address.city)
			return (
				<Form form={form}>
					<p>{city}</p>
					<form.FormGroup name='address'>
						{(group) => (
							<group.TextField
								name='city'
								label='Town'
							/>
						)}
					</form.FormGroup>
					<PlaceBlock
						fields={{ city: 'billingCity' }}
						label='Billing city'
					/>
				</Form>
			)
		}
		render(<Case />)

		for (const label of ['Town', 'Billing city']) {
			const input = screen.getByLabelText(label)
			await user.type(input, 'abc')
			expect(screen.getByLabelText(label)).toBe(input)
			expect(input).toHaveFocus()
			expect(input).toHaveValue('abc')
		}
	})

	it('form.X stays absolute inside a group — coordinates follow the object (R72)', async () => {
		const user = userEvent.setup()
		function Case(): ReactNode {
			const form = useForm({ defaultValues: PLACES })
			return (
				<Form form={form}>
					<form.FormGroup name='address'>
						{() => (
							<form.TextField
								name='address.city'
								label='Town'
							/>
						)}
					</form.FormGroup>
					<PlacesOutput form={form} />
				</Form>
			)
		}
		render(<Case />)

		await user.type(screen.getByLabelText('Town'), 'q')

		expect(screen.getByRole('status')).toHaveTextContent('"address":{"city":"q"}')
	})

	it('group.Array is relative too', async () => {
		const user = userEvent.setup()
		function Case(): ReactNode {
			const form = useForm({ defaultValues: { order: { tags: [{ label: '' }] } } })
			return (
				<Form form={form}>
					<form.FormGroup name='order'>
						{(group) => (
							<group.Array
								name='tags'
								newItem={{ label: '' }}
							>
								{({ items }) =>
									items.map((item) => (
										<item.TextField
											key={item.key}
											name='label'
											label={`Tag ${String(item.index)}`}
										/>
									))
								}
							</group.Array>
						)}
					</form.FormGroup>
				</Form>
			)
		}
		render(<Case />)

		await user.type(screen.getByLabelText('Tag 0'), 'v')

		expect(screen.getByLabelText('Tag 0').closest('[data-field]')).toHaveAttribute('data-field', 'order.tags[0].label')
	})

	it('names a registry key that collides with a group member (R69)', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		const bundle = createForm({ fields: { ...testFields, getMeta: testFields.TextField } as never })
		function Case(): ReactNode {
			const form = bundle.useForm({ defaultValues: PLACES })
			return (
				<bundle.Form form={form}>
					<form.FormGroup name='address'>{() => null}</form.FormGroup>
				</bundle.Form>
			)
		}

		expect(() => render(<Case />)).toThrow(/group\.getMeta/)
		vi.restoreAllMocks()
	})
})
```

Add `vi` to the vitest import. Type cases go in `composition-types.test.tsx`; they were all
prototyped with `tsc`:

```tsx
describe('group fields — types (D7)', () => {
	it('types group.X relative to the group, with a checked and an unchecked placement', () => {
		type Pair = { password: string; confirm: string }
		type Values = { email: string; n: number; security: Pair; newPassword: string; newPasswordRepeat: string }
		const Block = withFieldGroup({
			defaultValues: { password: '', confirm: '' },
			render: ({ group }) => (
				<>
					<group.TextField name='password' />
					<group.TextField
						// @ts-expect-error -- names are relative to the block
						name='security.password'
					/>
				</>
			),
		})
		function Parent(): ReactNode {
			const form = useForm({
				defaultValues: {
					email: '',
					n: 0,
					security: { password: '', confirm: '' },
					newPassword: '',
					newPasswordRepeat: '',
				} as Values,
			})
			return (
				<>
					<Block
						form={form}
						fields='security'
					/>
					<Block
						form={form}
						fields={{ password: 'newPassword', confirm: 'newPasswordRepeat' }}
					/>
					<Block
						form={form}
						// @ts-expect-error -- email is not a Pair branch
						fields='email'
					/>
					<Block
						form={form}
						// @ts-expect-error -- n is not a string path
						fields={{ password: 'n', confirm: 'newPasswordRepeat' }}
					/>
					<Block fields='security' />
					<Block
						// @ts-expect-error -- a map names every key of the block
						fields={{ password: 'newPassword' }}
					/>
					<form.FormGroup name='security'>
						{(group) => (
							<group.TextField
								// @ts-expect-error -- relative to the group
								name='security.password'
							/>
						)}
					</form.FormGroup>
				</>
			)
		}
		expectTypeOf(Parent).toBeFunction()
	})
})
```

Add to `custom-field.test.tsx`, under "the two entry points meet the same component" (the deferred
stage-4 gap). Reuse that describe's `SchemaForm` and custom field:

```tsx
it('stamps a document-mounted field with its own form id, beside a second form', () => {
	// render the describe's SchemaForm twice, each with its own `formId`, then:
	const wrappers = [...document.querySelectorAll('[data-field]')]
	expect(new Set(wrappers.map((wrapper) => wrapper.getAttribute('data-form-id'))).size).toBe(FORM_COUNT)
})
```

Spell out the two renders with `formId='first'` / `formId='second'`, using the describe's existing
document. Name `FORM_COUNT = 2` at the top of the file. Assert the exact ids — `['first', 'second']`
in document order — rather than only the count.

Kit tests: `packages/form/react/shadcn/src/groups.test.tsx`, and the same file in `heroui`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Form, withFieldGroup } from './index'

type Values = { email: string; address: { city: string }; billingCity: string }
const DEFAULTS: Values = { email: '', address: { city: '' }, billingCity: '' }
const CityBlock = withFieldGroup({
	defaultValues: { city: '' },
	props: { label: 'City' },
	render: ({ group, label }) => (
		<group.TextField
			name='city'
			label={label}
		/>
	),
})
const PLACED = [
	['Town', 'address.city'],
	['Billing city', 'billingCity'],
] as const

describe('group fields in this kit', () => {
	it('render the kit field under its absolute path and the form id', async () => {
		const user = userEvent.setup()
		render(
			<Form defaultValues={DEFAULTS}>
				{(form) => (
					<>
						<form.TextField
							name='email'
							label='Email'
						/>
						<form.FormGroup name='address'>
							{(group) => (
								<group.TextField
									name='city'
									label='Town'
								/>
							)}
						</form.FormGroup>
						<CityBlock
							fields={{ city: 'billingCity' }}
							label='Billing city'
						/>
					</>
				)}
			</Form>,
		)
		const formId = screen.getByLabelText('Email').closest('[data-field]')?.getAttribute('data-form-id') ?? ''
		expect(formId).not.toBe('')

		for (const [label, path] of PLACED) {
			const wrapper = screen.getByLabelText(label).closest('[data-field]')
			expect(wrapper).toHaveAttribute('data-field', path)
			expect(wrapper).toHaveAttribute('data-form-id', formId)
		}
		await user.type(screen.getByLabelText('Town'), 'Oslo')
		expect(screen.getByLabelText('Town')).toHaveValue('Oslo')
	})
})
```

Run `pnpm --filter @ez-kit/form-react exec vitest run src/field-groups.test.tsx src/custom-field.test.tsx`
and the package typecheck.

Expected: FAIL. `group.TextField` is undefined; there is no form from context; the types reject
`<Block fields='security' />`.

- [ ] **Step 2: `scopedMemberKeys` and `group-fields.tsx`**

`build-field-components.tsx`:

```ts
/**
 * The members a scope re-binds relative to its own path — an array entry and a group alike: every
 * registry key, the frame when registered, the headless `Array`, `Field` and `NativeField`. `Submit`
 * is not among them: it has no `name` to prefix.
 */
export function scopedMemberKeys(fields: FormFieldRegistry): readonly string[] {
	const fieldKeys = Object.keys(fields).filter((key) => !Object.hasOwn(BESPOKE_FIELD_KEYS, key))
	const frame = Object.hasOwn(fields, 'ArrayField') ? ['ArrayField'] : []
	return [...fieldKeys, ...frame, 'Array', 'Field', 'NativeField']
}
```

`buildFieldComponents` uses `const entryKeys = scopedMemberKeys(fields)`.

`group-fields.tsx`:

```tsx
'use client'

import type { ReactNode } from 'react'

type NamedComponent = (props: { name: string }) => ReactNode

/** The members a group already carries under these names and that its fields replace on purpose. */
const REPLACED_MEMBERS = { Field: true, NativeField: true } as const

/**
 * `source`'s field members under `keys`, each re-bound so its `name` (and a `NativeField`'s
 * listen-to lists) is resolved by `toAbsolute` before it renders — the group's own path rule. Built
 * once per group, so a member's identity, and the input under it, survives every re-render.
 */
export function scopeGroupMembers(
	source: object,
	keys: readonly string[],
	toAbsolute: <TProps extends { name: string }>(props: TProps) => TProps,
): Record<string, NamedComponent> {
	const record = source as Record<string, NamedComponent | undefined>
	const members: Record<string, NamedComponent> = {}
	for (const key of keys) {
		const Inner = record[key]
		if (Inner === undefined) continue
		members[key] = function GroupMember(props) {
			return <Inner {...toAbsolute(props)} />
		}
	}
	return members
}

/**
 * A scope over `base`: an object whose prototype is TanStack's group, carrying `members` on top.
 * TanStack's object is not written to, so StrictMode's second memo run finds it as it was.
 */
export function withMembers<TBase extends object>(base: TBase, members: object): TBase {
	for (const key of Object.keys(members)) {
		if (key in base && !Object.hasOwn(REPLACED_MEMBERS, key)) {
			throw new Error(
				`The field "${key}" has the name of a member every group carries, so group.${key} cannot be both. Register it under another name.`,
			)
		}
	}
	return Object.assign(Object.create(base) as TBase, members)
}
```

`errors` / `handleSubmit` are added in Tasks 2 and 5 as plain members. If the `key in base` check ever
trips on them, add them to `REPLACED_MEMBERS`.

- [ ] **Step 3: `form.FormGroup`**

`form-group.tsx`:

```tsx
export function createFormGroup<TFormData, TFields extends FormFieldRegistry>(
	form: FormInstance<TFormData, NoRegistry, NoRegistry>,
	memberKeys: readonly string[],
): FormGroupComponentOf<TFormData, TFields> {
	return function FormGroup({
		children,
		...options
	}: FormGroupProps<TFormData, DeepKeys<TFormData>, TFields>): ReactNode {
		const group = useFormGroup({ ...options, form })
		const members = useMemo(
			() => scopeGroupMembers(form, memberKeys, (props) => scopeFieldProps(props, options.name)),
			[options.name],
		)
		const scope = useMemo(() => withMembers(group, members), [group, members])
		return children(scope as never)
	} as FormGroupComponentOf<TFormData, TFields>
}
```

`useFormGroup` keeps its own `Field` / `NativeField` (the hook is unchanged, R69). The scoped members
override them with equivalent components.

- [ ] **Step 4: `withFieldGroup` in the factory**

`field-groups.tsx` — keep `useFieldGroup`, and replace the module-level `withFieldGroup`:

```tsx
type AnyPlacement = {
	form?: AnyFormInstance | undefined
	fields: string | Record<string, string>
	children?: ReactNode
}

/** The bundle's `withFieldGroup`, over the members its `fields` registry binds (R69, R23). */
export function createWithFieldGroup<TFields extends FormFieldRegistry>(memberKeys: readonly string[]) {
	return function withFieldGroup<TGroup, TSubmitMeta = never, TRenderProps extends object = Record<never, never>>(
		options: WithFieldGroupOptions<TGroup, TSubmitMeta, TRenderProps, TFields>,
	): FieldGroupBlock<TGroup, TRenderProps> {
		function FieldGroupBlockImpl(placement: AnyPlacement): ReactNode {
			const contextForm = useOptionalFormContext()
			const form = placement.form ?? contextForm
			if (form === null) throw new Error(missingFormMessage('withFieldGroup'))
			// `fields` is read on the first render only, as TanStack's group reads it — so the branch
			// taken here never changes for a mounted block, and each block's hooks stay unconditional.
			return typeof placement.fields === 'string' ? (
				<BranchBlock
					options={options as never}
					placement={placement}
					form={form}
					memberKeys={memberKeys}
				/>
			) : (
				<MappedBlock
					options={options as never}
					placement={placement}
					form={form}
					memberKeys={memberKeys}
				/>
			)
		}
		return FieldGroupBlockImpl as unknown as FieldGroupBlock<TGroup, TRenderProps>
	}
}

type BlockProps = {
	options: WithFieldGroupOptions<unknown, unknown, object, FormFieldRegistry>
	placement: AnyPlacement
	form: AnyFormInstance
	memberKeys: readonly string[]
}

/** The field group plus its flat members — shared by both placements. */
function useBlockScope({ options, placement, form, memberKeys }: BlockProps): object {
	const lens = useFieldGroup({ form, fields: placement.fields as never, defaultValues: options.defaultValues })
	const source = lens as unknown as GroupSource
	const members = useMemo(
		() => scopeGroupMembers(form, memberKeys, (props) => source.getFormFieldOptions(props)),
		[form, memberKeys, source],
	)
	return useMemo(() => withMembers(lens, members), [lens, members])
}

function BranchBlock(props: BlockProps): ReactNode {
	const group = useBlockScope(props)
	return props.options.render({ ...props.options.props, ...props.placement, group } as never)
}

function MappedBlock(props: BlockProps): ReactNode {
	const group = useBlockScope(props)
	return props.options.render({ ...props.options.props, ...props.placement, group } as never)
}
```

`create-form.tsx`, in `createFormInternals`: compute `const memberKeys = scopedMemberKeys(fields)`
once, next to `fieldTypeIds`.

- `useForm`'s `FormGroup` memo becomes `createFormGroup(…, memberKeys)`.
- The bundle returns `withFieldGroup: createWithFieldGroup<TFields>(memberKeys)`.

The returned function has to be generic: if typing it through `ReturnType` loses the generics,
declare `withFieldGroup` inline in `createFormInternals` with the same body and record that.

- [ ] **Step 5: Types and exports**

Write the `group-types.ts` additions from **Interfaces** above, each with a docblock:

- `GroupFields`: "the bundle's fields, `Array`, `Field` and `NativeField`, named relative to the group".
- `FieldGroupScope` / `FormGroupScope`: what `render` / `children` receive.
- The two placement types: "where the block lies; with `form`, `fields` is checked against it; without,
  the block reads the form above it and `fields` is a cast (R68)".

Then:

- `FormGroupProps<TFormData, TName, TFields extends FormFieldRegistry = NoRegistry>`: `children` takes
  `FormGroupScope<TFormData, TName, TFields>`.
- `FormGroupComponentOf<TFormData, TFields extends FormFieldRegistry = NoRegistry>`.
- `kit-form.ts`: `{ FormGroup: FormGroupComponentOf<TFormData, TFields> }`.
- `index.ts` exports `GroupFields`, `FieldGroupScope`, `FormGroupScope`, `FieldGroupPlacementProps`,
  `UncheckedFieldGroupPlacementProps`, `WithFieldGroupOptions`, `FieldGroupBlock`. Both kits add the
  same seven to their type-export lists.

- [ ] **Step 6: Run everything this touches**

Run, in order:

1. `pnpm --filter @ez-kit/form-react exec vitest run src/field-groups.test.tsx src/custom-field.test.tsx src/composition-types.test.tsx src/array.test.tsx src/array-field.test.tsx src/native-field.test.tsx`
2. the package typecheck and `test:react18`
3. `pnpm build --filter=...@ez-kit/form-core`
4. `pnpm --filter @ez-kit/form-shadcn exec vitest run src/groups.test.tsx`
5. `pnpm --filter @ez-kit/form-heroui exec vitest run src/groups.test.tsx`
6. `pnpm --filter @ez-kit/docs exec vitest run test/kit-exports-parity.test.ts test/form-package-graph.test.ts`
7. `pnpm verify:affected`

Expected: PASS.

- [ ] **Step 7: Changeset and commit**

Append to `.changeset/form-composition-helpers.md`:

```md
Groups carry the bundle's fields. Inside `form.FormGroup` and a `withFieldGroup` block, `group.TextField`,
`group.ArrayField`, `group.Array` and every field the app registered take a `name` relative to the
group — a path for `form.FormGroup` and `fields='…'`, the map's own key for a field map. `form.X`
inside a group stays absolute: the coordinates come from the object a field is called through.
`withFieldGroup` is now built per bundle, and a block placed without `form` takes the form above it,
with `fields` then unchecked; with neither, it throws a named error. Both kits export the new types
`GroupFields`, `FieldGroupScope`, `FormGroupScope`, `FieldGroupPlacementProps`,
`UncheckedFieldGroupPlacementProps`, `WithFieldGroupOptions` and `FieldGroupBlock`.
```

```bash
git add packages/form/react/react/src/group-fields.tsx packages/form/react/react/src/build-field-components.tsx packages/form/react/react/src/form-group.tsx packages/form/react/react/src/field-groups.tsx packages/form/react/react/src/group-types.ts packages/form/react/react/src/kit-form.ts packages/form/react/react/src/create-form.tsx packages/form/react/react/src/index.ts packages/form/react/react/src/field-groups.test.tsx packages/form/react/react/src/composition-types.test.tsx packages/form/react/react/src/custom-field.test.tsx packages/form/react/shadcn/src/index.ts packages/form/react/shadcn/src/groups.test.tsx packages/form/react/heroui/src/index.ts packages/form/react/heroui/src/groups.test.tsx .changeset/form-composition-helpers.md
git commit -m "feat(form): give groups the bundle's flat fields, relative to the group"
```

---

### Task 5: group validators and submit on a branch; whole-form submit runs every group

**Files:**

- Create: `packages/form/react/react/src/group-registry.ts` (`isPathWithin`, `validateGroups`,
  `hookGroupFields`)
- Modify: `packages/form/react/react/src/core-hooks.ts` (`afterValidateAllFields`)
- Modify: `packages/form/react/react/src/create-form.tsx`. The core hook runs the groups; the
  `focusOnError` flag is registered per instance.
- Modify: `packages/form/react/react/src/focus-first-error.ts`. Add `setFocusOnError`,
  `focusesOnError` and `focusFirstFieldWithErrors(form, within?)`, moved here from `create-form.tsx`.
- Modify: `packages/form/react/react/src/server-errors.ts` (`clearWhere`)
- Modify: `packages/form/react/react/src/form-group.tsx`. `useFormGroup`'s `handleSubmit` follows R61
  and R63, plus `onGroupSubmitInvalid` focus (R71).
- Modify: `packages/form/react/react/src/field-groups.tsx`. `BranchBlock` mounts the native group:
  `validators`, `onGroupSubmit`, `errors`, block-only `handleSubmit`.
- Modify: `packages/form/react/react/src/group-types.ts`:
  - add `GroupValidators<TGroup>`;
  - `WithFieldGroupOptions` gains `validators`;
  - the placements gain `onGroupSubmit`;
  - `FieldGroupScope` gains `errors` and `handleSubmit`;
  - `FieldGroupBlock` gains `TSubmitMeta`.
- Modify: `index.ts` and both kits (`GroupValidators`)
- Test: create `packages/form/react/react/src/group-submit.test.tsx`; extend `focus-on-error.test.tsx`
  (deferred stage-4 gaps)
- Modify: `.changeset/form-composition-helpers.md`

**Interfaces:**

```ts
// group-registry.ts
export type GroupHost = { formGroupApis: ReadonlySet<NativeGroupApi> }
export type NativeGroupApi = {
	name: string
	validate: (cause: 'submit', options: { skipFormValidation: boolean; skipRelatedFieldValidation: boolean }) => unknown
	validateAllFields: (cause: ValidationCause) => Promise<unknown[]>
	getInfo: () => { instance: NativeGroupApi | null }
}
/** One group the submit passes run: a native one, or (Task 6) a map group. */
export type ValidatedGroup = { owner: object; within: (scope: string) => boolean; validate: () => Promise<unknown> }
export function isPathWithin(scope: string, name: string): boolean
export function groupsOf(form: GroupHost): readonly ValidatedGroup[]
export async function validateGroups(form: GroupHost, accept: (group: ValidatedGroup) => boolean): Promise<void>
export function hookGroupFields(group: NativeGroupApi, form: GroupHost): void

// group-types.ts
export type GroupValidator<TGroup> = StandardSchemaV1<TGroup, unknown> | ((props: { value: TGroup }) => unknown)
export type GroupAsyncValidator<TGroup> =
	| StandardSchemaV1<TGroup, unknown>
	| ((props: { value: TGroup; signal: AbortSignal }) => unknown)
export type GroupValidators<TGroup> = {
	onMount?: GroupValidator<TGroup>
	onChange?: GroupValidator<TGroup>
	onChangeAsync?: GroupAsyncValidator<TGroup>
	onChangeAsyncDebounceMs?: number
	onBlur?: GroupValidator<TGroup>
	onBlurAsync?: GroupAsyncValidator<TGroup>
	onBlurAsyncDebounceMs?: number
	onSubmit?: GroupValidator<TGroup>
	onSubmitAsync?: GroupAsyncValidator<TGroup>
}
export type OnGroupSubmit<TGroup, TSubmitMeta> = (props: { value: TGroup; meta: TSubmitMeta }) => unknown

// server-errors.ts — ServerErrorsController gains:
clearWhere: (isCleared: (field: string) => boolean) => void
```

- [ ] **Step 1: Write the failing tests**

`group-submit.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'
import { testSchema } from './test-schema'

import type { ReactNode } from 'react'

const { Form, useForm, withFieldGroup } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

type Pair = { password: string; confirm: string }
type Profile = { displayName: string; email: string; security: Pair }
const PROFILE: Profile = { displayName: 'Ann', email: '', security: { password: '', confirm: '' } }
const MIN_PASSWORD = 8
const TOO_SHORT = 'At least 8 characters'
const MISMATCH = 'Passwords do not match'
const VALID_PASSWORD = 'correct horse'

const pairSchema = testSchema<Pair>((pair) => [
	...(pair.password.length < MIN_PASSWORD ? [{ message: TOO_SHORT, path: ['password'] }] : []),
	...(pair.password !== pair.confirm ? [{ message: MISMATCH, path: ['confirm'] }] : []),
])

const PasswordPair = withFieldGroup({
	defaultValues: { password: '', confirm: '' },
	validators: { onChange: pairSchema },
	render: ({ group }) => (
		<>
			<group.TextField
				name='password'
				label='Password'
			/>
			<group.TextField
				name='confirm'
				label='Repeat'
			/>
			<output data-testid='block-errors'>{group.errors.join('|')}</output>
		</>
	),
})

type Instance = ReturnType<typeof useProfileForm>
function useProfileForm(onSubmit: () => void) {
	return useForm({ defaultValues: PROFILE, onSubmit })
}

/** §4 scenario 2, profile: a FormGroup with no validators around a block that brings the rule. */
function ProfileCase({
	onSubmit,
	onGroupSubmit,
	onForm,
}: {
	onSubmit: () => void
	onGroupSubmit: (props: { value: Pair }) => void
	onForm?: (form: Instance) => void
}): ReactNode {
	const form = useProfileForm(onSubmit)
	useEffect(() => {
		onForm?.(form)
	}, [form, onForm])
	return (
		<Form form={form}>
			<form.TextField
				name='email'
				label='Email'
			/>
			<form.FormGroup
				name='security'
				onGroupSubmit={onGroupSubmit}
			>
				{(group) => (
					<>
						<PasswordPair fields='security' />
						<button
							type='button'
							onClick={() => void group.handleSubmit()}
						>
							Change password
						</button>
					</>
				)}
			</form.FormGroup>
			<form.SubmitButton>Save profile</form.SubmitButton>
			<form.Submit>{({ formErrors }) => <output data-testid='form-errors'>{formErrors.join('|')}</output>}</form.Submit>
		</Form>
	)
}

async function fillPair(user: ReturnType<typeof userEvent.setup>, password: string, confirm: string): Promise<void> {
	await user.type(screen.getByLabelText('Password'), password)
	await user.type(screen.getByLabelText('Repeat'), confirm)
}

describe('group submit (D7, §4 scenario 2)', () => {
	it("is blocked by a nested block's rule while untouched, and focuses the group's first error (R63, R71)", async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		const onGroupSubmit = vi.fn()
		render(
			<ProfileCase
				onSubmit={onSubmit}
				onGroupSubmit={onGroupSubmit}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'Change password' }))

		expect(onGroupSubmit).not.toHaveBeenCalled()
		expect(screen.getByText(TOO_SHORT)).toBeInTheDocument()
		expect(screen.getByLabelText('Password')).toHaveFocus()
	})

	it('submits only the branch once valid, and never the form', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		const onGroupSubmit = vi.fn()
		render(
			<ProfileCase
				onSubmit={onSubmit}
				onGroupSubmit={onGroupSubmit}
			/>,
		)

		await fillPair(user, VALID_PASSWORD, VALID_PASSWORD)
		await user.click(screen.getByRole('button', { name: 'Change password' }))

		expect(onGroupSubmit).toHaveBeenCalledTimes(1)
		expect(onGroupSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ value: { password: VALID_PASSWORD, confirm: VALID_PASSWORD } }),
		)
		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('runs the block on a whole-form submit, untouched (R62)', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(
			<ProfileCase
				onSubmit={onSubmit}
				onGroupSubmit={vi.fn()}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'Save profile' }))

		expect(onSubmit).not.toHaveBeenCalled()
		expect(screen.getByText(TOO_SHORT)).toBeInTheDocument()

		await fillPair(user, VALID_PASSWORD, VALID_PASSWORD)
		await user.click(screen.getByRole('button', { name: 'Save profile' }))
		expect(onSubmit).toHaveBeenCalledTimes(1)
	})

	it("clears only the branch's server errors before a group submit (R61, Review Focus 3)", async () => {
		const user = userEvent.setup()
		let instance: Instance | undefined
		render(
			<ProfileCase
				onSubmit={vi.fn()}
				onGroupSubmit={vi.fn()}
				onForm={(form) => {
					instance = form
				}}
			/>,
		)
		await fillPair(user, VALID_PASSWORD, VALID_PASSWORD)
		act(() => {
			instance?.setServerErrors({ fields: { 'security.password': 'Reused', email: 'Taken' }, form: 'Down' })
		})

		await user.click(screen.getByRole('button', { name: 'Change password' }))

		expect(screen.queryByText('Reused')).not.toBeInTheDocument()
		expect(screen.getByText('Taken')).toBeInTheDocument()
		expect(screen.getByTestId('form-errors')).toHaveTextContent('Down')
	})

	it("withFieldGroup's own handleSubmit submits the block, not the form (R70)", async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		const onGroupSubmit = vi.fn()
		const Section = withFieldGroup({
			defaultValues: { password: '', confirm: '' },
			validators: { onChange: pairSchema },
			render: ({ group }) => (
				<>
					<group.TextField
						name='password'
						label='Password'
					/>
					<group.TextField
						name='confirm'
						label='Repeat'
					/>
					<button
						type='button'
						onClick={() => void group.handleSubmit()}
					>
						Save section
					</button>
				</>
			),
		})
		render(
			<Form
				defaultValues={PROFILE}
				onSubmit={onSubmit}
			>
				{() => (
					<Section
						fields='security'
						onGroupSubmit={onGroupSubmit}
					/>
				)}
			</Form>,
		)

		await fillPair(user, VALID_PASSWORD, VALID_PASSWORD)
		await user.click(screen.getByRole('button', { name: 'Save section' }))

		expect(onGroupSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ value: { password: VALID_PASSWORD, confirm: VALID_PASSWORD } }),
		)
		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('shows one message when the group and the form schema state the same rule (R62)', async () => {
		const user = userEvent.setup()
		render(
			<Form
				defaultValues={PROFILE}
				validators={{
					onSubmit: testSchema<Profile>((values) =>
						values.security.password.length < MIN_PASSWORD
							? [{ message: TOO_SHORT, path: ['security', 'password'] }]
							: [],
					),
				}}
			>
				{(form) => (
					<>
						<PasswordPair fields='security' />
						<form.SubmitButton>Save profile</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		await user.click(screen.getByRole('button', { name: 'Save profile' }))

		expect(screen.getAllByText(TOO_SHORT)).toHaveLength(1)
	})

	it("puts a block's pathless issue in group.errors", async () => {
		const user = userEvent.setup()
		const NotName = withFieldGroup({
			defaultValues: { password: '', confirm: '' },
			validators: {
				onChange: testSchema<Pair>((pair) => (pair.password === 'ann' ? [{ message: 'Not your name' }] : [])),
			},
			render: ({ group }) => (
				<>
					<group.TextField
						name='password'
						label='Password'
					/>
					<output data-testid='block-errors'>{group.errors.join('|')}</output>
				</>
			),
		})
		render(<Form defaultValues={PROFILE}>{() => <NotName fields='security' />}</Form>)

		await user.type(screen.getByLabelText('Password'), 'ann')

		expect(screen.getByTestId('block-errors')).toHaveTextContent('Not your name')
	})
})
```

Add to `focus-on-error.test.tsx` (the deferred stage-4 gaps):

1. **`focusOnError={false}` on an uncontrolled `<SchemaForm>`.** Build a `SchemaForm` from this file's
   `createSchemaForm` with one required `text` node. Pass `focusOnError={false}`, click the submit
   node's button, and expect `document.activeElement` to be that button (or `document.body`) — never
   the input.
2. **`useForm({ focusOnError: false })` under `FormProvider` with no `<form>`.** A `TextField` with
   `validate={{ required: true }}` and a plain button calling `form.handleSubmit()`. After the click,
   the input does not have focus.
3. **The type case.** A controlled `<Form form={form}>` with
   `// @ts-expect-error -- focusOnError is a useForm option` on a `focusOnError` attribute line.

Run `pnpm --filter @ez-kit/form-react exec vitest run src/group-submit.test.tsx src/focus-on-error.test.tsx`
and the package typecheck.

Expected: FAIL. `validators` and `onGroupSubmit` are unknown on a block, the nested rule is not run,
the form submits untouched, and `Reused` stays. The focus-on-error additions already pass: they pin
existing behaviour.

- [ ] **Step 2: Focus flag and walk**

`focus-first-error.ts`:

```ts
const focusFlags = new WeakMap<object, { current: boolean }>()

/** Register the `focusOnError` of one instance — read when a group submit fails (R71). */
export function setFocusOnError(form: object, flag: { current: boolean }): void {
	focusFlags.set(form, flag)
}

export function focusesOnError(form: object): boolean {
	return focusFlags.get(form)?.current ?? true
}

/** The members of an instance the walk reads. */
export type ErrorFocusSource = {
	formId: string
	getFieldMeta: (name: string) => { errors: readonly unknown[] } | undefined
}

/** Focus the first field of `form`, in DOM order, with errors — optionally only among `within`'s names. */
export function focusFirstFieldWithErrors(
	form: ErrorFocusSource,
	within: (name: string) => boolean = () => true,
): void {
	focusFirstError(form.formId, (name) => within(name) && (form.getFieldMeta(name)?.errors.length ?? 0) > 0)
}
```

`create-form.tsx`:

- Delete the local `focusFirstFieldWithErrors` and import it from here.
- In `useForm`, after `focusOnErrorRef`, add
  `useMemo(() => { setFocusOnError(form, focusOnErrorRef) }, [form])`.
  A memo rather than an effect: a group submit can only happen after render.

- [ ] **Step 3: `group-registry.ts`, and the core hook**

```ts
import type { ValidationCause } from '@tanstack/form-core'

const SUBMIT = 'submit'
const GROUP_SUBMIT_PASS = { skipFormValidation: true, skipRelatedFieldValidation: true }

/** Is `name` the path `scope` or a path inside it — TanStack's own test, which it keeps private. */
export function isPathWithin(scope: string, name: string): boolean {
	return name === scope || name.startsWith(`${scope}.`) || name.startsWith(`${scope}[`)
}

/** Every mounted group of `form`, as the submit passes run them. */
export function groupsOf(form: GroupHost): readonly ValidatedGroup[] {
	return [...form.formGroupApis].map((api) => ({
		owner: api,
		within: (scope: string) => isPathWithin(scope, api.name),
		validate: async () => {
			await api.validate(SUBMIT, GROUP_SUBMIT_PASS)
		},
	}))
}

/** Run the submit validators of the groups `accept` picks — after the fields, never before (R62). */
export async function validateGroups(form: GroupHost, accept: (group: ValidatedGroup) => boolean): Promise<void> {
	await Promise.all(
		groupsOf(form)
			.filter(accept)
			.map((group) => group.validate()),
	)
}

const hookedGroups = new WeakSet<object>()

/**
 * Run the groups mounted inside `group` after its own field pass, once per group instance (R63).
 * The instance is TanStack's real `FormGroupApi` — `getInfo().instance`, set on mount — whose
 * `_handleSubmit` calls `this.validateAllFields`.
 */
export function hookGroupFields(group: NativeGroupApi, form: GroupHost): void {
	if (hookedGroups.has(group)) return
	hookedGroups.add(group)
	const { validateAllFields } = group
	Object.assign(group, {
		validateAllFields: async (cause: ValidationCause) => {
			const results = await validateAllFields(cause)
			if (cause === SUBMIT) {
				await validateGroups(form, (other) => other.owner !== group && other.within(group.name))
			}
			return results
		},
	})
}
```

`GROUP_SUBMIT_PASS` is a top-level literal with no spread, so it stays pure.

`core-hooks.ts`: `CoreHooks` gains
`afterValidateAllFields: (cause: ValidationCause) => Promise<void>`, and `hookCore` wraps
`validateAllFields`:

```ts
validateAllFields: async (cause: ValidationCause) => {
	const results = await validateAllFields(cause)
	await hooks.afterValidateAllFields(cause)
	return results
},
```

`coreHooksFor(form)` in `create-form.tsx` adds:

```ts
afterValidateAllFields: async (cause) => {
	if (cause === SUBMIT_CAUSE) await validateGroups(form as unknown as GroupHost, () => true)
},
```

`SUBMIT_CAUSE = 'submit'` is a module constant there.

- [ ] **Step 4: `clearWhere`**

`server-errors.ts`, inside `attachServerErrors`:

```ts
clearWhere(isCleared) {
	const kept = new Map([...fields].filter(([name]) => !isCleared(name)))
	if (kept.size === fields.size) return
	fields = kept
	reconcile()
},
```

Add it to the `ServerErrorsController` type with the docblock "Remove the field errors whose path
`isCleared` accepts — a group submit's own (R61). Form-level messages stay."

- [ ] **Step 5: `useFormGroup` submits like a group**

`form-group.tsx`, `useFormGroup`:

```tsx
const group = useTanStackFormGroup({
	...options,
	onGroupSubmitInvalid: (props: unknown) => {
		if (focusesOnError(options.form)) {
			focusFirstFieldWithErrors(options.form as unknown as ErrorFocusSource, (name) => isPathWithin(options.name, name))
		}
		;(options as { onGroupSubmitInvalid?: (props: unknown) => void }).onGroupSubmitInvalid?.(props)
	},
} as never) as unknown as object
```

Then, in the final memo:

```tsx
return useMemo(() => {
	const native = group as unknown as {
		handleSubmit: (meta?: unknown) => Promise<void>
		getInfo: NativeGroupApi['getInfo']
	}
	const submitNative = native.handleSubmit
	return Object.assign(group, members, {
		errors: formatOwnErrors(Object.values(groupMeta(group).errorMap)),
		handleSubmit: async (meta?: unknown): Promise<void> => {
			serverErrorsOf(options.form)?.clearWhere((field) => isPathWithin(options.name, field))
			const instance = native.getInfo().instance
			if (instance !== null) hookGroupFields(instance, options.form as unknown as GroupHost)
			await submitNative(meta)
		},
	})
}, [group, members, options.form, options.name]) as unknown as FormGroupInstance<TFormData, TName>
```

`FormGroupInstance` keeps TanStack's `handleSubmit` signature (same shape), and its docblock now says
"submits this branch: clears its server errors, runs its fields, the groups inside it and its own
validators, then `onGroupSubmit`".

- [ ] **Step 6: `BranchBlock` with a native group**

`field-groups.tsx`:

```tsx
function BranchBlock(props: BlockProps): ReactNode {
	const scope = useBlockScope(props)
	const { onGroupSubmit } = props.placement
	const branch = useFormGroup({
		form: props.form,
		name: props.placement.fields as string,
		validators: props.options.validators,
		...(onGroupSubmit !== undefined && { onGroupSubmit }),
	} as never) as unknown as { errors: string[]; handleSubmit: (meta?: unknown) => Promise<void> }
	const group = useMemo(
		() => Object.assign(Object.create(scope) as object, { errors: branch.errors, handleSubmit: branch.handleSubmit }),
		[scope, branch],
	)
	return props.options.render({ ...props.options.props, ...props.placement, group } as never)
}
```

`AnyPlacement` gains `onGroupSubmit?: ((props: { value: unknown; meta: unknown }) => unknown) | undefined`.
TanStack calls `onGroupSubmit` with `{ value, groupApi, meta }`; that is a superset of the documented
`{ value, meta }`. The block's `defaultValues` is deliberately not passed (R66).

`group-types.ts`:

- `WithFieldGroupOptions` gains `validators?: GroupValidators<NoInfer<TGroup>>`.
- Both placement types gain `onGroupSubmit?: OnGroupSubmit<TGroup, TSubmitMeta>` and the
  `TSubmitMeta` parameter.
- `FieldGroupScope` gains `errors: string[]` and `handleSubmit: (meta?: TSubmitMeta) => Promise<void>`,
  replacing TanStack's (R70) in the `Omit`.
- `FieldGroupBlock<TGroup, TSubmitMeta, TRenderProps>` threads it.
- Export `GroupValidators`, `GroupValidator`, `GroupAsyncValidator` and `OnGroupSubmit` from
  `index.ts` and both kits.

`MappedBlock` gets the same props in Task 6. Until then, a map block's `handleSubmit` is TanStack's
lens (whole form): Task 6's RED test pins the change.

- [ ] **Step 7: Run everything this touches**

Run, in order:

1. `pnpm --filter @ez-kit/form-react exec vitest run src/group-submit.test.tsx src/field-groups.test.tsx src/focus-on-error.test.tsx src/server-errors.test.tsx src/submit.test.tsx`
2. the package typecheck and `test:react18`
3. `pnpm build --filter=...@ez-kit/form-core`
4. both kits' `groups.test.tsx`
5. `pnpm --filter @ez-kit/docs exec vitest run test/kit-exports-parity.test.ts`
6. `pnpm verify:affected`

Expected: PASS.

- [ ] **Step 8: Changeset and commit**

Append to `.changeset/form-composition-helpers.md`:

```md
**Groups validate and submit.** `withFieldGroup` takes `validators` — a Standard Schema or a function
over the block's own shape, on `onMount`, `onChange`, `onBlur`, `onSubmit` and their async forms.
Issues with a path land on the real fields; issues without one are the block's `group.errors`.
`group.handleSubmit()` checks the block and calls the `onGroupSubmit` passed where the block is
placed, with `value` typed by the block. **Breaking:** a block's `group.handleSubmit` used to submit
the whole form; call `form.handleSubmit()` for that. On every group (`form.FormGroup`, `useFormGroup`,
a block), a submit first clears the server errors of the fields inside it, runs the groups placed
inside it, and focuses the group's first error when it fails. A whole-form submit now runs every
mounted group's validators after the fields — before, TanStack ran none of them.
```

```bash
git add packages/form/react/react/src/group-registry.ts packages/form/react/react/src/core-hooks.ts packages/form/react/react/src/create-form.tsx packages/form/react/react/src/focus-first-error.ts packages/form/react/react/src/server-errors.ts packages/form/react/react/src/form-group.tsx packages/form/react/react/src/field-groups.tsx packages/form/react/react/src/group-types.ts packages/form/react/react/src/index.ts packages/form/react/react/src/group-submit.test.tsx packages/form/react/react/src/focus-on-error.test.tsx packages/form/react/shadcn/src/index.ts packages/form/react/heroui/src/index.ts .changeset/form-composition-helpers.md
git commit -m "feat(form): validate and submit groups on their own, and on the form's submit" -m "TanStack's form submit ran no group validator; groups now run after the fields."
```

---

### Task 6: a field map — the block's own validation and submit

**Files:**

- Create: `packages/form/react/react/src/map-group.ts`
- Modify: `packages/form/react/react/src/group-registry.ts`. Add `registerMapGroup`; `groupsOf`
  includes map groups.
- Modify: `packages/form/react/react/src/create-form.tsx`. Compose `listeners.onBlur` into the blur
  bus: `emitFieldBlur`, exported from `map-group.ts`.
- Modify: `packages/form/react/react/src/field-groups.tsx` (`MappedBlock`)
- Modify: `packages/form/react/react/src/fields/submit.tsx`. Select `errorMap`; leave `onGroup:` keys
  out of `formErrors`.
- Test: create `packages/form/react/react/src/map-group.test.tsx`
- Modify: `apps/docs/test/tree-shaking.test.ts` (marker)
- Modify: `.changeset/form-composition-helpers.md`

**Interfaces:**

```ts
export const GROUP_ERROR_KEY_PREFIX = 'onGroup:'
export function emitFieldBlur(form: object, name: string): void
export type MapGroup = ValidatedGroup & {
	errorKey: string
	value: () => Record<string, unknown>
	submit: (meta: unknown, onGroupSubmit: OnGroupSubmit<unknown, unknown> | undefined) => Promise<void>
	connect: () => () => void
}
export function createMapGroup(options: {
	form: MapGroupHost
	map: Readonly<Record<string, string>>
	validators: GroupValidators<unknown> | undefined
	id: string
	toAbsolute: (relative: string) => string
}): MapGroup
```

- [ ] **Step 1: Write the failing tests**

`map-group.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'
import { testSchema } from './test-schema'

import type { ReactNode } from 'react'

const { Form, withFieldGroup } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

type Pair = { password: string; confirm: string }
type SignUp = { login: string; password: string; confirm: string; newPassword: string; other: string }
const SIGN_UP: SignUp = { login: '', password: '', confirm: '', newPassword: '', other: '' }
const MIN_PASSWORD = 8
const TOO_SHORT = 'At least 8 characters'
const MISMATCH = 'Passwords do not match'
const NOT_LOGIN = 'Must differ from the login'
const VALID = 'correct horse'

const pairSchema = testSchema<Pair>((pair) => [
	...(pair.password.length < MIN_PASSWORD ? [{ message: TOO_SHORT, path: ['password'] }] : []),
	...(pair.password !== pair.confirm ? [{ message: MISMATCH, path: ['confirm'] }] : []),
	...(pair.password === 'ann-is-me' ? [{ message: NOT_LOGIN }] : []),
])

const PasswordPair = withFieldGroup({
	defaultValues: { password: '', confirm: '' },
	validators: { onChange: pairSchema },
	render: ({ group }) => (
		<>
			<group.TextField
				name='password'
				label='Password'
			/>
			<group.TextField
				name='confirm'
				label='Repeat'
			/>
			<output data-testid='block-errors'>{group.errors.join('|')}</output>
			<button
				type='button'
				onClick={() => void group.handleSubmit()}
			>
				Save pair
			</button>
		</>
	),
})

const ROOT_MAP = { password: 'password', confirm: 'confirm' } as const

function SignUpCase({
	onSubmit,
	onGroupSubmit,
}: {
	onSubmit: () => void
	onGroupSubmit?: (props: { value: Pair }) => void
}): ReactNode {
	return (
		<Form
			defaultValues={SIGN_UP}
			onSubmit={onSubmit}
		>
			{(form) => (
				<>
					<form.TextField
						name='login'
						label='Login'
					/>
					<PasswordPair
						fields={ROOT_MAP}
						onGroupSubmit={onGroupSubmit}
					/>
					<form.SubmitButton>Sign up</form.SubmitButton>
					<form.Submit>
						{({ formErrors, canSubmit }) => (
							<>
								<output data-testid='form-errors'>{formErrors.join('|')}</output>
								<output data-testid='can-submit'>{String(canSubmit)}</output>
							</>
						)}
					</form.Submit>
				</>
			)}
		</Form>
	)
}

describe('withFieldGroup over a field map (R67)', () => {
	it('blocks an untouched sign-up and focuses the first error (Review Focus 1)', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<SignUpCase onSubmit={onSubmit} />)

		await user.click(screen.getByRole('button', { name: 'Sign up' }))

		expect(onSubmit).not.toHaveBeenCalled()
		expect(screen.getByText(TOO_SHORT)).toBeInTheDocument()
		expect(screen.getByLabelText('Password')).toHaveFocus()
	})

	it('puts a path issue on the real field, and submits clean values once valid', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<SignUpCase onSubmit={onSubmit} />)

		await user.type(screen.getByLabelText('Password'), VALID)
		await user.type(screen.getByLabelText('Repeat'), 'x')
		expect(screen.getByLabelText('Repeat').closest('[data-field]')).toHaveTextContent(MISMATCH)

		await user.clear(screen.getByLabelText('Repeat'))
		await user.type(screen.getByLabelText('Repeat'), VALID)
		await user.click(screen.getByRole('button', { name: 'Sign up' }))

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ value: { ...SIGN_UP, password: VALID, confirm: VALID } }),
		)
	})

	it('keeps a pathless issue on the block, out of formErrors, and blocks submitting', async () => {
		const user = userEvent.setup()
		render(<SignUpCase onSubmit={vi.fn()} />)

		await user.type(screen.getByLabelText('Password'), 'ann-is-me')
		await user.type(screen.getByLabelText('Repeat'), 'ann-is-me')

		expect(screen.getByTestId('block-errors')).toHaveTextContent(NOT_LOGIN)
		expect(screen.getByTestId('form-errors')).toHaveTextContent('')
		expect(screen.getByTestId('can-submit')).toHaveTextContent('false')
	})

	it('submits the block alone, with its value assembled from the map', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		const onGroupSubmit = vi.fn()
		render(
			<SignUpCase
				onSubmit={onSubmit}
				onGroupSubmit={onGroupSubmit}
			/>,
		)

		await user.type(screen.getByLabelText('Password'), VALID)
		await user.type(screen.getByLabelText('Repeat'), VALID)
		await user.click(screen.getByRole('button', { name: 'Save pair' }))

		expect(onGroupSubmit).toHaveBeenCalledWith(expect.objectContaining({ value: { password: VALID, confirm: VALID } }))
		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('runs onBlur on a mapped field only, and onMount once', async () => {
		const user = userEvent.setup()
		const onBlur = vi.fn(() => undefined)
		const onMount = vi.fn(() => undefined)
		const Watched = withFieldGroup({
			defaultValues: { password: '', confirm: '' },
			validators: { onBlur, onMount },
			render: ({ group }) => (
				<group.TextField
					name='password'
					label='Password'
				/>
			),
		})
		render(
			<Form defaultValues={SIGN_UP}>
				{(form) => (
					<>
						<form.TextField
							name='other'
							label='Other'
						/>
						<Watched fields={{ password: 'newPassword', confirm: 'confirm' }} />
					</>
				)}
			</Form>,
		)
		expect(onMount).toHaveBeenCalledTimes(1)

		await user.click(screen.getByLabelText('Other'))
		await user.tab()
		expect(onBlur).not.toHaveBeenCalled()

		await user.click(screen.getByLabelText('Password'))
		await user.tab()
		expect(onBlur).toHaveBeenCalledWith(expect.objectContaining({ value: { password: '', confirm: '' } }))
	})

	it('routes a function validator’s { fields, group } result', async () => {
		const user = userEvent.setup()
		const Card = withFieldGroup({
			defaultValues: { password: '', confirm: '' },
			validators: {
				onChange: ({ value }) =>
					value.password === 'x' ? { fields: { confirm: 'Wrong' }, group: 'Declined' } : undefined,
			},
			render: ({ group }) => (
				<>
					<group.TextField
						name='password'
						label='Password'
					/>
					<group.TextField
						name='confirm'
						label='Repeat'
					/>
					<output data-testid='block-errors'>{group.errors.join('|')}</output>
				</>
			),
		})
		render(<Form defaultValues={SIGN_UP}>{() => <Card fields={ROOT_MAP} />}</Form>)

		await user.type(screen.getByLabelText('Password'), 'x')

		expect(screen.getByTestId('block-errors')).toHaveTextContent('Declined')
		expect(screen.getByLabelText('Repeat').closest('[data-field]')).toHaveTextContent('Wrong')
	})

	it('removes its errors when the block unmounts', async () => {
		const user = userEvent.setup()
		function Case(): ReactNode {
			const [shown, setShown] = useState(true)
			return (
				<Form defaultValues={SIGN_UP}>
					{(form) => (
						<>
							{shown && <PasswordPair fields={ROOT_MAP} />}
							<button
								type='button'
								onClick={() => {
									setShown(false)
								}}
							>
								Hide
							</button>
							<form.Submit>
								{({ canSubmit }) => <output data-testid='can-submit'>{String(canSubmit)}</output>}
							</form.Submit>
						</>
					)}
				</Form>
			)
		}
		render(<Case />)
		await user.type(screen.getByLabelText('Password'), 'ann-is-me')
		expect(screen.getByTestId('can-submit')).toHaveTextContent('false')

		await user.click(screen.getByRole('button', { name: 'Hide' }))
		await act(async () => {})

		expect(screen.getByTestId('can-submit')).toHaveTextContent('true')
	})
})
```

The unmount case passes only if the unmounted fields' metas carry no stale errors. TanStack keeps an
unmounted field's meta, so the controller's disconnect clears its own key on every field it wrote.
That is exactly what the test pins.

Add to `apps/docs/test/tree-shaking.test.ts`, under the config-layer helpers describe:

```ts
/** A literal only the map-group controller contains. */
const MAP_GROUP_MARKER = 'onGroup:'

it('reach the map-group controller through createForm (control)', async () => {
	expect(await bundledCodeOf(FORM_REACT_ENTRY, ['createForm'])).toContain(MAP_GROUP_MARKER)
})

it('do not carry the map-group controller on their own', async () => {
	expect(await bundledCodeOf(FORM_REACT_ENTRY, FORM_HELPERS)).not.toContain(MAP_GROUP_MARKER)
})
```

Run `pnpm --filter @ez-kit/form-react exec vitest run src/map-group.test.tsx` and the package
typecheck.

Expected: FAIL. The map block has no validators, and its `handleSubmit` submits the form.

- [ ] **Step 2: Confirm R67's unmeasured point**

The first case, untouched sign-up, must neither loop nor warn. If writing the keys from inside the
store subscription re-enters the subscription (as `server-errors.ts`'s `syncing` flag guards
against), add the same guard. If it loops in a way the guard cannot fix, stop and report.

- [ ] **Step 3: `map-group.ts`**

```ts
import { isStandardSchemaValidator, standardSchemaValidators } from '@tanstack/form-core'

import { formatOwnErrors } from './own-errors'
import { isPathWithin } from './group-registry'
import { serverErrorsOf } from './server-errors'

import type { ValidatedGroup } from './group-registry'
import type { GroupValidators, OnGroupSubmit } from './group-types'

/** The `errorMap` key a map group owns on its fields and on the form — `onGroup:<block id>` (R67). */
export const GROUP_ERROR_KEY_PREFIX = 'onGroup:'

const FORM_SOURCE = 'form'
const PATHLESS_KEY = ''
const SUBMIT = 'submit'

/** The trigger a validation pass answers to. */
const MapGroupCause = { Mount: 'mount', Change: 'change', Blur: 'blur', Submit: 'submit' } as const
type MapGroupCause = (typeof MapGroupCause)[keyof typeof MapGroupCause]

/** Which slots a pass runs, in TanStack's order: a submit runs change, blur and submit (R62). */
const SYNC_SLOTS: Record<MapGroupCause, readonly ('onMount' | 'onChange' | 'onBlur' | 'onSubmit')[]> = {
	mount: ['onMount'],
	change: ['onChange'],
	blur: ['onBlur'],
	submit: ['onChange', 'onBlur', 'onSubmit'],
}
const ASYNC_SLOTS: Record<MapGroupCause, readonly ('onChangeAsync' | 'onBlurAsync' | 'onSubmitAsync')[]> = {
	mount: [],
	change: ['onChangeAsync'],
	blur: ['onBlurAsync'],
	submit: ['onChangeAsync', 'onBlurAsync', 'onSubmitAsync'],
}

type FieldMetaLike = { isTouched: boolean; errorMap: Record<string, unknown>; errors: readonly unknown[] }

/** The members of the instance a map group reads and writes. */
export type MapGroupHost = {
	state: { errorMap: Record<string, unknown> }
	fieldInfo: Partial<Record<string, { instance: unknown }>>
	getFieldValue: (name: string) => unknown
	getFieldMeta: (name: string) => FieldMetaLike | undefined
	setFieldMeta: (name: string, updater: (prev: FieldMetaLike) => FieldMetaLike) => void
	setErrorMap: (errorMap: Record<string, unknown>) => void
	validateField: (name: string, cause: typeof SUBMIT) => unknown
	store: { subscribe: (listener: () => void) => { unsubscribe: () => void } }
}

/** One pass's issues: by absolute field path, and the block's own. */
type Outcome = { fields: ReadonlyMap<string, readonly unknown[]>; own: readonly unknown[] }

const EMPTY: Outcome = { fields: new Map(), own: [] }

const blurListeners = new WeakMap<object, Set<(name: string) => void>>()

/** Called by `useForm`'s composed `listeners.onBlur` — TanStack runs it after the field's blur pass. */
export function emitFieldBlur(form: object, name: string): void {
	for (const listener of blurListeners.get(form) ?? []) listener(name)
}
```

Then `createMapGroup`, written to the behaviour below. Keep each function under 50 lines and split
helpers as needed.

- **`value()`:** `Object.fromEntries` of `map` keys to `getFieldValue(path)`.
- **`toOutcome(raw)`:**
  - **Standard schema:** run `standardSchemaValidators.validate({ value, validationSource: FORM_SOURCE }, schema)`,
    or `validateAsync` for the async slots. For the result `{ fields }`: `fields['']` is the block's
    own; every other key becomes `toAbsolute(key)`.
  - **Function result:** `{ fields, group }` (TanStack's global group shape), or a plain value, which
    is the block's own.
  - **`undefined`:** `EMPTY`.
- **`run(cause)`:**
  - Run the sync slots and merge their outcomes into `results[cause]`.
  - If the sync slots reported nothing and async slots exist:
    - abort the previous controller for that cause;
    - wait `onChangeAsyncDebounceMs` / `onBlurAsyncDebounceMs` (0 for submit);
    - run the async slots with `{ value, signal }`;
    - drop the result if aborted;
    - merge.
  - Then `write()`.
  - Returns whether the block is valid for that cause.
- **`write()`:**
  - Union all causes' outcomes.
  - For every path written before or now:
    `setFieldMeta(path, prev => ({ ...prev, errorMap: { ...prev.errorMap, [errorKey]: messages.length ? messages : undefined } }))`,
    only when the value differs by reference. A path never seen gets no meta (`getFieldMeta`
    `undefined`) and is skipped.
  - The form: `setErrorMap({ [errorKey]: own.length ? own : undefined })` when changed.
- **`connect()`:**
  - Register in `group-registry.ts` (`registerMapGroup(form, group)`, returns the unregister).
  - Subscribe to `store`: a changed mapped value (`Object.is` per key against the last snapshot) runs
    `change`.
  - Add a blur listener: a name within any mapped path runs `blur`.
  - Run `mount`.
  - Return the disconnect: unsubscribe, unregister, abort pending async, and write `undefined` under
    `errorKey` on every written path and on the form.
- **`within(scope)`:** every mapped path is within `scope` (`isPathWithin`).
- **`validate()`:** the `ValidatedGroup` member — `run('submit')`.
- **`submit(meta, onGroupSubmit)`:**
  1. Clear in-block server errors: `serverErrorsOf(form)?.clearWhere(name => mapped.some(path => isPathWithin(path, name)))`.
  2. Mark every mounted field within a mapped path touched, and `await validateField(name, SUBMIT)`.
  3. Run `submit`.
  4. Valid if no mapped field's meta has `errors` and `own` is empty. If not valid, focus the block's
     first error (R71), then return.
  5. Otherwise `await onGroupSubmit?.({ value: value(), meta })`.

`group-registry.ts`:

```ts
const mapGroups = new WeakMap<object, Set<ValidatedGroup>>()

/** Register a map group for the submit passes; returns the unregister. */
export function registerMapGroup(form: object, group: ValidatedGroup): () => void {
	const set = mapGroups.get(form) ?? new Set<ValidatedGroup>()
	mapGroups.set(form, set)
	set.add(group)
	return () => {
		set.delete(group)
	}
}
```

`groupsOf` returns the native list followed by `...(mapGroups.get(form) ?? [])`, inside the function
body.

`group.errors` of a map block: `formatOwnErrors([useSelector(form.store, (state) => state.errorMap[errorKey])])`.

`create-form.tsx`, `useForm`, `listeners` also gets:

```tsx
onBlur: (props) => {
	emitFieldBlur(form, props.fieldApi.name)
	tanstackOptions.listeners?.onBlur?.(props)
},
```

`fields/submit.tsx`:

- `selectSubmitState` selects `errorMap: state.errorMap` instead of `errors`; `SubmitState` in
  `bindable-form.ts` gets the same.
- `formErrors` becomes
  `formatOwnErrors([...Object.entries(errorMap).filter(([key]) => !key.startsWith(GROUP_ERROR_KEY_PREFIX)).map(([, value]) => value), ...serverFormErrors])`.

- [ ] **Step 4: `MappedBlock`**

```tsx
function MappedBlock(props: BlockProps): ReactNode {
	const scope = useBlockScope(props)
	const id = useId()
	const lens = scope as unknown as { getFormFieldName: (relative: string) => string }
	const controller = useMemo(
		() =>
			createMapGroup({
				form: props.form as unknown as MapGroupHost,
				map: props.placement.fields as Record<string, string>,
				validators: props.options.validators,
				id,
				toAbsolute: (relative) => lens.getFormFieldName(relative),
			}),
		// `fields` is read on the first render only, as TanStack's group reads it.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- see above
		[props.form, id],
	)
	useEffect(() => controller.connect(), [controller])
	const own = useSelector(
		(props.form as unknown as { store: Parameters<typeof useSelector>[0] }).store,
		(state: { errorMap: Record<string, unknown> }) => state.errorMap[controller.errorKey],
	)
	const { onGroupSubmit } = props.placement
	const group = useMemo(
		() =>
			Object.assign(Object.create(scope) as object, {
				errors: formatOwnErrors([own]),
				handleSubmit: (meta?: unknown) => controller.submit(meta, onGroupSubmit),
			}),
		[scope, own, controller, onGroupSubmit],
	)
	return props.options.render({ ...props.options.props, ...props.placement, group } as never)
}
```

If `react-hooks` refuses the scoped disable, keep `validators` and `fields` in a ref read at run time,
and drop the disable.

- [ ] **Step 5: Run everything this touches**

Run, in order:

1. `pnpm --filter @ez-kit/form-react exec vitest run src/map-group.test.tsx src/group-submit.test.tsx src/field-groups.test.tsx src/submit.test.tsx src/server-errors.test.tsx src/focus-on-error.test.tsx`
2. the package typecheck and `test:react18`
3. `pnpm build --filter=...@ez-kit/form-core`
4. `pnpm --filter @ez-kit/docs exec vitest run test/tree-shaking.test.ts`
5. `pnpm verify:affected`

Expected: PASS. A failure in the helpers marker case is a top-level expression in `map-group.ts` or
`group-registry.ts`; fix the expression, never the test.

- [ ] **Step 6: Changeset and commit**

Append to `.changeset/form-composition-helpers.md`:

```md
A block placed with a field map — `fields={{ password: 'newPassword', confirm: 'newPasswordRepeat' }}`
— validates and submits the same way: its value is assembled from the mapped fields, issues with a
path land on the mapped field, and its own issues are `group.errors`. Those are kept under an
`errorMap` key of the form `onGroup:<id>`, which `form.Submit`'s `formErrors` leaves out.
```

```bash
git add packages/form/react/react/src/map-group.ts packages/form/react/react/src/group-registry.ts packages/form/react/react/src/create-form.tsx packages/form/react/react/src/field-groups.tsx packages/form/react/react/src/fields/submit.tsx packages/form/react/react/src/bindable-form.ts packages/form/react/react/src/map-group.test.tsx apps/docs/test/tree-shaking.test.ts .changeset/form-composition-helpers.md
git commit -m "feat(form): validate and submit a group placed through a field map"
```

---

### Task 7: docs — Composition, the scenario 2 example, e2e

**Files:**

- Modify: `apps/docs/content/docs/form/composition.mdx` (rewrite)
- Modify: `apps/docs/content/docs/form/native-api.mdx` ("Composition helpers" section, l.~133)
- Modify: `packages/form/react/react/README.md` ("Composition" section, l.~84)
- Modify: `apps/docs/content/docs/form/submission.mdx` (group submits and server errors)
- Modify: `apps/docs/shared/form/FormKit.tsx` (`withForm` / `withFieldGroup` delegators, R74)
- Modify: `apps/docs/app/(embed)/examples/{shadcn,heroui}/form-kit-provider.tsx`
- Modify: `apps/docs/shared/form/examples/components/composition.tsx` (rewrite)
- Modify: `apps/docs/shared/form/examples/manifest.json` (a second id, `form-composition-sign-up`)
- Modify: `apps/docs/test/docs-options/page-type-map.ts` (two tables, two `FORM_TYPE` entries)
- Create: `apps/docs/e2e/packages/form/composition.spec.ts`
- Modify: `.changeset/form-docs-stage-2.md`

**Interfaces:** consumes every name Tasks 1–6 produced.

- [ ] **Step 1: `FormKit` delegators**

`FormKit.tsx`: the `FormKit` type gains `withForm: typeof shadcnWithForm` and
`withFieldGroup: typeof shadcnWithFieldGroup` (type imports from `@ez-kit/form-shadcn`). Then:

```tsx
/**
 * The kit's `withFieldGroup`, resolved at render time. A block is declared at module scope in an
 * example, while the kit is only known inside the embed route, so the real block is built on the
 * first render under each kit and cached per kit.
 */
export const withFieldGroup = ((options: Parameters<FormKit['withFieldGroup']>[0]) => {
	const blocks = new WeakMap<FormKit, ComponentType<object>>()
	return function KitFieldGroupBlock(props: object) {
		const kit = useFormKit()
		const Block = blocks.get(kit) ?? (kit.withFieldGroup(options) as unknown as ComponentType<object>)
		blocks.set(kit, Block)
		return <Block {...props} />
	}
}) as FormKit['withFieldGroup']
```

`withForm` is the same with `withForm`. Both providers pass
`{ useForm, Form, SchemaForm, withForm, withFieldGroup }`.

- [ ] **Step 2: The example**

`composition.tsx` — no comments; the kits' `Section`; `Button` from `shared/form/Button`. Check that
`Button` is exported under that name and use whatever `shared/form/examples` already imports.

```tsx
'use client'

import { useState } from 'react'
import { z } from 'zod'

import { Button } from 'shared/form/Button'
import { Form, withFieldGroup, withForm } from 'shared/form/FormKit'

type PasswordPairValues = { password: string; confirm: string }

type Profile = { displayName: string; security: PasswordPairValues }

type SignUp = { login: string; password: string; confirm: string }

type Sent = { to: string; value: unknown }

const MIN_PASSWORD = 8

const passwordPairSchema = z
	.object({ password: z.string().min(MIN_PASSWORD), confirm: z.string() })
	.refine((pair) => pair.password === pair.confirm, { path: ['confirm'], message: 'Passwords do not match' })

const PasswordPair = withFieldGroup({
	defaultValues: { password: '', confirm: '' } as PasswordPairValues,
	validators: { onChange: passwordPairSchema },
	render: ({ group }) => (
		<>
			<group.TextField
				name='password'
				type='password'
				label='Password'
			/>
			<group.TextField
				name='confirm'
				type='password'
				label='Repeat password'
			/>
		</>
	),
})

const PROFILE_DEFAULTS: Profile = { displayName: 'Ann', security: { password: '', confirm: '' } }

export function CompositionExample() {
	const [sent, setSent] = useState<Sent | null>(null)

	return (
		<Form
			defaultValues={PROFILE_DEFAULTS}
			onSubmit={({ value }) => {
				setSent({ to: 'saveProfile', value })
			}}
		>
			{(form) => (
				<>
					<form.TextField
						name='displayName'
						label='Display name'
					/>
					<form.FormGroup
						name='security'
						onGroupSubmit={({ value }) => {
							setSent({ to: 'changePassword', value })
						}}
					>
						{(group) => (
							<form.Section title='Password'>
								<PasswordPair fields='security' />
								<Button onClick={() => void group.handleSubmit()}>Change password</Button>
							</form.Section>
						)}
					</form.FormGroup>
					<form.SubmitButton>Save profile</form.SubmitButton>
					<pre>{JSON.stringify(sent, null, 2)}</pre>
				</>
			)}
		</Form>
	)
}

const SIGN_UP_DEFAULTS: SignUp = { login: '', password: '', confirm: '' }

const LoginPart = withForm({
	defaultValues: SIGN_UP_DEFAULTS,
	render: ({ form }) => (
		<form.TextField
			name='login'
			label='Login'
		/>
	),
})

export function CompositionSignUpExample() {
	const [sent, setSent] = useState<Sent | null>(null)

	return (
		<Form
			defaultValues={SIGN_UP_DEFAULTS}
			validators={{ onSubmit: z.object({ login: z.string().min(3) }) }}
			onSubmit={({ value }) => {
				setSent({ to: 'signUp', value })
			}}
		>
			{(form) => (
				<>
					<LoginPart />
					<PasswordPair fields={{ password: 'password', confirm: 'confirm' }} />
					<form.SubmitButton>Sign up</form.SubmitButton>
					<pre>{JSON.stringify(sent, null, 2)}</pre>
				</>
			)}
		</Form>
	)
}
```

`manifest.json` adds the second example:

```json
{
	"id": "form-composition-sign-up",
	"label": "Form composition — sign-up",
	"group": "form",
	"groupLabel": "Form",
	"sourceFile": "components/composition.tsx",
	"exportName": "CompositionSignUpExample"
}
```

The file is already in `registry.ts`; nothing to add there.

- [ ] **Step 3: `composition.mdx`**

Rewrite it. Keep the frontmatter, updating the description: "withForm, withFieldGroup and
form.FormGroup — which one a part of a form needs, and what each brings." The sections:

1. **Opening.** Reusing a whole form needs no helper; the helpers are for reusing a **part**. Then
   §4 scenario 2's table, as written there in English:

   | You need                                                         | Use              |
   | ---------------------------------------------------------------- | ---------------- |
   | to cut **one** large form into files, a part that sees all of it | `withForm`       |
   | one set of fields in **different** forms, with its own rules     | `withFieldGroup` |
   | a branch **inside** a form with its own check and its own "Save" | `form.FormGroup` |

2. **`withForm`.** A part of one form, typed by the whole form's data; no rules of its own.
   - `form` is optional: passed, it is checked at the call site; omitted, the block reads the form
     above it, as a cast like `useFormContext<V>()`; with neither, it throws.
   - Keep the existing "options are required, not decorative" paragraph and "Extra props".
   - Drop "There is no runtime here" and the whole "Why it had to be retyped" subsection's claim of
     zero runtime. Keep one sentence on why the render prop's `form` type is the kit's own.
3. **`withFieldGroup`.**
   - A block written in its own coordinates. `group.TextField name='password'` and every field the
     bundle registered, with names relative to the block.
   - Placement: `fields='security'` or a map; the form from context or the `form` prop.
   - `validators` in the block's coordinates (a schema over the block, one per object). An issue with
     a path lands on the real field; an issue without one is `group.errors`.
   - Its own submit: `group.handleSubmit()` inside the block, `onGroupSubmit` where it is placed,
     `value` typed by the block. It does not submit the form. **Breaking** note.
   - The `<KitExample exampleId='form-composition-sign-up' />` (the `PasswordPair` from scenario 2,
     with a map).
   - An option table **"`withFieldGroup` options"**: `defaultValues`, `props`, `validators`, `render`.
   - A table **"Placing a block"**: `form`, `fields`, `onGroupSubmit`.
4. **`form.FormGroup`.**
   - A branch with its own schema and submit.
   - `group.X` relative to `name`, so the group's schema (TanStack hands it `values[name]`) and the
     names share coordinates.
   - `group.errors` holds the group's own messages; `group.state.meta.errors` is TanStack's raw value.
   - The `<KitExample exampleId='form-composition' />` (the profile): "Change password" checks and
     sends only `security`; "Save profile" sends everything and also runs the block.
5. **Coordinates come from the object, not the tree.**
   - `form.X` is absolute — also inside a group — and so are the form's and a step's schemas.
   - `group.X` is relative, and so is the group's schema.
   - The anti-pattern: `form.TextField name='payment.card'` inside `form.FormGroup name='payment'`
     works, but do not write it.
6. **Where a rule goes.**
   - Owned by the block (card format, matching passwords) → the block's `validators`.
   - Depends on the place → `form.FormGroup` or the form schema there.
   - The form schema on `onSubmit` is the last barrier.
   - A whole-form submit also runs every mounted group (R62).
   - One schema on two levels is fine on different triggers (group `onChange` / `onBlur`, form
     `onSubmit`).
7. **Server errors and group submits.** A group submit clears the server errors inside it and keeps
   the rest (R61), and focuses the group's first error.
8. **The two hooks.** `useFieldGroup` / `useFormGroup` as before: no flat fields, with `Field` /
   `NativeField`. `useFormGroup` returns `errors` and the group submit described above.
9. **Components that know about the form.** Keep this whole section, with its subsections, unchanged.
10. **Choosing.** Replace it with the roles from D7's last bullet; mention `form.Step` (stage 6) only
    as "coming", without a link.

Delete the old "That example declares its `form` prop by hand…" paragraph and the
`FormInstance`-prop `AddressBlock` walk-through. Keep one short paragraph on `FormInstance<V>` as a
prop type for a plain component — the "if the block is rendered once" advice.

- [ ] **Step 4: The other pages and the README**

- `native-api.mdx` §"Composition helpers": `withForm` takes its form from context when omitted;
  groups carry the bundle's fields relative to the group. Link to Composition.
- `README.md` "Composition":
  - replace "It is TanStack's helper, retyped" with "the `form` it receives is the instance
    `useForm` returns; omit the prop and it reads the form above it";
  - replace the group paragraph's "carries no flat field components" with the flat fields,
    `validators`, `group.handleSubmit` / `onGroupSubmit`.
- `submission.mdx`, server errors: one bullet — "A group submit (`group.handleSubmit()`) clears only
  the server errors of the fields inside the group; form-level messages and other fields' stay."
- Second sweep (AGENTS.md rule):

  ```bash
  grep -rn -E "no flat field|carries no flat|retyped|zero runtime|There is no runtime|group\.Field. or .group\.NativeField|a group has no idea" apps/docs/content/docs/form packages/form/react/*/README.md
  ```

  Every hit describing the old composition is fixed. `custom-fields.mdx` and the stage 7 items are
  left.

- [ ] **Step 5: Map the tables**

`page-type-map.ts`:

```ts
/** `withFieldGroup`'s options: `defaultValues`, `props`, `validators`, `render`. */
WithFieldGroupOptions: { module: TypeModule.FormReact, name: 'WithFieldGroupOptions', typeArgs: ROW_TYPE_ARGS },
/** Where a block is placed — the checked overload: `form`, `fields`, `onGroupSubmit`. */
FieldGroupPlacementProps: {
	module: TypeModule.FormReact,
	name: 'FieldGroupPlacementProps',
	typeArgs: `<${PROBE_ROW_TYPE_NAME}, ${PROBE_ROW_TYPE_NAME}>`,
},
```

Import `PROBE_ROW_TYPE_NAME` if it is not imported yet. The `FormComposition` entry becomes:

```ts
{
	page: DocPage.FormComposition,
	optionTables: [
		{ heading: '`withFieldGroup` options', roots: [FORM_TYPE.WithFieldGroupOptions], expectedCount: 4 },
		{ heading: 'Placing a block', roots: [FORM_TYPE.FieldGroupPlacementProps], expectedCount: 3 },
	],
	nonOptionTables: [
		{ heading: NO_HEADING, reason: 'Maps a need to the helper that serves it — helper names, not keys.' },
	],
},
```

Use the real heading above the needs table if it has one.

- [ ] **Step 6: e2e**

`apps/docs/e2e/packages/form/composition.spec.ts`:

```ts
import { expect, test } from '../../fixtures'

const PROFILE = 'form-composition'
const SIGN_UP = 'form-composition-sign-up'
const VALID = 'correct horse'
const MISMATCH = 'Passwords do not match'

test.describe('composition — a branch with its own submit', () => {
	test.beforeEach(async ({ form }) => {
		await form.open(PROFILE)
	})

	test('"Change password" checks and sends only the branch', async ({ form, page }) => {
		await page.getByRole('button', { name: 'Change password' }).click()
		expect(await form.submitted()).toBeNull()

		await form.input('security.password').fill(VALID)
		await form.input('security.confirm').fill(VALID)
		await page.getByRole('button', { name: 'Change password' }).click()

		expect(await form.submitted()).toEqual({ to: 'changePassword', value: { password: VALID, confirm: VALID } })
	})

	test('"Save profile" runs the block too', async ({ form, page }) => {
		await page.getByRole('button', { name: 'Save profile' }).click()
		expect(await form.submitted()).toBeNull()
		await expect(form.input('security.password')).toBeFocused()
	})
})

test.describe('composition — a block placed through a field map', () => {
	test('a mismatch shows on the real path and blocks sign-up', async ({ form, page }) => {
		await form.open(SIGN_UP)
		await form.input('login').fill('ann')
		await form.input('password').fill(VALID)
		await form.input('confirm').fill('nope')

		await expect(form.field('confirm')).toContainText(MISMATCH)
		await page.getByRole('button', { name: 'Sign up' }).click()
		expect(await form.submitted()).toBeNull()

		await form.input('confirm').fill(VALID)
		await page.getByRole('button', { name: 'Sign up' }).click()
		expect(await form.submitted()).toEqual({ to: 'signUp', value: { login: 'ann', password: VALID, confirm: VALID } })
	})
})
```

Check that `form.input(path)` finds a `type='password'` input. The fixture reads the control by
`data-field`; adapt only the locator, never the assertion. The kit's `SubmitButton` may be disabled
while the form is invalid; then `click()` waits. Assert `toBeDisabled()` instead and record it.

- [ ] **Step 7: Run the docs checks**

Run, in order:

1. `pnpm build --filter=...@ez-kit/form-core`
2. `pnpm --filter @ez-kit/docs exec vitest run test/docs-option-names.test.ts test/kit-exports-parity.test.ts test/form-package-graph.test.ts test/tree-shaking.test.ts test/examples-registry.test.ts test/example-files.test.ts test/e2e-slots.test.ts`
3. `pnpm --filter @ez-kit/docs typecheck`
4. `pnpm --filter @ez-kit/docs lint`
5. `pnpm --filter @ez-kit/docs build`
6. `CI=1 pnpm --filter @ez-kit/docs exec playwright test --project=shadcn --project=heroui e2e/packages/form/composition.spec.ts`
7. `pnpm verify:affected`

Expected: PASS in both kits.

- [ ] **Step 8: Changeset and commit**

Append to `.changeset/form-docs-stage-2.md`:

```md
Composition is rewritten around the three helpers' roles: `withForm` (a part of one form, form from
context), `withFieldGroup` (a block with its own fields, rules and submit, placed by path or map) and
`form.FormGroup` (a branch with its own check and submit), with live examples of a profile form and a
sign-up form, the coordinates rule and where to put a rule.
```

```bash
git add apps/docs/content/docs/form/composition.mdx apps/docs/content/docs/form/native-api.mdx apps/docs/content/docs/form/submission.mdx packages/form/react/react/README.md apps/docs/shared/form/FormKit.tsx "apps/docs/app/(embed)/examples/shadcn/form-kit-provider.tsx" "apps/docs/app/(embed)/examples/heroui/form-kit-provider.tsx" apps/docs/shared/form/examples/components/composition.tsx apps/docs/shared/form/examples/manifest.json apps/docs/test/docs-options/page-type-map.ts apps/docs/e2e/packages/form/composition.spec.ts .changeset/form-docs-stage-2.md
git commit -m "docs(form): document withForm, withFieldGroup and form.FormGroup by role"
```

---

### Task 8: Stage gate

**Files:** a `package.json` `size-limit` entry, only if R73 requires it.

- [ ] **Step 1: Full gate, sequentially**

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @ez-kit/form-react test:react18
pnpm size
```

Run each as its own command, in this order, and save the output to the ledger. A failure that is only
a timeout, and passes when its package runs alone, is the machine-load artefact `AGENTS.md`
describes: rerun that package.

- [ ] **Step 2: e2e**

Run `pnpm --filter @ez-kit/docs build`, then:

```bash
CI=1 pnpm --filter @ez-kit/docs exec playwright test --project=shadcn --project=heroui --project=docs --grep-invert @smoke
```

Record the counts.

- [ ] **Step 3: Size (R73)**

Retune `form-react`'s main entry by the formula if it is over its limit. Then:

```bash
git add packages/form/react/react/package.json
git commit -m "build(form): retune form-react's size budget for the composition helpers" -m "<measured figure, limit = ceil(measured × 1.15) in 0.5 kB steps>"
```

If the `helpers` entry, either kit or `form-core` moved at all, stop and report — that is a defect
(R73).

- [ ] **Step 4: Spec cross-check**

```bash
grep -rn -E "withFieldGroup|FormGroup|withForm" specs/009-form-composition/design.md | sed -n 1,60p
grep -rn "tanstackWithForm\|does not clear them" packages/form apps/docs/content --include='*.ts' --include='*.tsx' --include='*.mdx' --include='*.md' | grep -v node_modules | grep -v /dist/ | grep -v CHANGELOG
```

The second command must return nothing. For every D7 bullet and every D7 test bullet in §8, name the
test that pins it in the hand-over.

- [ ] **Step 5: Hand over for review**

Report to the user:

- the stage's commits;
- the gate and e2e output;
- the size figures;
- the rulings the implementation bent, with the report lines;
- the outcome of R67's unmeasured point;
- anything this plan got wrong.

Do not start stage 6.

---

## Execution

Run with **superpowers:subagent-driven-development**. One fresh implementer per task; then that task's
reviewers, in parallel; then fixes, before the next task starts. Tasks are strictly sequential: each
consumes the previous ones' names.

**Ledger:** `.superpowers/sdd/2026-10-13-form-composition-stage-5/`, containing:

- `plan-path`;
- `global-constraints.md` — the Global Constraints section above, verbatim;
- `rulings.md` — R60–R76 and the Review Focus, plus every ruling made during execution, numbered from
  R77;
- `progress.md` — a pre-flight scan of every task pair's produces/consumes, then one line per
  dispatch, ruling, deferred minor and completion;
- `task-N-brief.md` and `task-N-report.md`;
- a `review-<base>..<head>.diff` per review.

**Reviewers per task**, chosen by `~/.claude/rules/ecc/common/agents.md` and dispatched in one message:

| Task | `typescript-reviewer` | `react-reviewer`           | `type-design-analyzer`                           | other                                                                                                          |
| ---- | --------------------- | -------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 1    | yes                   | yes                        | —                                                | `silent-failure-hunter` — wrapped core members, swallowed calls                                                |
| 2    | yes                   | —                          | —                                                | —                                                                                                              |
| 3    | yes                   | yes                        | yes — `KitFormBlock` / `KitFormBlockRender`      | —                                                                                                              |
| 4    | yes                   | yes (identity, memo, kits) | yes — `GroupFields`, scopes, placement overloads | —                                                                                                              |
| 5    | yes                   | yes                        | yes — `GroupValidators`, `OnGroupSubmit`         | `silent-failure-hunter` — group submit paths; `a11y-architect` — R71 focus                                     |
| 6    | yes                   | yes                        | —                                                | `silent-failure-hunter` — async aborts, stale keys; `performance-optimizer` — store subscription per keystroke |
| 7    | yes (snippets)        | yes (prose vs behaviour)   | —                                                | `e2e-runner` is not a reviewer; skip                                                                           |
| 8    | —                     | —                          | —                                                | —                                                                                                              |

Each reviewer gets the task brief, the global constraints, the rulings file, the implementer's report
and the diff file, and reviews read-only. After Task 8, one whole-branch review of the stage's range
(`<stage base>..HEAD`) by `code-reviewer` on the most capable model, pointed at the ledger's deferred
minors, before the hand-over.

**Every brief repeats these implementer instructions:**

- TDD — the failing run is evidence in the report.
- Prototype type and TanStack-runtime decisions the plan does not spell out on a throwaway file, and
  delete it.
- An _unmeasured_ ruling that the first RED test contradicts stops the task.
- Run `pnpm verify:affected` between edits.
- `git add` by path; no stash.
- Before writing `apps/docs` Next code, read the guide in `node_modules/next/dist/docs/` first.
