# Form composition — stage 2: factory and context

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the form factory per spec 009 — a form context with `FormProvider` /
`useFormContext`, the headless `form.Submit`, an open and fully optional `createForm({ FormElement,
fields, components })`, `createSchemaForm` split off so a JSX app never pays for the schema renderer,
and kit roots that tree-shake — so stages 3–6 build on the final factory shape.

**Architecture:** The form context is one package-level React context in `@ez-kit/form-react`,
provided by `<Form>`, `<SchemaForm>` and `<FormProvider>` and read by `useFormContext()`. Kits stop
being "a `createForm` call that exports its result": every component is exported from `blocks/`,
the two sets (`allFormFields`, `allFormComponents`) are plain object literals, and the prebuilt
`useForm` / `Form` / `SchemaForm` live in the kit's `form.tsx` behind `/* @__PURE__ */` calls with
delegating exports, never read at module top level. `createForm` returns
`{ useForm, Form, FormProvider, withForm, withFieldGroup }` and imports nothing from `schema/`;
`createSchemaForm` builds on the same internals and adds `SchemaForm`.

**Tech Stack:** pnpm + Turborepo, TypeScript 5.9 (`strict`, `exactOptionalPropertyTypes`,
`noUncheckedIndexedAccess`), React 18/19, TanStack Form 1.33.2, tsup, Vitest + Testing Library,
esbuild (tree-shaking test), changesets.

**Spec:** `specs/009-form-composition/design.md` — D1, D2, D4, D6 (context, non-generic
`useFormContext`; the generic is stage 3), D5 (`form.Submit` only; `form.Field` / `form.NativeField`
are stage 3), §4, §5 (schema-path runtime errors), §7 rows for them.
Stage 1 plan, for the conventions already in place:
`docs/superpowers/plans/2026-10-12-form-composition-stage-1.md`.

## Stages of spec 009

All stages land on branch `form-check` in **one PR into `develop`**; the user reviews after each
stage, nothing is merged or pushed between stages.

1. Graph and names — **done** (D3, D8, D9, D11, D12; `useSelector` re-exported).
2. **Factory and context** (this plan): D1, D2, D4, D6 context, `form.Submit`, kit `SubmitButton`
   on `form.Submit`, `allFormFields` / `allFormComponents`, tree-shaking cases.
3. Field primitives: `form.Field`, `form.NativeField`, generic `useFormContext<TValues>()`.
4. Behaviour: D13, D14, D16, D17, D15 hydration test.
5. Composition: D7.
6. Steps: D18 and the schema wizard on `form.Steps`.
7. Docs sweep: `native-api.mdx`, `custom-fields.mdx`, second pass over stale claims.

## Global Constraints

- Code, comments, docblocks, commit messages: English. No agent attribution anywhere in git
  (`AGENTS.md`). Conventional Commits; pre-commit runs Prettier + ESLint on staged files;
  `--max-warnings=0`; never `--no-verify`.
- Type imports use `import type`; `import/order` is enforced; inline `import('…')` type annotations
  are forbidden by lint; `require-await` is on.
- Every breaking change is a **minor** bump in each package it touches (pre-1.0). One changeset per
  task, naming only the packages that task changes. A still-pending changeset that a task makes
  wrong is edited in place, not contradicted (`.changeset/form-field-registry.md` is one).
- Between edits run `pnpm verify:affected` (if it selects nothing after a commit, run
  `pnpm turbo run lint typecheck test --filter='...[HEAD~1]' --concurrency=2`). The stage gate runs
  `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm size` **sequentially**.
- Docs tests read **built** packages: `pnpm build --filter=...@ez-kit/form-core` before
  `pnpm --filter @ez-kit/docs exec vitest run <files>`. `expectTypeOf` assertions are enforced by
  `tsc` (`pnpm --filter <pkg> typecheck`), not by vitest at runtime.
- Both kits must keep identical value and type exports (`apps/docs/test/kit-exports-parity.test.ts`);
  a kit's built `.d.ts` must not name `@tanstack/*` or `@ez-kit/form-core`
  (`apps/docs/test/form-package-graph.test.ts`) — annotate kit exports through `@ez-kit/form-react`
  types, as stage 1 did with `FormBundle`.
- Vendored shadcn primitives under `packages/form/react/shadcn/src/components/ui/**` are not edited.
- Docs examples' source is shown verbatim to readers: no internal-process comments in
  `apps/docs/shared/form/examples/**`; explanations go in MDX.
- A new data-grid-style top-level call in a kit or in `form-react` that is not `/* @__PURE__ */`
  with a flat, spread-free object argument anchors the module (`AGENTS.md`, tree-shaking section).
- Do not touch `specs/`, `docs/superpowers/plans/` other than this file, or `CHANGELOG.md` files.

## Rulings carried into this plan

These settle what the spec leaves open; each is recorded so a reviewer can disagree with it.

- **R1 — one package-level context.** The form context is a module-level `createContext` in
  `form-react` (`form-context.tsx`), not TanStack's `createFormHookContexts()` singleton (its
  `useFormContext` throws a message about `createFormHook` and is typed against
  `Record<string, never>`). Because it is not tied to a `createForm` call, the prebuilt `Form`,
  `SchemaForm` and `FormProvider` of a kit interoperate.
- **R2 — `FormProvider` is the package component.** `createForm` returns it (D2), and it is the
  same component every bundle returns; the kits export the package's `FormProvider` directly.
- **R3 — forbidden keys throw in every environment.** D4 says "dev error". A reserved key would
  overwrite TanStack's own member (`Subscribe`) or throw inside `Object.assign` (`state` is a
  getter), so the production behaviour is a broken instance either way. The check runs once per
  `createForm` call and costs a few bytes.
