# Form composition — stage 3: field primitives

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every form instance spec 009's two field primitives — `form.Field`, our binding of an
author's own control, and `form.NativeField`, TanStack's raw render-prop field under a new name —
with the same pair on every group (`withFieldGroup`, `useFieldGroup`, `form.FormGroup`,
`useFormGroup`) and on every array entry, and make `useFormContext<TValues>()` an optional
type-level cast.

**Architecture:** Every bound field in the package already reaches TanStack through one member,
`form.AppField`, and TanStack implements that member by reading `form.Field` off the instance at
render time. So the instance's `Field` cannot simply be replaced. This stage captures TanStack's
`Field` once as `NativeField` and replaces the instance's `AppField` with the package's own
**binding seam** (`field-binding.tsx`), built on the captured field. `form.Field` and every built-in,
custom, entry, group and schema field are bound through that seam; `form.NativeField` deliberately
is not. Stages 4 (D13 focus, D14 server errors) and 6 (D18 step registration) attach their
behaviour to the seam and see every field except `NativeField` without touching a binder. Retyping
the instance's `Field` / `FormGroup` with `Omit` costs the instance its assignability to TanStack's
own `FormApi` (a `private` member does not survive `Omit`), so the four group APIs become thin
wrappers in this package that take the instance type.

**Tech Stack:** pnpm + Turborepo, TypeScript 5.9 (`strict`, `exactOptionalPropertyTypes`,
`noUncheckedIndexedAccess`), React 18/19, TanStack Form 1.33.2, tsup, Vitest + Testing Library,
esbuild (tree-shaking test), changesets.

**Spec:** `specs/009-form-composition/design.md` — D5 (`form.Field`, `form.NativeField`; not
`form.Submit`, done in stage 2; not `form.Steps`, stage 6), D6 (the optional generic of
`useFormContext`), §4 scenarios 3–4, §7 row "`form.Field` — сырой `FieldApi` TanStack", §8 bullets
"`useFormContext<TValues>()`", "`form.Field` / `form.NativeField`", "Доки: `native-api.mdx`".
Stage 2 plan, for the conventions and rulings R1–R8:
`docs/superpowers/plans/2026-10-12-form-composition-stage-2.md`. Stage 2 ledger, for rulings R9–R15:
`.superpowers/sdd/2026-10-12-form-composition-stage-2/progress.md`.

## Stages of spec 009

All stages land on branch `form-check` in **one PR into `develop`**; the user reviews after each
stage, nothing is merged or pushed between stages.

1. Graph and names — **done**.
2. Factory and context — **done**.
3. **Field primitives** (this plan): `form.Field`, `form.NativeField` on the instance, every group
   and every array entry; generic `useFormContext<TValues>()`; two stage 2 leftovers.
4. Behaviour: D13, D14, D16, D17, D15 hydration test. **Attaches to the binding seam built here.**
5. Composition: D7 (flat `group.X`, group `validators` / sabmit, `withForm` form from context).
   **Extends the group wrappers built here.**
6. Steps: D18 and the schema wizard on `form.Steps`. **Registers fields from the binding seam.**
7. Docs sweep: `custom-fields.mdx`, second pass over stale claims.

## Global Constraints

- Code, comments, docblocks, commit messages: English. No agent attribution anywhere in git
  (`AGENTS.md`): no `Co-Authored-By`, no Claude/agent/session mention, even if a harness asks.
  Conventional Commits; pre-commit runs Prettier + ESLint on staged files; `--max-warnings=0`; never
  `--no-verify`.
- Type imports use `import type`; `import/order` is enforced (value imports: packages, blank line,
  relative; type imports after them: relative, then `@…` packages, then `react`); inline
  `import('…')` type annotations are forbidden; `require-await` is on;
  `@typescript-eslint/no-unnecessary-type-parameters` rejects a type parameter used once.
- A negative type test never reads a member of an error-typed value (`no-unsafe-member-access`
  fires on it): assert absence with `expectTypeOf<…>().not.toHaveProperty('…')`, or put
  `// @ts-expect-error -- <reason>` on the offending **attribute** line of a multi-line JSX element.
- Every breaking change is a **minor** bump in each package it touches (pre-1.0). A changeset names
  only the packages whose source the task changed (R12). A still-pending changeset that a task makes
  wrong is edited in place; a new one is created only when no pending one covers the change.
- Between edits run `pnpm verify:affected` (if it selects nothing after a commit, run
  `pnpm turbo run lint typecheck test --filter='...[HEAD~1]' --concurrency=2`). Only the last task
  runs the full gate — `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm size` —
  **sequentially**, each its own command.
- Docs tests read **built** packages: `pnpm build --filter=...@ez-kit/form-core` before
  `pnpm --filter @ez-kit/docs exec vitest run <files>`. `expectTypeOf` / `@ts-expect-error` are
  enforced by `pnpm --filter <pkg> typecheck`, not by vitest at runtime.
- Both kits keep identical value and type exports (`apps/docs/test/kit-exports-parity.test.ts`); a
  kit's built `.d.ts` names neither `@tanstack/*` nor `@ez-kit/form-core`
  (`apps/docs/test/form-package-graph.test.ts`).
- Every runtime test that renders a field runs on **both kits' behaviour through the test kit** in
  `form-react`; a docs-app or e2e case is written for **both** kits — never skip the heroui case on
  the grounds that "the kit has no such component": this stage changes no kit component.
- Do not touch: `specs/` (including `specs/010-schema-form/draft.md`), any `CHANGELOG.md`,
  `packages/form/react/shadcn/src/components/ui/**`, `docs/superpowers/plans/` other than this
  file, and the user's uncommitted edits under `.agents/skills/openspec-*` and
  `.claude/{skills,commands}/opsx*` — never stage them (`git add` named paths only, never `-A`).
- Docs examples (`apps/docs/shared/form/examples/**`) are shown verbatim: no internal comments.
- No `git stash` (shared across worktrees), no `pnpm up -r`, never push, never merge.
- Rulings R1–R15 (stage 2 plan and ledger) and R16–R24 below are binding.

## Rulings carried into this plan

Each settles something the spec leaves open and was checked before it was written down — the type
rulings by `tsc` on a throwaway file in `packages/form/react/react/src` (deleted afterwards), the
runtime ones by reading TanStack 1.33.2's `dist/esm` sources.

- **R16 — the binding seam is the instance's `AppField`.** TanStack's `createFormHook` builds
  `AppField` as `<form.Field …>`, reading `form.Field` off the instance at render
  (`createFormHook.js:44`), and `useFieldGroup` builds `group.Field` / `group.AppField` the same way
  (`useFieldGroup.js:23-27`). `useForm` therefore reads TanStack's `Field` **once**, keeps it as
  `NativeField`, and overwrites `AppField` with `createFieldBinding(NativeField)`. Every binder
  already renders `form.AppField`, so all of them, the schema renderer's custom node and
  (from Task 4) `form.Field` pass through the seam with no binder edited. The capture is idempotent
  (`form.NativeField ?? form.Field`), because a re-run memo — React StrictMode, a `formId` change —
  must not capture our own `Field`. The seam provides no TanStack `fieldContext`: this package
  injects no field components and exports no `useFieldContext`. _Cost if wrong:_ a caller of the
  undocumented `form.AppField` who read `useFieldContext()` from TanStack directly loses it.
- **R17 — `Omit<…, 'Field' | 'FormGroup'>` on the instance, and our own group APIs.** An
  intersection (`TForm & { Field: Ours }`) keeps TanStack's signature as an overload, so TanStack's
  documentation example (`field.state.value`) would still compile in `form.Field` — D5 says it must
  not. `Omit` is the only spelling that removes it, and `Omit` drops `FormApi`'s `private`
  `_devtoolsSubmissionOverride`, so the instance stops being assignable to any TanStack parameter
  typed `FormApi`. Measured: TanStack's `withFieldGroup` component, `useFieldGroup` and
  `useFormGroup` all reject it. They become this package's (`field-groups.tsx`, `form-group.tsx`),
  with `form: FormInstance<TFormData, NoRegistry, NoRegistry>` — the same parameter shape as
  `FormProvider`, which accepts a form whose values hold an array (prototype: `list: { a: string }[]`
  passes all four). _Cost if wrong:_ an app passing the instance to another TanStack API typed
  `FormApi` (devtools, a hand-rolled hook) needs a cast; a group passed as another group's `form`
  (nested `withFieldGroup`) is no longer typed — nothing in the repo or docs does it; stage 5
  decides whether to restore it.
- **R18 — `form.Field`'s props: `validate`, never `validators`.** Call site: `name`
  (`DeepKeys<TFormData>`, TanStack's own key set), `validate` (`FieldValidateProps` — the vocabulary
  every field of this package takes: `required`, `min`, `max`, `minLength`, `maxLength`, `format`,
  `messages`), `label`, `description`, `disabled`, `required`, `children`. `validate` goes through
  the same `fieldValidators` / `resolveRequired` pair the built-in binders use, so `form.Field`
  validates, marks `required` and shows its errors exactly like `form.TextField`. **TanStack's
  `validators` are not accepted** (user's decision, 2026-10-12): one validation vocabulary on every
  bound field. A rule that needs a standard schema or a function lives on the form's or a group's
  `validators`, or on `form.NativeField`, which keeps TanStack's. Render props: exactly what a
  `defineFieldType` field gets minus its `props` bag — `FieldRenderProps & { value; onChange }`, named
  `FieldControlProps<TValue>`. No `aria-*`: D5 lists them, but `FieldRenderProps` carries none today
  and the kits compute their own. `data-field-type` is the constant `'field'`. This deviates from the
  spec's text: D5 and §4 scenario 4 write `validators={{ onChange: z.number()… }}` on `form.Field`;
  `specs/` is not edited, the changeset and docs describe what ships. _Cost if wrong:_ adding
  `validators` later is additive, but it must then settle how a schema and `validate` share
  TanStack's single `onChange` slot; `'field'` coincides with the id a registry key `FieldField` would
  derive, which is cosmetic.
- **R19 — the pair is everywhere, with the same meaning.** `Field` / `NativeField` exist on the
  instance, on an array entry (`item.Field`, `item.NativeField`, item-relative like every entry
  member), on `withFieldGroup` / `useFieldGroup` groups and on `form.FormGroup` / `useFormGroup`
  groups (group-relative). On a field group `NativeField` maps names through TanStack's own
  `group.getFormFieldOptions`, so a `fields` map works; on a form group both join `name` with
  TanStack's `concatenatePaths`, so a group over an array branch (`name='tags'`,
  `group.Field name='[0].label'`) resolves `tags[0].label`. `useFormGroup` returns the augmented
  group too, and `form.FormGroup` is `useFormGroup` plus `children(group)`. _Cost if wrong:_
  `useFormGroup`'s result gains two members it did not have.
- **R20 — `useFormContext<TValues>()` types built-in kit fields, not custom ones.** It returns
  `FormInstance<TValues, AllFormFieldSlots, NoRegistry>` through an overload; without the generic it
  returns today's `FormInstance<unknown, NoRegistry, NoRegistry>`. The built-ins carry their own
  value-typed `name` (`form.TextField name` is `DeepKeysOfType<TValues, string>`) — stricter than
  the spec's "`DeepKeys<TValues>`" and the same as `form.TextField` everywhere else. Custom fields
  and components are absent: the second generic that would name them is the cycle D6 rules out.
  `FormContextApi` becomes `FormContextApi<TValues = unknown>` with the same two meanings. _Cost if
  wrong:_ a component calling `form.DateField` under a bundle that did not register `DateField`
  compiles and crashes on render with an undefined element — the spec accepts that the generic is a
  cast, and the docs say so.
