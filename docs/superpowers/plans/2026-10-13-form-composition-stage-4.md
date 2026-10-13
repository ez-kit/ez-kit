# Form composition — stage 4: behaviour

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every form of this package spec 009's behaviour layer — focus on the first error
after a failed submit (D13), server errors with their own clearing rules (D14), a debounced,
length-gated query for searchable option sources (D16), dirty-state recipes (D17) — and document
server actions with a live example and an e2e hydration check (D15).

**Architecture:** Everything lives in `@ez-kit/form-react` behind the instance `useForm` returns, so
the controlled form, the uncontrolled `<Form>`, `<SchemaForm>` and a `FormProvider`-only form get it
from one place. Focus is driven by form state and found in the DOM through `[data-field]` wrappers
that carry the form's id (`data-form-id`, a new member of the kit contract). Server errors are owned
by a small per-instance controller: TanStack's `errorMap.onServer` slot is where a **field** error is
stored (so every kit renders it unchanged), but when it appears, stays and goes is decided by the
controller, because TanStack's own clearing of that slot is inconsistent (measured, R36). Debounce
and the minimum query length sit between the kit's query and the source's hook in
`options/field-options.tsx`.

**Tech Stack:** pnpm + Turborepo, TypeScript 5.9 (`strict`, `exactOptionalPropertyTypes`,
`noUncheckedIndexedAccess`), React 18/19, TanStack Form 1.33.2 (`@tanstack/store` 0.11), tsup,
Vitest + Testing Library (first fake-timer tests in the form packages), Next.js 16.3 docs app,
Playwright, changesets.

**Spec:** `specs/009-form-composition/design.md` — D13, D14, D15, D16, D17; §8 bullets "Поведение",
"Оба кита, React 18 и 19"; §7 (nothing in it is new here). Stage 3 plan for the conventions and
R16–R24: `docs/superpowers/plans/2026-10-12-form-composition-stage-3.md`. Stage 3 ledger for R25–R32:
`.superpowers/sdd/2026-10-12-form-composition-stage-3/progress.md` (git-ignored; the rulings that
matter here are restated below).

## Stages of spec 009

All stages land on branch `form-check` in **one PR into `develop`**; the user reviews after each
stage, nothing is merged or pushed between stages.

1. Graph and names — **done**.
2. Factory and context — **done**.
3. Field primitives — **done** (`form.Field`, `form.NativeField`, the binding seam, own group APIs,
   `useFormContext<TValues>()`).
4. **Behaviour** (this plan): D13, D14, D16, D17, D15.
5. Composition: D7 (flat `group.X`, group `validators` / submit, `withForm` form from context).
6. Steps: D18 and the schema wizard on `form.Steps`.
7. Docs sweep: `custom-fields.mdx`, second pass over stale claims (incl. the stage 3 leftovers:
   `index.mdx:8` / `basic-concepts.mdx:22` "nothing is wrapped/hidden", `arrays/api.mdx` entry
   tables).

## Global Constraints

- Code, comments, docblocks, commit messages: English. No agent attribution anywhere in git
  (`AGENTS.md`): no `Co-Authored-By`, no Claude/agent/session mention, even if a harness asks.
  Conventional Commits; commit body lines ≤ 100 characters (commitlint); pre-commit runs Prettier +
  ESLint on staged files; `--max-warnings=0`; never `--no-verify`.
- Type imports use `import type`; `import/order` is enforced (value imports: packages, blank line,
  relative; type imports after them: relative, then `@…` packages, then `react`); inline
  `import('…')` type annotations are forbidden; `require-await` is on;
  `@typescript-eslint/no-unnecessary-type-parameters` rejects a type parameter used once.
- Closed sets are a `const` object plus a same-named union, never a TS `enum`; no magic literals —
  a meaningful number or string is a named `UPPER_SNAKE_CASE` constant (`.claude/rules/typescript/coding-style.md`).
- A negative type test never reads a member of an error-typed value: assert absence with
  `expectTypeOf<…>().not.toHaveProperty('…')`, or put `// @ts-expect-error -- <reason>` on the
  offending **attribute** line of a multi-line JSX element.
- Every breaking change is a **minor** bump in each package it touches (pre-1.0). A changeset names
  only the packages whose source the task changed (R12). A still-pending changeset that a task makes
  wrong is edited in place; a new one is created only when no pending one covers the change.
  `@ez-kit/docs` changes go into the pending `.changeset/form-docs-stage-2.md`.
- Between edits run `pnpm verify:affected` (if it selects nothing after a commit, run
  `pnpm turbo run lint typecheck test --filter='...[HEAD~1]' --concurrency=2`). Only the last task
  runs the full gate — `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm size`, plus
  `pnpm --filter @ez-kit/form-react test:react18` — **sequentially**, each its own command.
- Docs tests read **built** packages: `pnpm build --filter=...@ez-kit/form-core` before
  `pnpm --filter @ez-kit/docs exec vitest run <files>`. `expectTypeOf` / `@ts-expect-error` are
  enforced by `pnpm --filter <pkg> typecheck`, not by vitest at runtime.
- Both kits keep identical value and type exports (`apps/docs/test/kit-exports-parity.test.ts`); a
  kit's built `.d.ts` names neither `@tanstack/*` nor `@ez-kit/form-core`
  (`apps/docs/test/form-package-graph.test.ts`).
- Every runtime behaviour is tested through the test kit in `form-react` **and**, where a kit renders
  something new (`data-form-id`, the min-length hint), in **both** kits' own suites. A docs-app or
  e2e case is written for both kits.
- `form.Field` and every registered field take only `validate`; TanStack `validators` exist only on
  `form.NativeField`, the form and groups (user decision, R18/R22). Nothing here adds `validators` to
  a bound field.
- Do not touch: `specs/`, any `CHANGELOG.md`, `packages/form/react/shadcn/src/components/ui/**`,
  `docs/superpowers/plans/` other than this file, and the user's uncommitted edits under
  `.agents/skills/openspec-*` and `.claude/{skills,commands}/opsx*` — never stage them (`git add`
  named paths only, never `-A`).
- Docs examples (`apps/docs/shared/form/examples/**`) are shown verbatim: no internal comments.
- Before writing any Next.js code in `apps/docs`, read the relevant guide under
  `apps/docs/node_modules/next/dist/docs/` (`apps/docs/AGENTS.md`: this Next has breaking changes).
- No `git stash` (shared across worktrees), no `pnpm up -r`, never push, never merge.
- Type decisions the plan does not spell out are prototyped with `tsc` on a throwaway file in the
  package's `src` (deleted afterwards); runtime assumptions about TanStack with a throwaway vitest file
  (deleted afterwards). Both are recorded in the task report.
- Rulings R1–R32 (stage 2 and 3 plans and ledgers) and R33–R47 below are binding.

## Rulings carried into this plan

Each settles something the spec leaves open. The runtime ones were measured on TanStack Form 1.33.2
with throwaway vitest files on `FormApi` / `FieldApi` (deleted), the rest by reading the sources.

- **R33 — the focus target is found from form state, scoped by `data-form-id`.** `FieldRenderProps`
  gains `'data-form-id': string` (the instance's `form.formId`, React's `useId` unless the author
  passes `formId`), and every element that carries `data-field` carries it too — in both kits, the
  array wrappers and the test kit. After an invalid submit the package walks
  `document.querySelectorAll('[data-field]')` in DOM order, keeps the wrappers whose own
  `data-form-id` equals the form's id, and takes the first whose field has errors
  (`form.getFieldMeta(name)?.errors.length > 0`). Always the document, filtered by id — a form inside
  a `<form>` and one under `FormProvider` alone take the same path, and two forms with the same field
  names never cross. _Cost if wrong:_ a custom kit that picks props instead of spreading them must add
  one attribute, or its fields are skipped by focus (documented in `custom-kit.mdx`).
- **R34 — inside the wrapper: the element with the field's `id`, if focusable; else the first
  focusable descendant; else the wrapper itself if focusable.** The `id` element is looked up by
  comparing `element.id` (no `CSS.escape`: names hold `.` and `[`; jsdom lacks `CSS.escape`). The
  shadcn radio group and slider, and the HeroUI checkbox / switch / radio group / slider / date roots,
  put `id` on a non-focusable container (measured in the stage 4 survey), which is exactly what the
  fallback is for. `form.Field`'s author control spreads the props onto the control itself, so the
  wrapper _is_ the control. _Cost if wrong:_ a field whose first focusable descendant is not its main
  control (a "clear" button before the input) gets focus on that button.
- **R35 — `focusOnError` lives in `useForm`, which wraps the author's `onSubmitInvalid`.** Every path
  — controlled `useForm`, uncontrolled `<Form>` / `<SchemaForm>` (their props reach the bundle's
  `useForm`), `FormProvider` without `<form>` — goes through it. TanStack calls `onSubmitInvalid` on
  every invalid exit of `handleSubmit`, synchronously, after the fields were marked touched; the
  package focuses first, then calls the author's callback (D13). The fields' DOM exists at that point
  (the re-render that shows the messages has not committed yet, which focus does not need).
  _Cost if wrong:_ none known; TanStack's own exits are the only invalid paths.
- **R36 — the server-errors semantics are owned by the package; `errorMap.onServer` is only storage
  for field errors.** Measured: with no field validator, TanStack never clears a field's
  `onServer` (not on change, blur or submit); with a field validator, it clears it on **blur** too
  (a focused-then-left field would lose the message the user was just sent to); a first submit with a
  server error exits before validation and clears nothing; a form-level `onServer` is cleared by **any**
  field's change. So a per-instance controller (`server-errors.ts`) holds the truth and re-asserts it
  into the slot after every store change: a field's error goes when its value first differs
  (`Object.is`) from the value it had when the errors were applied, and never comes back for that
  value; every server error goes when `form.handleSubmit` or `form.reset` is called — the controller
  wraps both members on the instance, idempotently. _Cost if wrong:_ a change that does not alter the
  value (typing a character and deleting it before the next store update) does not count as a change.
- **R37 — form-level server errors are not stored in `errorMap`.** A form-level `onServer` makes
  `isValid` false, hence `canSubmit` false, hence both kits' `SubmitButton` disabled — and under D14's
  rule only a submit clears it: a dead end. The controller keeps form-level messages itself and
  `form.Submit` merges them into `formErrors` (subscribed through `useSyncExternalStore`). Field errors
  do block `canSubmit` until the field is edited — that is the point of a field error, and TanStack's
  own submit-validator errors behave the same. This deviates from D14's "Хранение" line for the
  form part only; `specs/` is not edited. _Cost if wrong:_ an app reading `form.state.errorMap.onServer`
  for the form message finds nothing — it reads `formErrors` from `form.Submit`.
- **R38 — applying server errors marks the named fields touched.** The display rule hides errors on
  untouched fields; server errors applied on mount (a server-rendered page, `useActionState`'s first
  state) would otherwise be invisible while focus goes to them. _Cost if wrong:_ a field gets
  `isTouched` without user interaction.
- **R39 — `serverErrors` is a `useForm` option.** The uncontrolled `<Form>` and `<SchemaForm>` take it
  as a prop because their props _are_ `useForm` options (`FORM_OPTION_KEYS`); a controlled
  `<Form form={…}>` / `<SchemaForm form={…}>` does not take it — the author passes it to their own
  `useForm`, one source. `form.setServerErrors(errors)` is the imperative entry and the same
  mechanism. Applied in an effect when the option's **reference** changes (and on mount if defined);
  focus follows when `focusOnError` is on. _Cost if wrong:_ a controlled-mode author looking for the
  prop on `<Form>` gets a type error pointing at `useForm`.
- **R40 — `setServerErrors` is a reserved instance key** (`RESERVED_FORM_KEYS`, `// this package`). A
  field or component registered under it is rejected like every other member name.
- **R41 — a field named in `serverErrors.fields` that is not mounted** keeps its entry in the
  controller and its meta in TanStack (`setFieldMeta` creates it); it shows when the field mounts and
  goes by the same rules. Nothing focuses it while it is unmounted. _Cost if wrong:_ none beyond what
  the rule says.