- **R4 — `ArrayField` carries its entry view as `ArrayField.Item`.** The kit writes
  `/* @__PURE__ */ Object.assign(ArrayFieldView, { Item: ArrayItemView })` (the spec's candidate).
  `ArrayField` is a bespoke key: it derives no document id and is excluded from
  `deriveFieldTypeIds`.
- **R5 — headless `form.Array` without a registered `ArrayField`.** `item.Item` falls back to
  rendering its children unchanged, so a headless array works in a form whose bundle registered no
  array frame.
- **R6 — default type arguments.** `FormInstance<TValues, TFields = AllFormFieldSlots,
TComponents = {}>` where `AllFormFieldSlots = Required<FormFieldSlots>`. An app that registered a
  subset writes `FormInstance<V, typeof fields, typeof components>` once in its `shared/form.ts`. No
  new "bound alias" API (stage 1's parked item) is added.
- **R7 — `form.Submit`'s `formErrors`** is `formatFieldErrors(state.errors)` — TanStack's
  form-level errors, which already include `errorMap.onServer`. D14 (stage 4) changes what reaches
  that slot, not this shape.
- **R8 — the kit `SubmitButton` submits through the `<form>` when it has one.** It renders
  `type='submit'` and calls `submit()` from its click handler only when the button has no form
  owner (`event.currentTarget.form === null`), so it never submits twice and still works under a
  `FormProvider` with no `<form>`.

## Review Focus

1. **A `SubmitButton` under `FormProvider` with no `<form>`, and the same button inside `<Form>`.**
   Expected: one submit each — never zero, never two. Pinned in Task 3.
2. **Two forms nested or side by side.** Expected: `useFormContext()` returns the nearest form, and
   a component outside every form gets a named error, not `undefined`. Pinned in Task 1.
3. **An app registers a key the instance already owns** — `fields: { Subscribe }`,
   `components: { state }`, or the same key in `fields` and `components`. Expected: a compile
   error naming the key, and a runtime throw at `createForm` before `Object.assign` corrupts the
   instance. Pinned in Task 6.
4. **A document with a `section`, a `submit` node, or steps, rendered by a `createSchemaForm` that
   was not given `Section` / `SubmitButton` / `Wizard`.** Expected: a thrown error naming the
   missing component and where to pass it — not a blank form or a silent `null`. Pinned in Task 5.
5. **`import { TextField } from '@ez-kit/form-shadcn'` and `import { Form } from …`.** Expected: the
   first pulls no calendar, no combobox and no schema renderer; the second pulls no schema
   renderer; and a form from the prebuilt `useForm` still renders through the prebuilt controlled
   `SchemaForm`. Pinned in Task 8.

---

### Task 1: Form context — `FormProvider` and `useFormContext` (D6)

**Files:**

- Create: `packages/form/react/react/src/form-context.tsx`
- Modify: `packages/form/react/react/src/form-shell.tsx` (provide the context)
- Modify: `packages/form/react/react/src/create-form.tsx` (return `FormProvider` from the bundle)
- Modify: `packages/form/react/react/src/index.ts`, both kit `src/index.ts`
- Test: `packages/form/react/react/src/form-context.test.tsx` (create)
- Create: `.changeset/form-context.md`

**Interfaces:**

- Produces (from `@ez-kit/form-react`, re-exported by both kits):
  `function useFormContext(): FormContextApi`,
  `function FormProvider(props: { form: AnyFormInstance; children: ReactNode }): ReactNode`,
  `type FormContextApi = FormInstance<unknown, {}>`,
  `type AnyFormInstance` (the widest instance — every `useForm` result is assignable).
  `createForm(...)` now also returns `FormProvider` (the same component).
- Internal: `FormContext` (the React context object) is **not** exported from `index.ts`.

- [ ] **Step 1: Write the failing tests**

`packages/form/react/react/src/form-context.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { createForm } from './create-form'
import { FormProvider, useFormContext } from './form-context'
import { testComponents, testFields } from './test-kit'

import type { FormContextApi } from './form-context'
import type { ReactNode } from 'react'

const { Form, useForm } = createForm({ components: testComponents, fields: testFields })

function ValueProbe({ testId }: { testId: string }): ReactNode {
	const form = useFormContext()
	return (
		<form.Subscribe selector={(state) => JSON.stringify(state.values)}>
			{(values) => <output data-testid={testId}>{values}</output>}
		</form.Subscribe>
	)
}

describe('useFormContext', () => {
	it('reads the form a <Form> renders', () => {
		render(<Form defaultValues={{ email: 'a@b.c' }}>{() => <ValueProbe testId='probe' />}</Form>)
		expect(screen.getByTestId('probe').textContent).toBe('{"email":"a@b.c"}')
	})

	it('reads the form a FormProvider passes, without rendering a <form>', () => {
		function Host(): ReactNode {
			const form = useForm({ defaultValues: { n: 1 } })
			return (
				<FormProvider form={form}>
					<ValueProbe testId='probe' />
				</FormProvider>
			)
		}
		const { container } = render(<Host />)
		expect(screen.getByTestId('probe').textContent).toBe('{"n":1}')
		expect(container.querySelector('form')).toBeNull()
	})

	it('returns the nearest form when forms nest', () => {
		function Inner(): ReactNode {
			const inner = useForm({ defaultValues: { inner: true } })
			return (
				<FormProvider form={inner}>
					<ValueProbe testId='inner' />
				</FormProvider>
			)
		}
		render(
			<Form defaultValues={{ outer: true }}>
				{() => (
					<>
						<ValueProbe testId='outer' />
						<Inner />
					</>
				)}
			</Form>,
		)
		expect(screen.getByTestId('outer').textContent).toBe('{"outer":true}')
		expect(screen.getByTestId('inner').textContent).toBe('{"inner":true}')
	})

	it('throws a named error outside every form', () => {
		expect(() => render(<ValueProbe testId='probe' />)).toThrow(
			'useFormContext() must be called inside <Form>, <SchemaForm> or <FormProvider>',
		)
	})

	it('returns the base API with unknown values', () => {
		expectTypeOf<FormContextApi['state']['values']>().toEqualTypeOf<unknown>()
		expectTypeOf<FormContextApi>().toHaveProperty('Subscribe')
		expectTypeOf<FormContextApi>().toHaveProperty('handleSubmit')
	})

	it('is returned by createForm as FormProvider', () => {
		expect(createForm({ components: testComponents, fields: testFields }).FormProvider).toBe(FormProvider)
	})
})
```

The `throws` case logs React's error boundary noise; wrap it in
`vi.spyOn(console, 'error').mockImplementation(() => undefined)` and restore it, as other tests in
this package already do (grep `spyOn(console, 'error')`), so test output stays pristine.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/form-context.test.tsx`
Expected: FAIL — `./form-context` does not exist.

- [ ] **Step 3: Write the context module**

`packages/form/react/react/src/form-context.tsx`:

```tsx
'use client'

import { createContext, useContext } from 'react'

import type { FormInstance } from './form-instance'
import type { ReactNode } from 'react'

/**
 * Any form instance, at its widest — what `FormProvider` accepts and what the context holds.
 *
 * Every `useForm` result is assignable: the value type and both registries are open.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the widest instance, see above
export type AnyFormInstance = FormInstance<any, any, any>

/**
 * What `useFormContext()` returns: the form's base API — `Subscribe`, `state`, `handleSubmit`,
 * `Submit`, `Array`, … — without the fields a bundle registered, and with values of type `unknown`.
 *
 * A component that names paths in the form's data is a slice of one form or a reusable block, and
 * `withForm` / `withFieldGroup` type it where it is placed. The context serves components that do
 * not depend on a particular form: a save bar, an error summary, a kit's `SubmitButton`.
 */
export type FormContextApi = FormInstance<unknown, {}>

/**
 * One context for the whole package, not one per `createForm` call: the prebuilt `Form`,
 * `SchemaForm` and `FormProvider` of a kit are built by separate factory calls and must still see
 * each other's form.
 */
const FormContext = createContext<AnyFormInstance | null>(null)

/** Provides `form` to `useFormContext()` without rendering a `<form>`. */
export function FormProvider({ form, children }: { form: AnyFormInstance; children: ReactNode }): ReactNode {
	return <FormContext.Provider value={form}>{children}</FormContext.Provider>
}

/** The nearest form above this component, as its base API. */
export function useFormContext(): FormContextApi {
	const form = useContext(FormContext)
	if (form === null) {
		throw new Error('useFormContext() must be called inside <Form>, <SchemaForm> or <FormProvider>.')
	}
	return form as FormContextApi
}
```

`FormInstance` gains its third parameter in Task 5. Until then write `FormInstance<any, any>` and
`FormInstance<unknown, {}>`; Task 5 adds the third argument. If `{}` does not satisfy
`FormFieldRegistry` today, use `Record<never, never>` and say so in the report.

- [ ] **Step 4: Provide the context from the `<form>` shell**

In `packages/form/react/react/src/form-shell.tsx`, wrap the rendered `FormElement` in
`<FormProvider form={form}>`; widen `FormShellProps.form` to `SubmittableForm & AnyFormInstance`
only if the compiler requires it (the three call sites pass real instances). `<Form>` (both modes)
and `<SchemaForm>` (both modes) all end in `FormShell`, so all four now provide the context.

In `create-form.tsx`, import `FormProvider` and add it to the returned object:
`return { useForm, Form, FormProvider, SchemaForm, withForm, withFieldGroup }`.

- [ ] **Step 5: Export it**

`packages/form/react/react/src/index.ts`: `export { FormProvider, useFormContext } from './form-context'`
and `export type { AnyFormInstance, FormContextApi } from './form-context'`. Both kit `src/index.ts`:
add `FormProvider`, `useFormContext` to the `@ez-kit/form-react` value block and `AnyFormInstance`,
`FormContextApi` to the type block (alphabetical, identically in both kits).

- [ ] **Step 6: Run the tests**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/form-context.test.tsx && pnpm --filter @ez-kit/form-react typecheck && pnpm verify:affected`, then
`pnpm build --filter=...@ez-kit/form-core && pnpm --filter @ez-kit/docs exec vitest run test/kit-exports-parity.test.ts test/form-package-graph.test.ts`.
Expected: PASS.

- [ ] **Step 7: Changeset and commit**

`.changeset/form-context.md`:

```md
---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Add a form context. `<Form>` and `<SchemaForm>` provide it, `FormProvider` provides it without
rendering a `<form>` (a form whose `<form>` element sits lower in the tree, or none at all), and
`useFormContext()` reads it — the base form API, for components that do not depend on a particular
form, such as a save bar. `createForm` also returns `FormProvider`.
```

```bash
git add packages/form apps/docs .changeset/form-context.md
git commit -m "feat(form): add FormProvider and useFormContext"
```

---

### Task 2: `form.Submit` — the headless submit primitive (D5)

**Files:**

- Create: `packages/form/react/react/src/fields/submit.tsx`
- Modify: `packages/form/react/react/src/bindable-form.ts` (`SubmitState` gains `isDirty`, `errors`)
- Modify: `packages/form/react/react/src/build-field-components.tsx` (attach `Submit`)
- Modify: `packages/form/react/react/src/field-props.ts` (`Submit` on the instance type; `SubmitProps`,
  `SubmitRenderProps`)
- Modify: `packages/form/react/react/src/field-registry.ts` (`Submit` joins the reserved layout keys)
- Modify: `packages/form/react/react/src/index.ts`, both kit `src/index.ts` (export the two types)
- Test: `packages/form/react/react/src/submit.test.tsx` (create)
- Create: `.changeset/form-submit-primitive.md`

**Interfaces:**

- Produces: `form.Submit` on every instance:
  `(props: SubmitProps) => ReactNode` with
  `type SubmitProps = { children: (state: SubmitRenderProps) => ReactNode }` and
  `type SubmitRenderProps = { canSubmit: boolean; isSubmitting: boolean; isDirty: boolean; formErrors: string[]; submit: () => Promise<void> }`.
  `submit` is `() => form.handleSubmit()`.
- `form.SubmitButton` is unchanged in this task (Task 5 removes the built-in).

- [ ] **Step 1: Write the failing tests**

`packages/form/react/react/src/submit.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields } from './test-kit'

import type { SubmitRenderProps } from './index'

const { Form } = createForm({ components: testComponents, fields: testFields })

describe('form.Submit', () => {
	it('hands over the submit state', () => {
		render(
			<Form defaultValues={{ name: '' }}>
				{(form) => (
					<form.Submit>
						{(state) => (
							<output data-testid='state'>{JSON.stringify({ ...state, submit: typeof state.submit })}</output>
						)}
					</form.Submit>
				)}
			</Form>,
		)
		expect(JSON.parse(screen.getByTestId('state').textContent ?? '')).toEqual({
			canSubmit: true,
			isSubmitting: false,
			isDirty: false,
			formErrors: [],
			submit: 'function',
		})
	})

	it('reports isDirty once a value changes', async () => {
		render(
			<Form defaultValues={{ name: '' }}>
				{(form) => (
					<>
						<form.TextField
							name='name'
							label='Name'
						/>
						<form.Submit>{({ isDirty }) => <output data-testid='dirty'>{String(isDirty)}</output>}</form.Submit>
					</>
				)}
			</Form>,
		)
		await userEvent.type(screen.getByLabelText('Name'), 'x')
		expect(screen.getByTestId('dirty').textContent).toBe('true')
	})

	it('submits through submit(), outside any <form> element', async () => {
		const onSubmit = vi.fn()
		render(
			<Form
				defaultValues={{ name: 'a' }}
				onSubmit={({ value }) => onSubmit(value)}
			>
				{(form) => (
					<form.Submit>
						{({ submit }) => (
							<button
								type='button'
								onClick={() => void submit()}
							>
								go
							</button>
						)}
					</form.Submit>
				)}
			</Form>,
		)
		await userEvent.click(screen.getByText('go'))
		await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'a' }))
	})

	it('surfaces form-level errors as strings, and no field-level ones', async () => {
		render(
			<Form
				defaultValues={{ name: '' }}
				validators={{ onSubmit: () => 'Nothing to save' }}
			>
				{(form) => (
					<form.Submit>
						{({ formErrors, submit }) => (
							<>
								<output data-testid='errors'>{JSON.stringify(formErrors)}</output>
								<button
									type='button'
									onClick={() => void submit()}
								>
									go
								</button>
							</>
						)}
					</form.Submit>
				)}
			</Form>,
		)
		await userEvent.click(screen.getByText('go'))
		await waitFor(() => expect(screen.getByTestId('errors').textContent).toBe('["Nothing to save"]'))
	})

	it('types the render props', () => {
		expectTypeOf<SubmitRenderProps>().toEqualTypeOf<{
			canSubmit: boolean
			isSubmitting: boolean
			isDirty: boolean
			formErrors: string[]
			submit: () => Promise<void>
		}>()
	})
})
```

Add one more case using a zod field-level schema on the form (`validators: { onChange: z.object({ name: z.string().min(1, 'Required') }) }`)
and assert `formErrors` stays `[]` after the field is invalid — a schema's field issues land on the
field, not on the form. If `zod` is not a devDependency of `form-react`, use a hand-written
validator returning `{ fields: { name: 'Required' } }` instead.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/submit.test.tsx`
Expected: FAIL — `form.Submit` is undefined / `SubmitRenderProps` not exported.

- [ ] **Step 3: Implement**

In `bindable-form.ts`, extend `SubmitState`:

```ts
/** The form-state members `form.Submit` subscribes to. */
export type SubmitState = {
	canSubmit: boolean
	isSubmitting: boolean
	isDirty: boolean
	/** TanStack's form-level errors, raw; `form.Submit` normalises them. */
	errors: readonly unknown[]
}
```

`packages/form/react/react/src/fields/submit.tsx`:

```tsx
import { formatFieldErrors } from '@ez-kit/form-core'

import type { BindableForm, SubmitState } from '../bindable-form'
import type { SubmitProps } from '../field-props'
import type { ReactNode } from 'react'

/**
 * Selects the raw slice and nothing derived: `errors` keeps its store identity, so the
 * subscription's shallow comparison does not see a fresh array on every state change.
 */
function selectSubmitState(state: SubmitState): SubmitState {
	return {
		canSubmit: state.canSubmit,
		isSubmitting: state.isSubmitting,
		isDirty: state.isDirty,
		errors: state.errors,
	}
}

/** Build `form.Submit` for one instance — headless; the caller renders the control. */
export function createSubmit(form: BindableForm): (props: SubmitProps) => ReactNode {
	const submit = (): Promise<void> => form.handleSubmit()

	return function Submit({ children }: SubmitProps): ReactNode {
		return (
			<form.Subscribe selector={selectSubmitState}>
				{({ canSubmit, isSubmitting, isDirty, errors }) =>
					children({ canSubmit, isSubmitting, isDirty, formErrors: formatFieldErrors(errors), submit })
				}
			</form.Subscribe>
		)
	}
}
```

`BindableForm` must expose `handleSubmit: () => Promise<void>`; add it if it is not there (it is on
`SubmittableForm` — reuse that). `fields/form-parts.tsx`'s own `selectSubmitState` stays until Task 5
deletes the file.

In `field-props.ts`, add the two exported types (verbatim from **Interfaces**) and
`Submit: (props: SubmitProps) => ReactNode` to `BuiltInFormFieldComponents`. In
`build-field-components.tsx`, add `Submit: createSubmit(form)` to the `layout` object, and add
`Submit: true` to `LAYOUT_COMPONENT_KEYS` in `field-registry.ts` (so a field key `Submit` is
rejected; Task 6 replaces this with the full reserved list).

Export `SubmitProps` and `SubmitRenderProps` from `form-react`'s `index.ts` and both kits'.

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/submit.test.tsx && pnpm --filter @ez-kit/form-react typecheck && pnpm verify:affected`.
Expected: PASS.

- [ ] **Step 5: Changeset and commit**

`.changeset/form-submit-primitive.md`:

```md
---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Add `form.Submit`, a headless render-prop on every form instance:
`{ canSubmit, isSubmitting, isDirty, formErrors, submit }`. `submit` is `form.handleSubmit`, so a
button built on it works outside a `<form>` element too.
```

```bash
git add packages/form .changeset/form-submit-primitive.md
git commit -m "feat(form): add the headless form.Submit primitive"
```

---

### Task 3: Kit `SubmitButton` built on `form.Submit`

**Files:**

- Modify: `packages/form/react/shadcn/src/blocks/form-parts.tsx`,
  `packages/form/react/heroui/src/blocks/form-parts.tsx` (add `SubmitButton`)
- Modify: both kit `src/index.ts` (export `SubmitButton` from `./blocks/form-parts`)
- Test: `packages/form/react/shadcn/src/submit-button.test.tsx`,
  `packages/form/react/heroui/src/submit-button.test.tsx` (create)
- Create: `.changeset/form-kit-submit-button.md`

**Interfaces:**

- Consumes: `useFormContext()` (Task 1), `form.Submit` / `SubmitRenderProps` (Task 2),
  `SubmitButtonProps` (`{ children: ReactNode; disabled?: boolean }`, existing in `form-react`).
- Produces: `SubmitButton(props: SubmitButtonProps): ReactNode` exported from each kit root. It keeps
  today's markers: shadcn `data-slot='form-submit'`, heroui `data-form-submit`. It is not wired into
  any bundle yet (Task 5 does that).

- [ ] **Step 1: Write the failing tests** (shadcn shown; heroui identical apart from the import path and
      the marker `[data-form-submit]`)

`packages/form/react/shadcn/src/submit-button.test.tsx`:

```tsx
import { FormProvider } from '@ez-kit/form-react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SubmitButton } from './blocks/form-parts'
import { Form, useForm } from './index'

import type { ReactNode } from 'react'

describe('SubmitButton', () => {
	it('submits once inside a <Form>', async () => {
		const onSubmit = vi.fn()
		render(
			<Form
				defaultValues={{ name: 'a' }}
				onSubmit={({ value }) => onSubmit(value)}
			>
				{() => <SubmitButton>Save</SubmitButton>}
			</Form>,
		)
		await userEvent.click(screen.getByRole('button', { name: 'Save' }))
		await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
		expect(screen.getByRole('button', { name: 'Save' }).getAttribute('data-slot')).toBe('form-submit')
	})

	it('submits once under a FormProvider with no <form>', async () => {
		const onSubmit = vi.fn()
		function Host(): ReactNode {
			const form = useForm({ defaultValues: { name: 'a' }, onSubmit: ({ value }) => onSubmit(value) })
			return (
				<FormProvider form={form}>
					<SubmitButton>Save</SubmitButton>
				</FormProvider>
			)
		}
		const { container } = render(<Host />)
		expect(container.querySelector('form')).toBeNull()
		await userEvent.click(screen.getByRole('button', { name: 'Save' }))
		await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
	})

	it('is disabled while the form cannot submit, and when told to be', () => {
		render(<Form defaultValues={{}}>{() => <SubmitButton disabled>Save</SubmitButton>}</Form>)
		expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
	})
})
```

After the first case, add an `await new Promise((r) => setTimeout(r, 0))` before the
`toHaveBeenCalledTimes(1)` assertion settles, or assert with `waitFor` and then re-assert the count
once more after a tick, so a second, late submit would be caught.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @ez-kit/form-shadcn exec vitest run src/submit-button.test.tsx`
Expected: FAIL — `SubmitButton` is not exported from `./blocks/form-parts`.

- [ ] **Step 3: Implement** (shadcn)

Add to `packages/form/react/shadcn/src/blocks/form-parts.tsx`:

```tsx
/**
 * The kit's submit button, built on `form.Submit` and reading the form from context, so the same
 * component works as `form.SubmitButton` and as a plain `<SubmitButton />`.
 *
 * Inside a `<form>` it is an ordinary submit button and the `<form>`'s own submit handler runs.
 * Under a `FormProvider` with no `<form>` the browser has nothing to submit, so the click submits
 * the form itself; checking the button's form owner is what keeps the two paths from both firing.
 */
export function SubmitButton({ children, disabled }: SubmitButtonProps): ReactNode {
	const form = useFormContext()
	return (
		<form.Submit>
			{({ canSubmit, isSubmitting, submit }) => (
				<ButtonPrimitive
					data-slot='form-submit'
					type='submit'
					disabled={disabled === true || !canSubmit || isSubmitting}
					onClick={(event) => {
						if (event.currentTarget.form === null) void submit()
					}}
				>
					{children}
				</ButtonPrimitive>
			)}
		</form.Submit>
	)
}
```

with `import { useFormContext } from '@ez-kit/form-react'` and `SubmitButtonProps` added to the
type import. HeroUI: the same with `HeroButton`, `variant='primary'`, `data-form-submit=''`,
`isDisabled`, and `onPress={(event) => { if ((event.target as HTMLButtonElement).form === null) void submit() }}`
— check in the test that React Aria's `onPress` plus `type='submit'` submits exactly once inside a
`<form>`; if it submits twice, drop `onPress` inside a form by the same form-owner check.

Export `SubmitButton` from both kit `index.ts` files, from `./blocks/form-parts` directly — not
through `./form`.

- [ ] **Step 4: Run the tests**

Run both kits' new test files, then `pnpm verify:affected` and
`pnpm build --filter=...@ez-kit/form-core && pnpm --filter @ez-kit/docs exec vitest run test/kit-exports-parity.test.ts`.
Expected: PASS.

- [ ] **Step 5: Changeset and commit**

`.changeset/form-kit-submit-button.md`:

```md
---
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Export `SubmitButton`, the kit's submit button built on `form.Submit`. It reads the form from
context, so it works inside `<Form>` and under a `FormProvider` with no `<form>` element.
```

```bash
git add packages/form .changeset/form-kit-submit-button.md
git commit -m "feat(form): build the kit SubmitButton on form.Submit"
```

---

### Task 4: `ArrayField` moves into `fields`, with `ArrayField.Item` (D4)

**Files:**

- Modify: `packages/form/react/react/src/contract.ts` (`FormFieldSlots.ArrayField: ArrayFieldSlot`;
  `ArrayField` / `ArrayItem` leave `FormComponents`)
- Modify: `packages/form/react/react/src/field-registry.ts` (`ArrayField` is a bespoke key: no
  document id; drop it from `LAYOUT_COMPONENT_KEYS`)
- Modify: `packages/form/react/react/src/build-field-components.tsx` (bespoke array handling;
  `createArrayField` / `createArray` take the slot from `fields`)
- Modify: `packages/form/react/react/src/fields/array-field.tsx` (use `slot` and `slot.Item`;
  `scopedFieldsFor` scopes **field keys only**)
- Modify: `packages/form/react/react/src/component-guard.tsx` (`ArrayField` guarded with the fields;
  removed from the component keys)
- Modify: `packages/form/react/react/src/schema/render-node.tsx` (unchanged behaviour; adjust types)
- Modify: `packages/form/react/react/src/test-kit.tsx` (`testFields.ArrayField` with `.Item`)
- Modify: both kits' `src/blocks/array.tsx` (export `ArrayField` assembled with `Item`) and
  `src/form.tsx` (move it from `formComponents` to `formFieldSlots`)
- Modify: every test that built `components` with `ArrayField` / `ArrayItem` (grep below)
- Create: `.changeset/form-array-field-in-fields.md`

**Interfaces:**

- Produces: `type ArrayFieldSlot = ((props: ArrayFieldRenderProps) => ReactNode) & { Item: (props: ArrayItemRenderProps) => ReactNode }`
  (exported from `form-react`), `FormFieldSlots.ArrayField: ArrayFieldSlot` (required in this task,
  optional from Task 5). `FormComponents` keeps `Button`, `Form`, `Section`, `GridItem`, `Wizard`
  for now.
- `form.ArrayField`, `form.Array`, `item.Item` behave exactly as before.
- `ArrayItemScope` no longer carries `SubmitButton`, `Section`, `GridItem`, `ArrayField`, `Array`
  wrapped with a bogus `name` — only field components are scoped to the entry. `ArrayField` and
  `Array` _are_ field-like and stay scoped (nested arrays depend on it).

- [ ] **Step 1: Write the failing tests**

Add to `packages/form/react/react/src/array-field.test.tsx`:

```tsx
it('takes the frame from fields.ArrayField and the entry from fields.ArrayField.Item', () => {
	const Frame = Object.assign((props: ArrayFieldRenderProps) => <div data-testid='frame'>{props.children}</div>, {
		Item: (props: ArrayItemRenderProps) => <div data-testid='entry'>{props.children}</div>,
	})
	const { Form } = createForm({ components: testComponents, fields: { ...testFields, ArrayField: Frame } })
	render(
		<Form defaultValues={{ tags: [{ label: 'a' }] }}>
			{(form) => (
				<form.ArrayField name='tags'>
					{(item) => (
						<item.Item>
							<item.TextField name='label' />
						</item.Item>
					)}
				</form.ArrayField>
			)}
		</Form>,
	)
	expect(screen.getByTestId('frame')).toBeInTheDocument()
	expect(screen.getByTestId('entry')).toBeInTheDocument()
})
```

and to `field-registry.test.ts`: `deriveFieldTypeIds({ ...testFields, RatingField })` does not
contain `array` and does not throw (today `ArrayField` would derive the reserved id `array`).

Add a type test to `array-types.test.tsx`: inside an entry, `item.TextField` exists and
`expectTypeOf<keyof typeof item>()` does not include `'SubmitButton' | 'Section' | 'GridItem'`
(write it as `// @ts-expect-error — not scoped to an entry` on `item.SubmitButton`).

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/array-field.test.tsx src/field-registry.test.ts && pnpm --filter @ez-kit/form-react typecheck`
Expected: FAIL — `ArrayField` is not a key of `FormFieldSlots` / `fields` frame is ignored.

- [ ] **Step 3: Implement**

- `contract.ts`: add `ArrayFieldSlot` (verbatim from **Interfaces**, with a docblock: the frame
  carries its entry view so the pair travels as one registration), add
  `ArrayField: ArrayFieldSlot` to `FormFieldSlots`, remove `ArrayField` and `ArrayItem` from
  `FormComponents`.
- `field-registry.ts`: introduce `const BESPOKE_FIELD_KEYS = { ArrayField: true } as const`; in
  `deriveFieldTypeIds`, skip keys in it (they derive no document id); remove `ArrayField` from
  `LAYOUT_COMPONENT_KEYS` (keep its `satisfies` honest by adjusting the type it is checked against).
- `build-field-components.tsx`: `ArrayField` is no longer read from `components`. Exclude
  `ArrayField` from the generic-binder loop (it is a bespoke key) and pass
  `fields.ArrayField as ArrayFieldSlot` to `createArrayField(form, slot, fieldComponents)` and
  `createArray(form, slot, fieldComponents)`.
- `fields/array-field.tsx`: replace `components: FormComponents` parameters with
  `slot: ArrayFieldSlot`; `components.ArrayField` → `slot`, `components.ArrayItem` → `slot.Item`.
  `scope.Button` still comes from the `Button` slot — thread `components.Button` through as a
  separate argument for this task only (Task 5 removes it). In `scopedFieldsFor`, scope only keys
  that are field components (the registry's keys plus `ArrayField` and `Array`); copy nothing else
  into the entry scope.
- `component-guard.tsx`: `COMPONENT_KEYS` loses `ArrayField` / `ArrayItem`; `FIELD_KEYS` gains
  `ArrayField`. A guarded missing `ArrayField` must still have an `Item` — make the placeholder
  `Object.assign(missingFrame, { Item: missingEntry })`.
- `test-kit.tsx`: `testFields.ArrayField = Object.assign(TestArrayField, { Item: TestArrayItem })`;
  delete both from `testComponents`.
- Kits: in `src/blocks/array.tsx`, rename the frame component to `ArrayFieldView` (internal) and
  export
  `export const ArrayField = /* @__PURE__ */ Object.assign(ArrayFieldView, { Item: ArrayItem })`.
  In `src/form.tsx`, move `ArrayField` into `formFieldSlots`, drop `ArrayField` / `ArrayItem` from
  `formComponents`.
- Fix every other caller: `grep -rn "ArrayItem\|components\.ArrayField\|ArrayField:" packages/form apps/docs --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v /dist/`.
  The kits' `index.test.tsx` pin `formComponents`' keys and `formFieldSlots`' length — update them
  (7 → 5 keys; 12 → 13).

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter @ez-kit/form-react test && pnpm verify:affected`, then
`pnpm build --filter=...@ez-kit/form-core && pnpm --filter @ez-kit/docs exec vitest run test/kit-exports-parity.test.ts test/docs-option-names.test.ts`.
Expected: PASS. `docs-option-names` may report a changed count for `custom-kit.mdx`'s
`'Layout and wizard'` table (it lists `FormComponents` keys); update the expected count in
`apps/docs/test/docs-options/page-type-map.ts` only after rereading the table, and move the
`ArrayField` / `ArrayItem` rows of that table to the fields table in the MDX. Task 9 rewrites the
page; this step only keeps it true.

- [ ] **Step 5: Changeset and commit**

`.changeset/form-array-field-in-fields.md`:

```md
---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

`ArrayField` is now registered with the fields, not the components, and carries its entry view as
`ArrayField.Item`: `fields: { ArrayField: Object.assign(Frame, { Item: Entry }) }`. A kit's
`ArrayField` export already has its `Item`. Inside an array entry, only field components are scoped
to the entry.
```

```bash
git add packages/form apps/docs .changeset/form-array-field-in-fields.md
git commit -m "refactor(form)!: register ArrayField with the fields, carrying its Item"
```

---

### Task 5: Open, optional factory options — `FormElement`, `fields`, `components` (D4)

This is the largest task: the options type changes at once for every caller. Do it in the order of
the steps; the test file in Step 1 is the acceptance criterion.

**Files:**

- Modify: `packages/form/react/react/src/contract.ts` (`FormComponents` → optional
  `SubmitButton` / `Section` / `GridItem` / `Wizard`; `Button` and `Form` removed; `FormFieldSlots`
  keys optional; `AllFormFieldSlots`, `FormComponentRegistry`)
- Modify: `packages/form/react/react/src/create-form.tsx` (`CreateFormOptions<TFields, TComponents>`;
  no guards; `FormElement` falls back to `'form'`; components attached as-is)
- Modify: `packages/form/react/react/src/field-props.ts` (`FormFieldComponents` maps only the keys
  passed; `SubmitButton` / `Section` / `GridItem` leave `BuiltInFormFieldComponents`;
  `ArrayScope.Button` removed; `SectionProps` / `GridItemProps` accept explicit `undefined`)
- Modify: `packages/form/react/react/src/kit-form.ts`, `form-instance.ts` (`TComponents`
  parameter, default `{}`)
- Modify: `packages/form/react/react/src/build-field-components.tsx` (no `Button` / `Section` /
  `GridItem` wrappers; `Submit` and `Array` stay built in)
- Delete: `packages/form/react/react/src/fields/form-parts.tsx`, `fields/layout-parts.tsx`
- Delete: `packages/form/react/react/src/component-guard.tsx` and `component-guard.test.tsx` (move
  `FIELD_KEYS` to `field-registry.ts` if `field-registry.test.ts` still needs it)
- Modify: `packages/form/react/react/src/fields/array-field.tsx` (no `Button` argument; `item.Item`
  falls back to its children when no `ArrayField` is registered — ruling R5)
- Modify: `packages/form/react/react/src/schema/*` (layout comes from `components`; the submit node
  renders `components.SubmitButton`; named throws when a document needs a component that was not
  passed)
- Modify: `packages/form/react/react/src/test-kit.tsx` (`testFormElement`; `testComponents =
{ SubmitButton, Section, GridItem, Wizard }` with `SubmitButton` built on `useFormContext` +
  `form.Submit`, marker `data-testkit='button'`)
- Modify: every `createForm(` call site in `packages/form` and `apps/docs` (≈40 in form-react tests)
- Modify: both kits' `src/blocks/layout.tsx` (`Section` / `GridItem` take `SectionProps` /
  `GridItemProps`), `src/blocks/form-parts.tsx` (`Button` and `Form` stop being exported slots:
  `Button` becomes file-internal, `Form` is exported as `FormElement`), `src/form.tsx`
- Modify: `apps/docs/shared/form/examples/components/arrays-custom.tsx` (no `scope.Button`)
- Modify: `apps/docs/test/docs-options/page-type-map.ts` (`ArrayScope` 12 → 11, `FormComponents`
  tables)
- Test: `packages/form/react/react/src/create-form-options.test.tsx` (create)
- Create: `.changeset/form-open-options.md`

**Interfaces:**

- Produces:

  ```ts
  export type FormFieldSlots = {
  	TextField?: (props: TextFieldRenderProps) => ReactNode
  	// …the other eleven, each optional, unchanged otherwise
  	ArrayField?: ArrayFieldSlot
  }
  export type AllFormFieldSlots = Required<FormFieldSlots>
  export type FormComponents = {
  	SubmitButton?: (props: SubmitButtonProps) => ReactNode
  	Section?: (props: SectionProps) => ReactNode
  	GridItem?: (props: GridItemProps) => ReactNode
  	Wizard?: (props: WizardRenderProps) => ReactNode
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- props are contravariant
  export type FormComponentRegistry = Record<string, (props: any) => ReactNode>
  export type CreateFormOptions<
  	TFields extends FormFieldRegistry = {},
  	TComponents extends FormComponentRegistry = {},
  > = {
  	FormElement?: (props: FormElementProps) => ReactNode
  	fields?: TFields & FormFieldSlots
  	components?: TComponents & FormComponents
  }
  export function createForm<TFields extends FormFieldRegistry = {}, TComponents extends FormComponentRegistry = {}>(
  	options?: CreateFormOptions<TFields, TComponents>,
  ): { useForm; Form; FormProvider; SchemaForm; withForm; withFieldGroup }
  export type FormInstance<TValues, TFields extends FormFieldRegistry = AllFormFieldSlots, TComponents extends FormComponentRegistry = {}>
  ```

  The instance type is `TanStack instance & FormFieldComponents<TValues, TFields> & TComponents &
{ Submit; Array }`, where `FormFieldComponents` maps **only the keys present in `TFields`**:
  built-in keys to their bespoke prop types, every other key through `CustomFieldComponentsOf`.
  `form.SubmitButton` exists only when `components.SubmitButton` was passed, and is that component.

- `SchemaForm` still comes from `createForm` in this task (Task 7 splits it).
- Removed from the public surface: `ButtonProps`, `SectionRenderProps`, `GridItemRenderProps`, the
  `Button` and `Form` slots, `ArrayScope.Button`.

- [ ] **Step 1: Write the failing tests**

`packages/form/react/react/src/create-form-options.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { createForm } from './create-form'
import { useFormContext } from './form-context'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { FormInstance } from './index'
import type { ReactNode } from 'react'

describe('createForm options', () => {
	it('works with no options at all: a bare <form> and only the built-in primitives', () => {
		const { Form } = createForm()
		const { container } = render(
			<Form defaultValues={{ a: 1 }}>
				{(form) => <form.Submit>{({ canSubmit }) => <output>{String(canSubmit)}</output>}</form.Submit>}
			</Form>,
		)
		expect(container.querySelector('form')).not.toBeNull()
		expect(screen.getByText('true')).toBeInTheDocument()
	})

	it('renders the kit FormElement when passed', () => {
		const { Form } = createForm({ FormElement: testFormElement })
		const { container } = render(<Form defaultValues={{}}>{() => null}</Form>)
		expect(container.querySelector('[data-testkit="form"]')).not.toBeNull()
	})

	it('puts exactly the passed fields on the instance', () => {
		const { useForm } = createForm({ fields: { TextField: testFields.TextField } })
		function Probe(): ReactNode {
			const form = useForm({ defaultValues: { name: '' } })
			expectTypeOf(form).toHaveProperty('TextField')
			// @ts-expect-error — not registered
			void form.NumberField
			return null
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('puts each passed component on the instance as-is, typed by its own props', () => {
		function SaveBar({ label }: { label: string }): ReactNode {
			const form = useFormContext()
			return <form.Submit>{({ canSubmit }) => <button disabled={!canSubmit}>{label}</button>}</form.Submit>
		}
		const { Form } = createForm({ components: { SaveBar } })
		render(<Form defaultValues={{}}>{(form) => <form.SaveBar label='Save' />}</Form>)
		expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
		// @ts-expect-error — SaveBar requires label
		;<Form defaultValues={{}}>{(form) => <form.SaveBar />}</Form>
	})

	it('has form.SubmitButton only when a SubmitButton component was passed', () => {
		const withButton = createForm({ components: { SubmitButton: testComponents.SubmitButton } })
		const without = createForm({ fields: { TextField: testFields.TextField } })
		function Probe(): ReactNode {
			const a = withButton.useForm({ defaultValues: {} })
			const b = without.useForm({ defaultValues: {} })
			expectTypeOf(a).toHaveProperty('SubmitButton')
			// @ts-expect-error — no SubmitButton registered
			void b.SubmitButton
			return null
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('re-asserts the contract on known keys', () => {
		// @ts-expect-error — a TextField that cannot take TextFieldRenderProps
		createForm({ fields: { TextField: (_: { totallyUnrelated: symbol }) => null } })
		// @ts-expect-error — a Section that cannot take SectionProps
		createForm({ components: { Section: (_: { nope: number }) => null } })
	})

	it('accepts an all-in kit instance as FormInstance<V> and a subset one as FormInstance<V, Fields, Components>', () => {
		const all = createForm({ fields: testFields, components: testComponents })
		const subset = createForm({ fields: { TextField: testFields.TextField } })
		function Probe(): ReactNode {
			const a = all.useForm({ defaultValues: { name: '' } })
			const b = subset.useForm({ defaultValues: { name: '' } })
			expectTypeOf(a).toExtend<FormInstance<{ name: string }>>()
			expectTypeOf(b).toExtend<FormInstance<{ name: string }, { TextField: typeof testFields.TextField }>>()
			return null
		}
		expectTypeOf(Probe).toBeFunction()
	})
})
```

Add a schema-path test file `packages/form/react/react/src/schema/missing-components.test.tsx`:
a `createForm({ fields: testFields })` (no components) rendering `SchemaForm` with a document that
has (a) a `section` node, (b) a `submit` node, (c) `step` nodes — each must throw an error whose
message names the component (`Section`, `SubmitButton`, `Wizard`) and the option to pass it in
(`components`). Use exact messages from Step 3. Silence `console.error` around the renders as in
Task 1.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @ez-kit/form-react typecheck` and
`pnpm --filter @ez-kit/form-react exec vitest run src/create-form-options.test.tsx src/schema/missing-components.test.tsx`
Expected: FAIL — `components` / `fields` are required, `testFormElement` does not exist, etc.

- [ ] **Step 3: Implement**

1. **Contract** (`contract.ts`): the types in **Interfaces**. Delete `ButtonProps`, `Button`, `Form`
   from `FormComponents`; delete `SectionRenderProps` / `GridItemRenderProps` (the kits take the
   consumer props `SectionProps` / `GridItemProps`; change their fields to `title?: ReactNode | undefined`
   etc. so the schema renderer can pass resolved `undefined`s under `exactOptionalPropertyTypes`).
   Keep `FormElementProps`.
2. **Instance types** (`field-props.ts`, `kit-form.ts`, `form-instance.ts`):
   `FormFieldComponents<TFormData, TFields>` becomes
   `{ [K in keyof TFields & BuiltInFieldKey]-?: BuiltInFieldComponents<TFormData, TFields>[K] } & CustomFieldComponentsOf<TFormData, Omit<TFields, BuiltInFieldKey>>`
   where `BuiltInFieldKey = keyof FormFieldSlots` (the twelve plus `ArrayField`) and
   `BuiltInFieldComponents` is today's `BuiltInFormFieldComponents` minus `SubmitButton`, `Section`,
   `GridItem`, `Array`, `Submit`. The always-present primitives are a separate
   `FormPrimitives<TFormData, TFields> = { Array; Submit }`. `KitFormApi` gets a 14th parameter
   `TComponents extends FormComponentRegistry = {}` and is
   `TanStackInstance & FormFieldComponents<…> & FormPrimitives<…> & TComponents`. `FormInstance`
   gets `TComponents` with default `{}` and `TFields` defaulting to `AllFormFieldSlots`. Re-run the
   stage-1 `form-instance.test.tsx`; keep every assertion passing (adapt only the factory calls).
3. **Factory** (`create-form.tsx`): `createForm(options = {})`; `FormElement ?? 'form'` (a string tag
   is a valid component for JSX — type the fallback as the same component type); no
   `guardComponents` / `guardFields`; `buildFieldComponents(form, fields)` then
   `Object.assign(form, fieldComponents, components)` — components attached unwrapped. `useForm` /
   `Form` / `withForm` / the three `FormElement` call sites read the options directly.
4. **Field builder** (`build-field-components.tsx`): drop `createSubmitButton` /
   `createSection` / `createGridItem`; `layout` keeps `Submit`, `ArrayField` (only when registered)
   and `Array`. Delete `fields/form-parts.tsx` and `fields/layout-parts.tsx`.
5. **Arrays** (`fields/array-field.tsx`): remove the `Button` argument and `scope.Button`
   (`ArrayScope` loses `Button`); `createArray(form, slot | undefined, …)` — when `slot` is
   undefined, `item.Item` is `({ children }) => children`.
6. **Schema path** (`schema/*`): `LayoutComponents` becomes `FormComponents` (all optional). Where
   the renderer needs one, it throws if absent, with these exact messages:
   - `SchemaForm: the document has a section, but no Section component was passed in components.`
   - `SchemaForm: a section has a grid, but no GridItem component was passed in components.`
   - `SchemaForm: the document has steps, but no Wizard component was passed in components.`
   - `SchemaForm: the document has a submit node, but no SubmitButton component was passed in components.`
   - `SchemaForm: the document has an array, but no ArrayField was passed in fields.`
     The submit node renders `components.SubmitButton` (not `form.SubmitButton`). A missing built-in
     field kind keeps today's `Unknown node type` error.
7. **Test kit** (`test-kit.tsx`): export `testFormElement` (today's `testComponents.Form`, with
   `data-testkit='form'`), and `testComponents = { SubmitButton, Section, GridItem, Wizard }` where
   `SubmitButton` uses `useFormContext()` + `form.Submit` and renders
   `<button type='submit' data-testkit='button' disabled={…}>`. Update every `createForm(` call in
   form-react's tests to `createForm({ FormElement: testFormElement, fields: testFields, components: testComponents })`
   where they relied on the old full kit (grep `createForm(`). Tests that asserted the guards'
   warnings go with `component-guard.test.tsx`; the "bundle shape" test in `create-form.test.tsx`
   gains `FormProvider` in the key list.
8. **Kits**: `blocks/layout.tsx` — `Section` / `GridItem` typed with `SectionProps` /
   `GridItemProps`; `blocks/form-parts.tsx` — `Button` stays as a file-internal helper only if
   `SubmitButton` uses it (otherwise delete it), `Form` is renamed and exported as `FormElement`;
   `src/form.tsx` — `formFieldSlots` unchanged in shape (still including `ArrayField`),
   `formComponents = { SubmitButton, Section, GridItem, Wizard } satisfies FormComponents`, and
   `createForm({ FormElement, fields: formFieldSlots, components: formComponents })`. The kits'
   `index.test.tsx` pins update (4 component keys). `KitFormBundle` becomes
   `FormBundle<typeof formFieldSlots, typeof formComponents>` (`FormBundle` gains the second
   parameter).
9. **Docs**: `arrays-custom.tsx` used `scope.Button` for add / remove controls. Replace it with a
   docs-side `Button` that renders the active kit's button, following the precedent of
   `apps/docs/shared/form/Dialog.tsx` (read it first). `apps/docs/test/docs-options/page-type-map.ts`:
   `ArrayScope` count 12 → 11 and the `custom-kit.mdx` tables — remove the `Button` / `Form` rows from
   the MDX table and adjust counts; Task 9 rewrites the page's prose.

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter @ez-kit/form-react typecheck && pnpm --filter @ez-kit/form-react test`, both kits'
`test`, then `pnpm verify:affected` and
`pnpm build --filter=...@ez-kit/form-core && pnpm --filter @ez-kit/docs exec vitest run test/kit-exports-parity.test.ts test/form-package-graph.test.ts test/docs-option-names.test.ts`.
Expected: PASS.

- [ ] **Step 5: Changeset and commit**

`.changeset/form-open-options.md`:

```md
---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

`createForm` takes `{ FormElement?, fields?, components? }`, all optional. `form.X` exists in the
types for exactly what was passed: a field kind under its key, and any component under its key with
its own props — `components: { SaveBar }` gives `<form.SaveBar />`. Without `FormElement` the form
renders a plain `<form>`.

Breaking: the `Button` and `Form` slots are gone. Pass the kit's `FormElement` as `FormElement`, and
its `SubmitButton`, `Section`, `GridItem` and `Wizard` in `components`; `form.SubmitButton` is now
the `SubmitButton` you passed. `ArrayScope.Button` is removed — a custom array layout renders its
own buttons. `ButtonProps`, `SectionRenderProps` and `GridItemRenderProps` are no longer exported;
a kit's `Section` and `GridItem` take `SectionProps` and `GridItemProps`. `createForm` no longer
warns about missing slots; `SchemaForm` throws a named error when a document needs a component
that was not passed.
```

```bash
git add packages/form apps/docs .changeset/form-open-options.md
git commit -m "refactor(form)!: make createForm's FormElement, fields and components open and optional"
```

---

### Task 6: Reserved keys — type error and runtime throw (D4)

**Files:**

- Create: `packages/form/react/react/src/reserved-keys.ts`
- Modify: `packages/form/react/react/src/create-form.tsx` (`CreateFormOptions` guards; runtime check)
- Modify: `packages/form/react/react/src/field-registry.ts` (`LAYOUT_COMPONENT_KEYS` checks fold into
  the reserved list)
- Test: `packages/form/react/react/src/reserved-keys.test.tsx` (create)
- Create: `.changeset/form-reserved-keys.md`

**Interfaces:**

- Produces: `type ReservedFormKey` — `keyof` TanStack's React form API (`FormApi` + `ReactFormApi`:
  `Field`, `FormGroup`, `Subscribe`, `state`, `reset`, `handleSubmit`, …) plus `AppField`,
  `AppForm`, and ours: `Field`, `NativeField`, `Array`, `Submit`, `Steps`, `Step`. The runtime
  object `RESERVED_FORM_KEYS: Record<ReservedFormKey, true>` is compile-checked both ways (a key
  TanStack adds or removes is a compile error here). Neither is exported from `index.ts`.
- `CreateFormOptions` rejects, at the key, (a) a reserved key in `fields` or `components`, (b) a key
  present in both.

- [ ] **Step 1: Write the failing tests**

`packages/form/react/react/src/reserved-keys.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields } from './test-kit'

const Noop = () => null

describe('reserved keys', () => {
	it.each([
		'Subscribe',
		'state',
		'reset',
		'handleSubmit',
		'Field',
		'FormGroup',
		'AppField',
		'Submit',
		'Array',
		'NativeField',
		'Steps',
		'Step',
	])('rejects %s in fields at runtime', (key) => {
		expect(() => createForm({ fields: { [key]: Noop } as never })).toThrow(
			`createForm: "${key}" is reserved by the form instance and cannot be registered in fields.`,
		)
	})

	it('rejects a reserved key in components at runtime', () => {
		expect(() => createForm({ components: { state: Noop } as never })).toThrow(
			'createForm: "state" is reserved by the form instance and cannot be registered in components.',
		)
	})

	it('rejects a key registered in both fields and components', () => {
		expect(() =>
			createForm({ fields: { RatingField: Noop } as never, components: { RatingField: Noop } as never }),
		).toThrow('createForm: "RatingField" is registered in both fields and components.')
	})

	it('rejects them in the types', () => {
		// @ts-expect-error — reserved
		createForm({ fields: { Subscribe: Noop } })
		// @ts-expect-error — reserved
		createForm({ components: { handleSubmit: Noop } })
		// @ts-expect-error — in both
		createForm({ fields: { RatingField: Noop }, components: { RatingField: Noop } })
		createForm({ fields: testFields, components: testComponents })
	})
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/reserved-keys.test.tsx && pnpm --filter @ez-kit/form-react typecheck`
Expected: FAIL — no throw; unused `@ts-expect-error` directives.

- [ ] **Step 3: Implement**

`packages/form/react/react/src/reserved-keys.ts`:

```ts
import type { AnyFormApi } from '@ez-kit/form-core'
import type { ReactFormApi } from '@tanstack/react-form'

/**
 * Every key the form instance already owns. A field or component registered under one of these
 * would be written over it by `Object.assign` — `Subscribe` silently replaced, `state` (a getter)
 * a `TypeError` — so `createForm` refuses them.
 *
 * Derived from TanStack's types plus the members this package adds, never written down as a free
 * list: `RESERVED_FORM_KEYS` below is annotated with this union, so a TanStack upgrade that adds or
 * removes a member fails to compile here.
 */
export type ReservedFormKey =
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- only the key set is read
	| keyof AnyFormApi
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- only the key set is read
	| keyof ReactFormApi<any, any, any, any, any, any, any, any, any, any, any, any>
	| 'AppField'
	| 'AppForm'
	| 'NativeField'
	| 'Array'
	| 'Submit'
	| 'Steps'
	| 'Step'

export const RESERVED_FORM_KEYS: Record<ReservedFormKey, true> = {
	// Fill in every key the compiler asks for; it rejects both a missing and an extra one.
}

/** Throws when `registry` (named `option` in the message) registers a reserved key. */
export function assertNoReservedKeys(registry: object, option: 'fields' | 'components'): void {
	for (const key of Object.keys(registry)) {
		if (Object.hasOwn(RESERVED_FORM_KEYS, key)) {
			throw new Error(`createForm: "${key}" is reserved by the form instance and cannot be registered in ${option}.`)
		}
	}
}

/** Throws when one key is registered as both a field and a component. */
export function assertNoSharedKeys(fields: object, components: object): void {
	for (const key of Object.keys(fields)) {
		if (Object.hasOwn(components, key)) {
			throw new Error(`createForm: "${key}" is registered in both fields and components.`)
		}
	}
}

/** Type-level guard: a reserved key's value must be this message, which no component is. */
export type ReservedKeyGuard<T> = {
	[K in keyof T & ReservedFormKey]: `Error: "${K & string}" is reserved by the form instance`
}

/** Type-level guard: a key in both registries must be this message. */
export type SharedKeyGuard<TComponents, TFields> = {
	[K in keyof TComponents & keyof TFields]: `Error: "${K & string}" is registered in both fields and components`
}
```

If `ReactFormApi`'s generic arity differs, match it (it is TanStack's `ReactFormApi` from
`useForm.d.ts`); if `keyof AnyFormApi` turns out to include keys that are not real members, use
`keyof ReactFormExtendedApi<any × 12>` instead and say so in the report. Fill
`RESERVED_FORM_KEYS` by letting the compiler list what is missing.

In `create-form.tsx`, extend the options type:
`fields?: TFields & FormFieldSlots & ReservedKeyGuard<TFields>` and
`components?: TComponents & FormComponents & ReservedKeyGuard<TComponents> & SharedKeyGuard<TComponents, TFields>`;
at the top of `createForm`, call `assertNoReservedKeys(fields, 'fields')`,
`assertNoReservedKeys(components, 'components')`, `assertNoSharedKeys(fields, components)` before
`deriveFieldTypeIds`. Fold the `LAYOUT_COMPONENT_KEYS` check in `deriveFieldTypeIds` into this
(remove what is now redundant, keep the reserved-document-id check — that one is about the
document, not the instance). `custom-field.test.tsx:~419` asserted the old layout-key rejection:
update its expected message.

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/reserved-keys.test.tsx src/custom-field.test.tsx && pnpm --filter @ez-kit/form-react typecheck && pnpm verify:affected`
Expected: PASS.

- [ ] **Step 5: Changeset and commit**

`.changeset/form-reserved-keys.md`:

```md
---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

`createForm` rejects a field or component registered under a name the form instance already owns
(`Subscribe`, `state`, `reset`, `Field`, `Submit`, …) or under a name used in both `fields` and
`components` — a type error at the key, and an error thrown by `createForm`. Previously such a key
silently replaced the instance's own member.
```

```bash
git add packages/form .changeset/form-reserved-keys.md
git commit -m "feat(form): reject registry keys the form instance already owns"
```

---

### Task 7: `createSchemaForm` — `createForm` stops importing the schema renderer (D2)

**Files:**

- Create: `packages/form/react/react/src/create-schema-form.tsx`
- Modify: `packages/form/react/react/src/create-form.tsx` (no value import from `./schema/*`;
  internals factory)
- Modify: `packages/form/react/react/src/index.ts`, both kit `src/index.ts`, both kit `src/form.tsx`
- Modify: every caller that took `SchemaForm` from `createForm` (form-react tests, `form-types.test.tsx`,
  `apps/docs/shared/form/FormKit.tsx`, `apps/docs/app/(embed)/examples/*/form-kit-provider.tsx` if
  affected, docs pages showing `createForm` + `SchemaForm`)
- Test: `packages/form/react/react/src/create-schema-form.test.tsx` (create); `apps/docs/test/tree-shaking.test.ts`
- Create: `.changeset/form-create-schema-form.md`

**Interfaces:**

- Produces:
  `createForm(options?) → { useForm, Form, FormProvider, withForm, withFieldGroup }`;
  `createSchemaForm(options?) → { useForm, Form, FormProvider, withForm, withFieldGroup, SchemaForm }`
  with the same `CreateFormOptions`. `type FormBundle<TFields, TComponents>` and
  `type SchemaFormBundle<TFields, TComponents>` (`ReturnType<typeof createSchemaForm<…>>`), both
  exported.
- Internal: `createFormInternals(options)` in `create-form.tsx` returns
  `{ bundle, internals: { useForm, FormElement, fields, components } }`; `createForm` returns
  `createFormInternals(options).bundle`; `createSchemaForm` builds `SchemaForm` from `internals`.
  `customFieldsById` moves to `create-schema-form.tsx`.

- [ ] **Step 1: Write the failing tests**

`packages/form/react/react/src/create-schema-form.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createForm } from './create-form'
import { createSchemaForm } from './create-schema-form'
import { testComponents, testFields, testFormElement } from './test-kit'

const OPTIONS = { FormElement: testFormElement, fields: testFields, components: testComponents }

describe('bundle shapes', () => {
	it('createForm returns no SchemaForm', () => {
		expect(Object.keys(createForm(OPTIONS)).sort()).toEqual([
			'Form',
			'FormProvider',
			'useForm',
			'withFieldGroup',
			'withForm',
		])
	})

	it('createSchemaForm returns the same plus SchemaForm', () => {
		expect(Object.keys(createSchemaForm(OPTIONS)).sort()).toEqual([
			'Form',
			'FormProvider',
			'SchemaForm',
			'useForm',
			'withFieldGroup',
			'withForm',
		])
	})

	it('resolves a custom field registered once, from JSX and from a document', () => {
		const RatingField = ({ value }: { value: unknown }) => <output data-testid='rating'>{String(value)}</output>
		const { SchemaForm } = createSchemaForm({ ...OPTIONS, fields: { ...testFields, RatingField } })
		render(
			<SchemaForm
				schema={{ fields: [{ type: 'rating', name: 'score' }] }}
				defaultValues={{ score: 3 }}
			/>,
		)
		expect(screen.getByTestId('rating').textContent).toBe('3')
	})
})
```

Adapt the document literal and `RatingField`'s props to the real schema / custom-field shapes (see
`custom-field.test.tsx` for a working one) — the assertion that matters is that a field registered
through `createSchemaForm` resolves by its derived id. Move the existing "bundle shape" test out of
`create-form.test.tsx` (it asserted `bundle.SchemaForm` exists, which is now false).