- **R21 — stage 3 rewrites `native-api.mdx` and fixes every line that names `form.Field`,
  `group.Field` or `form.AppField` as TanStack's.** Leaving them would document code that no longer
  compiles (`docs-option-names` and the example's typecheck would catch only part of it). Stage 7
  keeps the second pass over claims that describe the old behaviour without the name. _Cost if
  wrong:_ stage 5 rewrites `composition.mdx`'s group section again.
- **R22 — `validators` stay off every bound field.** §4 scenario 5 writes
  `<form.RatingField validators={…} />`; registered fields keep `validate` only, as `form.Field` does
  (R18). Nothing to implement; the docs show `validate`.
- **R23 — `withFieldGroup` is module-level for now.** It is the same function in every bundle, as
  `FormProvider` is (R2). Stage 5 gives groups flat `group.X` fields over the bundle's registry and
  moves it into `createFormInternals` then. _Cost if wrong:_ one move in stage 5.
- **R24 — size.** `form-react` sits at 9.55 / 10 kB. This stage adds the seam, the `Field`
  primitive and four group wrappers — estimated +0.5–0.9 kB gz. Task 7 measures and, if the entry
  exceeds 10 kB, retunes the limit to `ceil(measured × 1.15)` rounded up to the next 0.5 kB
  (expected **12 KB**), per `AGENTS.md`'s ~15% rule. The kits' budgets `ignore` `@ez-kit/form-react`
  and this stage adds only type exports to them, so `form-heroui` (4.42 / 4.5 kB) and `form-shadcn`
  must not move; if either does, that is a defect, not a retune.

## Review Focus

1. **React StrictMode, and a form whose `formId` changes.** Expected: `form.NativeField` still
   renders TanStack's field (a `FieldApi` in the render prop) and `form.Field` ours — never our
   `Field` captured as "native". Pinned in Task 2.
2. **Typing into a `form.Field` control while a sibling `Subscribe` re-renders the parent.**
   Expected: the same `<input>` element keeps focus (no remount from a fresh component identity).
   Pinned in Task 4.
3. **Group-relative paths beyond the simple case** — a `fields` map on `withFieldGroup`, and a
   `form.FormGroup` over an array branch. Expected: `group.Field` / `group.NativeField` write the
   mapped path (`billingCity`) and the indexed path (`tags[0].label`). Pinned in Tasks 3 and 4.
4. **Spreading the rest of `form.Field`'s render props onto a plain `<input>`**, as §4 scenario 4
   does after taking out `value`, `onChange`, `errors`, `invalid`. Expected: no React warning about
   an unknown DOM attribute. Pinned in Task 4.
5. **A `form.Field` with `validate` that fails before the user touched it, then on submit.**
   Expected: no error shown while untouched, the error shown after a submit attempt, `invalid`
   true — the same display rule every field follows. Pinned in Task 4.

---

### Task 1: Stage 2 leftovers — own-key lookups and a stale docblock

**Files:**

- Modify: `packages/form/react/react/src/schema/required-components.ts:126`
- Modify: `packages/form/react/react/src/schema/render-node.tsx:290` and `:552`
- Modify: `packages/form/react/react/src/schema/schema-form.tsx:~114` (docblock only)
- Test: `packages/form/react/react/src/schema/missing-components.test.tsx`,
  `packages/form/react/react/src/schema/registries.test.tsx`
- Create: `.changeset/form-schema-own-keys.md`

**Interfaces:** none produced. Every later task relies only on the suite staying green.

The up-front walk (`assertFieldKind`) and the render-time lookups of a custom field kind and of a
block component index a plain object with a document string, so `toString`, `constructor`,
`valueOf` … resolve `Object.prototype` members: the walk lets an unregistered kind through, and the
render path calls the prototype function as a component. `build-field-components.tsx` documents the
same trap and already uses `Object.hasOwn`.

- [ ] **Step 1: Write the failing tests**

In `missing-components.test.tsx`, inside `describe('SchemaForm without the component a document
needs', …)`:

```tsx
it('does not resolve a custom field kind from Object.prototype', () => {
	const schema = {
		version: 1,
		children: [{ type: 'toString', name: 'name' }],
	} as FormSchema<Values, 'toString'>
	expect(() => {
		render(
			<FieldsOnly
				schema={schema}
				{...COMMON}
			/>,
		)
	}).toThrow(
		'SchemaForm: the document has a field of type "toString", but no component registered in fields derives that type id.',
	)
})
```

In `registries.test.tsx`, after `'a block renders without binding to any value'` (reuse that file's
`SchemaForm`, `BlockValues` and imports; add `vi` and the console spy the file's other throwing
cases use, or `vi.spyOn(console, 'error').mockImplementation(() => undefined)` restored at the end):

```tsx
test('does not resolve a block component from Object.prototype', () => {
	const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
	const schema: FormSchema<BlockValues> = {
		version: 1,
		children: [{ type: 'block', component: 'toString' }],
	}

	expect(() => {
		render(
			<SchemaForm
				schema={schema}
				blocks={{}}
				defaultValues={{ name: '' }}
				onSubmit={() => {}}
			/>,
		)
	}).toThrow('Unknown block component "toString".')
	consoleError.mockRestore()
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/schema/missing-components.test.tsx src/schema/registries.test.tsx`
Expected: both FAIL — the first renders with no throw (or throws React's "Objects are not valid as a
React child"), the second renders the string `[object Object]`.

- [ ] **Step 3: Use own-key lookups**

`required-components.ts`, in `assertFieldKind`:

```ts
if (!Object.hasOwn(registered.custom, type)) throw new Error(missingCustomFieldMessage(type))
```

`render-node.tsx`, the custom-field branch:

```tsx
const CustomField =
	context.fields !== undefined && Object.hasOwn(context.fields, node.type) ? context.fields[node.type] : undefined
```

and the `block` case:

```tsx
const Block =
	context.blocks !== undefined && Object.hasOwn(context.blocks, node.component)
		? context.blocks[node.component]
		: undefined
```

Keep each existing `=== undefined` throw below the lookup; add one line above the custom lookup:
`// Own keys only: a document string such as "toString" must not resolve an Object.prototype member.`

- [ ] **Step 4: Fix the docblock**

`schema-form.tsx`, the `form` member of `SchemaFormControlledProps`: replace
``rather than `Unknown node type "rating"` at render`` with
`rather than SchemaForm's "no component registered in fields derives that type id" error before
the first render`.

- [ ] **Step 5: Run the tests and the package**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/schema` then `pnpm verify:affected`
Expected: PASS.

- [ ] **Step 6: Changeset and commit**

`.changeset/form-schema-own-keys.md`:

```md
---
'@ez-kit/form-react': patch
---

`SchemaForm` no longer resolves a custom field kind or a block component named after an
`Object.prototype` member (`toString`, `constructor`, …). Such a document now fails with the same
error as any unregistered kind instead of rendering the prototype function.
```

```bash
git add packages/form/react/react/src/schema/required-components.ts packages/form/react/react/src/schema/render-node.tsx packages/form/react/react/src/schema/schema-form.tsx packages/form/react/react/src/schema/missing-components.test.tsx packages/form/react/react/src/schema/registries.test.tsx .changeset/form-schema-own-keys.md
git commit -m "fix(form): resolve schema field kinds and blocks from own keys only"
```

---

### Task 2: The binding seam and `form.NativeField`

**Files:**

- Create: `packages/form/react/react/src/field-binding.tsx`
- Modify: `packages/form/react/react/src/kit-form.ts` (`NativeMembers`, `NativeFieldOf`, `BoundForm`)
- Modify: `packages/form/react/react/src/create-form.tsx` (`useForm`)
- Modify: `packages/form/react/react/src/build-field-components.tsx` (entries carry `NativeField`)
- Modify: `packages/form/react/react/src/field-props.ts` (`ArrayItemScope`)
- Modify: `packages/form/react/react/src/reserved-keys.ts` (derive `NativeField`)
- Test: create `packages/form/react/react/src/field-binding.test.tsx`,
  `packages/form/react/react/src/native-field.test.tsx`
- Create: `.changeset/form-field-primitives.md`

**Interfaces:**

- Produces (internal, `field-binding.tsx`):
  `type NativeFieldLike = (props: { name: string; validators?: BoundFieldValidators | undefined; children: (field: BoundFieldApi) => ReactNode }) => ReactNode`,
  `function createFieldBinding(NativeField: NativeFieldLike): BindableForm['AppField']`,
  `function nativeMembersOf(form: { Field: NativeFieldLike; NativeField?: NativeFieldLike }): { NativeField: NativeFieldLike; AppField: BindableForm['AppField'] }`.
- Produces (types, `kit-form.ts`, exported from `index.ts` only through `FormInstance`):
  `type NativeMembers<TForm> = { NativeField: TForm extends { Field: infer TField } ? TField : never }`,
  `type NativeFieldOf<TFormData>` = TanStack's `FieldComponent<TFormData, …eleven open params>`.
- Produces on every instance: `form.NativeField` (TanStack's `Field`, unchanged type) and an
  `AppField` that is the seam. `item.NativeField` on every array entry (item-relative).
- `BindableForm['AppField']` is unchanged: every bound field, `form.Field` included, hands it the
  `BoundFieldValidators` `fieldValidators` builds.

- [ ] **Step 1: Write the failing tests**

`native-field.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { ReactNode } from 'react'

type Values = { email: string; tags: { label: string }[] }
const DEFAULTS: Values = { email: '', tags: [{ label: '' }] }

const { Form, useForm } = createForm({ FormElement: testFormElement, fields: testFields, components: testComponents })

function NativeCase({ onSubmit }: { onSubmit: (value: Values) => void }): ReactNode {
	const form = useForm({
		defaultValues: DEFAULTS,
		onSubmit: ({ value }) => {
			onSubmit(value)
		},
	})
	return (
		<Form form={form}>
			<form.NativeField name='email'>
				{(field) => (
					<input
						aria-label='native email'
						value={field.state.value}
						onChange={(event) => {
							field.handleChange(event.target.value)
						}}
					/>
				)}
			</form.NativeField>
			<form.TextField
				name='email'
				label='Bound email'
			/>
			<form.SubmitButton>Save</form.SubmitButton>
		</Form>
	)
}

describe('form.NativeField', () => {
	it("is TanStack's render-prop field, writing the form's value", async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<NativeCase onSubmit={onSubmit} />)

		await user.type(screen.getByLabelText('native email'), 'x@y.z')
		expect(screen.getByLabelText('Bound email')).toHaveValue('x@y.z')

		await user.click(screen.getByRole('button', { name: 'Save' }))
		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ email: 'x@y.z' }))
		})
	})

	it('stays native and keeps every bound field working under StrictMode', async () => {
		const user = userEvent.setup()
		render(
			<StrictMode>
				<NativeCase onSubmit={() => {}} />
			</StrictMode>,
		)

		await user.type(screen.getByLabelText('Bound email'), 'a')
		expect(screen.getByLabelText('native email')).toHaveValue('a')
	})

	it('is item-relative on an array entry', async () => {
		const user = userEvent.setup()
		function EntryCase(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })
			return (
				<Form form={form}>
					<form.Array
						name='tags'
						newItem={{ label: '' }}
					>
						{({ items }) =>
							items.map((item) => (
								<item.NativeField
									key={item.key}
									name='label'
								>
									{(field) => (
										<input
											aria-label={`native ${field.name}`}
											value={field.state.value}
											onChange={(event) => {
												field.handleChange(event.target.value)
											}}
										/>
									)}
								</item.NativeField>
							))
						}
					</form.Array>
					<form.Subscribe selector={(state) => state.values.tags[0]?.label}>
						{(label) => <output>{label}</output>}
					</form.Subscribe>
				</Form>
			)
		}
		render(<EntryCase />)

		await user.type(screen.getByLabelText('native tags[0].label'), 'q')
		expect(screen.getByRole('status')).toHaveTextContent('q')
	})

	it("keeps TanStack's type", () => {
		function Probe(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })
			expectTypeOf<Parameters<Parameters<typeof form.NativeField>[0]['children']>[0]>().toHaveProperty('state')
			return null
		}
		expectTypeOf(Probe).toBeFunction()
	})
})
```

If `Parameters<…>['children']` resolves to a union with `ReactNode` and the assertion does not
type-check, narrow with `Extract<…, (...args: never[]) => unknown>` — note the change in the report.

`field-binding.test.tsx` — the architecture test: every bound field passes the seam, `NativeField`
does not. It wraps the real seam through `vi.mock`, so it watches the module `create-form.tsx`
imports:

```tsx
import { FormFieldType } from '@ez-kit/form-core'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { createSchemaForm } from './create-schema-form'
import { defineFieldType } from './field-registry'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { FormSchema } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