- **R42 — debounce and min length (D16).** `SearchableOptionSource` gains `debounce?: number` and
  `minLength?: number`; a searchable field's `searchable` becomes `boolean | { debounce?: number;
minLength?: number }` in TSX and in a schema node (scalar-or-object). Effective values: field over
  source over default — remote source `debounce: 300`, `minLength: 0`; an in-memory (`options=`)
  searchable list `debounce: 0`, `minLength: 0`, and it honours a field-level object too. The kit
  receives the typed text at once (`search.query`) and two new members, `search.minLength` and
  `search.belowMinLength`. The source's hooks receive the **debounced** query; while the typed text is
  shorter than `minLength` they receive `query: undefined` ("no search") and the listed options are
  dropped (the selected ones stay, so a chosen label never disappears); the creatable row keeps using
  the immediate text. `loading` is also true while a debounce is pending. `debounce: 0` is synchronous
  — no timer, so every existing test keeps its timing. _Cost if wrong:_ a source author who fetched on
  `query === undefined` fetches once more than needed (documented).
- **R43 — D15's hydration check needs a server-rendered route.** Every docs example renders through
  `next/dynamic({ ssr: false })` (`apps/docs/components/example-renderer.tsx`), so nothing a form
  example renders today is server-rendered and no hydration mismatch can show. Task 9 adds a route
  outside `(embed)/examples/*/[slug]` that renders the server-actions example through the normal
  server path, per kit, and an e2e spec that loads it in both kits and asserts no `pageerror` and no
  console error (React 19 reports hydration mismatches as console errors). _Cost if wrong:_ one extra
  route in the docs app.
- **R44 — the live server action is real and stateless.** A `'use server'` module in the docs app
  validates the payload on the server with `@ez-kit/form-core` and returns `serverErrors`-shaped data
  (e.g. a reserved username); nothing is persisted. `next.config.mjs` has no `output: 'export'`, so
  actions run on Vercel and under `next start`. _Cost if wrong:_ none.
- **R45 — `data-form-id` is a kit-contract addition and therefore a minor bump in both kits.** A
  custom kit that spreads `FieldRenderProps` onto its wrapper gets it for free; one that picks props
  does not, and loses focus-on-error until it adds it.
- **R46 — D17 stays recipes plus tests.** `form.Submit` already hands over `isDirty` (stage 2). This
  stage pins the documented recipes with tests (save-then-`reset(value)`, async `defaultValues` while
  untouched, the kits' `SubmitButton` not blocking on `isDirty`) and corrects the docs where a test
  disproves them — the stage 4 survey suspects that `formApi.update(opts)` on the next render resets
  `this.options.defaultValues`, undoing the baseline `reset(values)` set. _Cost if wrong:_ none.
- **R47 — size.** `form-react` is at 10.05 / 12 kB and its `helpers` entry at 494 / 570 B. This stage
  adds the focus walk, the server-errors controller and the query gate (estimated +1.0–1.5 kB gz) and
  adds a hint and an attribute to each kit. Task 10 measures. Any entry that exceeds its limit is
  retuned to `ceil(measured × 1.15)` — 0.5 kB steps for kB limits, 10 B steps for byte limits — **for
  the packages this stage changes** (`form-react`, `form-shadcn`, `form-heroui`), with the figures in the
  commit body. The `helpers` entry must not move at all (nothing here is reachable from it); if it
  does, that is a defect, not a retune.

## Review Focus

1. **Two forms on one page with the same field names**, one of them under `FormProvider` with no
   `<form>`. Expected: an invalid submit of either focuses its own first error, never the other
   form's field of the same name. Pinned in Task 3.
2. **A field with a server error that the user tabs into and out of without typing** (the focus from
   D13 puts them there). Expected: the message stays; typing one character removes it; deleting that
   character again does not bring it back. Pinned in Task 4.
3. **A form-level server error with a kit `SubmitButton`.** Expected: the button stays enabled, the
   message is in `form.Submit`'s `formErrors`, and pressing the button clears it before the new
   submission runs. Pinned in Tasks 4 and 5.
4. **Fast typing into a remote searchable select with `minLength: 2`, then clearing it, while a value
   is selected.** Expected: the source never sees a one-character query, sees at most one query per
   pause, the selected option's label stays visible, the hint replaces "No matches" while below the
   minimum, and the "Add …" row of a creatable field follows the typed text at once. Pinned in Tasks 7
   and 8.
5. **A form rendered on the server and hydrated** (the server-actions example). Expected: no React
   hydration error in either kit — `data-form-id` comes from `useId` and must match. Pinned in Task 9.

---

### Task 1: D17 — pin the dirty-state recipes

**Files:**

- Test: create `packages/form/react/react/src/dirty-state.test.tsx`
- Modify: `packages/form/react/shadcn/src/submit-button.test.tsx` and
  `packages/form/react/heroui/src/submit-button.test.tsx` (find the kits' existing `SubmitButton`
  tests with `grep -rln "SubmitButton" packages/form/react/{shadcn,heroui}/src --include='*.test.tsx'`
  and add the case there; if neither kit has one, create the two files above)
- Modify: `apps/docs/content/docs/form/submission.mdx` (only if a test disproves a sentence; plus the
  `beforeunload` recipe)
- Modify: `.changeset/form-docs-stage-2.md`

**Interfaces:** none produced. Consumes `form.Submit`'s `isDirty` (stage 2).

- [ ] **Step 1: Write the tests**

`dirty-state.test.tsx` — through the test kit:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { ReactNode } from 'react'

const { Form, useForm } = createForm({ FormElement: testFormElement, fields: testFields, components: testComponents })

describe('dirty state recipes', () => {
	it('is clean again after reset(value) in onSubmit, and stays clean across re-renders', async () => {
		const user = userEvent.setup()
		function Editor(): ReactNode {
			const [, force] = useState(0)
			const form = useForm({
				defaultValues: { name: 'Ann' },
				onSubmit: ({ value, formApi }) => {
					formApi.reset(value)
				},
			})
			return (
				<Form form={form}>
					<form.TextField
						name='name'
						label='Name'
					/>
					<form.Submit>{({ isDirty }) => <output aria-label='dirty'>{String(isDirty)}</output>}</form.Submit>
					<form.Subscribe selector={(state) => state.isDefaultValue}>
						{(isDefault) => <output aria-label='default'>{String(isDefault)}</output>}
					</form.Subscribe>
					<form.SubmitButton>Save</form.SubmitButton>
					<button
						type='button'
						onClick={() => {
							force((n) => n + 1)
						}}
					>
						Re-render
					</button>
				</Form>
			)
		}
		render(<Editor />)

		await user.type(screen.getByLabelText('Name'), 'a')
		expect(screen.getByLabelText('dirty')).toHaveTextContent('true')
		await user.click(screen.getByRole('button', { name: 'Save' }))
		await waitFor(() => {
			expect(screen.getByLabelText('dirty')).toHaveTextContent('false')
		})
		await user.click(screen.getByRole('button', { name: 'Re-render' }))
		expect(screen.getByLabelText('dirty')).toHaveTextContent('false')
		expect(screen.getByLabelText('Name')).toHaveValue('Anna')
		// Record what isDefaultValue reads now — see Step 3.
		expect(screen.getByLabelText('default')).toHaveTextContent(/true|false/)
	})

	it('takes late defaultValues while untouched, and not after the user typed', async () => {
		const user = userEvent.setup()
		function Late({ loaded }: { loaded: string }): ReactNode {
			return (
				<Form defaultValues={{ name: loaded }}>
					{(form) => (
						<form.TextField
							name='name'
							label='Name'
						/>
					)}
				</Form>
			)
		}
		const { rerender } = render(<Late loaded='' />)
		rerender(<Late loaded='Ann' />)
		await waitFor(() => {
			expect(screen.getByLabelText('Name')).toHaveValue('Ann')
		})
		await user.type(screen.getByLabelText('Name'), 'x')
		rerender(<Late loaded='Bob' />)
		expect(screen.getByLabelText('Name')).toHaveValue('Annx')
	})
})
```

The last assertion of the first case is deliberately loose: Step 3 replaces it with the measured
value (`'true'` or `'false'`) and adjusts the docs accordingly.

Each kit: a case that renders the kit's `Form` with `defaultValues` and its `SubmitButton`, and
asserts the button is **enabled** before any interaction (`expect(button).toBeEnabled()` /
`not.toHaveAttribute('aria-disabled', 'true')` for HeroUI, whichever the kit's existing tests use) —
D17: the kit's button does not block on `isDirty`.

- [ ] **Step 2: Run them**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/dirty-state.test.tsx` and the two kit test
files. These pin existing behaviour, so they may pass at once; a recipe the docs promise that fails
here is the finding this task exists for. Record the outcome either way in the report (this is the
task's RED/GREEN evidence).

- [ ] **Step 3: Settle the docs against the measurement**

Read `form.state.isDefaultValue` after the forced re-render in case 1 and write the measured value into
the assertion. Then `submission.mdx`, section "Initial values that arrive late":

- if `isDefaultValue` reads `false` after the re-render, the sentence "It replaces both the values and
  the defaults the form compares against, so the form is pristine again rather than dirty against a
  stale baseline" is wrong for `isDefaultValue` (TanStack re-applies the options it was rendered with):
  rewrite it to say that `reset(value)` makes `isDirty` false and the values the saved ones, and that
  `isDefaultValue` compares against the `defaultValues` option — pass the saved value back as
  `defaultValues` (state) when that comparison must follow the save;
- if it reads `true`, leave the sentence.

Add a short subsection **"Warn before leaving with unsaved changes"** after it: a `useEffect` that adds
a `beforeunload` listener while `isDirty` is true (read through `form.Subscribe` or `form.Submit`) and
removes it otherwise; one sentence that router navigation is the router's business (D17: no shared
hook). Code in TSX, no internal comments needed in mdx snippets beyond what the page already does.

- [ ] **Step 4: Run and commit**

Run: `pnpm verify:affected`. Append to `.changeset/form-docs-stage-2.md`:

```md
Submission documents the dirty-state recipes: resetting after a save, late initial values and a
`beforeunload` warning while the form is dirty.
```

```bash
git add packages/form/react/react/src/dirty-state.test.tsx <the two kit test files> apps/docs/content/docs/form/submission.mdx .changeset/form-docs-stage-2.md
git commit -m "test(form): pin the dirty-state recipes the docs describe"
```

---

### Task 2: `data-form-id` on every field wrapper

**Files:**

- Modify: `packages/form/react/react/src/contract.ts` (`FieldRenderProps`)
- Modify: `packages/form/react/react/src/bindable-form.ts` (`BoundFieldApi.form`)
- Modify: `packages/form/react/react/src/field-render-props.ts` (`fieldRenderProps`)
- Modify: `packages/form/react/react/src/fields/array-field.tsx` (the array wrapper's render props)
- Modify: `packages/form/react/react/src/test-kit.tsx` (every element that carries `data-field`)
- Modify: both kits — every element that carries `data-field`: `shadcn/src/blocks/field-shell.tsx`
  and its callers in `blocks/*.tsx`, `shadcn/src/blocks/array.tsx`; `heroui/src/blocks/field-state.ts`
  (`fieldRoot`), `heroui/src/blocks/fields.tsx` (the slider), `heroui/src/blocks/array.tsx`
- Modify: `apps/docs/test/docs-options/page-type-map.ts` (`FieldControlProps` table count 13 → 14)
  and `apps/docs/content/docs/form/native-api.mdx` (the render-prop table gains a row);
  `apps/docs/content/docs/form/custom-kit.mdx` (the contract list)
- Test: create `packages/form/react/react/src/form-id.test.tsx`,
  `packages/form/react/shadcn/src/form-id.test.tsx`, `packages/form/react/heroui/src/form-id.test.tsx`
- Create: `.changeset/form-behaviour.md`

**Interfaces:**

- Produces: `FieldRenderProps['data-form-id']: string` — the form's `formId`; therefore also on
  `FieldControlProps` (`form.Field`) and every kit field's render props.
- Produces: `BoundFieldApi` gains `form: { formId: string }` (TanStack's `FieldApi.form` is the core
  `FormApi`, whose `formId` getter exists in 1.33.2, `FormApi.d.ts:372`).
- Every DOM element that has a `data-field` attribute has a `data-form-id` attribute with the same
  form's id — the invariant Task 3 relies on.

- [ ] **Step 1: Write the failing tests**

`form-id.test.tsx` (form-react, test kit): render one `Form` with **every** test-kit field kind plus a
`form.ArrayField` with one entry and a `form.Field` whose author control spreads the rest of the
render props onto an `<input>`; render a second `Form` beside it with one `TextField` of the same name.
Assert:

```tsx
const wrappers = [...document.querySelectorAll('[data-field]')]
expect(wrappers.length).toBeGreaterThan(10)
for (const wrapper of wrappers) {
	expect(wrapper.getAttribute('data-form-id')).not.toBeNull()
}
const ids = new Set(wrappers.map((wrapper) => wrapper.getAttribute('data-form-id')))
expect(ids.size).toBe(2)
```

and that `form.Field`'s render prop object contains `'data-form-id': form.formId` (capture the instance
through the uncontrolled render prop, `expect.objectContaining`).

The two kit `form-id.test.tsx`: the same "every `[data-field]` carries `data-form-id`" assertion over
each kit's prebuilt `Form` rendering every field kind the kit registers (`allFormFields`) and one
`ArrayField` entry. Reuse the field-kind fixture the kit's existing "renders every field" test uses
(grep `allFormFields` in the kit's tests) rather than writing a new one.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/form-id.test.tsx`, then each kit's
`form-id.test.tsx`. Expected: FAIL — no element carries `data-form-id`.

- [ ] **Step 3: Contract and props**

`contract.ts`, in `FieldRenderProps` after `'data-field-type'`:

```ts
	/**
	 * The id of the form this field belongs to; spread onto the kit's root beside `data-field`.
	 * Focus-on-error walks `[data-field]` wrappers in DOM order and keeps only the ones whose
	 * `data-form-id` is the submitting form's, so two forms on one page — or a form whose fields
	 * sit under `FormProvider` with no `<form>` element — never reach into each other.
	 */
	'data-form-id': string