In `apps/docs/test/tree-shaking.test.ts`, add a `describe('form-react')` block (the existing
`PACKAGES` table cannot express it — every form package is one dist file — so use the
`bundledCodeOf` literal pattern the `FilterPanel` cases use):

```ts
const FORM_REACT_ENTRY = entryOf('form/react/react')
/** A message only the schema renderer contains. */
const SCHEMA_MARKER = 'may not mix `step` nodes'

describe('form-react schema renderer', () => {
	it('is reached through createSchemaForm', async () => {
		expect(await bundledCodeOf(FORM_REACT_ENTRY, ['createSchemaForm'])).toContain(SCHEMA_MARKER)
	})

	it('is not reached through createForm', async () => {
		expect(await bundledCodeOf(FORM_REACT_ENTRY, ['createForm'])).not.toContain(SCHEMA_MARKER)
	})
})
```

Check that `SCHEMA_MARKER` is a literal in `schema/schema-form.tsx` today (grep); if the wording
differs, use the exact literal and keep it unique to the schema module.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/create-schema-form.test.tsx`
Expected: FAIL — `./create-schema-form` does not exist.

- [ ] **Step 3: Implement**

- `create-form.tsx`: move `UncontrolledSchemaForm`, `SchemaForm`, `customFieldsById` and every value
  import from `./schema/*` (`assertNoReservedFieldKeyCollision`, `isSchemaFormControlled`,
  `renderSchemaFields`, `resolveSchemaValidators`, `schemaDefaultValues`, `stripHiddenValuesOnSubmit`)
  into `create-schema-form.tsx`. Keep `deriveFieldTypeIds(fields)` in `createForm` — it validates the
  registry at startup for both factories — and let `createSchemaForm` re-key its result into
  `customFieldsById`. Introduce `createFormInternals` (see **Interfaces**). After the move,
  `grep -n "from './schema" packages/form/react/react/src/create-form.tsx` must show type-only
  imports or nothing.
- `create-schema-form.tsx` (`'use client'`):

  ```tsx
  export function createSchemaForm<
  	TFields extends FormFieldRegistry = {},
  	TComponents extends FormComponentRegistry = {},
  >(options: CreateFormOptions<TFields, TComponents> = {}) {
  	const { bundle, internals } = createFormInternals(options)
  	const SchemaForm = buildSchemaForm(internals) // the moved implementation, both overloads
  	return { ...bundle, SchemaForm }
  }

  export type SchemaFormBundle<
  	TFields extends FormFieldRegistry = {},
  	TComponents extends FormComponentRegistry = {},
  > = ReturnType<typeof createSchemaForm<TFields, TComponents>>
  ```

  (The spread is in the factory body, not at a module's top level — it costs nothing to tree
  shaking.)

- `index.ts`: export `createSchemaForm` and `SchemaFormBundle`; `FormBundle` stays exported.
- Kits' `src/form.tsx`: a second call `const schemaBundle: KitSchemaFormBundle = createSchemaForm({ FormElement, fields: formFieldSlots, components: formComponents })`
  and `export const SchemaForm: KitSchemaFormBundle['SchemaForm'] = schemaBundle.SchemaForm`; the
  `Form` / `useForm` exports keep coming from the `createForm` bundle. (Task 8 makes both calls
  pure and the exports delegating.) Both kits export `createSchemaForm` from `@ez-kit/form-react`.
- Every caller that destructured `SchemaForm` from `createForm(...)`: switch to `createSchemaForm`
  (`grep -rn "SchemaForm" packages/form apps/docs --include='*.ts' --include='*.tsx' --include='*.mdx' | grep createForm`).

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter @ez-kit/form-react test && pnpm verify:affected`, then
`pnpm build --filter=...@ez-kit/form-core && pnpm --filter @ez-kit/docs exec vitest run test/tree-shaking.test.ts test/kit-exports-parity.test.ts test/form-package-graph.test.ts test/docs-option-names.test.ts`.
Expected: PASS, including both new tree-shaking cases.

- [ ] **Step 5: Changeset and commit**

`.changeset/form-create-schema-form.md`:

```md
---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Add `createSchemaForm`: the same options as `createForm`, returning the same bundle plus
`SchemaForm`. `createForm` no longer returns `SchemaForm` and no longer pulls in the schema
renderer, so an app that writes its forms in JSX does not ship it. Replace
`const { SchemaForm } = createForm(options)` with `createSchemaForm(options)`; fields registered
there resolve from JSX and from a document exactly as before.
```

```bash
git add packages/form apps/docs .changeset/form-create-schema-form.md
git commit -m "feat(form)!: split createSchemaForm from createForm"
```

---

### Task 8: Kit roots that tree-shake — `allFormFields`, `allFormComponents`, the prebuilt bundle (D1)

**Files:**

- Create: `packages/form/react/{shadcn,heroui}/src/sets.ts`
- Modify: `packages/form/react/{shadcn,heroui}/src/form.tsx` (the prebuilt bundle only)
- Modify: `packages/form/react/{shadcn,heroui}/src/index.ts` (components from `./blocks/*`, sets from
  `./sets`, prebuilt from `./form`)
- Modify: both kits' `src/index.test.tsx`, `packages/form/react/shadcn/CLAUDE.md`,
  `packages/form/react/heroui/CLAUDE.md` (if it describes `form.tsx`), kit READMEs' `formComponents`
  / `formFieldSlots` mentions
- Modify: `apps/docs/test/tree-shaking.test.ts`
- Modify: `apps/docs` callers of `formComponents` / `formFieldSlots` (3 MDX files; code only — prose
  in Task 9)
- Create: `.changeset/form-kit-tree-shaking.md`

**Interfaces:**

- Consumes: `createForm`, `createSchemaForm`, `FormBundle`, `SchemaFormBundle` (Task 7),
  `FormProvider` (Task 1), `SubmitButton` (Task 3), `ArrayField` with `Item` (Task 4), `FormElement`
  (Task 5).
- Produces, from each kit root (identically):
  - components, straight from `blocks/`: `TextField` … `DateRangeField` (12), `ArrayField`,
    `FormElement`, `SubmitButton`, `Section`, `GridItem`, `Wizard`;
  - sets, from `./sets`: `allFormFields` (`satisfies FormFieldSlots`, the 13 field keys) and
    `allFormComponents` (`satisfies FormComponents`, the 4 component keys) — renamed from
    `formFieldSlots` / `formComponents`, which are removed;
  - prebuilt, from `./form`: `useForm`, `Form`, `SchemaForm`, `withForm`, `withFieldGroup`;
  - from `@ez-kit/form-react`: `FormProvider`, `useFormContext`, `createForm`, `createSchemaForm`, …

- [ ] **Step 1: Write the failing tree-shaking tests**

In `apps/docs/test/tree-shaking.test.ts`, add (after Task 7's block):

```ts
/** Markers: a module specifier only the date block imports, and a literal only the schema renderer has. */
const KITS = [
	{ name: '@ez-kit/form-shadcn', entry: entryOf('form/react/shadcn'), calendar: 'react-day-picker' },
	{ name: '@ez-kit/form-heroui', entry: entryOf('form/react/heroui'), calendar: '@internationalized/date' },
] as const