const bound = vi.hoisted(() => [] as string[])

vi.mock('./field-binding', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./field-binding')>()
	return {
		...actual,
		createFieldBinding: (NativeField: Parameters<typeof actual.createFieldBinding>[0]) => {
			const Seam = actual.createFieldBinding(NativeField)
			return function RecordingSeam(props: Parameters<typeof Seam>[0]): ReactNode {
				bound.push(props.name)
				return <Seam {...props} />
			}
		},
	}
})

type Values = { email: string; score: number; seats: number; tags: { label: string }[] }
const DEFAULTS: Values = { email: '', score: 0, seats: 1, tags: [{ label: '' }] }

const RatingField = defineFieldType<Record<never, never>, number>()(function Rating(): ReactNode {
	return null
})

describe('the binding seam', () => {
	it('binds every bound field kind and leaves NativeField alone', () => {
		bound.length = 0
		const { Form } = createForm({
			FormElement: testFormElement,
			fields: { ...testFields, RatingField },
			components: testComponents,
		})
		render(
			<Form defaultValues={DEFAULTS}>
				{(form) => (
					<>
						<form.TextField name='email' />
						<form.RatingField name='score' />
						<form.NativeField name='seats'>{() => null}</form.NativeField>
						<form.ArrayField
							name='tags'
							newItem={{ label: '' }}
						>
							{({ items }) =>
								items.map((item) => (
									<item.TextField
										key={item.key}
										name='label'
									/>
								))
							}
						</form.ArrayField>
					</>
				)}
			</Form>,
		)

		expect(bound).toEqual(expect.arrayContaining(['email', 'score', 'tags', 'tags[0].label']))
		expect(bound).not.toContain('seats')
	})

	it('binds a schema document field', () => {
		bound.length = 0
		const { SchemaForm } = createSchemaForm({ FormElement: testFormElement, fields: testFields })
		const schema: FormSchema<{ name: string }> = { version: 1, children: [{ type: FormFieldType.Text, name: 'name' }] }
		render(
			<SchemaForm
				schema={schema}
				defaultValues={{ name: '' }}
				onSubmit={() => {}}
			/>,
		)
		expect(bound).toContain('name')
	})
})
```

`import('./field-binding')` inside a type argument is an inline type import, which lint forbids:
write `import type * as FieldBindingModule from './field-binding'` at the top and
`importOriginal<typeof FieldBindingModule>()`. Write the schema node's type as `FormFieldType.Text`
(value import from `@ez-kit/form-core`, as `missing-components.test.tsx` does), not the string
`'text'`.

The same file also pins a minor deferred in stage 2's ledger (Task 5: no identity-across-rerender
test for members put on the instance): the `form.NativeField` / `form.AppField` identities are stable across a parent re-render (capture
`form.NativeField` in two renders of a component that re-renders through a `useState` toggle and
`expect(first).toBe(second)`).

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/native-field.test.tsx src/field-binding.test.tsx`
Expected: FAIL — `form.NativeField` is undefined; `./field-binding` does not exist.

- [ ] **Step 3: Write the seam**

`packages/form/react/react/src/field-binding.tsx`:

```tsx
'use client'

import type { BindableForm, BoundFieldApi, BoundFieldValidators } from './bindable-form'
import type { ReactNode } from 'react'

/** TanStack's render-prop `Field`, at the shape this package calls it with. */
export type NativeFieldLike = (props: {
	name: string
	validators?: BoundFieldValidators | undefined
	children: (field: BoundFieldApi) => ReactNode
}) => ReactNode

/**
 * The one component every bound field reaches TanStack through.
 *
 * It replaces TanStack's own `AppField` on the instance (see `nativeMembersOf`), so the twelve
 * built-in binders, the generic binder of a registered field, `form.Field`, the fields of an array
 * entry and of a group, and the schema renderer's custom node all pass here — and only
 * `form.NativeField` does not. Behaviour that has to see every field a user can address through
 * this package attaches here rather than to each binder.
 */
export function createFieldBinding(NativeField: NativeFieldLike): BindableForm['AppField'] {
	return function FieldBinding({ name, validators, children }): ReactNode {
		return (
			<NativeField
				name={name}
				validators={validators}
			>
				{children}
			</NativeField>
		)
	}
}

/**
 * TanStack's `Field`, read once, and the seam built on it.
 *
 * Read **before** the instance's `Field` is replaced, and idempotently: TanStack's `AppField` and a
 * field group's members read `form.Field` at render, so once ours is assigned, reading `form.Field`
 * again would capture ours. A memo that re-runs on an instance it already augmented — React's
 * StrictMode double render — finds `NativeField` and keeps it.
 */
export function nativeMembersOf(form: { Field: NativeFieldLike; NativeField?: NativeFieldLike }): {
	NativeField: NativeFieldLike
	AppField: BindableForm['AppField']
} {
	const NativeField = form.NativeField ?? form.Field
	return { NativeField, AppField: createFieldBinding(NativeField) }
}
```

- [ ] **Step 4: Put both on the instance**

`create-form.tsx`, in `useForm`:

```tsx
		const form = useAppForm(formOptions)

		// TanStack's `Field`, captured before the assign below replaces the instance's `AppField`
		// with the binding seam — see `nativeMembersOf`.
		const native = useMemo(() => nativeMembersOf(form as unknown as Parameters<typeof nativeMembersOf>[0]), [form])

		const fieldComponents = useMemo(
			() => buildFieldComponents<TFormData>(form as unknown as BindableForm, native.NativeField, fields),
			// The form instance is stable for the lifetime of the component, so the field
			// components — and therefore the mounted inputs — are built exactly once.
			[form, native],
		)

		return useMemo(
			() =>
				Object.assign(form, native, fieldComponents, components) as unknown as KitFormApi<…unchanged…>,
			[form, native, fieldComponents],
		)
```

The binders read `form.AppField` when they render, which is after this assign, so they bind
through the seam with no change of their own. Say so in one line above `buildFieldComponents`.

`build-field-components.tsx`: add a parameter `NativeField: NativeFieldLike` after `form`, put it in
the record (`const fieldComponents = { ...built, NativeField, ...primitives } …`) and in
`entryKeys` (`[...Object.keys(built), …, 'Array', 'NativeField']`) so each entry scopes it like a
field. Update the function docblock: the record now carries `NativeField` for the entries' sake;
`Object.assign` in `useForm` writes the same value.

- [ ] **Step 5: Types**

`kit-form.ts`:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the validator parameters an entry's NativeField leaves open, as FormInstance does
type Open = any

/** The members this package adds that are TanStack's own, renamed: `NativeField` is TanStack's `Field`. */
export type NativeMembers<TForm> = { NativeField: TForm extends { Field: infer TField } ? TField : never }

/** TanStack's render-prop field over `TFormData`, with its form-level validator types left open. */
export type NativeFieldOf<TFormData> = FieldComponent<
	TFormData,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open
>
```

(`FieldComponent` is a type import from `@tanstack/react-form`.) `BoundForm` becomes
`TForm & NativeMembers<TForm> & FormFieldComponents<…> & FormPrimitives<…> & TComponents`.

`field-props.ts`, `ArrayItemScope`: intersect `& { NativeField: NativeFieldOf<TItem> }` (type import
from `./kit-form`), and add a line to its docblock: an entry carries `NativeField` too,
item-relative.

`reserved-keys.ts`: `| keyof NativeMembers<unknown>` replaces the hand-written `| 'NativeField'`;
the comment above the remaining `'Steps' | 'Step'` names stage 6 only. `RESERVED_FORM_KEYS` keeps its
`NativeField: true` entry under `// this package`.

- [ ] **Step 6: Run the tests and the package**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/native-field.test.tsx src/field-binding.test.tsx src/reserved-keys.test.tsx`, then `pnpm --filter @ez-kit/form-react typecheck`, then `pnpm verify:affected`
Expected: PASS. `create-form.test.tsx`'s "exposes AppField alongside the flat fields" still passes —
`AppField` is now the seam.

- [ ] **Step 7: Changeset and commit**

`.changeset/form-field-primitives.md` (Task 3 and Task 4 extend it):

```md
---
'@ez-kit/form-react': minor
---

Every form instance gains `form.NativeField`: TanStack's render-prop field, with its `FieldApi`, under
a new name. It is also on every array entry (`item.NativeField`, item-relative).
```

```bash
git add packages/form/react/react/src/field-binding.tsx packages/form/react/react/src/kit-form.ts packages/form/react/react/src/create-form.tsx packages/form/react/react/src/build-field-components.tsx packages/form/react/react/src/field-props.ts packages/form/react/react/src/reserved-keys.ts packages/form/react/react/src/native-field.test.tsx packages/form/react/react/src/field-binding.test.tsx .changeset/form-field-primitives.md
git commit -m "feat(form): bind every field through one seam and add form.NativeField"
```

---

### Task 3: The package's own group APIs, with `NativeField` on every group

**Files:**

- Create: `packages/form/react/react/src/group-types.ts`
- Create: `packages/form/react/react/src/field-groups.tsx` (`useFieldGroup`, `withFieldGroup`)
- Create: `packages/form/react/react/src/form-group.tsx` (`useFormGroup`, `createFormGroup`)
- Modify: `packages/form/react/react/src/kit-form.ts` (`BoundForm` omits and retypes `FormGroup`)
- Modify: `packages/form/react/react/src/create-form.tsx` (return our `withFieldGroup`; put our
  `FormGroup` on the instance)
- Modify: `packages/form/react/react/src/index.ts` (export ours instead of TanStack's)
- Modify: `packages/form/react/react/src/composition-types.test.tsx`
- Test: create `packages/form/react/react/src/field-groups.test.tsx`
- Modify: `.changeset/form-field-primitives.md`

**Interfaces:**

- Consumes: `NativeFieldOf<T>` (Task 2), the instance's `NativeField` and `AppField` (Task 2).
- Produces (`group-types.ts`, exported from `index.ts`):
  - `type FieldGroupInstance<TGroup, TSubmitMeta = never>` — TanStack's
    `AppFieldExtendedReactFieldGroupApi<unknown, TGroup, string | FieldsMap<unknown, TGroup>, Open×11, TSubmitMeta, NoInjectedComponents, NoInjectedComponents>`
    plus `{ NativeField: <that type>['Field'] }`. (Task 4 replaces its `Field`.)
  - `type FormGroupInstance<TFormData, TName extends DeepKeys<TFormData>>` —
    `FormGroupApi<TFormData, TName, DeepValue<TFormData, TName>, Open×21>` plus
    `{ NativeField: NativeFieldOf<DeepValue<TFormData, TName>> }`.
  - `type FormGroupProps<TFormData, TName extends DeepKeys<TFormData>>` — TanStack's
    `FormGroupOptions` minus `name` / `validators`, plus `name: TName`, `validators?` (one
    value-typed slot per trigger, see the code) and
    `children: (group: FormGroupInstance<TFormData, TName>) => ReactNode`.
  - `type FormGroupComponentOf<TFormData> = <const TName extends DeepKeys<TFormData>>(props: FormGroupProps<TFormData, TName>) => ReactNode`.
- Produces (values, exported from `index.ts`, re-exported unchanged by both kits):
  `useFieldGroup`, `useFormGroup` (ours, same names); `createForm(...).withFieldGroup` is ours.
- The instance's `FormGroup` is `FormGroupComponentOf<TFormData>`.

Why now, before `form.Field`: `Omit<…, 'FormGroup'>` on the instance is the first `Omit`, and from
that commit the instance no longer satisfies TanStack's `withFieldGroup` / `useFieldGroup` /
`useFormGroup` parameter types (R17). Shipping the wrappers in the same commit keeps every existing
call site compiling.

- [ ] **Step 1: Write the failing tests**

`field-groups.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { createForm } from './create-form'
import { useFieldGroup } from './field-groups'
import { useFormGroup } from './form-group'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { ReactNode } from 'react'