```

`bindable-form.ts`, `BoundFieldApi`: add `form: { formId: string }` with a one-line docblock (TanStack's
core `FormApi.formId`).

`field-render-props.ts`, `fieldRenderProps` return object: `'data-form-id': field.form.formId,` after
`'data-field-type'`. `fields/array-field.tsx`: wherever the array wrapper's props set `'data-field'`,
add `'data-form-id'` from the form instance the array field already holds (`form.formId`; widen the
local type if needed).

- [ ] **Step 4: Kits and the test kit**

Put `data-form-id` on every element that has `data-field`:

- test kit: every `data-field={…}` site gains `data-form-id={props['data-form-id']}` (or the spread
  already covers it — check each).
- shadcn: `FieldShell` spreads `...data` onto `<Field>`; make sure the callers pass `data-form-id`
  through (they pass the render props' data members — add it where they pick); `blocks/array.tsx`
  likewise.
- heroui: `fieldRoot()` picks `'data-field' | 'data-field-type'` — add `'data-form-id'` to the `Pick`
  and the return type; the slider (`fields.tsx` ~299-310) and `blocks/array.tsx` destructure
  `data-field` by hand — add `data-form-id` beside it.

Run `grep -rn "data-field=" packages/form/react/*/src --include='*.tsx' | grep -v test` afterwards: every
hit must have a `data-form-id` neighbour (or come from a spread that carries it).

- [ ] **Step 5: Docs tables**

`native-api.mdx`, the `form.Field` render-prop table: add a row `` `data-form-id` `` — "The form's id;
spread it with `data-field` so focus-on-error can find this control." `page-type-map.ts`: the
`FieldControlProps` entry's `expectedCount` 13 → 14 (and its comment's arithmetic). `custom-kit.mdx`:
where the contract lists the `data-*` members a kit spreads on its root, add `data-form-id` and one
sentence on why (R33/R45).

- [ ] **Step 6: Run the tests and the packages**

Run the three `form-id.test.tsx` files, `pnpm --filter @ez-kit/form-react typecheck`, then
`pnpm build --filter=...@ez-kit/form-core` and
`pnpm --filter @ez-kit/docs exec vitest run test/docs-option-names.test.ts test/kit-exports-parity.test.ts test/e2e-slots.test.ts`,
then `pnpm verify:affected`. Expected: PASS.

- [ ] **Step 7: Changeset and commit**

`.changeset/form-behaviour.md` (Tasks 3–8 extend it):

```md
---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

**Kit contract:** every field's render props carry `data-form-id`, the id of the form the field
belongs to, and a kit spreads it onto the same element as `data-field`. Both kits do; a custom kit
that picks its props rather than spreading them must add it, or focus-on-error skips its fields.
`form.Field` hands it over too.
```

```bash
git add packages/form/react/react/src/contract.ts packages/form/react/react/src/bindable-form.ts packages/form/react/react/src/field-render-props.ts packages/form/react/react/src/fields/array-field.tsx packages/form/react/react/src/test-kit.tsx packages/form/react/react/src/form-id.test.tsx packages/form/react/shadcn/src packages/form/react/heroui/src apps/docs/test/docs-options/page-type-map.ts apps/docs/content/docs/form/native-api.mdx apps/docs/content/docs/form/custom-kit.mdx .changeset/form-behaviour.md
git commit -m "feat(form)!: stamp every field wrapper with its form's id"
```

(Check `git status --short packages/form/react/shadcn/src packages/form/react/heroui/src` first: only
this task's files may be in it.)

---

### Task 3: D13 — focus on the first error

**Files:**

- Create: `packages/form/react/react/src/focus-first-error.ts`
- Create: `packages/form/react/react/src/form-behaviour.ts` (`FormBehaviourOptions`, the option-key set)
- Modify: `packages/form/react/react/src/create-form.tsx` (`useForm` takes and strips the option,
  wraps `onSubmitInvalid`)
- Modify: `packages/form/react/react/src/form-options.ts` (`FORM_OPTION_KEYS` covers the package's own
  option keys)
- Modify: `packages/form/react/react/src/form-props.ts`, `packages/form/react/react/src/schema/schema-form.tsx`
  (uncontrolled props accept `FormBehaviourOptions`)
- Modify: `packages/form/react/react/src/index.ts` (export the types), both kits' `src/index.ts`
- Test: create `packages/form/react/react/src/focus-on-error.test.tsx`
- Modify: `.changeset/form-behaviour.md`

**Interfaces:**

- Consumes: `data-form-id` on every `[data-field]` element (Task 2).
- Produces (`focus-first-error.ts`, internal):
  `function focusFirstError(formId: string, hasErrors: (name: string) => boolean, root?: ParentNode): boolean`
  — returns whether something was focused.
- Produces (`form-behaviour.ts`, exported from `index.ts` and both kits):
  `type FormBehaviourOptions = { focusOnError?: boolean }` (Task 5 makes it generic over the form
  data and adds `serverErrors`)
  and the internal `const BEHAVIOUR_OPTION_KEYS: Record<keyof FormBehaviourOptions<unknown>, true>`.
- `useForm(options)` accepts `FormOptions<…12> & FormBehaviourOptions<TFormData>`; uncontrolled
  `<Form>` / `<SchemaForm>` accept the same keys as props.

- [ ] **Step 1: Write the failing tests**

`focus-on-error.test.tsx` — through the test kit; the bundle registers `testFields` (Task 2's
`data-form-id` already on them):

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { createSchemaForm } from './create-schema-form'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { FormSchema } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

const { Form, FormProvider, useForm } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

const REQUIRED = { required: true } as const
```

Cases (each asserts `document.activeElement`):

1. **First in DOM order, not in registration order.** `Form` with `TextField name='b' validate={REQUIRED}`
   rendered **above** `TextField name='a' validate={REQUIRED}`, default values `{ a: '', b: '' }`;
   click the submit button → `document.activeElement` is the input labelled `b`.
2. **A valid field before an invalid one is skipped.** `a` filled, `b` empty → focus on `b`.
3. **Fallback to the first focusable descendant.** A `form.Field name='choice' validate={REQUIRED}` whose
   author markup is `<div {...{ 'data-field': field['data-field'], 'data-form-id': field['data-form-id'] }} id={field.id}><button type='button'>A</button><button type='button'>B</button></div>`
   (the `id` on a non-focusable `div`, like the shadcn radio group) → focus on button `A`.
4. **`onSubmitInvalid` runs after the focus.** `onSubmitInvalid={() => { seen.push(document.activeElement) }}`
   → `seen[0]` is the invalid input.
5. **`focusOnError={false}`** on the uncontrolled `<Form>` → `document.activeElement` stays on the
   submit button (`toBe(button)`) and `onSubmitInvalid` still runs; and the attribute never reaches the
   DOM: `screen.getByRole('form'...)`/the `<form>` element has no `focusoneerror`/`focusOnError`
   attribute (`expect(formElement.hasAttribute('focusOnError')).toBe(false)`; pick the element via
   `container.querySelector('form')`).
6. **Two forms, same names (Review Focus 1).** Form A (`<Form>`) and form B (`useForm` + `FormProvider`,
   no `<form>`, submitted by a button calling `form.handleSubmit()`), both with `TextField name='email'
validate={REQUIRED}`, A above B. Submit B → focus is B's input (`getAllByLabelText('Email')[1]`);
   submit A → A's input.
7. **Controlled form and SchemaForm.** A controlled `useForm` + `<Form form={form}>` focuses; an
   uncontrolled `SchemaForm` from `createSchemaForm({ FormElement: testFormElement, fields: testFields })`
   with a required text node (`validate: { required: true }` in the node; check the schema type in
   `@ez-kit/form-core` `schema.ts` for the exact key) focuses its input.
8. **Form-level error only** (`validators={{ onSubmit: () => 'Nope' }}` with no field errors) → nothing
   is focused by the package (`activeElement` stays the button) and no error is thrown.

Type case (in the same file, never rendered): `useForm({ defaultValues: { a: '' }, focusOnError: false })`
compiles; `// @ts-expect-error -- not a boolean` on `focusOnError: 'no'`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/focus-on-error.test.tsx` and
`pnpm --filter @ez-kit/form-react typecheck`. Expected: FAIL — focus stays on the button; `focusOnError`
is not an accepted option (and in uncontrolled mode it lands on the `<form>` element as an attribute).

- [ ] **Step 3: The walk**

`focus-first-error.ts`:

```ts
/** Elements that take focus from script without further checks; `[disabled]` is excluded below. */
const FOCUSABLE_SELECTOR = [
	'input:not([type="hidden"])',
	'select',
	'textarea',
	'button',
	'a[href]',
	'[tabindex]:not([tabindex="-1"])',
	'[contenteditable="true"]',
].join(',')

const FIELD_SELECTOR = '[data-field]'
const FIELD_ATTRIBUTE = 'data-field'
const FORM_ID_ATTRIBUTE = 'data-form-id'

function isFocusable(element: Element): element is HTMLElement {
	return element instanceof HTMLElement && element.matches(FOCUSABLE_SELECTOR) && !element.matches(':disabled')
}

/** The element carrying the field's own `id`, compared by value — names hold `.` and `[`. */
function elementWithId(wrapper: Element, id: string): Element | undefined {
	if (wrapper.id === id) return wrapper
	return [...wrapper.querySelectorAll('[id]')].find((element) => element.id === id)
}

function focusTarget(wrapper: Element, id: string): HTMLElement | undefined {
	const own = elementWithId(wrapper, id)
	if (own !== undefined && isFocusable(own)) return own
	const inner = [...wrapper.querySelectorAll(FOCUSABLE_SELECTOR)].find(isFocusable)
	if (inner !== undefined) return inner
	return isFocusable(wrapper) ? wrapper : undefined
}

/**
 * Focus the first field of one form, in DOM order, that has errors.
 *
 * "First" comes from form state, not from `aria-invalid`: a kit may put that attribute on a
 * container (the shadcn radio group and slider do), so it cannot be trusted to mark the control.
 * The walk is always over the whole document and keeps only the wrappers stamped with this form's
 * id — which is what makes a `FormProvider` form with no `<form>` element, and two forms with the
 * same field names, behave like any other. A field's `id` is its `name` (`fieldRenderProps`).
 */