describe.each(KITS)('$name root', ({ entry, calendar }) => {
	it('reaches the calendar through DateField (control)', async () => {
		expect(await bundledCodeOf(entry, ['DateField'])).toContain(calendar)
	})

	it('reaches the schema renderer through SchemaForm (control)', async () => {
		expect(await bundledCodeOf(entry, ['SchemaForm'])).toContain(SCHEMA_MARKER)
	})

	it('a one-field form pulls no calendar and no schema renderer', async () => {
		const code = await bundledCodeOf(entry, ['createForm', 'FormElement', 'TextField', 'SubmitButton'])
		expect(code).not.toContain(calendar)
		expect(code).not.toContain(SCHEMA_MARKER)
	})

	it('the prebuilt Form pulls no schema renderer', async () => {
		expect(await bundledCodeOf(entry, ['Form'])).not.toContain(SCHEMA_MARKER)
	})

	it('a one-field form costs well under the whole root', async () => {
		const narrow = await bundledCodeOf(entry, ['createForm', 'FormElement', 'TextField', 'SubmitButton'])
		const everything = await bundledCodeOf(entry, [])
		expect(narrow.length).toBeLessThan(everything.length / 2)
	})
})
```

Add the combobox to the shadcn case: a second marker `'@base-ui/react'` asserted absent from the
one-field bundle and present in `['SelectField']`'s (if `TextField` itself imports `@base-ui/react`,
pick the searchable-select block's own literal instead and record which). If a heroui control fails
because `TextField` also imports `@internationalized/date`, pick a literal unique to the heroui date
block (e.g. its `data-slot` string) and record it.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm build --filter=...@ez-kit/form-core && pnpm --filter @ez-kit/docs exec vitest run test/tree-shaking.test.ts`
Expected: the controls pass; "a one-field form pulls no calendar" and "the prebuilt Form pulls no
schema renderer" FAIL — today every component reaches the root through `form.tsx`, whose top-level
`createForm(...)` and property reads anchor everything.