type Values = {
	email: string
	address: { city: string }
	billingCity: string
	tags: { label: string }[]
}
const DEFAULTS: Values = { email: '', address: { city: '' }, billingCity: '', tags: [{ label: '' }] }

const { Form, useForm, withFieldGroup } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

function NativeInput({
	field,
}: {
	field: { name: string; state: { value: string }; handleChange: (value: string) => void }
}): ReactNode {
	return (
		<input
			aria-label={field.name}
			value={field.state.value}
			onChange={(event) => {
				field.handleChange(event.target.value)
			}}
		/>
	)
}

function ValuesOutput({
	form,
}: {
	form: {
		Subscribe: (props: {
			selector: (state: { values: unknown }) => string
			children: (json: string) => ReactNode
		}) => ReactNode
	}
}): ReactNode {
	return (
		<form.Subscribe selector={(state) => JSON.stringify(state.values)}>
			{(json) => <output>{json}</output>}
		</form.Subscribe>
	)
}
```

If that structural `form` prop type does not accept the instance, inline the `form.Subscribe` in each
case instead. The cases, each rendering through `Form` with `defaultValues={DEFAULTS}` and asserting
on the `<output>` (`screen.getByRole('status')`):

1. `withFieldGroup` with `fields='address'`: `group.NativeField name='city'` typed into → the
   output contains `"address":{"city":"x"}`; the input's `aria-label` is `address.city`.
2. `withFieldGroup` with `fields={{ city: 'billingCity' }}`: the same group writes
   `"billingCity":"x"`.
3. `form.FormGroup name='address'`: `group.NativeField name='city'` writes `address.city`.
4. `form.FormGroup name='tags'`: `group.NativeField name='[0].label'` writes `tags[0].label`
   (aria-label `tags[0].label`).
5. `form.FormGroup` with `validators={{ onChange: ({ value }) => (value.city === '' ? 'City required' : undefined) }}`
   and `onGroupSubmit={spy}`: a button calling `group.handleSubmit()` after typing `x` calls the spy
   with `expect.objectContaining({ value: { city: 'x' } })`; with the field empty it does not.
6. `useFieldGroup({ form, fields: 'address', defaultValues: { city: '' } })` inside a component
   under `<FormProvider>`-less `Form form={form}` returns a group whose `NativeField` writes
   `address.city`, and the same object across a re-render (`expect(groups[0]).toBe(groups[1])`
   collected through a ref).
7. `useFormGroup({ form, name: 'address' })` returns a group with `NativeField` that writes
   `address.city`.

Type cases in the same file (`expectTypeOf` inside a never-rendered component, as
`composition-types.test.tsx` does):

```tsx
describe('group APIs — types', () => {
	it('take a form whose values hold an array, and reject a branch of another shape', () => {
		const Address = withFieldGroup({
			defaultValues: { city: '' },
			render: ({ group }) => (
				<group.NativeField name='city'>{(field) => <NativeInput field={field} />}</group.NativeField>
			),
		})

		function Parent(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })
			const group = useFieldGroup({ form, fields: 'address', defaultValues: { city: '' } })
			const branch = useFormGroup({ form, name: 'address' })
			expectTypeOf(group.state.values).toEqualTypeOf<{ city: string }>()
			expectTypeOf(branch.state.value).toEqualTypeOf<{ city: string }>()
			return (
				<>
					<Address
						form={form}
						fields='address'
					/>
					<Address
						form={form}
						// @ts-expect-error -- `email` is not a `{ city: string }` branch
						fields='email'
					/>
					<form.FormGroup name='address'>
						{(formGroup) => (
							<formGroup.NativeField
								// @ts-expect-error -- names are relative to the group
								name='address.city'
							>
								{() => null}
							</formGroup.NativeField>
						)}
					</form.FormGroup>
				</>
			)
		}
		expectTypeOf(Parent).toBeFunction()
	})
})
```

If `group.state.values` is not how TanStack's field group spells its values in 1.33.2, read
`FieldGroupApi.d.ts` and assert on the member it has; report the change.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/field-groups.test.tsx`
Expected: FAIL — the modules do not exist, `group.NativeField` is undefined.

- [ ] **Step 3: Types**

`group-types.ts` (checked by prototype in this shape, including the array-valued form):

```ts
import type { NoInjectedComponents, NativeFieldOf } from './kit-form'
import type {
	DeepKeys,
	DeepValue,
	FieldsMap,
	FormGroupApi,
	FormGroupAsyncValidateOrFn,
	FormGroupOptions,
	FormGroupValidateOrFn,
} from '@tanstack/form-core'
import type { AppFieldExtendedReactFieldGroupApi } from '@tanstack/react-form'
import type { ReactNode } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack's validator parameters, left open as FormInstance leaves them
type Open = any

type NativeFieldGroup<TGroup, TSubmitMeta> = AppFieldExtendedReactFieldGroupApi<
	unknown,
	TGroup,
	string | FieldsMap<unknown, TGroup>,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	TSubmitMeta,
	NoInjectedComponents,
	NoInjectedComponents
>

/** What `withFieldGroup`'s `render` and `useFieldGroup` hand back: TanStack's field group, plus `NativeField`. */
export type FieldGroupInstance<TGroup, TSubmitMeta = never> = NativeFieldGroup<TGroup, TSubmitMeta> & {
	/** TanStack's render-prop field, named through the group's `fields` (a path or a map). */
	NativeField: NativeFieldGroup<TGroup, TSubmitMeta>['Field']
}

type GroupValidator<TFormData, TName extends DeepKeys<TFormData>> =
	| undefined
	| FormGroupValidateOrFn<TFormData, TName, DeepValue<TFormData, TName>>
type GroupAsyncValidator<TFormData, TName extends DeepKeys<TFormData>> =
	| undefined
	| FormGroupAsyncValidateOrFn<TFormData, TName, DeepValue<TFormData, TName>>

/** What `form.FormGroup`'s render prop and `useFormGroup` hand back: TanStack's form group, plus `NativeField`. */
export type FormGroupInstance<TFormData, TName extends DeepKeys<TFormData>> = FormGroupApi<
	TFormData,
	TName,
	DeepValue<TFormData, TName>,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open,
	Open
> & {
	/** TanStack's render-prop field, with `name` relative to the group's own. */
	NativeField: NativeFieldOf<DeepValue<TFormData, TName>>
}

/**
 * `form.FormGroup`'s props: TanStack's group options with `name` and `validators` typed per call.
 * Each validator slot is the union of what TanStack accepts there, rather than a type parameter per
 * slot: inference of one parameter per slot through a nested object fails (measured), and the
 * value type the validator receives is what matters to an author.
 */
export type FormGroupProps<TFormData, TName extends DeepKeys<TFormData>> = Omit<
	FormGroupOptions<
		TFormData,
		TName,
		DeepValue<TFormData, TName>,
		Open,
		Open,
		Open,
		Open,
		Open,
		Open,
		Open,
		Open,
		Open,
		Open,
		Open,
		Open,
		Open,
		Open,
		Open,
		Open,
		Open,
		Open,
		Open,
		Open,
		Open
	>,
	'name' | 'validators'
> & {
	name: TName
	validators?: {
		onMount?: GroupValidator<TFormData, TName>
		onChange?: GroupValidator<TFormData, TName>
		onChangeAsync?: GroupAsyncValidator<TFormData, TName>
		onBlur?: GroupValidator<TFormData, TName>
		onBlurAsync?: GroupAsyncValidator<TFormData, TName>
		onSubmit?: GroupValidator<TFormData, TName>
		onSubmitAsync?: GroupAsyncValidator<TFormData, TName>
		onDynamic?: GroupValidator<TFormData, TName>
		onDynamicAsync?: GroupAsyncValidator<TFormData, TName>
	}
	children: (group: FormGroupInstance<TFormData, TName>) => ReactNode
}

export type FormGroupComponentOf<TFormData> = <const TName extends DeepKeys<TFormData>>(
	props: FormGroupProps<TFormData, TName>,
) => ReactNode
```

Count the `Open` arguments against TanStack's declarations (`FormGroupApi` / `FormGroupOptions`
take 24 type parameters, `AppFieldExtendedReactFieldGroupApi` 16) — Prettier will put one per line.
If TanStack's `FormGroupValidators` lacks `onDynamic*`, drop those two keys.

`kit-form.ts`, `BoundForm`:
`Omit<TForm, 'FormGroup'> & { FormGroup: FormGroupComponentOf<TFormData> } & NativeMembers<TForm> & …`,
with a docblock paragraph on R17: why `Omit`, and that it is why the group APIs are this package's.

- [ ] **Step 4: Field groups**

`field-groups.tsx`:

```tsx
'use client'

import { useFieldGroup as useTanStackFieldGroup } from '@tanstack/react-form'
import { useMemo } from 'react'

import type { NoRegistry } from './contract'
import type { FormInstance } from './form-instance'
import type { FieldGroupInstance } from './group-types'
import type { DeepKeysOfType, FieldsMap } from '@tanstack/form-core'
import type { PropsWithChildren, ReactNode } from 'react'

/** What `useFieldGroup` and a `withFieldGroup` block take: the parent form and where the group lies in it. */
export type FieldGroupOptions<TFormData, TGroup> = {
	form: FormInstance<TFormData, NoRegistry, NoRegistry>
	fields: DeepKeysOfType<TFormData, TGroup | null | undefined> | FieldsMap<TFormData, TGroup>
	defaultValues?: TGroup
}

type GroupSource = {
	form: { NativeField: (props: object) => ReactNode }
	getFormFieldOptions: <TOptions extends { name: string }>(props: TOptions) => TOptions
}

/**
 * TanStack's field group, plus `NativeField`.
 *
 * TanStack's own hook, re-exported until now, types `form` as its `FormApi`, which the instance no
 * longer satisfies once `Field` and `FormGroup` are retyped with `Omit` (a `private` member does not
 * survive it). The group itself is TanStack's, created once per component; `NativeField` maps
 * `name` through the group's `fields` with TanStack's own `getFormFieldOptions` and renders the
 * form's `NativeField`.
 */
export function useFieldGroup<TFormData, TGroup>(
	options: FieldGroupOptions<TFormData, TGroup>,
): FieldGroupInstance<TGroup> {
	const group = useTanStackFieldGroup(options as never) as unknown as GroupSource
	return useMemo(() => {
		const NativeField = (props: { name: string }): ReactNode => (
			<group.form.NativeField {...group.getFormFieldOptions(props)} />
		)
		return Object.assign(group, { NativeField })
	}, [group]) as unknown as FieldGroupInstance<TGroup>
}

/**
 * A reusable block of fields, typed by its own shape and placed in any form through `fields`.
 *
 * Built on `useFieldGroup` rather than on TanStack's `withFieldGroup` for the reason `useFieldGroup`
 * gives. It is the same function in every bundle until stage 5 gives groups the bundle's flat fields.
 */
export function withFieldGroup<TGroup, TSubmitMeta = never, TRenderProps extends object = Record<never, never>>({
	render,
	props,
	defaultValues,
}: {
	defaultValues?: TGroup
	props?: TRenderProps
	render: (
		props: PropsWithChildren<NoInfer<TRenderProps> & { group: FieldGroupInstance<TGroup, TSubmitMeta> }>,
	) => ReactNode
}): <TFormData>(params: PropsWithChildren<NoInfer<TRenderProps> & FieldGroupOptions<TFormData, TGroup>>) => ReactNode {
	return function FieldGroupBlock(params) {
		const group = useFieldGroup({ form: params.form, fields: params.fields, defaultValues })
		return render({ ...props, ...params, group } as never)
	}
}
```

The `as never` on `render`'s argument stands for the spread of two generic object types, which
TypeScript cannot prove equal to the declared props; say so in a one-line comment. If
`TSubmitMeta` is reported by `no-unnecessary-type-parameters`, keep it and add a scoped disable
with the reason "TanStack's submit meta, named by the caller", or drop it and use `never` — report
which. `useFieldGroup` reads TanStack's group only on its first render, as TanStack's does: a
changed `fields` after mount is not picked up (unchanged behaviour; one line in the docblock).

- [ ] **Step 5: Form groups**

`form-group.tsx`:

```tsx
'use client'

import { concatenatePaths } from '@tanstack/form-core'
import { useFormGroup as useTanStackFormGroup } from '@tanstack/react-form'
import { useMemo } from 'react'

import type { NoRegistry } from './contract'
import type { FormInstance } from './form-instance'
import type { FormGroupComponentOf, FormGroupInstance, FormGroupProps } from './group-types'
import type { DeepKeys } from '@tanstack/form-core'
import type { ReactNode } from 'react'

type NameScoped = (props: { name: string }) => ReactNode

/** `Inner` with `name` read relative to `prefix` — `[0].label` under `tags` is `tags[0].label`. */
export function scopeName(Inner: NameScoped, prefix: string): NameScoped {
	return function Scoped(props) {
		return (
			<Inner
				{...props}
				name={concatenatePaths(prefix, props.name)}
			/>
		)
	}
}

/**
 * TanStack's form group over the branch `name`, plus `NativeField` relative to it.
 *
 * TanStack's group object is rebuilt on every change of its state, so the members are built once
 * per form and name and written onto each new object.
 */
export function useFormGroup<TFormData, const TName extends DeepKeys<TFormData>>(
	options: Omit<FormGroupProps<TFormData, TName>, 'children'> & {
		form: FormInstance<TFormData, NoRegistry, NoRegistry>
	},
): FormGroupInstance<TFormData, TName> {
	const group = useTanStackFormGroup(options as never) as unknown as object
	const native = (options.form as unknown as { NativeField: NameScoped }).NativeField
	const members = useMemo(() => ({ NativeField: scopeName(native, options.name) }), [native, options.name])
	return useMemo(() => Object.assign(group, members), [group, members]) as unknown as FormGroupInstance<
		TFormData,
		TName
	>
}

/** `form.FormGroup`: `useFormGroup` over this form, rendering `children(group)`. */
export function createFormGroup<TFormData>(
	form: FormInstance<TFormData, NoRegistry, NoRegistry>,
): FormGroupComponentOf<TFormData> {
	return function FormGroup({ children, ...options }: FormGroupProps<TFormData, DeepKeys<TFormData>>): ReactNode {
		const group = useFormGroup({ ...options, form })
		return children(group)
	} as FormGroupComponentOf<TFormData>
}
```

- [ ] **Step 6: Wire them in**

`create-form.tsx`:

- import `withFieldGroup` from `./field-groups` and `createFormGroup` from `./form-group`; drop
  `withFieldGroup` from the `createFormHook` destructure;
- in `useForm`, add the instance's group before the assign —
  `const FormGroup = useMemo(() => createFormGroup(form as unknown as FormInstance<TFormData, NoRegistry, NoRegistry>), [form])`
  — and assign it: `Object.assign(form, native, { FormGroup }, fieldComponents, components)`;
- replace the closing comment about re-exporting TanStack's `withFieldGroup` with one line: the
  bundle's `withFieldGroup` is the package's (`field-groups.tsx`).

`createFormGroup` reads `form.NativeField` when a group renders, which is after the assign.

`index.ts`: replace `export { useFieldGroup, useFormGroup, useSelector } from '@tanstack/react-form'`
with `export { useSelector } from '@tanstack/react-form'`, `export { useFieldGroup } from './field-groups'`
and `export { useFormGroup } from './form-group'`; add
`export type { FieldGroupInstance, FormGroupInstance, FormGroupProps } from './group-types'` and
`export type { FieldGroupOptions } from './field-groups'`. `withFieldGroup` stays off the root, as
before — a bundle returns it. Update the comment above the old re-export: the two hooks are the
package's since the instance's `Field` / `FormGroup` are retyped. Add `FieldGroupOptions` to both
kits' type exports in Task 4 with the other new types.

`schema/form-wizard.tsx` keeps TanStack's `useFormGroup` under its existing cast — stage 6 rewrites
it; do not touch it.

`composition-types.test.tsx`, `describe('withFieldGroup — types')`: the docblock above it says the
group carries the native `group.Field` and no flat fields — change it to "a group carries TanStack's
`Field` (stage 4 makes it ours) and `NativeField`, and no flat fields (stage 5)", and add
`expectTypeOf(group.NativeField).toBeFunction()` to the existing case.

- [ ] **Step 7: Run the tests and the package**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/field-groups.test.tsx src/composition-types.test.tsx src/form-instance.test.tsx src/schema`, then `pnpm --filter @ez-kit/form-react typecheck`, then `pnpm verify:affected`
Expected: PASS — including `form-instance.test.tsx`'s "is the parent form of a field group" and
"describes a kit-like bundle" (the withForm-with-validators case from stage 1/5 must not change).

- [ ] **Step 8: Changeset and commit**

Append to `.changeset/form-field-primitives.md`:

```md
Every group gains `NativeField` too: `withFieldGroup` and `useFieldGroup` groups (names mapped
through `fields`), and `form.FormGroup` and `useFormGroup` groups (names relative to the group's
`name`). `useFieldGroup`, `useFormGroup` and the bundle's `withFieldGroup` are now this package's own,
taking the form instance `useForm` returns; they no longer accept a TanStack `FormApi` built
elsewhere, nor a group as another group's `form`.
```

```bash
git add packages/form/react/react/src/group-types.ts packages/form/react/react/src/field-groups.tsx packages/form/react/react/src/form-group.tsx packages/form/react/react/src/kit-form.ts packages/form/react/react/src/create-form.tsx packages/form/react/react/src/index.ts packages/form/react/react/src/composition-types.test.tsx packages/form/react/react/src/field-groups.test.tsx .changeset/form-field-primitives.md
git commit -m "feat(form)!: own the group APIs and give every group a NativeField"
```

---

### Task 4: `form.Field` — our binding of an author's control, everywhere

**Files:**

- Create: `packages/form/react/react/src/fields/field.tsx`
- Modify: `packages/form/react/react/src/field-render-props.ts` (`fieldControlProps`)
- Modify: `packages/form/react/react/src/fields/custom-field.tsx` (use `fieldControlProps`)
- Modify: `packages/form/react/react/src/field-props.ts` (`FieldProps`, `FieldControlProps`,
  `BoundFieldComponent`, `FormPrimitives.Field`, `EntryUnscopedKey`)
- Modify: `packages/form/react/react/src/field-registry.ts` (`PRIMITIVE_KEYS.Field`)
- Modify: `packages/form/react/react/src/build-field-components.tsx` (`primitives.Field`, entry key)
- Modify: `packages/form/react/react/src/kit-form.ts` (`Omit<TForm, 'Field' | 'FormGroup'>`)
- Modify: `packages/form/react/react/src/group-types.ts`, `field-groups.tsx`, `form-group.tsx`
  (`Field` on every group)
- Modify: `packages/form/react/react/src/index.ts`, `packages/form/react/shadcn/src/index.ts`,
  `packages/form/react/heroui/src/index.ts` (type exports)
- Modify: `packages/form/react/react/src/create-form.test.tsx` (the native case moves to
  `NativeField`; a `form.Field` case is added), `packages/form/react/react/src/field-binding.test.tsx`
- Test: create `packages/form/react/react/src/field.test.tsx`, `packages/form/react/react/src/field-types.test.tsx`
- Modify: `.changeset/form-field-primitives.md` (now also names both kits)

**Interfaces:**

- Consumes: the seam (Task 2), `FieldGroupInstance` / `FormGroupInstance` / `scopeName` (Task 3).
- Produces (`field-props.ts`, exported from `index.ts` and both kits):

```ts
export type FieldControlProps<TValue> = FieldRenderProps & {
	value: TValue
	onChange: (value: TValue) => void
}

export type FieldProps<TFormData, TName extends DeepKeys<TFormData>> = {
	name: TName
	validate?: FieldValidateProps
	label?: ReactNode
	description?: ReactNode
	disabled?: boolean
	required?: boolean
	children: (field: FieldControlProps<DeepValue<TFormData, TName>>) => ReactNode
}

export type BoundFieldComponent<TFormData> = <const TName extends DeepKeys<TFormData>>(
	props: FieldProps<TFormData, TName>,
) => ReactNode
```

- `FormPrimitives<TFormData>` gains `Field: BoundFieldComponent<TFormData>`; the instance,
  `item.Field`, `group.Field` (both group kinds, relative) are `BoundFieldComponent<…>`.
- `fieldControlProps(field, fieldType, chrome): FieldControlProps<unknown>` in
  `field-render-props.ts` — the one place a bound control's props are assembled for both the
  generic binder and `form.Field`.
- Exported names added to both kits' `export type { … } from '@ez-kit/form-react'`:
  `BoundFieldComponent`, `FieldControlProps`, `FieldGroupInstance`, `FieldGroupOptions`, `FieldProps`,
  `FormGroupInstance`, `FormGroupProps`.

- [ ] **Step 1: Write the failing tests**

`field.test.tsx` — every case renders through the test kit; `SeatPicker` is a plain control:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { MockInstance } from 'vitest'
import type { ReactNode } from 'react'

type Values = {
	seats: number
	guest: string
	address: { city: string }
	billingCity: string
	tags: { label: string }[]
}
const DEFAULTS: Values = { seats: 0, guest: '', address: { city: '' }, billingCity: '', tags: [{ label: '' }] }

const { Form, withFieldGroup } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})
```