export function focusFirstError(
	formId: string,
	hasErrors: (name: string) => boolean,
	root: ParentNode = document,
): boolean {
	for (const wrapper of root.querySelectorAll(FIELD_SELECTOR)) {
		if (wrapper.getAttribute(FORM_ID_ATTRIBUTE) !== formId) continue
		const name = wrapper.getAttribute(FIELD_ATTRIBUTE)
		if (name === null || !hasErrors(name)) continue
		const target = focusTarget(wrapper, name)
		if (target === undefined) continue
		target.focus()
		return true
	}
	return false
}
```

A wrapper whose field has errors but nothing focusable is skipped (`continue`), so the next invalid
field still gets focus.

- [ ] **Step 4: The option**

`form-behaviour.ts`:

```ts
/** Behaviour this package adds to a form, beside TanStack's own options. */
export type FormBehaviourOptions = {
	/**
	 * After a submit that fails validation, focus the first field — in DOM order — that has an
	 * error. On by default; `false` turns it off. The form's own `onSubmitInvalid` runs after it.
	 */
	focusOnError?: boolean
}

/** Every key of {@link FormBehaviourOptions}, for `<Form>`'s prop split. Self-checking like `FORM_OPTION_KEYS`. */
export const BEHAVIOUR_OPTION_KEYS: Record<keyof FormBehaviourOptions, true> = {
	focusOnError: true,
}
```

(Task 5 makes it generic over the form data for `serverErrors`; until then keep it non-generic so
`no-unnecessary-type-parameters` stays quiet. Export `FormBehaviourOptions` from `index.ts` and add it
to both kits' `export type { … } from '@ez-kit/form-react'` lists, alphabetically.)

`form-options.ts`: the split recognises the package's keys too — iterate over
`{ ...FORM_OPTION_KEYS, ...BEHAVIOUR_OPTION_KEYS }` (or check both with `Object.hasOwn`); update the
docblock (one sentence: the package's own behaviour options travel with TanStack's).

`create-form.tsx`, `useForm`: the parameter type becomes `FormOptions<…12> & FormBehaviourOptions`;
the body starts with

```tsx
const { focusOnError = true, ...tanstackOptions } = formOptions
const form = useAppForm({
	...tanstackOptions,
	onSubmitInvalid: (props) => {
		if (focusOnError) {
			focusFirstError(form.formId, (name) => (form.getFieldMeta(name)?.errors.length ?? 0) > 0)
		}
		tanstackOptions.onSubmitInvalid?.(props)
	},
})
```

The callback closes over `form` — declared by this very statement — and only runs later, inside
`handleSubmit`, when `form` is initialised; if the compiler or lint objects to the self-reference,
hold the instance in a ref assigned right after the call, or move the wrapping into a `useMemo` over
`[formOptions]` that reads a ref — whichever type-checks with no cast. Type the `props` parameter from
TanStack's `onSubmitInvalid` (no `any`). `formApi.update(opts)` runs on every render, so the wrapper
always sees the latest `focusOnError` and the latest author callback.

`form-props.ts` / `schema/schema-form.tsx`: the uncontrolled props types intersect
`FormBehaviourOptions`; `create-schema-form.tsx`'s `useForm({ ...options, … })` already forwards it
through `splitFormProps`.

- [ ] **Step 5: Run the tests and the package**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/focus-on-error.test.tsx src/create-form.test.tsx src/form-props.test.tsx`
(whichever of those exist), `pnpm --filter @ez-kit/form-react typecheck`,
`pnpm --filter @ez-kit/form-react test:react18`, then `pnpm verify:affected`. Expected: PASS.

- [ ] **Step 6: Changeset and commit**

Append to `.changeset/form-behaviour.md`:

```md
**Focus on the first error.** After a submit that fails validation, the first field in DOM order
that has an error takes focus — its control by `id`, or the first focusable element inside it. It
works in a `<form>`, under `FormProvider` alone, and with several forms on one page. `focusOnError:
false` (an option of `useForm`, a prop of the uncontrolled `<Form>` / `<SchemaForm>`) turns it off;
`onSubmitInvalid` still runs, after the focus.
```

```bash
git add packages/form/react/react/src/focus-first-error.ts packages/form/react/react/src/form-behaviour.ts packages/form/react/react/src/create-form.tsx packages/form/react/react/src/form-options.ts packages/form/react/react/src/form-props.ts packages/form/react/react/src/schema/schema-form.tsx packages/form/react/react/src/index.ts packages/form/react/react/src/focus-on-error.test.tsx packages/form/react/shadcn/src/index.ts packages/form/react/heroui/src/index.ts .changeset/form-behaviour.md
git commit -m "feat(form): focus the first field with an error after a failed submit"
```

---

### Task 4: D14 — the server-errors controller and `form.setServerErrors`

**Files:**

- Create: `packages/form/react/react/src/server-errors.ts`
- Modify: `packages/form/react/react/src/create-form.tsx` (create, connect, put `setServerErrors` on the
  instance, focus after apply)
- Modify: `packages/form/react/react/src/kit-form.ts` (`BoundForm` gains `ServerErrorMembers<TFormData>`)
- Modify: `packages/form/react/react/src/reserved-keys.ts` (`setServerErrors`)
- Modify: `packages/form/react/react/src/index.ts`, both kits' `src/index.ts` (`ServerErrors`)
- Test: create `packages/form/react/react/src/server-errors.test.tsx`
- Modify: `.changeset/form-behaviour.md`

**Interfaces:**

- Consumes: `focusFirstError` (Task 3), `FormBehaviourOptions['focusOnError']`.
- Produces (`server-errors.ts`, `ServerErrors` exported from `index.ts` and both kits):

```ts
export type ServerErrorMessages = string | readonly string[]
export type ServerErrors<TFormData> = {
	fields?: { [TName in DeepKeys<TFormData>]?: ServerErrorMessages }
	form?: ServerErrorMessages
}
export type ServerErrorsController = {
	apply: (errors: ServerErrors<unknown>) => void
	clear: () => void
	formErrors: () => readonly string[]
	subscribe: (listener: () => void) => () => void
	/** Re-assert the slots on every store change; returns the disconnect. */
	connect: () => () => void
}
export function serverErrorsOf(form: object): ServerErrorsController | undefined
export function attachServerErrors(form: ServerErrorsHost): ServerErrorsController
```

- On the instance: `form.setServerErrors(errors: ServerErrors<TFormData>): void`.
- `form.Submit` reads `serverErrorsOf(form)?.formErrors()` in Task 5.

- [ ] **Step 1: Write the failing tests**

`server-errors.test.tsx` — through the test kit, a `TextField name='email'` (no `validate`) and a
`TextField name='name' validate={{ minLength: 2 }}` (so both TanStack paths from R36 are exercised), a
kit `SubmitButton`, and a `form.Submit` printing `formErrors.join('|')` and `String(canSubmit)` into
two `<output>`s. The instance comes from a controlled `useForm` so the test can call
`form.setServerErrors` through `act`.

Cases:

1. **Applies and shows field errors at once (R38).** `setServerErrors({ fields: { email: 'Taken', name: ['Too common', 'Reserved'] } })`
   before any interaction → the kit shows `Taken` for `email` and both messages for `name`
   (`getByText`), and `canSubmit` reads `false`.
2. **Blur without a change keeps it (R36, Review Focus 2).** Apply, focus `email`, `user.tab()` → `Taken`
   still shown. Same for `name` (the validated field, where TanStack itself would clear it).
3. **The first change clears it, and a revert does not bring it back.** Apply, type `a` into `email` →
   `Taken` gone; `user.clear` → still gone.
4. **Other fields' changes do not clear it.** Apply on `email`, type into `name` → `Taken` still shown.
5. **Submit clears everything first.** Apply `{ fields: { email: 'Taken' } }`, press Enter in `name`
   (submits the `<form>`; the button is disabled by `canSubmit`) → `Taken` gone before `onSubmit` runs
   (`onSubmit` spy reads `document.body.textContent` and asserts it has no `Taken`).
6. **`form.reset()` clears everything** and nothing re-appears after a later store change.
7. **Unmounted field (R41).** Apply on `later`, then mount a `TextField name='later'` → `Taken` shows.
8. **Focus after apply.** `setServerErrors({ fields: { name: 'X' } })` → `document.activeElement` is
   the `name` input; with `focusOnError: false` on the `useForm` → not moved.
9. **Reserved key.** `createForm({ fields: { setServerErrors: TextField } as never })` throws the
   reserved-key error (reuse the assertion shape of `reserved-keys.test.tsx`).

Type cases: `form.setServerErrors({ fields: { email: 'x' } })` compiles; `// @ts-expect-error -- not a path`
on `{ fields: { nope: 'x' } }`; `{ form: ['a', 'b'] }` compiles.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/server-errors.test.tsx` and the package
typecheck. Expected: FAIL — `setServerErrors` does not exist.

- [ ] **Step 3: The controller**

`server-errors.ts` — the shape below; adjust the TanStack-facing types (`ServerErrorsHost`) to what
type-checks against `FormApi` 1.33.2 without `any`, and check `@tanstack/store` 0.11's `subscribe`
return value (a function or `{ unsubscribe }`) before writing `connect`:

```ts
import type { DeepKeys } from '@tanstack/form-core'

export type ServerErrorMessages = string | readonly string[]

/** Errors a server reported, by field path, plus messages for the form as a whole. */
export type ServerErrors<TFormData> = {
	fields?: { [TName in DeepKeys<TFormData>]?: ServerErrorMessages }
	form?: ServerErrorMessages
}

type FieldEntry = { messages: readonly string[]; value: unknown }

type FieldMetaLike = { isTouched: boolean; errorMap: Record<string, unknown> }

/** The members of TanStack's instance the controller reads and wraps. */
export type ServerErrorsHost = {
	getFieldValue: (name: string) => unknown
	getFieldMeta: (name: string) => FieldMetaLike | undefined
	setFieldMeta: (name: string, updater: (prev: FieldMetaLike) => FieldMetaLike) => void
	handleSubmit: (...args: never[]) => Promise<void>
	reset: (...args: never[]) => void
	store: { subscribe: (listener: () => void) => unknown }
}

const NO_MESSAGES: readonly string[] = []

function toMessages(messages: ServerErrorMessages | undefined): readonly string[] {
	if (messages === undefined) return NO_MESSAGES
	return (typeof messages === 'string' ? [messages] : messages).filter((message) => message !== '')
}
```

Then the controller. The collections are replaced, never mutated in place; `owned` is the set of
names whose `onServer` slot this controller wrote and has not cleared yet:

```ts
const controllers = new WeakMap<object, ServerErrorsController>()

/** The controller of a form `attachServerErrors` was called on; `form.Submit` reads it. */
export function serverErrorsOf(form: object): ServerErrorsController | undefined {
	return controllers.get(form)
}

/**
 * The server errors of one form instance.
 *
 * TanStack stores a field's server error in `errorMap.onServer` but clears that slot
 * inconsistently — never without a field validator, on blur with one, not on a first submit — so
 * this controller decides when an error appears and goes, and re-asserts the slot after every store
 * change. Form-level messages stay here, not in `errorMap`: there they would make `canSubmit` false
 * with nothing but a submit to clear them, and the kits disable submitting while `canSubmit` is false.
 * Idempotent per instance, so React's double memo in StrictMode gets the same controller.
 */