- [ ] **Step 3: Restructure each kit** (shadcn shown; heroui identical apart from paths)

`src/sets.ts`:

```ts
import { ArrayField } from './blocks/array'
import { DateField, DateRangeField } from './blocks/date'
// …the remaining block imports, exactly the ones today's form.tsx has
import { SubmitButton } from './blocks/form-parts'
import { GridItem, Section } from './blocks/layout'
import { Wizard } from './blocks/wizard'

import type { FormComponents, FormFieldSlots } from '@ez-kit/form-react'

/** Every field kind this kit ships, keyed as `createForm({ fields })` takes them. */
export const allFormFields = {
	TextField,
	NumberField,
	TextareaField,
	SelectField,
	CheckboxField,
	SwitchField,
	RadioGroupField,
	SliderField,
	MultiSelectField,
	CheckboxGroupField,
	DateField,
	DateRangeField,
	ArrayField,
} satisfies FormFieldSlots

/** Every form-aware component this kit ships, keyed as `createForm({ components })` takes them. */
export const allFormComponents = { SubmitButton, Section, GridItem, Wizard } satisfies FormComponents
```

`src/form.tsx` — the prebuilt bundle, and nothing else:

```tsx
'use client'

import { createForm, createSchemaForm } from '@ez-kit/form-react'

import { FormElement } from './blocks/form-parts'
import { allFormComponents, allFormFields } from './sets'

import type { FormBundle, SchemaFormBundle } from '@ez-kit/form-react'

type KitFormBundle = FormBundle<typeof allFormFields, typeof allFormComponents>
type KitSchemaFormBundle = SchemaFormBundle<typeof allFormFields, typeof allFormComponents>

/**
 * Both calls are pure with flat, spread-free arguments, and nothing at the top level reads a
 * property of either: every export delegates inside a function body. So a consumer that imports
 * only `TextField` from the kit root keeps neither bundle, and one that imports `Form` keeps the
 * form bundle and not the schema renderer. A property read here (`export const Form = kit.Form`)
 * would anchor the bundle and every component it registers — the defect this module replaced.
 */
const kit: KitFormBundle = /* @__PURE__ */ createForm({
	FormElement,
	fields: allFormFields,
	components: allFormComponents,
})
const schemaKit: KitSchemaFormBundle = /* @__PURE__ */ createSchemaForm({
	FormElement,
	fields: allFormFields,
	components: allFormComponents,
})

export const useForm = ((options: never) => kit.useForm(options)) as KitFormBundle['useForm']
export const Form = ((props: never) => <kit.Form {...(props as object)} />) as unknown as KitFormBundle['Form']
export const SchemaForm = ((props: never) => (
	<schemaKit.SchemaForm {...(props as object)} />
)) as unknown as KitSchemaFormBundle['SchemaForm']
export const withForm = ((options: never) => kit.withForm(options)) as KitFormBundle['withForm']
export const withFieldGroup = ((options: never) => kit.withFieldGroup(options)) as KitFormBundle['withFieldGroup']
```