Every case renders a `form.Subscribe` `<output>` of `JSON.stringify(state.values)` inside the
`Form` render prop and asserts on `screen.getByRole('status')`. Cases:

1. **Render props.** `<form.Field name='guest'>{(field) => …}</form.Field>` hands
   `name: 'guest'`, `id: 'guest'`, `'data-field': 'guest'`, `'data-field-type': 'field'`,
   `value: ''`, `errors: []`, `invalid: false`; the test captures the object through a `vi.fn()` and
   asserts `expect.objectContaining({ … })`. `onChange('Ann')` writes `guest` (output shows `"guest":"Ann"`).
2. **`validate`, display rule (Review Focus 5).**
   `validate={{ min: 1, messages: { min: 'At least one seat' } }}` on `seats` (default `0`): typing nothing → no `role='alert'`; click the test kit's submit button → the author's
   `{invalid && <p role='alert'>{errors.join(', ')}</p>}` shows `At least one seat`.
3. **`validate.required` marks and enforces.** `validate={{ required: true }}` on `guest`: the
   render prop has `required: true` before any input; a button calling `onBlur()` shows the
   required message in the author's alert; `onChange('Ann')` clears it. A second `form.Field` with
   only `required` (no `validate`) gets `required: true` and never an error — the same split
   `BaseFieldProps` documents.
4. **Spread onto a DOM element (Review Focus 4).** §4 scenario 4 verbatim with `<input>` for
   `SeatPicker`:

```tsx
<form.Field name='seats'>
	{({ value, onChange, errors, invalid, ...field }) => (
		<>
			<input
				{...field}
				type='number'
				value={value}
				onChange={(event) => {
					onChange(Number(event.target.value))
				}}
			/>
			{invalid && <p role='alert'>{errors.join(', ')}</p>}
		</>
	)}
</form.Field>
```

with `consoleError = vi.spyOn(console, 'error')` (no mock implementation) set in `beforeEach`;
after typing `3`, `expect(consoleError).not.toHaveBeenCalled()`. 5. **Identity (Review Focus 2).** A `form.Field` on `guest` rendering an `<input aria-label='guest'>`
next to a `form.Subscribe` that renders the whole values JSON: type `abc`; the element returned
by `screen.getByLabelText('guest')` before typing `toBe` the one after, and it is
`document.activeElement`. 6. **Array entry.** `form.Array name='tags'` with `item.Field name='label'` → writes `tags[0].label`,
`'data-field'` is `tags[0].label`. 7. **Field group, path and map (Review Focus 3).** `withFieldGroup({ defaultValues: { city: '' }, render: ({ group }) => <group.Field name='city'>…</group.Field> })`
placed with `fields='address'` writes `address.city`; placed with `fields={{ city: 'billingCity' }}`
writes `billingCity`. 8. **Form group, nested and array branch (Review Focus 3).** `form.FormGroup name='address'` →
`group.Field name='city'` writes `address.city`; `form.FormGroup name='tags'` →
`group.Field name='[0].label'` writes `tags[0].label`.

Extend `field-binding.test.tsx`'s first case with `form.Field name='guest'` (add `guest` to its
values), `item.Field` on `tags`, a `withFieldGroup` block's `group.Field` on `address.city` and a
`form.FormGroup`'s `group.Field` on `address.city`, and expect them in `bound`; `seats` (the
`NativeField`) still absent.

`field-types.test.tsx`:

```tsx
import { describe, expectTypeOf, it } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { FieldControlProps } from './field-props'
import type { ReactNode } from 'react'

type Values = { email: string; seats: number; address: { city: string }; tags: { label: string }[] }
const DEFAULTS: Values = { email: '', seats: 1, address: { city: '' }, tags: [] }

const { useForm, withFieldGroup } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

type ChildOf<T> = T extends { children: (field: infer TField) => unknown } ? TField : never

describe('form.Field — types', () => {
	it("hands the control's props, not a FieldApi — a TanStack example does not compile", () => {
		function Probe(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })
			type FieldChild = ChildOf<Parameters<typeof form.Field>[0]>
			expectTypeOf<FieldChild>().toHaveProperty('value')
			expectTypeOf<FieldChild>().toHaveProperty('onChange')
			expectTypeOf<FieldChild>().not.toHaveProperty('state')
			expectTypeOf<ChildOf<Parameters<typeof form.NativeField>[0]>>().toHaveProperty('state')
			return (
				<>
					<form.Field
						name='seats'
						validate={{ min: 1 }}
					>
						{(field) => {
							expectTypeOf(field).toEqualTypeOf<FieldControlProps<number>>()
							return null
						}}
					</form.Field>
					<form.Field
						// @ts-expect-error -- not a path of Values
						name='nope'
					>
						{() => null}
					</form.Field>
				</>
			)
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('types group and entry fields relative to their branch', () => {
		const Address = withFieldGroup({
			defaultValues: { city: '' },
			render: ({ group }) => (
				<>
					<group.Field name='city'>{({ value }) => value}</group.Field>
					<group.Field
						// @ts-expect-error -- names are relative to the group
						name='address.city'
					>
						{() => null}
					</group.Field>
				</>
			),
		})
		function Probe(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })
			return (
				<>
					<Address
						form={form}
						fields='address'
					/>
					<form.FormGroup name='address'>
						{(group) => <group.Field name='city'>{({ value }) => value}</group.Field>}
					</form.FormGroup>
					<form.Array
						name='tags'
						newItem={{ label: '' }}
					>
						{({ items }) =>
							items.map((item) => (
								<item.Field
									key={item.key}
									name='label'
								>
									{({ value }) => value}
								</item.Field>
							))
						}
					</form.Array>
				</>
			)
		}
		expectTypeOf(Probe).toBeFunction()
	})
})
```

`Parameters<typeof form.Field>` instantiates the generic at its constraint, which is enough for
the member checks above. If `ChildOf` yields `never` because `children` is optional or a union,
apply `NonNullable` first; report it.

`create-form.test.tsx`: in the native case (`'keeps the native API'`-style test around line 470),
change `form.Field` → `form.NativeField` and its comment to "TanStack's render-prop field, as
`NativeField`". Add a sibling case that writes `email` through `form.Field` with an
`<input aria-label='bound email' value={value} onChange={(event) => { onChange(event.target.value) }} />`
and submits it — the same assertions.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/field.test.tsx src/field-binding.test.tsx src/create-form.test.tsx` and `pnpm --filter @ez-kit/form-react typecheck`
Expected: FAIL — `form.Field` hands a `FieldApi`, `group.Field` / `item.Field` are TanStack's or
missing, the type assertions fail.

- [ ] **Step 3: One assembler for a bound control's props**

`field-render-props.ts`:

```ts
/**
 * Everything a bound control receives: {@link fieldRenderProps} plus the value and a value-taking
 * `onChange`. The generic binder of a registered field adds the author's `props` bag to it; `form.Field`
 * hands it as is — which is what makes `form.Field` a one-off `defineFieldType` field.
 */
export function fieldControlProps(
	field: BoundFieldApi,
	fieldType: string,
	chrome: Parameters<typeof fieldRenderProps>[2],
): FieldControlProps<unknown> {
	return {
		...fieldRenderProps(field, fieldType, chrome),
		value: field.state.value,
		onChange: (value: unknown) => {
			// A control's value type is the author's, and `FieldValue` enumerates the built-in ones.
			field.handleChange(value as FieldValue)
		},
	}
}
```

`fields/custom-field.tsx`: render `<Component {...fieldControlProps(field, typeId, { label, description, disabled, required, validate })} props={authored} />`
and delete the inline `value` / `onChange` and their comment (now on `fieldControlProps`).

- [ ] **Step 4: The primitive**

`fields/field.tsx`:

```tsx
import { fieldControlProps } from '../field-render-props'
import { fieldValidators } from '../field-validate'

import type { BindableForm } from '../bindable-form'
import type { BoundFieldComponent, FieldControlProps } from '../field-props'
import type { FieldValidateProps } from '../field-validate'
import type { ReactNode } from 'react'

/** `data-field-type` of a control bound through `form.Field`, which registers no field kind. */
export const FIELD_PRIMITIVE_TYPE = 'field'

type LooseFieldProps = {
	name: string
	validate?: FieldValidateProps
	label?: ReactNode
	description?: ReactNode
	disabled?: boolean
	required?: boolean
	children: (field: FieldControlProps<unknown>) => ReactNode
}

/**
 * `form.Field`: an author's own control, bound like a registered field.
 *
 * Bound through `form.AppField` — the binding seam — exactly as the generic binder of a
 * `defineFieldType` field is, and handed the same props minus the `props` bag. `validate` runs and
 * marks `required` exactly as it does on every built-in field. `form` is anything with an `AppField`: the
 * instance, a field group (its `AppField` maps names through `fields`), or a scope that prefixes them.
 */
export function createField<TFormData>(form: Pick<BindableForm, 'AppField'>): BoundFieldComponent<TFormData> {
	return function Field({
		name,
		validate,
		label,
		description,
		disabled,
		required,
		children,
	}: LooseFieldProps): ReactNode {
		return (
			<form.AppField
				name={name}
				validators={fieldValidators(name, validate)}
			>
				{(field) =>
					children(
						fieldControlProps(field, FIELD_PRIMITIVE_TYPE, {
							label,
							description,
							disabled,
							required,
							validate,
						}),
					)
				}
			</form.AppField>
		)
	} as BoundFieldComponent<TFormData>
}
```

- [ ] **Step 5: On the instance and the entries**

- `field-registry.ts`: `PRIMITIVE_KEYS` gains `Field: true` (its `satisfies` now demands it).
- `field-props.ts`: add `FieldProps`, `FieldControlProps`, `BoundFieldComponent` (see Interfaces;
  `FieldValidateProps` is already imported there). Add a type case to `field-types.test.tsx`:
  `// @ts-expect-error -- form.Field takes validate, not TanStack's validators` on a `validators`
  attribute line. `FormPrimitives`
  gains `Field: BoundFieldComponent<TFormData>`. `EntryUnscopedKey` becomes
  `Exclude<keyof typeof PRIMITIVE_KEYS, 'Array' | 'Field'>`, and its docblock says an entry carries
  `Field` and `NativeField`, item-relative.
- `build-field-components.tsx`: `primitives` gains `Field: createField<TFormData>(form)`;
  `entryKeys` gains `'Field'`.
- `kit-form.ts`, `BoundForm`: `Omit<TForm, 'Field' | 'FormGroup'> & { FormGroup: … } & NativeMembers<TForm> & …`.
  `NativeMembers` must read `TForm['Field']` from the un-omitted `TForm` — it already does. Extend
  the R17 docblock: `Field` is omitted so TanStack's signature does not survive as an overload.

- [ ] **Step 6: On every group**

- `group-types.ts`: `FieldGroupInstance` becomes
  `Omit<NativeFieldGroup<TGroup, TSubmitMeta>, 'Field'> & { Field: BoundFieldComponent<TGroup>; NativeField: NativeFieldGroup<TGroup, TSubmitMeta>['Field'] }`;
  `FormGroupInstance` gains `Field: BoundFieldComponent<DeepValue<TFormData, TName>>`.