export function attachServerErrors(host: ServerErrorsHost): ServerErrorsController {
	const existing = controllers.get(host)
	if (existing !== undefined) return existing

	let fields: ReadonlyMap<string, FieldEntry> = new Map()
	let formMessages: readonly string[] = NO_MESSAGES
	let owned: ReadonlySet<string> = new Set()
	let listeners: ReadonlySet<() => void> = new Set()
	let syncing = false

	const notify = (): void => {
		for (const listener of listeners) listener()
	}

	const writeSlot = (name: string, messages: readonly string[] | undefined, touch: boolean): void => {
		host.setFieldMeta(name, (prev) => ({
			...prev,
			...(touch && { isTouched: true }),
			errorMap: { ...prev.errorMap, onServer: messages },
		}))
	}

	const sync = (): void => {
		if (syncing) return
		syncing = true
		try {
			fields = new Map([...fields].filter(([name, entry]) => Object.is(host.getFieldValue(name), entry.value)))
			for (const name of owned) {
				const wanted = fields.get(name)?.messages
				if (host.getFieldMeta(name)?.errorMap.onServer !== wanted) writeSlot(name, wanted, false)
			}
			owned = new Set([...owned].filter((name) => fields.has(name)))
		} finally {
			syncing = false
		}
	}

	const controller: ServerErrorsController = {
		apply(errors) {
			const nextFields = new Map<string, FieldEntry>()
			for (const [name, messages] of Object.entries(errors.fields ?? {})) {
				const list = toMessages(messages as ServerErrorMessages | undefined)
				if (list.length > 0) nextFields.set(name, { messages: list, value: host.getFieldValue(name) })
			}
			const nextForm = toMessages(errors.form)
			syncing = true
			try {
				for (const name of owned) if (!nextFields.has(name)) writeSlot(name, undefined, false)
				for (const [name, entry] of nextFields) writeSlot(name, entry.messages, true)
			} finally {
				syncing = false
			}
			fields = nextFields
			owned = new Set(nextFields.keys())
			const formChanged = nextForm.join('\n') !== formMessages.join('\n')
			formMessages = nextForm
			if (formChanged) notify()
		},
		clear() {
			controller.apply({})
		},
		formErrors: () => formMessages,
		subscribe(listener) {
			listeners = new Set([...listeners, listener])
			return () => {
				listeners = new Set([...listeners].filter((entry) => entry !== listener))
			}
		},
		connect() {
			const subscription = host.store.subscribe(sync)
			return () => {
				// `@tanstack/store` 0.11 — adapt to what `subscribe` returns (a function or `{ unsubscribe }`).
				unsubscribe(subscription)
			}
		},
	}

	const { handleSubmit, reset } = host
	Object.assign(host, {
		handleSubmit: (...args: Parameters<typeof handleSubmit>) => {
			controller.clear()
			return handleSubmit(...args)
		},
		reset: (...args: Parameters<typeof reset>) => {
			controller.clear()
			reset(...args)
		},
	})
	controllers.set(host, controller)
	return controller
}
```

`setFieldMeta`'s updater may receive `undefined` for a field that has never mounted (R41: the
error must still land and show when the field mounts) — check TanStack's `setFieldMeta` /
`getFieldMeta` for what it passes and build from its default meta in that case (prototype it on a
throwaway test first; Step 1's case 7 pins it).

Adapt to the compiler, not the other way round: `unsubscribe(subscription)` is a small local helper
for whatever `@tanstack/store` 0.11's `subscribe` returns (read its `.d.ts` first); the `messages as`
narrowing goes away if `Object.entries` is typed through a local helper; `formChanged` may compare
arrays element-wise instead of joining. Keep the behaviour: `apply` replaces everything and writes
slots without re-entering `sync`; `sync` drops a field entry permanently the first time its value is
not `Object.is` the applied one and re-asserts every owned slot **by identity** (a write only when it
differs — which is also what ends the store-notification loop); `handleSubmit` and `reset` clear first.
Both members are own properties of TanStack's extended instance (`useForm.js` builds `handleSubmit`
explicitly and spreads `reset` from the core instance), so overriding them on the instance is enough.

- [ ] **Step 4: Wire it in**

`create-form.tsx`, `useForm`, after the instance exists:

```tsx
const serverErrors = useMemo(() => attachServerErrors(form as unknown as ServerErrorsHost), [form])
useEffect(() => serverErrors.connect(), [serverErrors])
const focusOnErrorRef = useRef(focusOnError)
focusOnErrorRef.current = focusOnError
const setServerErrors = useCallback(
	(errors: ServerErrors<TFormData>) => {
		serverErrors.apply(errors as ServerErrors<unknown>)
		if (focusOnErrorRef.current) {
			focusFirstError(form.formId, (name) => (form.getFieldMeta(name)?.errors.length ?? 0) > 0)
		}
	},
	[serverErrors, form],
)
```

(If `react-hooks` lint rejects writing the ref during render, write it in a layout effect.) Add `{ setServerErrors }` to the final
`Object.assign(form, native, { FormGroup, setServerErrors }, fieldComponents, components)` and its
memo deps. Factor the "has errors" predicate shared with Task 3 into one local function.

`kit-form.ts`: `type ServerErrorMembers<TFormData> = { setServerErrors: (errors: ServerErrors<TFormData>) => void }`
intersected into `BoundForm`. `reserved-keys.ts`: `setServerErrors: true` under `// this package`.
`index.ts`: `export type { ServerErrorMessages, ServerErrors } from './server-errors'`; both kits add
`ServerErrorMessages` and `ServerErrors` to their type-export lists.

- [ ] **Step 5: Run the tests and the package**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/server-errors.test.tsx src/reserved-keys.test.tsx src/field-binding.test.tsx src/native-field.test.tsx`
(the last two pin StrictMode / formId behaviour of the instance members), the package typecheck,
`test:react18`, then `pnpm verify:affected`. Expected: PASS.

- [ ] **Step 6: Changeset and commit**

Append to `.changeset/form-behaviour.md`:

```md
**Server errors.** `form.setServerErrors({ fields, form })` puts errors a server reported onto the
form: `fields` maps a field path to a message or a list of them, `form` holds messages for the form
as a whole. A field's error shows at once, stays when the field is focused and left, and goes the
first time its value changes — it does not come back if the value is changed back. Every server error
goes when the form is submitted again or reset. Afterwards the first field with an error takes focus.
Field errors live in TanStack's `errorMap.onServer`, so every kit renders them unchanged.
```

```bash
git add packages/form/react/react/src/server-errors.ts packages/form/react/react/src/create-form.tsx packages/form/react/react/src/kit-form.ts packages/form/react/react/src/reserved-keys.ts packages/form/react/react/src/index.ts packages/form/react/react/src/server-errors.test.tsx packages/form/react/shadcn/src/index.ts packages/form/react/heroui/src/index.ts .changeset/form-behaviour.md
git commit -m "feat(form): put server-reported errors on a form with their own clearing rules"
```

---

### Task 5: D14 — the `serverErrors` option and `formErrors`

**Files:**

- Modify: `packages/form/react/react/src/form-behaviour.ts` (`serverErrors`; generic over the data)
- Modify: `packages/form/react/react/src/create-form.tsx` (apply on reference change)
- Modify: `packages/form/react/react/src/fields/submit.tsx` (merge form-level server messages)
- Modify: `packages/form/react/react/src/field-props.ts` (`SubmitRenderProps.formErrors` docblock)
- Modify: `packages/form/react/react/src/form-props.ts`, `schema/schema-form.tsx` (generic behaviour props)
- Test: extend `packages/form/react/react/src/server-errors.test.tsx`, `packages/form/react/react/src/submit.test.tsx`
- Modify: `.changeset/form-behaviour.md`

**Interfaces:**

- Consumes: the controller (Task 4), `serverErrorsOf`.
- Produces: `FormBehaviourOptions<TFormData> = { focusOnError?: boolean; serverErrors?: ServerErrors<TFormData> | undefined }`;
  `BEHAVIOUR_OPTION_KEYS` gains `serverErrors`. `form.Submit`'s `formErrors` = TanStack's form-level
  errors followed by the server's form messages, de-duplicated (`formatFieldErrors` over the
  concatenation).

- [ ] **Step 1: Write the failing tests**

Add to `server-errors.test.tsx`:

1. **Declarative, by reference.** An uncontrolled `<Form serverErrors={errors}>` whose parent holds
   `errors` in state: initial `undefined` → nothing; set `{ fields: { email: 'Taken' } }` → shown and
   focused; re-render the parent with the **same** object after the user typed into `email` (error
   gone) → not re-applied; set a **new** object with the same content → shown again.
2. **On mount.** `<Form serverErrors={{ fields: { email: 'Taken' } }}>` → shown on first paint (after
   effects) and `email` focused.
3. **SchemaForm.** An uncontrolled `SchemaForm` with `serverErrors` → the text node shows it.
4. **The attribute never reaches the DOM**: the `<form>` has no `serverErrors` attribute.
5. **Form-level (Review Focus 3).** `serverErrors={{ form: 'Service unavailable' }}` → `form.Submit`'s
   `formErrors` output reads `Service unavailable`, `canSubmit` reads `true`, the kit `SubmitButton`
   is enabled; click it → the message is gone before `onSubmit` runs and `onSubmit` is called.

Add to `submit.test.tsx`: `formErrors` concatenates a form validator's error and a server form message
in that order, de-duplicated (`validators={{ onChange: () => 'Same' }}` plus server form `['Same',
'Other']` → `['Same', 'Other']`). Update the `expectTypeOf<SubmitRenderProps>` case only if the type
changed (it should not).

Type case: `useForm({ defaultValues: { a: '' }, serverErrors: { fields: { a: 'x' } } })` compiles;
`// @ts-expect-error -- not a path` on `serverErrors: { fields: { b: 'x' } }`; the controlled
`<Form form={form} serverErrors={…}>` is a type error (`@ts-expect-error -- serverErrors is a useForm option`
on the attribute line, R39).

- [ ] **Step 2: Run them to see them fail**

Run the two files and the package typecheck. Expected: FAIL — the option is unknown and lands on the
`<form>`; `formErrors` lacks the server message.

- [ ] **Step 3: Implement**

`form-behaviour.ts`: make the type generic, `FormBehaviourOptions<TFormData>`, add
`serverErrors?: ServerErrors<TFormData> | undefined` with a docblock (applied when the reference
changes; one source — the controlled `<Form>` does not take it, R39), and `serverErrors: true` in
`BEHAVIOUR_OPTION_KEYS` (typed `Record<keyof FormBehaviourOptions<unknown>, true>`). Update Task 3's
uses to pass `TFormData`.

`create-form.tsx`, `useForm`: destructure `serverErrors` beside `focusOnError` (so it never reaches
TanStack), and

```tsx
useEffect(() => {
	if (serverErrors !== undefined) setServerErrors(serverErrors)
	// eslint-disable-next-line react-hooks/exhaustive-deps -- applied when the errors' reference changes (D14), not when the setter's does
}, [serverErrors])
```

(Use the scoped disable only if lint asks for `setServerErrors` — it is stable per instance, so
including it is also fine; prefer including it and dropping the disable.)

`fields/submit.tsx`: `Submit` reads the controller of the form it was built for —
`serverErrorsOf(form)` — and subscribes with `useSyncExternalStore(controller.subscribe,
controller.formErrors, controller.formErrors)` (a stable no-op subscription when there is no
controller, e.g. a hand-built `BindableForm` in a test); `formErrors: formatFieldErrors([...errors,
...serverFormMessages])`. Keep `selectSubmitState` as it is. `field-props.ts`: the `formErrors`
docblock says it holds form-level validator errors and form-level server errors.

`form-props.ts` / `schema-form.tsx`: the uncontrolled prop types use `FormBehaviourOptions<TValues>`;
the controlled ones do not include `serverErrors` (they may keep accepting nothing new).

- [ ] **Step 4: Run the tests and the package**

Run: the two files, `src/focus-on-error.test.tsx`, the package typecheck, `test:react18`, then
`pnpm verify:affected`. Expected: PASS.

- [ ] **Step 5: Changeset and commit**

Append to `.changeset/form-behaviour.md`:

```md
`serverErrors` is the declarative form of the same: an option of `useForm` and a prop of the
uncontrolled `<Form>` and `<SchemaForm>`, applied whenever its value changes by reference — the shape
`useActionState` hands back. Messages for the form as a whole arrive in `form.Submit`'s `formErrors`
and do not disable submitting; the next submit clears them.
```