Adjust the casts to whatever the compiler and `@typescript-eslint` accept — the shape that matters
is: two `/* @__PURE__ */` calls, flat arguments, exports that only reference `kit` / `schemaKit`
inside function bodies, every export annotated through a `@ez-kit/form-react` type. If the
`react-hooks` lint rule objects to `kit.useForm` inside the delegating `useForm`, name the arrow
with a `use` prefix (it already is) or write `export function useForm(...)`. If esbuild still keeps
`kit` when only `TextField` is imported (the Step 1 case fails), fall back to a lazy singleton —
`let cached: KitFormBundle | undefined; const kit = (): KitFormBundle => (cached ??= createForm({…}))`
— and record the measurement in the report.

`src/index.ts`: export each component from its block module (`export { TextField, … } from './blocks/fields'`
etc., `ArrayField` from `./blocks/array`, `FormElement` and `SubmitButton` from `./blocks/form-parts`,
`Section` / `GridItem` from `./blocks/layout`, `Wizard` from `./blocks/wizard`); `allFormFields`,
`allFormComponents` from `./sets`; `useForm`, `Form`, `SchemaForm`, `withForm`, `withFieldGroup`
from `./form`; nothing else from `./form`. Remove `formComponents` / `formFieldSlots`. Keep both
kits' lists identical.