- `field-groups.tsx`, in the `useMemo`: `Field: createField({ AppField: group.AppField })` — TanStack's
  `group.AppField` maps the name through `fields` and renders the instance's `AppField`, the seam.
  Add `AppField` to `GroupSource`. TanStack's own `group.Field` reads the instance's `Field` — ours
  from this task — so it **must** be overwritten here; say so in the docblock.
- `form-group.tsx`, in `members`: `Field: createField({ AppField: scopeName(appField, options.name) })`
  where `appField` is read off `options.form` like `native` (widen the local cast to
  `{ NativeField: NameScoped; AppField: BindableForm['AppField'] }`; `scopeName` must accept the seam's
  props — type its parameter as a component taking `{ name: string }` plus anything, e.g.
  `<TProps extends { name: string }>(Inner: (props: TProps) => ReactNode, prefix: string)`).

- [ ] **Step 7: Exports**

`index.ts`: add `BoundFieldComponent`, `FieldControlProps`, `FieldProps` to the `./field-props`
type export. Both kits' `src/index.ts`: add `BoundFieldComponent`, `FieldControlProps`,
`FieldGroupInstance`, `FieldGroupOptions`, `FieldProps`, `FormGroupInstance`, `FormGroupProps` to the
`export type { … } from '@ez-kit/form-react'` list, alphabetically, identically in both.