```bash
git add packages/form/react/react/src/form-behaviour.ts packages/form/react/react/src/create-form.tsx packages/form/react/react/src/fields/submit.tsx packages/form/react/react/src/field-props.ts packages/form/react/react/src/form-props.ts packages/form/react/react/src/schema/schema-form.tsx packages/form/react/react/src/server-errors.test.tsx packages/form/react/react/src/submit.test.tsx .changeset/form-behaviour.md
git commit -m "feat(form): take server errors as a useForm option and surface form-level ones"
```

---

### Task 6: D16 — `searchable` takes an object in a schema

**Files:**

- Modify: `packages/form/core/src/schema.ts` (`SelectMember.searchable`, `MultiSelectMember.searchable`,
  `CreatableProvision` if it reads `searchable: true`)
- Modify: `packages/form/core/src/parse.ts` (`assertSearchable`, `assertCreatable`)
- Modify: `packages/form/core/src/options-source.ts` (the "for now" docblocks, l.~60-85)
- Create: `packages/form/core/src/search-settings.ts` (the shared type and defaults)
- Modify: `packages/form/core/src/index.ts`
- Test: `packages/form/core/src/searchable.test.ts`
- Create: `.changeset/form-core-search-settings.md`

**Interfaces:**

- Produces (`search-settings.ts`, exported from `@ez-kit/form-core`, re-exported by `form-react` in Task
  7 and both kits):

```ts
/** How a searchable field feeds its typed text to an option source. */
export type SearchSettings = {
	/** Milliseconds of no typing before the source sees the text. */
	debounce?: number
	/** Shortest text the source sees; below it the source gets `query: undefined`. */
	minLength?: number
}
export type Searchable = boolean | SearchSettings
export const REMOTE_SEARCH_DEFAULTS: Required<SearchSettings> = { debounce: 300, minLength: 0 }
export const LOCAL_SEARCH_DEFAULTS: Required<SearchSettings> = { debounce: 0, minLength: 0 }
export function isSearchable(value: Searchable | undefined): boolean
```

(`isSearchable` is `value === true || (typeof value === 'object' && value !== null)`.)

- `SelectMember.searchable` / `MultiSelectMember.searchable`: `Searchable`.

- [ ] **Step 1: Write the failing tests**

In `searchable.test.ts` (core), beside the existing `searchable` cases:

- `parseFormSchema` accepts `searchable: { debounce: 150, minLength: 2 }`, `{}`, `true`, `false` on a
  `select` and a `multiselect`;
- rejects `{ debounce: -1 }`, `{ minLength: 1.5 }`, `{ debounce: '300' }`, `{ wait: 3 }` (unknown key),
  `null`, `'yes'` — each with a `FormSchemaError` whose message names `searchable` and the offending
  member (`"searchable.debounce" must be a non-negative integer, got -1`; `"searchable" has an unknown
key "wait"`; keep the file's existing message style);
- `creatable: true` with `searchable: { minLength: 1 }` is accepted, with `searchable: false` rejected
  as today;
- `isSearchable(undefined | false)` → `false`, `true | {}` → `true`.

Type cases (in a `*.test-d.ts` or the existing type-test file of core, whichever the package uses):
`searchable: { debounce: 100 }` compiles on a select node; `creatable: true` together with
`searchable: {}` compiles (if `CreatableProvision` keys off `searchable: true`, widen it to
`searchable: true | SearchSettings`).

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @ez-kit/form-core exec vitest run src/searchable.test.ts` and
`pnpm --filter @ez-kit/form-core typecheck`. Expected: FAIL.

- [ ] **Step 3: Implement**

`search-settings.ts` as above (named constants, no magic numbers). `parse.ts`:

- `assertSearchable`: after the type check, accept a boolean; otherwise require a plain object whose
  keys are a subset of `SEARCH_SETTING_KEYS` (a `Record<keyof SearchSettings, true>` constant) and whose
  values are non-negative safe integers (`Number.isSafeInteger(value) && value >= 0`).
- `assertCreatable`: replace `record.searchable !== true` with `!isSearchable(record.searchable as Searchable | undefined)`
  (narrow without `as` if the helper can take `unknown`).

`options-source.ts`: rewrite the two "for now" docblocks (l.~60-85) to describe the shipped behaviour:
the query arrives debounced and only at sufficient length, configured on the source (`debounce`,
`minLength`) or per field (`searchable: { … }`), defaults 300 ms / 0 for a source; below the minimum the
hook receives `query: undefined` and should not fetch. Drop the `useDebouncedValue` example.

- [ ] **Step 4: Run, changeset, commit**

Run the core tests, core typecheck, then `pnpm verify:affected` (form-react's typecheck may now need
Task 7's widening — if it fails only because `render-node.tsx` passes the object form to a
`boolean`-typed prop, widen `SelectFieldProps.searchable` / `MultiSelectFieldProps.searchable` in
`field-props.ts` to `Searchable` now and say so in the report; Task 7 then gives it behaviour).

`.changeset/form-core-search-settings.md`:

```md
---
'@ez-kit/form-core': minor
---

A `select` or `multiselect` node's `searchable` also takes an object, `{ debounce?, minLength? }`,
tuning how the typed text reaches the option source; `parseFormSchema` validates both as non-negative
integers. `SearchSettings`, `Searchable`, `isSearchable` and the two default sets are exported.
```

```bash
git add packages/form/core/src/schema.ts packages/form/core/src/parse.ts packages/form/core/src/options-source.ts packages/form/core/src/search-settings.ts packages/form/core/src/index.ts packages/form/core/src/searchable.test.ts .changeset/form-core-search-settings.md
git commit -m "feat(form): let a schema tune a searchable field's query"
```

(Add `packages/form/react/react/src/field-props.ts` if Step 4 widened it.)

---

### Task 7: D16 — the debounced, length-gated query

**Files:**

- Create: `packages/form/react/react/src/options/use-search-query.ts`
- Modify: `packages/form/react/react/src/options/source-types.ts` (`SearchableOptionSource`)
- Modify: `packages/form/react/react/src/options/field-options.tsx` (`SearchBinding`,
  `FieldOptionsProps.searchable`, `StaticSearchableOptions`, `SourcedFieldOptions`,
  `SearchableSourcedOptions`)
- Modify: `packages/form/react/react/src/contract.ts` (`SearchRenderProps.search` and the "for now"
  docblock at l.~150-160)
- Modify: `packages/form/react/react/src/field-props.ts` (`searchable` on the select props)
- Modify: `packages/form/react/react/src/fields/select-field.tsx`, `fields/multi-select-field.tsx`
  (pass `searchable` through unchanged — check only)
- Modify: `packages/form/react/react/src/test-kit.tsx` (render the hint)
- Modify: `packages/form/react/react/src/index.ts` (re-export `SearchSettings`, `Searchable`)
- Test: create `packages/form/react/react/src/search-query.test.tsx`; rewrite
  `searchable-select.test.tsx`'s "passes the raw query straight to `useOptions`" case (l.~175)
- Modify: `.changeset/form-behaviour.md`

**Interfaces:**

- Consumes: `SearchSettings`, `Searchable`, `isSearchable`, the two default sets (Task 6).
- Produces (`use-search-query.ts`, internal):

```ts
export type SearchQuery = {
	/** What the user typed, immediately — what the kit's input shows. */
	query: string
	onQueryChange: (query: string) => void
	/** What the source's hooks receive: debounced; `undefined` below `minLength`. */
	sourceQuery: string | undefined
	minLength: number
	belowMinLength: boolean
	/** A debounce is running: the source has not seen the latest text yet. */
	pending: boolean
	reset: () => void
}
export function useSearchQuery(settings: Required<SearchSettings>): SearchQuery
export function resolveSearchSettings(
	field: Searchable | undefined,
	source: SearchSettings | undefined,
	defaults: Required<SearchSettings>,
): Required<SearchSettings>
```

- Kit contract (`contract.ts`): `search: { query: string; onQueryChange: (query: string) => void; minLength: number; belowMinLength: boolean } | undefined`.
- `SearchableOptionSource` gains `debounce?: number; minLength?: number` (its `SearchSettings`).

- [ ] **Step 1: Write the failing tests**

`search-query.test.tsx` — the first fake-timer tests in this package:

```tsx
beforeEach(() => {
	vi.useFakeTimers()
})
afterEach(() => {
	vi.useRealTimers()
})
// userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
```

Reuse `searchable-select.test.tsx`'s spy source shape (`{ source, queries }`, l.~64-91) — move it into
a shared test helper only if you touch both files anyway; otherwise copy the twelve lines. Cases
(Review Focus 4), all through the test kit's select and multiselect (`data-testkit='select-search'` /
`'multiselect-search'` inputs):

1. **Default remote debounce.** Type `ber` quickly (no timer advance between keys): the source's
   `queries` grows by nothing beyond the initial `''`; the test kit's input already shows `ber`;
   `advanceTimersByTime(299)` → still nothing; `+1` → exactly one new query, `'ber'`.
2. **Source-level settings.** A source with `debounce: 0, minLength: 2`: type `b` → the source got
   `undefined` (never `'b'`), the test kit renders the hint (`'Type at least 2 characters'`), the
   selected option's label (pre-selected value) is still rendered; type `e` → the source got `'be'`
   synchronously.
3. **Field over source.** The same source with `searchable={{ minLength: 3 }}` on the field → `'be'`
   is still below; `'ber'` passes.
4. **Clearing.** With `minLength: 0` and `debounce: 300`: type `ber`, advance 300, clear the input,
   advance 300 → the last query is `''`.
5. **`loading` while pending.** During the debounce window the test kit's loading marker
   (`data-loading` or whatever the test kit renders from `loading`) is on.
6. **Static list.** An `options=` searchable select filters synchronously as today (no timers needed —
   assert without advancing); with `searchable={{ minLength: 2 }}` it shows the hint for one character.
7. **Creatable row follows the typed text at once** (a creatable searchable select over a remote
   source): type `zz` → the `Add "zz"` row renders before any timer advance.
8. **Params change resets the query** (existing `useClearOnParamsChange` behaviour) and cancels a
   pending debounce: type, change the dependent field before 300 ms, advance → the source never got the
   stale text.

Rewrite `searchable-select.test.tsx` ~l.175 ("passes the raw query straight to `useOptions`, with no
debounce of its own") to the new contract: a source with `debounce: 0` receives every keystroke from
the first character; remove the "for now" comment.

Type cases: `searchable={{ debounce: 100 }}` compiles on `form.SelectField`;
`// @ts-expect-error -- not a number` on `searchable={{ debounce: '100' }}`; a source object with
`debounce: 200` satisfies `SearchableOptionSource`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/search-query.test.tsx src/searchable-select.test.tsx`
and the package typecheck. Expected: FAIL.

- [ ] **Step 3: The hook**

`use-search-query.ts`:

```ts
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { Searchable, SearchSettings } from '@ez-kit/form-core'

export function resolveSearchSettings(
	field: Searchable | undefined,
	source: SearchSettings | undefined,
	defaults: Required<SearchSettings>,
): Required<SearchSettings> {
	const own = typeof field === 'object' ? field : undefined
	return {
		debounce: own?.debounce ?? source?.debounce ?? defaults.debounce,
		minLength: own?.minLength ?? source?.minLength ?? defaults.minLength,
	}
}

/**
 * The typed text, and what the source may see of it.
 *
 * The kit gets the text immediately; the source gets it after `debounce` ms without typing and only
 * once it is `minLength` long — below that, `undefined`, which a source reads as "no search". A
 * `debounce` of `0` is synchronous: no timer, the same render.
 */
export function useSearchQuery({ debounce, minLength }: Required<SearchSettings>): SearchQuery {
	const [query, setQuery] = useState('')
	const [settled, setSettled] = useState('')
	const live = debounce === 0 ? query : settled

	useEffect(() => {
		if (debounce === 0) return undefined
		const timer = setTimeout(() => {
			setSettled(query)
		}, debounce)
		return () => {
			clearTimeout(timer)
		}
	}, [query, debounce])

	const reset = useCallback(() => {
		setQuery('')
		setSettled('')
	}, [])

	return useMemo(() => {
		const belowMinLength = query.length < minLength
		return {
			query,
			onQueryChange: setQuery,
			sourceQuery: live.length < minLength ? undefined : live,
			minLength,
			belowMinLength,
			pending: debounce !== 0 && settled !== query,
			reset,
		}
	}, [query, live, settled, minLength, debounce, reset])
}
```

(Import `SearchQuery` from the same file; adapt names to lint. `react-hooks` may ask for `setSettled`
in deps — it is stable; follow lint.)

- [ ] **Step 4: Use it**

`source-types.ts`: `SearchableOptionSource = SearchSettings & { useOptions; useSelectedOptions }`
(docblock: the two settings and their defaults, 300 / 0).

`field-options.tsx`:

- `SearchBinding` gains `minLength: number; belowMinLength: boolean` (it mirrors the contract);
  `FieldOptionsProps.searchable` becomes `Searchable | undefined`; every `searchable` truthiness check
  uses `isSearchable`.
- `StaticSearchableOptions`: `const search = useSearchQuery(resolveSearchSettings(searchable, undefined, LOCAL_SEARCH_DEFAULTS))`;
  filter by `search.sourceQuery`; while it is `undefined` (below `minLength`) the list holds only the
  selected options — the same rule as the sourced branch — and the kit shows the hint; `withCreated`
  keeps the immediate `search.query`; hand the kit
  `{ query, onQueryChange, minLength, belowMinLength }`.
- `SearchableSourcedOptions`: the same hook with `resolveSearchSettings(searchable, source,
REMOTE_SEARCH_DEFAULTS)` (thread `searchable` through `SourcedFieldOptions`, which currently consumes
  it); `source.useOptions({ params, query: search.sourceQuery })` and the same for
  `useSelectedOptions`; while `search.belowMinLength`, drop `listed.options` from the merge (keep
  `selected.options`); `loading: search.pending || listed.loading || selected.loading`;
  `useClearOnParamsChange(…, search.reset)`.
- `OptionSourceInput.query` is already optional (`query?: string`); passing `undefined` under
  `exactOptionalPropertyTypes` needs `...(sourceQuery !== undefined && { query: sourceQuery })` or a
  widened type — prototype, pick the one without a cast, record it.

`contract.ts`: the `search` type as in Interfaces; replace the "Debouncing is the source's job for
now" docblock with the shipped contract (`query` is immediate; `minLength` / `belowMinLength` let the
kit show a hint instead of "No matches").

`field-props.ts`: `searchable?: Searchable` on the select and multiselect props. `index.ts`: re-export
`SearchSettings` and `Searchable` (type) from `@ez-kit/form-core` beside the other core types the
package re-exports; both kits add them to their type-export lists (Task 8 commits the kits).

`test-kit.tsx`: in the select and multiselect, when `search?.belowMinLength` render
`<p data-testkit='search-hint'>{`Type at least ${search.minLength} characters`}</p>` (a named template
constant) instead of the empty-list text, and keep rendering the selected label.

- [ ] **Step 5: Run the tests and the package**

Run: `src/search-query.test.tsx`, every `src/*searchable*.test.tsx`, `src/option-sources.test.tsx`,
`src/loading-options.test.tsx`, `src/create-form-options.test.tsx`, the package typecheck,
`test:react18`, then `pnpm verify:affected` (the kits' typecheck may fail here because their
`search` consumers do not read the new members yet — that is fine, it is not a type error to ignore
members; if a kit's test-kit-style mock of `search` fails typecheck for missing members, fix the mock
in Task 8 and note it).

- [ ] **Step 6: Changeset and commit**

Append to `.changeset/form-behaviour.md`:

```md
**Searchable sources wait for the user.** A searchable field over an option source hands the source
its query after 300 ms without typing, not on every keystroke; `debounce` and `minLength` on the
source, or `searchable={{ debounce, minLength }}` on the field (and in a schema node), tune it. Below
`minLength` the source receives `query: undefined` and the kit shows a hint. An in-memory searchable
list still filters at once. **Kit contract:** `search` gains `minLength` and `belowMinLength`.
```

```bash
git add packages/form/react/react/src/options packages/form/react/react/src/contract.ts packages/form/react/react/src/field-props.ts packages/form/react/react/src/test-kit.tsx packages/form/react/react/src/index.ts packages/form/react/react/src/search-query.test.tsx packages/form/react/react/src/searchable-select.test.tsx .changeset/form-behaviour.md
git commit -m "feat(form)!: debounce and length-gate the query a searchable source receives"
```

(Add `fields/select-field.tsx` / `fields/multi-select-field.tsx` only if they changed.)

---

### Task 8: D16 — the kits show the hint

**Files:**

- Modify: `packages/form/react/shadcn/src/blocks/searchable-select.tsx`,
  `blocks/searchable-multi-select.tsx`
- Modify: `packages/form/react/heroui/src/blocks/searchable-select.tsx`,
  `blocks/searchable-multi-select.tsx`
- Modify: both kits' `src/index.ts` (type exports `SearchSettings`, `Searchable`)
- Test: both kits' `src/searchable-select.test.tsx`, `src/searchable-multiselect.test.tsx`
- Modify: `.changeset/form-behaviour.md` (already names both kits — check the text only)

**Interfaces:** consumes `search.minLength` / `search.belowMinLength` (Task 7). Each kit exports a
named constant for the hint text builder (e.g. `minLengthHint(n)`), not a bare literal.

- [ ] **Step 1: Write the failing tests**

In each kit's two searchable test files: a source with `minLength: 2, debounce: 0`; open the control,
type one character → the hint `Type at least 2 characters` is visible where "No matches" would be,
and "No matches" is not; type a second → the hint is gone and the source's options render. Use the
query helpers those files already use (they open the popover the kit's own way).

- [ ] **Step 2: Run them to see them fail**

Run each kit's two files. Expected: FAIL — "No matches" shows.

- [ ] **Step 3: Implement**

shadcn: `<ComboboxEmpty>` (searchable-select ~l.114, multi ~l.130) becomes a three-way choice —
`loading` → `Searching…`, `search.belowMinLength` → the hint, else `No matches`. HeroUI:
`renderEmptyState` in both files gains the same middle branch (same element and classes as the
"No matches" branch). The selected value's label must keep rendering (it does — it comes from
`options`, which still holds the selected ones).

- [ ] **Step 4: Run, commit**

Run each kit's test suite, their typecheck, `pnpm build --filter=...@ez-kit/form-core`, the docs
`kit-exports-parity` and `form-package-graph` tests, then `pnpm verify:affected`.

```bash
git add packages/form/react/shadcn/src packages/form/react/heroui/src
git commit -m "feat(form): show a minimum-length hint in both kits' searchable selects"
```

(Check `git status --short` for both kit `src` directories first.)

---

### Task 9: D15 — server actions: page, live example, hydration check

**Files:**

- Create: `apps/docs/shared/form/examples/actions/sign-up.ts` (`'use server'`)
- Create: `apps/docs/shared/form/examples/components/server-action.tsx`,
  `apps/docs/shared/form/examples/components/server-action-schema.tsx`
- Modify: `apps/docs/shared/form/examples/manifest.json`, `apps/docs/shared/form/examples/registry.ts`
- Create: a server-rendered route for the hydration check, e.g.
  `apps/docs/app/(embed)/ssr/form/[kit]/page.tsx` (name it after reading the Next guides; it must not
  be under `(embed)/examples/*/[slug]`, which forces `ssr: false`)
- Create: `apps/docs/e2e/packages/form/hydration.spec.ts`
- Create: `apps/docs/content/docs/form/server-actions.mdx`; modify `apps/docs/content/docs/form/meta.json`
- Modify: `apps/docs/test/docs-options/page-type-map.ts` (`DocPage.FormServerActions` + `PAGE_ENTRIES`)
- Modify: `.changeset/form-docs-stage-2.md`

**Interfaces:** consumes `serverErrors` (Task 5). The action's return type is
`{ serverErrors?: ServerErrors<SignUpValues>; ok?: true }` (or the shape you settle in Step 3 —
record it).

- [ ] **Step 1: Read the guides**

Read, under `apps/docs/node_modules/next/dist/docs/01-app/`, the guides on Server Functions /
`'use server'`, `useActionState`, and on rendering a Client Component from a Server Component page.
Note in the report what differs from Next 15 behaviour you would have assumed.

- [ ] **Step 2: Write the failing e2e spec**

`hydration.spec.ts`, per kit (it sits under `e2e/packages/form/`, so it runs in the `shadcn` and
`heroui` projects):

```ts
import { expect, test } from '../../fixtures'

test('the server-rendered form hydrates without errors and submits to a real action', async ({ page, kit }) => {
	const errors: string[] = []
	page.on('pageerror', (error) => errors.push(error.message))
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text())
	})

	await page.goto(`/ssr/form/${kit}?theme=light`)
	await expect(page.locator('[data-field="username"]')).toBeVisible()

	await page.locator('[data-field="username"] input').fill('admin')
	await page.getByRole('button', { name: 'Sign up' }).click()
	await expect(page.locator('[data-field="username"]')).toContainText('That username is taken')
	await expect(page.locator('[data-field="username"] input')).toBeFocused()

	expect(errors).toEqual([])
})
```

Adapt the route, the selector for the input (HeroUI's root differs — prefer `#username`, the field's
`id`, which both kits put on the text control) and the fixture import to what `e2e/fixtures.ts`
exports; the shape and the three assertions stay. Also confirm `apps/docs/test/e2e-slots.test.ts` is
unaffected (it checks `data-slot` literals; this spec uses `data-field`).