Kits' `index.test.tsx`: assert `allFormFields` has the 13 keys and `allFormComponents` the 4,
`kit[name] === kit.allFormFields[name]` for each field, and the existing custom-field case through
`createForm({ FormElement: kit.FormElement, fields: { ...kit.allFormFields, RatingField }, components: kit.allFormComponents })`.

Add one interoperation test to one kit's `index.test.tsx`: a form from the prebuilt `useForm`
rendered by the prebuilt **controlled** `SchemaForm` shows its fields and submits — the two
prebuilt bundles are separate `createForm` calls and must still work together (Review Focus 5).

Update the three MDX files' code that names `formComponents` / `formFieldSlots`
(`custom-kit.mdx`, `schema.mdx`, `custom-fields.mdx`) to `allFormComponents` / `allFormFields` and
the new options shape; `shadcn/CLAUDE.md:15` (and heroui's, if present) to describe `sets.ts` and
`form.tsx` as above.

- [ ] **Step 4: Run the tests**

Run: `pnpm build --filter=...@ez-kit/form-core && pnpm --filter @ez-kit/docs exec vitest run test/tree-shaking.test.ts test/kit-exports-parity.test.ts test/form-package-graph.test.ts test/docs-option-names.test.ts`,
both kits' `test`, `pnpm verify:affected`, `pnpm size`.
Expected: PASS. `size-limit` measures the whole entry, so the kit budgets should not move by more
than the new code; if one fails, report the measured size before changing a limit.

- [ ] **Step 5: Changeset and commit**

`.changeset/form-kit-tree-shaking.md`:

```md
---
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

The kit root now tree-shakes: importing `TextField` and `createForm` no longer pulls the date
picker, the comboboxes or the schema renderer, and importing `Form` no longer pulls the schema
renderer. Every component is exported on its own — the twelve field kinds, `ArrayField`,
`FormElement`, `SubmitButton`, `Section`, `GridItem`, `Wizard` — and `formFieldSlots` /
`formComponents` are renamed `allFormFields` / `allFormComponents`: importing one is a deliberate
"everything".

    export const { useForm, Form } = createForm({
      FormElement,
      fields: { TextField, SelectField, ArrayField },
      components: { SubmitButton, Section },
    })
```

```bash
git add packages/form apps/docs .changeset/form-kit-tree-shaking.md
git commit -m "feat(form)!: make the kit roots tree-shake"
```

---

### Task 9: Docs and pending changesets for the new factory

**Files:**

- Modify: `apps/docs/content/docs/form/custom-kit.mdx` (the kit contract: `FormElement`, open
  optional `fields` / `components`, no `Button` / `Form` slots, "seven required slots" and "fields is
  required" prose gone)
- Modify: `apps/docs/content/docs/form/schema.mdx` (`createSchemaForm`), `custom-fields.mdx`
  (`allFormFields`, options shape — names and code only; the page's full rewrite is stage 7),
  `getting-started.mdx`, `fields.mdx` (the `form.SubmitButton` section: it is the kit component
  passed in `components`; `form.Submit` is the primitive), `submission.mdx` (`form.Submit`,
  `SubmitButton` outside `<form>` with `FormProvider`), `composition.mdx` (a short section for
  `useFormContext` / `FormProvider`, spec §4 scenario 3), `arrays/api.mdx` (`ArrayScope` has no
  `Button`; `ArrayField.Item`), `index.mdx`, `installation/*.mdx`
- Modify: `apps/docs/shared/form/FormKit.tsx` and the embed `form-kit-provider.tsx` files if a docs
  example now needs `SubmitButton` / `FormProvider` / `useFormContext` from the active kit
- Modify: `apps/docs/test/docs-options/page-type-map.ts` (new and changed option tables)
- Modify: `packages/form/react/{react,shadcn,heroui}/README.md`
- Modify (in place, pending): `.changeset/form-field-registry.md` (`formComponents` /
  `formFieldSlots` / `createForm({ components, fields })` → the new names and shape)
- Create: `.changeset/form-docs-stage-2.md` only if `@ez-kit/docs` is versioned by changesets in this
  repo (check `.changeset/config.json` and existing changesets naming `@ez-kit/docs`); otherwise
  none.

**Interfaces:**

- Consumes: everything Tasks 1–8 produce. Produces no code.

- [ ] **Step 1: Find every stale claim**

Run:

```bash
grep -rnE "formComponents|formFieldSlots|components\.Button|Button slot|seven|scope\.Button|createForm\(\{ components|SchemaForm \} = createForm|required" apps/docs/content/docs/form packages/form/react/*/README.md .changeset | grep -v CHANGELOG
```

Read each hit. Then do the `AGENTS.md` second sweep for claims, not identifiers: grep for
"required", "all seven", "every slot", "warns", "console warning", "renders nothing" under
`apps/docs/content/docs/form` and read each — the old guards' warn-once behaviour is described in
prose that names no identifier.

- [ ] **Step 2: Rewrite**

- `custom-kit.mdx`: the contract section states two levels — a kit implements each slot's props type
  and checks with `satisfies FormFieldSlots` / `satisfies FormComponents`; an app assembles any
  subset with `createForm({ FormElement, fields, components })`. Show the kit's `sets.ts` and
  `form.tsx` shape from Task 8 and explain the `/* @__PURE__ */` + delegating-export rule in one
  paragraph.
- `composition.mdx`: a "Components that know about the form" section with spec §4 scenario 3
  (`ErrorSummary` via `useFormContext`, registered in `components` or rendered directly) and
  `FormProvider` for a `<form>` lower in the tree. Use a live example only if one exists; otherwise a
  code block.
- `submission.mdx`: `form.Submit` and its five render props; `SubmitButton` works under
  `FormProvider`.
- Every option table you add or change is registered in `page-type-map.ts` with its governing type
  (`CreateFormOptions`, `SubmitRenderProps`, `FormComponents`, `FormFieldSlots`) and its count.
- READMEs: the same changes in short.
- `.changeset/form-field-registry.md`: rename and reshape in place, keeping it true for the release
  it ships in.

- [ ] **Step 3: Run the tests**

Run: `pnpm build --filter=...@ez-kit/form-core && pnpm --filter @ez-kit/docs exec vitest run test/docs-option-names.test.ts`,
`pnpm --filter @ez-kit/docs typecheck`, `pnpm lint` (runs `check-changesets` and `check-site-url`).
Re-run the Step 1 grep: only CHANGELOGs, `specs/` and intentional "was … now …" sentences in
changesets remain.

- [ ] **Step 4: Commit**

```bash
git add apps/docs packages/form .changeset
git commit -m "docs(form): document the stage 2 factory, context and kit sets"
```

---

### Task 10: Stage gate

**Files:** none new.

- [ ] **Step 1: Full gate, sequentially**

```bash
pnpm build && pnpm lint && pnpm typecheck && pnpm test && pnpm size
```

Expected: all green. A timeout-only failure that passes when its package runs alone is the
machine-load artefact `AGENTS.md` describes — rerun that package; do not change the test.

- [ ] **Step 2: Spec cross-check**

Confirm, by grep returning nothing outside `specs/`, plans, CHANGELOGs and the changesets that
describe the change:

```bash
grep -rnE "\bformComponents\b|\bformFieldSlots\b|ButtonProps\b|SectionRenderProps|GridItemRenderProps|guardComponents|guardFields" apps packages --include='*.ts' --include='*.tsx' --include='*.md' --include='*.mdx' | grep -v node_modules | grep -v /dist/ | grep -v CHANGELOG
```

and that `grep -n "from './schema" packages/form/react/react/src/create-form.tsx` shows type-only
imports or nothing.

- [ ] **Step 3: Hand over for review**

Report to the user: the stage's commits, the gate output, the tree-shaking measurements, and
anything the plan got wrong. Do not start stage 3.