- [ ] **Step 8: Run the tests, the package, and the parity / graph tests**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/field.test.tsx src/field-binding.test.tsx src/create-form.test.tsx src/field-groups.test.tsx`, `pnpm --filter @ez-kit/form-react typecheck`, `pnpm --filter @ez-kit/form-react test:react18`, then
`pnpm build --filter=...@ez-kit/form-core` and
`pnpm --filter @ez-kit/docs exec vitest run test/kit-exports-parity.test.ts test/form-package-graph.test.ts`,
then `pnpm verify:affected`.
Expected: PASS. `apps/docs` typecheck fails on `shared/form/examples/components/native-api.tsx`
(`field.state` on `form.Field`) — **expected here**; Task 6 rewrites that example. If
`verify:affected` stops there, record it in the report and continue: Task 6 must turn it green
before it commits.

- [ ] **Step 9: Changeset and commit**

`.changeset/form-field-primitives.md`: add `'@ez-kit/form-shadcn': minor` and
`'@ez-kit/form-heroui': minor` to the front matter (their type exports changed — R12), and append:

```md
**Breaking:** `form.Field` is no longer TanStack's field. It binds a control of your own the way a
registered field is bound: its render prop receives `id`, `name`, `value`, a value-taking `onChange`,
`onBlur`, `errors` (already filtered by the display rule), `invalid`, `data-field`, … — the props a
`defineFieldType` field gets — and it validates through `validate`, like every field of this package
(TanStack's `validators` stay on `form.NativeField`). It is also on every array entry
(`item.Field`) and every group (`group.Field`), with names relative to them. Code written against
TanStack's `form.Field` (`field.state.value`, `field.handleChange`) moves to `form.NativeField` and
no longer compiles in `form.Field`. Both kits export the new types `FieldProps`, `FieldControlProps`,
`BoundFieldComponent`, `FieldGroupInstance`, `FieldGroupOptions`, `FormGroupInstance` and
`FormGroupProps`.
```

```bash
git add packages/form/react/react/src packages/form/react/shadcn/src/index.ts packages/form/react/heroui/src/index.ts .changeset/form-field-primitives.md
git commit -m "feat(form)!: make form.Field bind an author's own control"
```

(`packages/form/react/react/src` as a directory is safe here: nothing outside this task's files
changed in it — check `git status --short packages/form/react/react/src` first.)

---

### Task 5: `useFormContext<TValues>()`

**Files:**

- Modify: `packages/form/react/react/src/form-context.tsx`
- Test: `packages/form/react/react/src/form-context.test.tsx`
- Modify: `.changeset/form-context.md` (pending, edited in place)

**Interfaces:**

- Produces:
  `type FormContextApi<TValues = unknown> = unknown extends TValues ? FormInstance<unknown, NoRegistry, NoRegistry> : FormInstance<TValues, AllFormFieldSlots, NoRegistry>`;
  `function useFormContext(): FormContextApi` and `function useFormContext<TValues>(): FormContextApi<TValues>`
  (overloads, checked by prototype against an implementation returning `AnyFormInstance`, with an
  array in the values).

- [ ] **Step 1: Write the failing tests**

Add to `form-context.test.tsx` (its `createForm` bundle registers `testFields`, so `TextField`
exists at runtime):

```tsx
it('types values, base API and built-in fields through the optional generic', () => {
	type Guest = { name: string; seats: number; tags: { label: string }[] }
	function Hint(): ReactNode {
		const form = useFormContext<Guest>()
		expectTypeOf(form.state.values).toEqualTypeOf<Guest>()
		return (
			<>
				<form.TextField name='name' />
				<form.TextField
					// @ts-expect-error -- `seats` holds a number
					name='seats'
				/>
				<form.Field name='seats'>{({ value }) => value.toFixed()}</form.Field>
				<form.Subscribe selector={(state) => state.values.seats}>{(seats) => seats.toFixed()}</form.Subscribe>
			</>
		)
	}
	expectTypeOf(Hint).toBeFunction()
})

it('without the generic keeps unknown values and no fields', () => {
	expectTypeOf<FormContextApi['state']['values']>().toEqualTypeOf<unknown>()
	expectTypeOf<FormContextApi>().not.toHaveProperty('TextField')
	expectTypeOf<FormContextApi<{ a: string }>>().toHaveProperty('TextField')
})

it('is a cast: the generic returns the same instance', () => {
	const seen: unknown[] = []
	function Probe(): ReactNode {
		seen.push(useFormContext(), useFormContext<{ email: string }>())
		return null
	}
	render(<Form defaultValues={{ email: '' }}>{() => <Probe />}</Form>)
	expect(seen[0]).toBe(seen[1])
})

it('is provided by <SchemaForm>', () => {
	const { SchemaForm } = createSchemaForm({ fields: testFields })
	const schema: FormSchema<{ name: string }> = { version: 1, children: [] }
	render(
		<SchemaForm
			schema={schema}
			defaultValues={{ name: 'Ann' }}
			onSubmit={() => {}}
		>
			<ValueProbe testId='probe' />
		</SchemaForm>,
	)
	expect(screen.getByTestId('probe').textContent).toBe('{"name":"Ann"}')
})
```

The last case closes a minor deferred in stage 2's ledger (Task 1: no test that `<SchemaForm>`
provides the context). Add `createSchemaForm` and `FormSchema` to the file's imports. If `SchemaForm`
takes no `children`, render `ValueProbe` through a `block` node
registered in `blocks` instead, and say so in the report. Remove the existing
`'returns the base API with unknown values'` case only if the second new case fully supersedes it.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @ez-kit/form-react typecheck` and `pnpm --filter @ez-kit/form-react exec vitest run src/form-context.test.tsx`
Expected: typecheck FAIL (`useFormContext` takes no type argument; `FormContextApi` is not generic).

- [ ] **Step 3: Implement**

`form-context.tsx`:

```tsx
/**
 * What `useFormContext()` returns.
 *
 * Without a type argument: the form's base API — `Subscribe`, `state`, `handleSubmit`, `Submit`,
 * `Array`, `Field`, `NativeField`, `FormGroup`, … — with values of type `unknown` and no kit fields.
 *
 * `FormContextApi<V>`: the same API typed over `V`, plus the kit's **built-in** fields with their
 * value-typed `name`. Custom fields and components are not on it: naming them would need the
 * bundle's registry, and a component the bundle registers cannot import the bundle (D6).
 */
export type FormContextApi<TValues = unknown> = unknown extends TValues
	? FormInstance<unknown, NoRegistry, NoRegistry>
	: FormInstance<TValues, AllFormFieldSlots, NoRegistry>

/** The nearest form above this component, as its base API with `unknown` values. */
export function useFormContext(): FormContextApi
/**
 * The nearest form above this component, typed as a form over `TValues`.
 *
 * **A cast, not a check:** nothing verifies that the form above has these values, or that the
 * bundle registered the built-in field a component calls. A component that names paths in one
 * form's data is better written with `withForm` or `withFieldGroup`, which are checked where they
 * are placed; this is for small helpers such as a hint beside a field.
 */
export function useFormContext<TValues>(): FormContextApi<TValues>
export function useFormContext(): AnyFormInstance {
	const form = useContext(FormContext)
	if (form === null) {
		throw new Error('useFormContext() must be called inside <Form>, <SchemaForm> or <FormProvider>.')
	}
	return form
}
```

(`AllFormFieldSlots` is a type import from `./contract`.) If the compiler reports TS2394 (overload
not compatible with implementation) once Task 4's `Omit` is in place, type the implementation's
return as `FormContextApi<any>` under a scoped `no-explicit-any` disable with the reason, and report
it — the prototype passed without it.

- [ ] **Step 4: Run the tests and the package**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/form-context.test.tsx`, `pnpm --filter @ez-kit/form-react typecheck`, `pnpm verify:affected`
Expected: PASS (apart from the `apps/docs` example failure Task 4 recorded, if Task 6 has not run).

- [ ] **Step 5: Changeset and commit**

Append to `.changeset/form-context.md`:

```md
`useFormContext<Values>()` takes an optional type argument: it types the values, the base API and
the kit's built-in fields by `name` over `Values`. It is a cast, not a check — nothing verifies that
the form above holds `Values` — so a component that names paths in one form's data is better written
with `withForm` or `withFieldGroup`.
```

```bash
git add packages/form/react/react/src/form-context.tsx packages/form/react/react/src/form-context.test.tsx .changeset/form-context.md
git commit -m "feat(form): type useFormContext over the form's values on request"
```

---

### Task 6: Docs, examples and the pending docs changeset

**Files:**

- Modify: `apps/docs/content/docs/form/native-api.mdx` (rewrite around `form.Field` / `form.NativeField`)
- Modify: `apps/docs/shared/form/examples/components/native-api.tsx` (and `manifest.json` /
  `registry.ts` only if an export name changes — see below)
- Modify: `apps/docs/test/docs-options/page-type-map.ts` (the native-api table's count, if it moves)
- Modify: `apps/docs/content/docs/form/basic-concepts.mdx:20-55`, `composition.mdx:92-120`,
  `validation.mdx:130`, `schema.mdx:226`, `custom-fields.mdx:56`, `reactivity.mdx:30`
- Modify: `apps/docs/shared/form/examples/components/reactivity.tsx:~31`,
  `apps/docs/shared/form/examples/components/composition.tsx:~54` (docblocks)
- Modify: `packages/form/react/react/README.md:46,104`, `packages/form/react/shadcn/README.md`
  (the `form.Field` lines), and the heroui README if the same grep finds it there
- Modify: `.changeset/form-docs-stage-2.md` (pending `@ez-kit/docs` changeset, edited in place)

**Interfaces:** none. Consumes the names Tasks 2–5 produced.

- [ ] **Step 1: Find every stale line**

Run:

```bash
grep -rn -E "(form|group|item)\.(Field|AppField)\b|native .?form\.Field|useFormContext\(\)" apps/docs/content apps/docs/shared packages/form/react/*/README.md | grep -v node_modules
```

Every hit that presents `form.Field` / `group.Field` as TanStack's render-prop field, or
`form.AppField` as something to use, is stale. Note each in the report with what it became.

- [ ] **Step 2: Rewrite the example first (it is what fails `apps/docs` typecheck)**

`native-api.tsx` — two controls, no comments, same export name `NativeApiExample` (so `manifest.json`
and `registry.ts` need no change):

```tsx
'use client'

import { Form } from 'shared/form/FormKit'

const SEAT_CHOICES = [1, 2, 3, 4]

export function NativeApiExample() {
	return (
		<Form defaultValues={{ guest: '', seats: 1, notes: '' }}>
			{(form) => (
				<>
					<form.TextField
						name='guest'
						label='Guest name'
					/>

					<form.Field
						name='seats'
						validate={{ min: 1, messages: { min: 'Pick at least one seat' } }}
					>
						{({ value, onChange, errors, invalid, id }) => (
							<div
								id={id}
								className='flex items-center gap-2'
							>
								<span className='text-sm'>Seats</span>
								{SEAT_CHOICES.map((count) => (
									<button
										key={count}
										type='button'
										aria-pressed={value === count}
										onClick={() => {
											onChange(count)
										}}
										className={
											value === count
												? 'rounded-md bg-black px-3 py-1 text-sm text-white dark:bg-white dark:text-black'
												: 'rounded-md border border-black/20 px-3 py-1 text-sm dark:border-white/25'
										}
									>
										{count}
									</button>
								))}
								{invalid && <p role='alert'>{errors.join(', ')}</p>}
							</div>
						)}
					</form.Field>

					<form.NativeField name='notes'>
						{(field) => (
							<textarea
								aria-label='Notes'
								value={field.state.value}
								onChange={(event) => {
									field.handleChange(event.target.value)
								}}
								onBlur={field.handleBlur}
								className='rounded-md border border-black/20 p-2 text-sm dark:border-white/25'
							/>
						)}
					</form.NativeField>

					<form.Subscribe selector={(state) => `${state.values.guest || '—'} · ${String(state.values.seats)} seat(s)`}>
						{(summary) => <p className='text-sm opacity-70'>{summary}</p>}
					</form.Subscribe>
				</>
			)}
		</Form>
	)
}
```

- [ ] **Step 3: Rewrite `native-api.mdx`**

- Front-matter `description`: "The flat fields are additive — form.Field binds a control of your
  own, form.NativeField is TanStack's field, and form.handleSubmit and form.state are still there."
- The table (rows checked against `FormInstance` by `docs-option-names`): `form.Field` — "Binds a
  control of your own like a registered field: `value`, `onChange`, `errors`, `invalid`, `id`.";
  `form.NativeField` — "TanStack's render-prop field, with its `FieldApi`."; `form.Subscribe`,
  `form.handleSubmit`, `form.state`, `form.setFieldValue` as today. **Drop** the `form.AppField` row
  (D5: not documented). Six rows; `page-type-map.ts`'s `expectedCount: 6` stays — if the count
  changes, update it and the comment above it.
- `## form.Field`: §4 scenario 4, written with `validate` — what the render prop gets (the
  `FieldControlProps` list), that it validates through `validate` like every field (a schema rule
  belongs on the form or a group, or on `form.NativeField`), that label and error output are the author's, that the errors arrive
  filtered by the display rule (shown once the field is touched or a submit was attempted), and
  "a control you need in several places → [`defineFieldType`](/docs/form/custom-fields)".
- `## form.NativeField`: when it is needed (field meta, `pushValue` and the rest of `FieldApi`), and
  the line from D5: it is a level below — this package's behaviour around fields does not see it.
  Say what that is **today** without naming future stages: it does not take part in the props
  assembly (`errors` filtering, `data-field`, `id`). One sentence that TanStack's own examples paste
  into `form.NativeField`, not `form.Field`, where they fail to compile.
- `## Groups and array entries`: `group.Field` / `group.NativeField` and `item.Field` /
  `item.NativeField` exist with the same meaning, names relative to the group or the entry.
- The closing paragraph about composition helpers: "`withFieldGroup`, `useFieldGroup` and
  `useFormGroup` are this package's own, taking the instance `useForm` returns" (replace "All four of
  TanStack's composition helpers … are shipped by your kit package, with `withForm` retyped").

- [ ] **Step 4: The other pages and READMEs**

- `basic-concepts.mdx`: the `form.Field // TanStack's, untouched` line becomes
  `form.NativeField // TanStack's field` plus a `form.Field // your own control, bound` line; the
  "form.Field: you render everything" example moves to `form.Field` with value-taking `onChange`
  (as in Step 2); the "Reach for form.Field when …" sentence stays true and stays.
- `composition.mdx:92`: a group API carries `group.Field` (bound, relative) and `group.NativeField`,
  not the flat field components — "flat fields inside a group are not available yet" is a promise,
  so write only what is true: "not the flat field components". `:98-103`: `useFieldGroup` /
  `useFormGroup` "return the same group, with `Field` and `NativeField`". `:112`: list `NativeField`
  among the base API, and add the optional generic: one paragraph and one snippet
  (`const form = useFormContext<SignUp>()`) with "a cast, not a check" and the advice to prefer
  `withForm` / `withFieldGroup` for components that name paths (D6's last bullet).
- `validation.mdx:130`: "…or drop to [`form.NativeField`](/docs/form/native-api#formnativefield),
  which accepts TanStack's own `validators`."
- `schema.mdx:226`: "Field-level validators through `form.NativeField` still compose with either
  mode".
- `custom-fields.mdx:56`: "rather than wiring `form.AppField` by hand" → "rather than writing a
  `form.Field` at every call site".
- `reactivity.mdx:30` and `reactivity.tsx:~31` docblock: "renders through `form.AppField`" →
  "subscribes to that one field's value and meta" (drop the internal member name).
- `composition.tsx:~54` docblock: the sentence about "the native `group.Field`" → what is true
  after Task 4 (a group carries `group.Field` and `group.NativeField`, no flat fields). Docblocks in
  example files are shown to readers too: keep them reader-facing.
- READMEs: `form.Field name='email'>{(field) => <input value={field.state.value} />}` →
  `form.NativeField …`; `native form.Field / form.AppField` → `form.NativeField`.

- [ ] **Step 5: Run the docs checks**

Run: `pnpm build --filter=...@ez-kit/form-core`, then
`pnpm --filter @ez-kit/docs exec vitest run test/docs-option-names.test.ts test/kit-exports-parity.test.ts test/form-package-graph.test.ts test/tree-shaking.test.ts`,
then `pnpm --filter @ez-kit/docs typecheck`, then `pnpm verify:affected`, then repeat the Step 1
grep — every remaining hit must be correct as written.
Expected: PASS.

- [ ] **Step 6: Changeset and commit**

Append to `.changeset/form-docs-stage-2.md`:

```md
Native API now documents `form.Field`, which binds a control of your own, and `form.NativeField`,
TanStack's field, on the form, on groups and on array entries; Composition documents the optional
type argument of `useFormContext`.
```

```bash
git add apps/docs/content/docs/form apps/docs/shared/form/examples/components/native-api.tsx apps/docs/shared/form/examples/components/reactivity.tsx apps/docs/shared/form/examples/components/composition.tsx apps/docs/test/docs-options/page-type-map.ts packages/form/react/react/README.md packages/form/react/shadcn/README.md packages/form/react/heroui/README.md .changeset/form-docs-stage-2.md
git commit -m "docs(form): document form.Field, form.NativeField and the typed form context"
```

(Drop a path from `git add` if the task did not change it.)

---

### Task 7: Stage gate

**Files:** `packages/form/react/react/package.json` only if the size check requires it.

- [ ] **Step 1: Full gate, sequentially**

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm size
```

Each its own command, in this order. A timeout-only failure that passes when its package runs alone
is the machine-load artefact `AGENTS.md` describes — rerun that package; do not change the test.

- [ ] **Step 2: Size (R24)**

Read `@ez-kit/form-react`'s "everything" entry from the `pnpm size` output. If it exceeds 10 KB,
set its `limit` to the measured size × 1.15, rounded up to the next 0.5 KB (expected `"12 KB"`),
rerun `pnpm --filter @ez-kit/form-react size`, and commit:

```bash
git add packages/form/react/react/package.json
git commit -m "build(form): retune form-react's size budget for the field primitives"
```

with the measured figure and the formula in the commit body. If `form-heroui` or `form-shadcn`
moved at all, stop and report it (R24 — it is a defect, not a retune). Also report the `helpers`
entry (466 / 500 B before this stage).

- [ ] **Step 3: Spec cross-check**

Confirm by grep, returning nothing outside `specs/`, plans, CHANGELOGs and changesets:

```bash
grep -rn -E "form\.Field\b[^']*\bstate\.value|form\.AppField" apps packages --include='*.ts' --include='*.tsx' --include='*.md' --include='*.mdx' | grep -v node_modules | grep -v /dist/ | grep -v CHANGELOG
grep -n "from '@tanstack/react-form'" packages/form/react/react/src/index.ts
```

The first must return only internal binder code under `packages/form/react/react/src` (the binders
render `form.AppField` by design) and no docs; the second only `useSelector`.

- [ ] **Step 4: Hand over for review**

Report to the user: the stage's commits, the gate output, the size figures, the rulings the
implementation had to bend (with the report lines), and anything the plan got wrong. Do not start
stage 4.

---

## Execution

Run with **superpowers:subagent-driven-development**. One fresh implementer per task, then that
task's reviewers in parallel, then fixes, before the next task starts. Tasks are strictly
sequential: each consumes the previous one's types.

**Ledger:** `.superpowers/sdd/2026-10-12-form-composition-stage-3/` — `plan-path`,
`global-constraints.md` (the Global Constraints section above, verbatim), `progress.md` (pre-flight
scan of every task pair's produces/consumes, then one line per dispatch, ruling, deferred minor and
completion, as stage 2's ledger does), `task-N-brief.md`, `task-N-report.md`, and a
`review-<base>..<head>.diff` per review. New rulings during execution continue the numbering at R25.

**Reviewers per task**, chosen by `~/.claude/rules/ecc/common/agents.md`, dispatched in one message:

| Task | `typescript-reviewer` | `react-reviewer`         | `type-design-analyzer`                                                                 |
| ---- | --------------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| 1    | yes                   | yes (`render-node.tsx`)  | —                                                                                      |
| 2    | yes                   | yes                      | — (no new public type beyond `NativeField` on the instance)                            |
| 3    | yes                   | yes                      | yes — `FieldGroupInstance`, `FormGroupInstance`, `FormGroupProps` are new public types |
| 4    | yes                   | yes                      | yes — `FieldProps`, `FieldControlProps`, `BoundFieldComponent`                         |
| 5    | yes                   | yes (`form-context.tsx`) | yes — the `useFormContext` generic, `FormContextApi<TValues>`                          |
| 6    | yes (`.tsx` example)  | yes                      | —                                                                                      |
| 7    | —                     | —                        | —                                                                                      |

Task 3 is on the `type-design-analyzer` list although the brief named only Tasks 4 and 5: it
introduces three public types. Each reviewer gets the task brief, the global constraints, the
implementer's report and the diff file, and reviews read-only. After Task 7, one whole-branch review
of the stage's range (`<stage base>..HEAD`) by `code-reviewer` before the hand-over.

**Implementer instructions that every brief repeats:** TDD — the failing run is evidence in the
report; type decisions that the plan does not spell out are prototyped with `tsc` on a throwaway
file and the file is deleted; `pnpm verify:affected` between edits; `git add` by path; no stash.