- [ ] **Step 3: The action and the example**

`actions/sign-up.ts`:

```ts
'use server'

import type { ServerErrors } from '@ez-kit/form-shadcn'

export type SignUpValues = { username: string; email: string }
export type SignUpResult = { serverErrors?: ServerErrors<SignUpValues>; ok?: true }

const TAKEN_USERNAMES = new Set(['admin', 'root'])

export async function signUp(_previous: SignUpResult, values: SignUpValues): Promise<SignUpResult> {
	if (TAKEN_USERNAMES.has(values.username.trim().toLowerCase())) {
		return { serverErrors: { fields: { username: 'That username is taken' } } }
	}
	return { ok: true }
}
```

(`require-await` is on: if the function has no `await`, drop `async` and return a resolved value the
way Next accepts, or validate with `@ez-kit/form-core`'s `buildValidator` against a small schema so the
example shows server-side validation from the same rules — the latter is what D15 asks the docs to
show; settle it and record it. Import `ServerErrors` from whichever kit package the docs app already
depends on for types; if the action must stay kit-agnostic, use `@ez-kit/form-react`'s type through
the docs app's dependency.)

`components/server-action.tsx` — `'use client'`, no internal comments, export `ServerActionExample`:
`const [state, action, isPending] = useActionState(signUp, {})`; `<Form defaultValues={…}
serverErrors={state.serverErrors} onSubmit={({ value }) => { startTransition(() => { action(value) }) }}>`
with a `TextField` `username` (`validate={{ required: true }}`), a `TextField` `email` and a submit
control built on `form.Submit` whose `disabled` also reads `isPending` (D15: `isSubmitting` ends before
the action does). A success line when `state.ok`. `server-action-schema.tsx` — the same through
`SchemaForm` with a document (the docs' schema-twin convention). Register both in `manifest.json`
(`form-server-action`, `form-server-action-schema`) and both `sourceFile`s in `registry.ts`.

The SSR route renders `ServerActionExample` for `kit` **through the normal server path** (a Server
Component page importing the client example statically, inside the kit's form-kit provider used by the
embed layouts — reuse `form-kit-provider.tsx` / the dialog and button providers the embed layouts wrap
with). `generateStaticParams` over the two kits, or dynamic — whatever the guide recommends for a page
whose children call a server action.

- [ ] **Step 4: The page**

`server-actions.mdx` (add `"server-actions"` after `"submission"` in `meta.json`):

- **Without JavaScript the form does not work** — the kits' fields are controlled components, and
  arrays, conditions and the wizard live in JS; say so plainly, first.
- **The recipe:** `onSubmit` calls the action inside `startTransition`; the action's result goes back
  in through `serverErrors` (from `useActionState`); the button reads `isPending` because
  `isSubmitting` ends when `onSubmit` returns, before the action resolves. Show the TSX (no internal
  comments), then `<KitExample exampleId='form-server-action' />` and the schema twin.
- **What `serverErrors` does** — one paragraph and a link to Submission's section (Task 10 writes it):
  shown at once, kept until the field changes, cleared on the next submit, focus on the first.
- **Validating on the server:** `@ez-kit/form-core` runs without React — `buildValidator`,
  `stripHiddenValues`, `parseFormSchema` — or a shared standard schema; a short snippet.
- No markdown table unless it is an option table you then map; if you add one, classify it in
  `page-type-map.ts`. Add `FormServerActions: 'content/docs/form/server-actions.mdx'` to `DocPage`
  beside `FormSubmission` and a `PAGE_ENTRIES` entry (`optionTables: [], nonOptionTables: []` if none).

- [ ] **Step 5: Run**

Run: `pnpm build --filter=...@ez-kit/form-core`, `pnpm --filter @ez-kit/docs typecheck`, `pnpm --filter
@ez-kit/docs lint`, the docs tests `test/docs-option-names.test.ts test/e2e-slots.test.ts`, then the e2e
spec against a production build, both kits:
`pnpm --filter @ez-kit/docs build && pnpm --filter @ez-kit/docs exec playwright test e2e/packages/form/hydration.spec.ts --project=shadcn --project=heroui`
(the CI shape; locally `webServer` starts `next start` when `CI` is set — set it for this run, or
follow `playwright.config.ts`). Then the smoke spec for the two new manifest ids:
`… playwright test e2e/smoke.spec.ts --project=shadcn --grep server-action` (it is `@smoke`, excluded by
default — run it explicitly). Expected: PASS. A hydration error found here is a real defect: fix its
cause (it is most likely an id the kit's UI library generates, or `data-form-id`), never filter it out
of the spec.

- [ ] **Step 6: Changeset and commit**

Append to `.changeset/form-docs-stage-2.md`:

```md
A new Server actions page shows a form submitting to a real server action, with `serverErrors` from
`useActionState`, and states that the form needs JavaScript; an end-to-end test checks that a
server-rendered form hydrates without errors in both kits.
```

```bash
git add apps/docs/shared/form/examples apps/docs/app apps/docs/e2e/packages/form/hydration.spec.ts apps/docs/content/docs/form/server-actions.mdx apps/docs/content/docs/form/meta.json apps/docs/test/docs-options/page-type-map.ts .changeset/form-docs-stage-2.md
git commit -m "docs(form): document server actions with a live example and a hydration check"
```

(`apps/docs/app` and `apps/docs/shared/form/examples` as directories are safe only if `git status
--short` shows nothing else there.)

---

### Task 10: Docs for D13, D14, D16 and the kit contract

**Files:**

- Modify: `apps/docs/content/docs/form/submission.mdx` (new sections: focus on the first error; server
  errors with `serverErrors` / `setServerErrors`; the existing "Errors that come back from the server"
  section — the validator route stays valid and is presented as the alternative for a server check
  that should run as validation)
- Modify: `apps/docs/content/docs/form/select/searchable.mdx` (the "Debouncing and `minChars` are the
  source's job — for now" section, l.~105-121, and the kit-contract section l.~78-89)
- Modify: `apps/docs/content/docs/form/index.mdx` (l.~49 links the old anchor and calls it "not
  permanent")
- Modify: `apps/docs/content/docs/form/custom-kit.mdx` (`search.minLength` / `belowMinLength`)
- Modify: `apps/docs/content/docs/form/schema.mdx` (if it documents `searchable` as a boolean)
- Modify: `apps/docs/test/docs-options/page-type-map.ts` (every new or changed option table)
- Modify: `packages/form/react/react/README.md` (only if it describes debouncing, server errors or
  focus — grep)
- Modify: `.changeset/form-docs-stage-2.md`

**Interfaces:** none. Consumes every name Tasks 2–8 produced.

- [ ] **Step 1: Find every stale line**

```bash
grep -rn -E "for now|minChars|raw query|every keystroke|debounc|useDebouncedValue|errorMap\.onServer|onSubmitInvalid|focus" apps/docs/content/docs/form packages/form/react/*/README.md | grep -v node_modules
```

Every hit that describes the old behaviour (raw query, debouncing as the source's job, no focus
handling, server errors only through validators) is stale. Note each in the report with what it
became. Then a second sweep for the claims without the identifiers (AGENTS.md rule): read
`submission.mdx` and `searchable.mdx` top to bottom.

- [ ] **Step 2: Write the sections**

- `submission.mdx` → **"Focus on the first error"**: what is focused (DOM order, the control by `id`,
  else the first focusable element), `focusOnError: false`, `onSubmitInvalid` after it, works without a
  `<form>` and across several forms; collapsed sections and inactive tabs are the layout's business
  (D13 last bullet) — a hidden field is skipped, it is not revealed.
- `submission.mdx` → **"Server errors"**: `serverErrors` (option / uncontrolled prop; controlled form:
  pass it to `useForm`), `form.setServerErrors`, the shape (`fields` by path → string or list, `form`),
  the clearing rules (R36 in user words: stays when the field is left, goes on the first change and does
  not return, everything goes on the next submit or reset), form-level messages in `form.Submit`'s
  `formErrors` and not blocking submit, focus after apply. A short "which one?" paragraph against the
  existing validator section: a server **validator** runs as part of submitting and blocks it; server
  **errors** are a response you put on the form afterwards (the server-action shape). If you add an
  option table (`focusOnError`, `serverErrors`), map it in `page-type-map.ts` to
  `FormBehaviourOptions` (via the right `FORM_TYPE` entry — add one if missing) with its count.
- `searchable.mdx`: replace the "for now" section with **"Debounce and minimum length"**: defaults
  (remote 300 ms / 0; in-memory none), on the source, on the field (`searchable={{ … }}`), in a schema
  node, below the minimum the source gets `query: undefined` and should not fetch, the kit shows a
  hint; the kit-contract snippet gains `minLength` and `belowMinLength`. Fix `index.mdx`'s link to the
  new anchor and drop "not permanent".
- `custom-kit.mdx`: the `search` contract members.

- [ ] **Step 3: Run the docs checks**

Run: `pnpm build --filter=...@ez-kit/form-core`, then
`pnpm --filter @ez-kit/docs exec vitest run test/docs-option-names.test.ts test/kit-exports-parity.test.ts test/form-package-graph.test.ts test/tree-shaking.test.ts`,
`pnpm --filter @ez-kit/docs typecheck`, `pnpm --filter @ez-kit/docs lint` (it runs
`check-site-url.mjs` and the changeset check), then `pnpm verify:affected`, then repeat the Step 1 grep —
every remaining hit must be correct as written.

- [ ] **Step 4: Changeset and commit**

Append to `.changeset/form-docs-stage-2.md`:

```md
Submission documents focus on the first error and server errors (`serverErrors`,
`form.setServerErrors`); Searchable selects documents the source's debounce and minimum length.
```

```bash
git add apps/docs/content/docs/form apps/docs/test/docs-options/page-type-map.ts .changeset/form-docs-stage-2.md
git commit -m "docs(form): document focus on error, server errors and the search query gate"
```

(Add the README path if it changed.)

---

### Task 11: Stage gate

**Files:** a `package.json` `size-limit` entry only if R47 requires it.

- [ ] **Step 1: Full gate, sequentially**

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @ez-kit/form-react test:react18
pnpm size
```

Each its own command, in this order, output saved to the ledger directory. A timeout-only failure
that passes when its package runs alone is the machine-load artefact `AGENTS.md` describes — rerun that
package; do not change the test.

- [ ] **Step 2: e2e**

`pnpm --filter @ez-kit/docs build`, then the CI command for the two form projects and the docs
project: `pnpm --filter @ez-kit/docs exec playwright test --project=shadcn --project=heroui --project=docs --grep-invert @smoke`
(with `CI=1`, as in `.github/workflows/ci.yml`). Record the counts.

- [ ] **Step 3: Size (R47)**

Read every `@ez-kit/form-*` entry from `pnpm size`. For each that exceeds its limit in
`form-react`, `form-shadcn` or `form-heroui`: `limit = ceil(measured × 1.15)` rounded up to the next
0.5 kB (kB limits) or 10 B (byte limits); rerun that package's `size`; commit only the touched
`package.json` files:

```bash
git add <the package.json files>
git commit -m "build(form): retune the form packages' size budgets for the behaviour layer" -m "<measured figures and the formula, lines ≤ 100 chars>"
```

If `form-react`'s `helpers` entry moved at all, stop and report it (R47 — a defect, not a retune).

- [ ] **Step 4: Spec cross-check**

```bash
grep -rn -E "for now|minChars|raw query" apps/docs/content packages/form --include='*.ts' --include='*.tsx' --include='*.md' --include='*.mdx' | grep -v node_modules | grep -v /dist/ | grep -v CHANGELOG
grep -rn "data-field=" packages/form/react/*/src --include='*.tsx' | grep -v test
```

The first must return nothing; every hit of the second must have a `data-form-id` beside it.

- [ ] **Step 5: Hand over for review**

Report to the user: the stage's commits, the gate and e2e output, the size figures, the rulings the
implementation had to bend (with the report lines), and anything the plan got wrong. Do not start
stage 5.

---

## Execution

Run with **superpowers:subagent-driven-development**. One fresh implementer per task, then that
task's reviewers in parallel, then fixes, before the next task starts. Tasks are strictly sequential:
each consumes the previous one's names (Tasks 6–8 do not depend on 2–5, but they share
`create-form.tsx`'s neighbours and the changesets, so they stay in order).

**Ledger:** `.superpowers/sdd/2026-10-13-form-composition-stage-4/` — `plan-path`,
`global-constraints.md` (the Global Constraints section above, verbatim), `rulings.md` (R33–R47 and
Review Focus, plus every ruling made during execution, numbered from R48), `progress.md` (pre-flight
scan of every task pair's produces/consumes, then one line per dispatch, ruling, deferred minor and
completion, as stage 3's ledger does), `task-N-brief.md`, `task-N-report.md`, and a
`review-<base>..<head>.diff` per review.

**Reviewers per task**, chosen by `~/.claude/rules/ecc/common/agents.md`, dispatched in one message:

| Task | `typescript-reviewer` | `react-reviewer`         | `type-design-analyzer`                               | other                                                                         |
| ---- | --------------------- | ------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1    | yes                   | yes                      | —                                                    | —                                                                             |
| 2    | yes                   | yes (kits' wrappers)     | —                                                    | —                                                                             |
| 3    | yes                   | yes                      | yes — `FormBehaviourOptions`                         | `a11y-architect` — focus target rules                                         |
| 4    | yes                   | yes                      | yes — `ServerErrors`, `setServerErrors`              | `silent-failure-hunter` — store sync, swallowed states                        |
| 5    | yes                   | yes                      | yes — the generic option, controlled vs uncontrolled | —                                                                             |
| 6    | yes                   | —                        | yes — `SearchSettings`, `Searchable`                 | —                                                                             |
| 7    | yes                   | yes                      | —                                                    | `performance-optimizer` — timers, re-renders per keystroke                    |
| 8    | yes                   | yes                      | —                                                    | `a11y-architect` — the hint's announcement                                    |
| 9    | yes                   | yes                      | —                                                    | `security-reviewer` — the server action; `e2e-runner` is not a reviewer, skip |
| 10   | yes (snippets)        | yes (prose vs behaviour) | —                                                    | —                                                                             |
| 11   | —                     | —                        | —                                                    | —                                                                             |

Each reviewer gets the task brief, the global constraints, the rulings file, the implementer's report
and the diff file, and reviews read-only. After Task 11, one whole-branch review of the stage's range
(`<stage base>..HEAD`) by `code-reviewer` on the most capable model, pointed at the ledger's deferred
minors, before the hand-over.

**Implementer instructions that every brief repeats:** TDD — the failing run is evidence in the
report; type and TanStack-runtime decisions that the plan does not spell out are prototyped on a
throwaway file and the file is deleted; `pnpm verify:affected` between edits; `git add` by path; no
stash; for `apps/docs` Next code, read the guide in `node_modules/next/dist/docs/` first.
