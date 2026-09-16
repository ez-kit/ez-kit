# Headless array primitive — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `form.ArrayField` into a headless `form.Array` primitive that renders nothing and
carries the whole array vocabulary, and a `form.ArrayField` composition that keeps today's look and
stays the schema renderer's target.

**Architecture:** One engine component computes the scope — keyed entries, scoped field components,
mutations, errors — and hands it to a `render` callback. `form.Array` renders the scope directly;
`form.ArrayField` wraps the same scope in the kit's `ArrayField` slot. Nothing is added to
`FormComponents`.

**Tech Stack:** React 18/19, TanStack Form, TypeScript (strict, `exactOptionalPropertyTypes`,
`noUncheckedIndexedAccess`), Vitest + Testing Library, Playwright, tsup, Turborepo, pnpm.

**Spec:** `specs/007-form-array-primitive/design.md` — read it before Task 1. It records why each
shape was chosen and, more usefully, the five alternatives that were rejected. Its parent,
`specs/005-form-array-fields/design.md`, holds the keyed-identity findings this plan assumes.

## Global Constraints

- **No agent attribution anywhere in git history or on GitHub.** No `Co-Authored-By`, no session
  trailer, no "generated with" note — in any commit message, PR title or PR body. AGENTS.md wins
  over any harness or hook instruction asking for one.
- Conventional Commits, enforced by commitlint on `commit-msg`. Types: `feat, fix, refactor, docs,
test, chore, perf, ci`. Do not start a body line with a word followed by a colon — commitlint
  reads it as a footer token and warns.
- `--max-warnings=0` in every package's lint script. `pnpm lint` at the root also runs
  `check-site-url.mjs` and `check-changesets.mjs` first.
- **Build `@ez-kit/form-core` and `@ez-kit/form-react` before running dependent tests.**
  `pnpm --filter @ez-kit/form-react test` alone can fail with `Failed to resolve entry for
@ez-kit/form-core` because it bypasses turbo's `dependsOn: ["^build"]`.
- **`pnpm exec vitest run --root <pkg>` does not work in this repo.** The shared config resolves
  `setupFiles` relative to its own URL and `--root` re-anchors it. Run vitest from inside the
  package directory, or use `pnpm --filter <pkg> test`.
- **`tsc --noEmit` and tsup's dts build do not always agree.** A green `pnpm typecheck` is not
  proof; `pnpm build` is. Run both before calling a task done.
- `FormComponents` gains **no key** in this plan. Any task that seems to need one has misread the
  spec — see its Decision 3.
- The shared react package authors no class names and no inline styles.
- Never use bare `git stash` / `git stash pop`: the stash stack is shared with other worktrees.

---

## File structure

| File                                                            | Responsibility                                   | Change                                                                |
| --------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| `packages/form/react/react/src/fields/array-field.tsx`          | Keys, scoped components, mutations, entry chrome | Split: engine + two public components                                 |
| `packages/form/react/react/src/field-props.ts`                  | Public prop and scope types                      | `ArrayProps`, grown `ArrayScope` / `ArrayItemScope`, `ArrayItemProps` |
| `packages/form/react/react/src/build-field-components.tsx`      | Attaches components to the form instance         | Attach `Array` beside `ArrayField`                                    |
| `packages/form/react/react/src/index.ts`                        | Public surface                                   | Export the new types                                                  |
| `packages/form/react/react/src/array-field.test.tsx`            | Composition behaviour                            | Unchanged — it is the regression proof                                |
| `packages/form/react/react/src/array.test.tsx`                  | Primitive behaviour                              | Create                                                                |
| `packages/form/react/{shadcn,heroui}/src/array-fields.test.tsx` | Kit row from the primitive                       | Extend                                                                |
| `apps/docs/shared/form/examples/components/arrays-custom.tsx`   | Third example                                    | Create                                                                |
| `apps/docs/e2e/packages/form/arrays/arrays-custom.spec.ts`      | Browser proof, both kits                         | Create                                                                |

`array-field.tsx` is 352 lines today and grows. If it passes ~500 lines after Task 4, split the
engine into `fields/array-engine.tsx` and leave the two public components in `array-field.tsx`.
Do not split pre-emptively.

---

### Task 1: Extract the engine, keep behaviour identical

A pure refactor. Its gate is that **every existing test passes unchanged** — no test is edited in
this task. If a test needs editing, the refactor changed behaviour and is wrong.

**Files:**

- Modify: `packages/form/react/react/src/fields/array-field.tsx`

**Interfaces:**

- Consumes: nothing new.
- Produces: `ArrayBody`, an internal component with a `render` prop:
  `render: (scope: ArrayScopeInternal, frame: ArrayFrameProps) => ReactNode`, where
  `ArrayFrameProps` is `Omit<ArrayFieldRenderProps, 'children'>`.

- [ ] **Step 1: Confirm the baseline is green before touching anything**

```bash
pnpm --filter @ez-kit/form-core build && pnpm --filter @ez-kit/form-react build
cd packages/form/react/react && pnpm exec vitest run && cd -
```

Expected: all form-react suites pass. Record the test count — it must not change in this task.

- [ ] **Step 2: Rename `ArrayFieldBody` to `ArrayBody` and give it a `render` prop**

In `array-field.tsx`, change the props type and the final `return`. Replace the `children`
member of `ArrayFieldBodyProps` and the `KitArrayField` member with:

```tsx
type ArrayFrameProps = {
	'data-field': string
	'data-field-type': string
	name: string
	label: ReactNode
	description: ReactNode
	errors: string[]
	invalid: boolean
	disabled: boolean | undefined
	required: boolean | undefined
	addLabel: ReactNode
	onAdd: () => void
	canAdd: boolean
}

type ArrayBodyProps = {
	// …every existing member except `KitArrayField` and `children`…
	render: (
		scope: { items: readonly ArrayItemScope<unknown>[]; add: () => void; canAdd: boolean },
		frame: ArrayFrameProps,
	) => ReactNode
}
```

Replace the component's `return` with:

```tsx
const frame: ArrayFrameProps = {
	'data-field': field.name,
	'data-field-type': ARRAY_FIELD_TYPE,
	name: field.name,
	label,
	description,
	errors,
	invalid: errors.length > 0,
	disabled,
	required,
	addLabel: addLabel ?? DEFAULT_ADD_LABEL,
	onAdd: add,
	canAdd,
}

return render({ items, add, canAdd }, frame)
```

- [ ] **Step 3: Re-express `ArrayField` on top of it**

In `createArrayField`, pass the wrapping through `render` instead of handing `KitArrayField` down:

```tsx
<ArrayBody
	field={field}
	fieldName={name}
	KitArrayItem={KitArrayItem}
	scoped={scoped}
	label={label}
	description={description}
	disabled={disabled}
	required={required}
	reorderable={reorderable}
	newItem={newItem}
	addLabel={addLabel}
	removeLabel={removeLabel}
	itemLabel={itemLabel}
	validate={validate}
	render={(scope, frame) => (
		<KitArrayField {...frame}>{(children as unknown as (s: typeof scope) => ReactNode)(scope)}</KitArrayField>
	)}
/>
```

- [ ] **Step 4: Run the whole form suite and the kits**

```bash
pnpm --filter @ez-kit/form-react build
cd packages/form/react/react && pnpm exec vitest run && cd -
cd packages/form/react/shadcn && pnpm exec vitest run && cd -
cd packages/form/react/heroui && pnpm exec vitest run && cd -
```

Expected: identical counts to Step 1, zero edited tests. `git diff --stat -- '*.test.tsx'` must
print nothing.

- [ ] **Step 5: Typecheck, build, lint**

```bash
pnpm typecheck && pnpm build && pnpm lint
```

- [ ] **Step 6: Commit**

```bash
git add packages/form/react/react/src/fields/array-field.tsx
git commit -m "refactor(form): lift the array engine out of the ArrayField body

The body computed the scope and wrapped it in the kit's slot in one place.
It now hands the scope and the frame props to a render callback, so a second
caller can take the scope without the frame. No behaviour changes: every
array test passes unedited."
```

---

### Task 2: Grow the scope

`insert`, `remove`, `move`, `errors`, `invalid`, `field` and `Button` on the array scope;
`isFirst`, `isLast`, `remove`, `moveUp`, `moveDown` on the item scope. Driven through the existing
`form.ArrayField`, so no new component is needed yet.

**Files:**

- Modify: `packages/form/react/react/src/field-props.ts`
- Modify: `packages/form/react/react/src/fields/array-field.tsx`
- Test: `packages/form/react/react/src/array-field.test.tsx`

**Interfaces:**

- Consumes: `ArrayBody` from Task 1.
- Produces:

```ts
export type ArrayScope<TItem> = {
	items: readonly ArrayItemScope<TItem>[]
	add: () => void
	insert: (index: number, value?: TItem) => void
	remove: (index: number) => void
	move: (from: number, to: number) => void
	canAdd: boolean
	errors: string[]
	invalid: boolean
	Button: FormComponents['Button']
	field: BoundFieldApi
}

export type ArrayItemScope<TItem> = FormFieldComponents<TItem> & {
	key: string
	index: number
	isFirst: boolean
	isLast: boolean
	remove: () => void
	moveUp: () => void
	moveDown: () => void
	/** Still `{ children }` at this task; Task 4 widens it to `ArrayItemProps`. */
	Item: (props: { children: ReactNode }) => ReactNode
}
```

`ArrayFieldScope<TItem>` becomes an alias of `ArrayScope<TItem>` — one scope serves both
components, as the spec's Decision 1 requires.

- [ ] **Step 1: Write the failing tests**

Append to `array-field.test.tsx`. The form under test is the existing `PeopleForm`; add a second
harness that reaches the new members.

```tsx
describe('the array scope', () => {
	it('inserts an entry at a position without disturbing the others', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(
			<Form
				defaultValues={{ title: '', people: [{ firstName: 'Ada' }, { firstName: 'Grace' }] }}
				onSubmit={({ value }) => {
					onSubmit(value)
				}}
			>
				{(form) => (
					<>
						<form.ArrayField
							name='people'
							newItem={NEW_PERSON}
						>
							{({ items, insert }) => (
								<>
									{items.map((item) => (
										<item.Item key={item.key}>
											<item.TextField
												name='firstName'
												label='Name'
											/>
										</item.Item>
									))}
									<button
										type='button'
										onClick={() => {
											insert(1, { firstName: 'Katherine' })
										}}
									>
										insert
									</button>
								</>
							)}
						</form.ArrayField>
						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		await user.click(screen.getByRole('button', { name: 'insert' }))
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({
				title: '',
				people: [{ firstName: 'Ada' }, { firstName: 'Katherine' }, { firstName: 'Grace' }],
			})
		})
	})

	it('keeps each entry mounted across an insert in the middle', async () => {
		// Control-local state is the only witness — a remount is invisible in the submitted
		// values. An uncontrolled sibling input survives a re-render and dies on a remount, so
		// its text is the assertion.
		const user = userEvent.setup()
		render(
			<Form defaultValues={{ title: '', people: [{ firstName: 'Ada' }, { firstName: 'Grace' }] }}>
				{(form) => (
					<form.ArrayField
						name='people'
						newItem={NEW_PERSON}
					>
						{({ items, insert }) => (
							<>
								{items.map((item) => (
									<item.Item key={item.key}>
										<item.TextField
											name='firstName'
											label={`Name ${String(item.index)}`}
										/>
										<input
											aria-label={`scratch ${item.key}`}
											defaultValue=''
										/>
									</item.Item>
								))}
								<button
									type='button'
									onClick={() => {
										insert(1, { firstName: 'Katherine' })
									}}
								>
									insert
								</button>
							</>
						)}
					</form.ArrayField>
				)}
			</Form>,
		)

		const scratches = screen.getAllByLabelText(/^scratch /)
		const lastScratch = scratches[scratches.length - 1]!
		await user.type(lastScratch, 'survives')
		await user.click(screen.getByRole('button', { name: 'insert' }))

		const after = screen.getAllByLabelText(/^scratch /)
		expect(after).toHaveLength(3)
		expect(after[after.length - 1]).toHaveValue('survives')
	})

	it('reports isFirst and isLast against the current order', async () => {
		const user = userEvent.setup()
		render(
			<Form defaultValues={{ title: '', people: [{ firstName: 'Ada' }, { firstName: 'Grace' }] }}>
				{(form) => (
					<form.ArrayField
						name='people'
						newItem={NEW_PERSON}
					>
						{({ items, move }) => (
							<>
								{items.map((item) => (
									<div key={item.key}>
										<span>{`${String(item.index)}:${String(item.isFirst)}:${String(item.isLast)}`}</span>
										<item.TextField
											name='firstName'
											label={`Name ${String(item.index)}`}
										/>
									</div>
								))}
								<button
									type='button'
									onClick={() => {
										move(0, 1)
									}}
								>
									swap
								</button>
							</>
						)}
					</form.ArrayField>
				)}
			</Form>,
		)

		expect(screen.getByText('0:true:false')).toBeInTheDocument()
		expect(screen.getByText('1:false:true')).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'swap' }))

		// The flags describe positions, so they read the same after a swap — what must have
		// changed is which entry sits at each position.
		expect(screen.getByLabelText('Name 0')).toHaveValue('Grace')
		expect(screen.getByLabelText('Name 1')).toHaveValue('Ada')
	})
})
```

The second case is the important one: it is the only check that `insert` reuses the cached per-key
component rather than renumbering component identities.

- [ ] **Step 2: Run them and watch them fail**

```bash
cd packages/form/react/react && pnpm exec vitest run array-field && cd -
```

Expected: FAIL — `insert is not a function`, and the flags are `undefined`.

- [ ] **Step 3: Add `onInsert` to `useItemKeys`**

```tsx
const onInsert = useCallback(
	(index: number) => {
		keysRef.current.splice(index, 0, create())
	},
	[create],
)
```

Add `onInsert` to the hook's return type and to its returned object.

- [ ] **Step 4: Add the mutations and the flags to the body**

In `ArrayBody`, beside `add` / `remove` / `move`:

```tsx
const add = (): void => {
	keys.onAdd()
	write([...list, newItem])
}

const insert = (index: number, value?: unknown): void => {
	keys.onInsert(index)
	const next = [...list]
	next.splice(index, 0, value === undefined ? newItem : value)
	write(next)
}
```

In the `items` map, extend the returned object:

```tsx
return {
	...scoped,
	key,
	index,
	isFirst: index === 0,
	isLast: index === list.length - 1,
	remove: () => {
		remove(index)
	},
	moveUp: () => {
		if (index > 0) move(index, index - 1)
	},
	moveDown: () => {
		if (index < list.length - 1) move(index, index + 1)
	},
	Item: componentFor(key),
}
```

Note `moveUp` / `moveDown` are always callable — unlike the kit's rendered arrows, which stay
governed by `reorderable`. Guarding here rather than returning `undefined` keeps the item scope's
shape constant, which is what lets an author wire a control without a null check.

Pass the whole scope to `render`:

```tsx
return render(
	{ items, add, insert, remove, move, canAdd, errors, invalid: errors.length > 0, Button: components.Button, field },
	frame,
)
```

`ArrayBody` therefore needs the whole `components` record, not just the two slots. Replace its
`KitArrayItem` prop with `components: FormComponents`, read `components.ArrayItem` inside, and
update the call site in `createArrayField` to pass `components={components}` in place of
`KitArrayItem={KitArrayItem}`. `createArrayField` keeps destructuring `ArrayField` for its own
`render` wrapper.

- [ ] **Step 5: Run the tests**

```bash
cd packages/form/react/react && pnpm exec vitest run array-field && cd -
```

Expected: PASS, including every pre-existing case in the file.

- [ ] **Step 6: Typecheck, build, lint, commit**

```bash
pnpm typecheck && pnpm build && pnpm lint
git add packages/form/react/react/src
git commit -m "feat(form): carry the whole array vocabulary on the scope

The scope handed out one mutation, add, so removal and reordering existed
only inside the buttons the kit draws. It now carries insert, remove and
move, the list's own errors, and the kit's generic Button; an entry carries
remove, moveUp, moveDown and the isFirst / isLast flags a control needs to
disable itself at the ends."
```

---

### Task 3: `form.Array`

**Files:**

- Modify: `packages/form/react/react/src/field-props.ts`
- Modify: `packages/form/react/react/src/fields/array-field.tsx`
- Modify: `packages/form/react/react/src/build-field-components.tsx`
- Modify: `packages/form/react/react/src/index.ts`
- Test: `packages/form/react/react/src/array.test.tsx` (create)

**Interfaces:**

- Consumes: `ArrayBody`, `ArrayScope` from Tasks 1–2.
- Produces:

```ts
export type ArrayProps<TFormData, TItem> = {
	name: DeepKeysOfType<TFormData, readonly TItem[]>
	disabled?: boolean
	required?: boolean
	validate?: FieldValidateProps
	newItem: TItem
	children: (scope: ArrayScope<TItem>) => ReactNode
}
```

and `FormFieldComponents<TFormData>['Array']:  <TItem>(props: ArrayProps<TFormData, TItem>) => ReactNode`.

- [ ] **Step 1: Write the failing test**

Create `packages/form/react/react/src/array.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents } from './test-kit'

type Person = { firstName: string }
type Values = { people: Person[] }

const { Form } = createForm({ components: testComponents })
const NEW_PERSON: Person = { firstName: '' }

function BareList({ onSubmit }: { onSubmit?: (values: Values) => void }) {
	return (
		<Form
			defaultValues={{ people: [{ firstName: 'Ada' }] }}
			onSubmit={({ value }) => {
				onSubmit?.(value)
			}}
		>
			{(form) => (
				<>
					<form.Array
						name='people'
						newItem={NEW_PERSON}
					>
						{({ items, add, canAdd }) => (
							<ul>
								{items.map((item) => (
									<li key={item.key}>
										<item.TextField
											name='firstName'
											label={`Name ${String(item.index)}`}
										/>
										<button
											type='button'
											onClick={item.remove}
										>{`remove ${String(item.index)}`}</button>
									</li>
								))}
								<button
									type='button'
									onClick={() => {
										add()
									}}
									disabled={!canAdd}
								>
									add
								</button>
							</ul>
						)}
					</form.Array>
					<form.SubmitButton>Save</form.SubmitButton>
				</>
			)}
		</Form>
	)
}

describe('form.Array', () => {
	it('renders no chrome of its own', () => {
		render(<BareList />)
		expect(document.querySelector('[data-slot="form-array"]')).toBeNull()
		expect(document.querySelector('[data-slot="form-array-item"]')).toBeNull()
		expect(screen.getByRole('list')).toBeInTheDocument()
	})

	it('removes the entry the author asked for', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<BareList onSubmit={onSubmit} />)

		await user.click(screen.getByRole('button', { name: 'add' }))
		await user.type(screen.getByLabelText('Name 1'), 'Grace')
		await user.click(screen.getByRole('button', { name: 'remove 0' }))
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ people: [{ firstName: 'Grace' }] })
		})
	})

	it('addresses the entry paths from inside an entry', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<BareList onSubmit={onSubmit} />)

		await user.clear(screen.getByLabelText('Name 0'))
		await user.type(screen.getByLabelText('Name 0'), 'Katherine')
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ people: [{ firstName: 'Katherine' }] })
		})
	})
})
```

Check the two `data-slot` values against what `test-kit.tsx` actually stamps before running; use
the literals it writes, not these, if they differ.

- [ ] **Step 2: Run it and watch it fail**

```bash
cd packages/form/react/react && pnpm exec vitest run array.test && cd -
```

Expected: FAIL — `form.Array is not a function`.

- [ ] **Step 3: Add `createArray` beside `createArrayField`**

First lift the `scoped` record out of `createArrayField` into a helper, so both factories build it
the same way. The body is the expression that already sits inside `createArrayField` — move it,
do not retype it:

```tsx
/**
 * The form's field components, re-read as addressing an entry's paths. One record per form, so
 * component identities are stable for every array and every entry — see the note on
 * `ArrayItemPathContext`.
 */
function buildScopedComponents<TFormData>(
	fieldComponents: FormFieldComponents<TFormData>,
): FormFieldComponents<unknown> {
	return Object.fromEntries(
		Object.entries(fieldComponents).map(([key, Component]) => [
			key,
			scopeComponent(Component as (props: { name: string }) => ReactNode),
		]),
	) as unknown as FormFieldComponents<unknown>
}
```

`createArrayField` now opens with `const scoped = buildScopedComponents(fieldComponents)`.

Note both factories are called once each per form, so each builds its **own** record. That is
correct — identities only need to be stable for the lifetime of one array field, and the two
components never render the same one.

```tsx
export function createArray<TFormData>(
	form: BindableForm,
	components: FormComponents,
	fieldComponents: FormFieldComponents<TFormData>,
): FormFieldComponents<TFormData>['Array'] {
	const scoped = buildScopedComponents(fieldComponents)

	return function ArrayPrimitive<TItem>({
		name,
		disabled,
		required,
		validate,
		newItem,
		children,
	}: ArrayProps<TFormData, TItem>): ReactNode {
		return (
			<form.AppField
				name={name}
				validators={fieldValidators(name, validate)}
			>
				{(field) => (
					<ArrayBody
						field={field}
						fieldName={name}
						components={components}
						scoped={scoped}
						label={null}
						description={null}
						disabled={disabled}
						required={required}
						reorderable={undefined}
						newItem={newItem}
						addLabel={undefined}
						removeLabel={undefined}
						itemLabel={undefined}
						validate={validate}
						render={(scope) => (children as unknown as (s: typeof scope) => ReactNode)(scope)}
					/>
				)}
			</form.AppField>
		)
	} as FormFieldComponents<TFormData>['Array']
}
```

- [ ] **Step 4: Attach it and export the types**

In `build-field-components.tsx`, add `Array: createArray(form, components, fieldComponents)`
alongside `ArrayField`, and add the `Array` member to `FormFieldComponents` in `field-props.ts`.

In `index.ts`, export `ArrayProps`, `ArrayScope`, `ArrayItemScope` and `ArrayItemProps` — **and
check that `BoundFieldApi` is exported too.** `ArrayScope.field` is typed as `BoundFieldApi`, so a
consumer who annotates a scope cannot name its type unless that one is public. If it is not
exported today, export it in this step; a public type referring to a private one type-checks
inside the package and fails for the consumer, which is exactly the class of defect `pnpm build`
catches and `tsc --noEmit` does not.

- [ ] **Step 5: Run the tests**

```bash
cd packages/form/react/react && pnpm exec vitest run && cd -
```

Expected: PASS, and `array-field.test.tsx` still passes untouched.

- [ ] **Step 6: Typecheck, build, lint, commit**

```bash
pnpm typecheck && pnpm build && pnpm lint
git add packages/form/react/react/src
git commit -m "feat(form): add form.Array, a primitive that renders nothing

ArrayField is a widget with no escape hatch: an author who wants the remove
control in a card heading cannot have it. form.Array renders only its
children and hands them the same scope, so the layout and every control are
the author's. ArrayField keeps its look and stays what a schema document
renders through."
```

---

### Task 4: The kit's row from the primitive

`item.Item` works inside `form.Array`, taking its captions from the author since no outer
component holds them.

**Files:**

- Modify: `packages/form/react/react/src/field-props.ts`
- Modify: `packages/form/react/react/src/fields/array-field.tsx`
- Test: `packages/form/react/react/src/array.test.tsx`

**Interfaces:**

- Produces:

```ts
export type ArrayItemProps = {
	children: ReactNode
	label?: ReactNode
	removeLabel?: ReactNode
	/** Offer the kit's move controls on this row. Off by default, as on `ArrayField`. */
	reorderable?: boolean | { up?: { label?: ReactNode }; down?: { label?: ReactNode } }
}
```

- [ ] **Step 1: Write the failing test**

Append to `array.test.tsx`:

```tsx
describe('the kit row inside form.Array', () => {
	it('renders the kit row with the captions the author gave', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(
			<Form
				defaultValues={{ people: [{ firstName: 'Ada' }, { firstName: 'Grace' }] }}
				onSubmit={({ value }) => {
					onSubmit(value)
				}}
			>
				{(form) => (
					<>
						<form.Array
							name='people'
							newItem={NEW_PERSON}
						>
							{({ items }) => (
								<section>
									{items.map((item) => (
										<item.Item
											key={item.key}
											label={`Person ${String(item.index + 1)}`}
											removeLabel='Drop'
											reorderable
										>
											<item.TextField
												name='firstName'
												label={`Name ${String(item.index)}`}
											/>
										</item.Item>
									))}
								</section>
							)}
						</form.Array>
						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		expect(screen.getByText('Person 1')).toBeInTheDocument()
		await user.click(screen.getAllByRole('button', { name: 'Drop' })[0]!)
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ people: [{ firstName: 'Grace' }] })
		})
	})

	it('offers no move control on a row that did not ask for one', () => {
		render(
			<Form defaultValues={{ people: [{ firstName: 'Ada' }, { firstName: 'Grace' }] }}>
				{(form) => (
					<form.Array
						name='people'
						newItem={NEW_PERSON}
					>
						{({ items }) => (
							<section>
								{items.map((item) => (
									<item.Item
										key={item.key}
										removeLabel='Drop'
									>
										<item.TextField
											name='firstName'
											label={`Name ${String(item.index)}`}
										/>
									</item.Item>
								))}
							</section>
						)}
					</form.Array>
				)}
			</Form>,
		)

		expect(screen.queryByRole('button', { name: 'Move up' })).toBeNull()
		expect(screen.queryByRole('button', { name: 'Move down' })).toBeNull()
		expect(screen.getAllByRole('button', { name: 'Drop' })).toHaveLength(2)
	})
})
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd packages/form/react/react && pnpm exec vitest run array.test && cd -
```

Expected: FAIL — the captions fall back to the package defaults and `reorderable` is ignored,
because `Item` takes only `children` today.

- [ ] **Step 3: Let `Item` take its own presentational props**

Widen the cached component to accept `ArrayItemProps` and resolve each caption as **prop → value
from `ItemData` → package default**. The composition keeps filling `ItemData`, so `ArrayField`'s
behaviour is unchanged; the primitive leaves those fields at their defaults and the author's props
win.

```tsx
const Item = ({ children: itemChildren, label, removeLabel, reorderable }: ArrayItemProps): ReactNode => {
	const data = itemDataRef.current.get(key)
	if (data === undefined) return null
	const rowReorder = reorderable ?? data.reorderable
	const rowLabels = typeof rowReorder === 'object' ? rowReorder : undefined
	const offerMoves = rowReorder !== undefined && rowReorder !== false
	return (
		<ArrayItemPathContext.Provider value={data.path}>
			<KitArrayItem
				data-index={data.index}
				index={data.index}
				label={label ?? data.label}
				removeLabel={removeLabel ?? data.removeLabel}
				moveUpLabel={rowLabels?.up?.label ?? data.moveUpLabel}
				moveDownLabel={rowLabels?.down?.label ?? data.moveDownLabel}
				disabled={data.disabled}
				onRemove={data.onRemove}
				onMoveUp={offerMoves ? data.onMoveUp : undefined}
				onMoveDown={offerMoves ? data.onMoveDown : undefined}
			>
				{itemChildren}
			</KitArrayItem>
		</ArrayItemPathContext.Provider>
	)
}
```

`ItemData` gains a `reorderable` member carrying the array-level setting, and `onMoveUp` /
`onMoveDown` are stored **unconditionally** (still `undefined` at the ends, where the move is
impossible) so a row can opt in without the array having asked.

- [ ] **Step 4: Run the tests**

```bash
cd packages/form/react/react && pnpm exec vitest run && cd -
cd packages/form/react/shadcn && pnpm exec vitest run && cd -
cd packages/form/react/heroui && pnpm exec vitest run && cd -
```

Expected: PASS everywhere, `array-field.test.tsx` still unedited.

- [ ] **Step 5: Typecheck, build, lint, commit**

```bash
pnpm typecheck && pnpm build && pnpm lint
git add packages/form/react/react/src
git commit -m "feat(form): let the kit row carry its own captions inside form.Array

The row is the piece an author is least likely to want to rebuild, so it
stays reachable from the primitive. With no outer component to hold them,
the captions and the move controls come from the row's own props and fall
back to the array's, then to the package defaults."
```

---

### Task 5: Prove it in both kits

**Files:**

- Modify: `packages/form/react/shadcn/src/array-fields.test.tsx`
- Modify: `packages/form/react/heroui/src/array-fields.test.tsx`

- [ ] **Step 1: Write the failing test in each kit**

Both kits already import `Form` from `./form` and drive the contract props through a local
harness; shadcn's file additionally ends with a block driving the **real** `form.ArrayField`
through the kit. Follow that last pattern — the point of this case is the real component, not a
harness.

Both kits write `form-array-item` (shadcn as `ITEM_SLOT` in `blocks/array.tsx:28`, heroui at
`blocks/array.tsx:112`), so the selector below is legal in both. Verify the literal before
trusting it: the two kits do **not** stamp identical names everywhere.

Add the same case to each file, changing only the import of `Form`:

```tsx
describe('the bare primitive through this kit', () => {
	it('renders the kit row inside a form.Array with a custom layout', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()

		render(
			<Form
				defaultValues={{ people: [{ name: 'Ada' }, { name: 'Grace' }] }}
				onSubmit={({ value }) => {
					onSubmit(value)
				}}
			>
				{(form) => (
					<>
						<form.Array
							name='people'
							newItem={{ name: '' }}
						>
							{({ items, add, canAdd, Button }) => (
								<section>
									<header>
										<h3>People</h3>
										<Button
											onClick={() => {
												add()
											}}
											disabled={!canAdd}
										>
											Add person
										</Button>
									</header>
									{items.map((item) => (
										<item.Item
											key={item.key}
											removeLabel='Remove person'
										>
											<item.TextField
												name='name'
												label={`Name ${String(item.index)}`}
											/>
										</item.Item>
									))}
								</section>
							)}
						</form.Array>
						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		expect(document.querySelectorAll('[data-slot="form-array-item"]')).toHaveLength(2)

		// The add control sits in the section heading — a placement the composition cannot reach.
		await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Add person' }))
		expect(document.querySelectorAll('[data-slot="form-array-item"]')).toHaveLength(3)

		await user.click(screen.getAllByRole('button', { name: 'Remove person' })[0]!)
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ people: [{ name: 'Grace' }, { name: '' }] })
		})
	})
})
```

`within(screen.getByRole('banner'))` assumes `<header>` maps to `banner` — it does not when the
header is nested inside a `<section>`. Give the `<header>` an explicit `aria-label` and select it
by that instead if the query comes back empty; do not weaken the assertion to a bare
`getAllByRole('button')[0]`, which would pass whatever the placement.

- [ ] **Step 2: Run them and watch them fail, then pass**

```bash
cd packages/form/react/shadcn && pnpm exec vitest run && cd -
cd packages/form/react/heroui && pnpm exec vitest run && cd -
```

If they pass immediately, Task 4 already covered the behaviour — keep the tests anyway: they are
the per-kit regression guard, and the plan's claim is that both kits work, not that one does.

- [ ] **Step 3: Commit**

```bash
git add packages/form/react/shadcn/src packages/form/react/heroui/src
git commit -m "test(form): cover the kit row rendered from the bare primitive"
```

---

### Task 6: Docs

**Files:**

- Create: `apps/docs/shared/form/examples/components/arrays-custom.tsx`
- Modify: `apps/docs/shared/form/examples/manifest.json`
- Modify: `apps/docs/shared/form/examples/registry.ts`
- Modify: `apps/docs/content/docs/form/arrays.mdx`
- Modify: `apps/docs/test/docs-options/page-type-map.ts`

- [ ] **Step 1: Write the example**

The case that is impossible today: the add control in a section heading, a duplicate-below control
built on `insert`, and the row drawn by the author rather than by the kit. `export function
ArraysCustomExample()` is load-bearing for both the registry lookup and the source panel.

```tsx
'use client'

import { useState } from 'react'

import { Form } from 'shared/form/FormKit'

type Line = { sku: string; qty: number }
type Order = { reference: string; lines: Line[] }

const NEW_LINE: Line = { sku: '', qty: 1 }

const DEFAULTS: Order = {
	reference: 'PO-1042',
	lines: [{ sku: 'EZ-100', qty: 2 }],
}

/**
 * The same data as `form-arrays`, composed by hand.
 *
 * `form.Array` renders nothing at all, so the add control can sit in the section heading and the
 * row can be a table row — neither is reachable through `form.ArrayField`, which owns its frame
 * and draws its own add control. Note `errors` is rendered here explicitly: nothing renders it
 * for a bare `form.Array`, and a `minLength` failure would otherwise block submit silently.
 */
export function ArraysCustomExample() {
	const [saved, setSaved] = useState<Order | null>(null)

	return (
		<div className='flex flex-col gap-4'>
			<Form
				defaultValues={DEFAULTS}
				onSubmit={({ value }) => {
					setSaved(value)
				}}
			>
				{(form) => (
					<>
						<form.TextField
							name='reference'
							label='Reference'
						/>

						<form.Array
							name='lines'
							newItem={NEW_LINE}
							validate={{ minLength: 1, maxLength: 5 }}
						>
							{({ items, add, insert, canAdd, errors, invalid, Button }) => (
								<section className='flex flex-col gap-2'>
									<header className='flex items-center justify-between'>
										<h3 className='text-sm font-medium'>Lines</h3>
										<Button
											onClick={() => {
												add()
											}}
											disabled={!canAdd}
										>
											Add line
										</Button>
									</header>

									<table className='w-full'>
										<tbody>
											{items.map((item) => (
												<tr key={item.key}>
													<td>
														<item.TextField
															name='sku'
															label={`SKU ${String(item.index + 1)}`}
														/>
													</td>
													<td>
														<item.NumberField
															name='qty'
															label={`Qty ${String(item.index + 1)}`}
														/>
													</td>
													<td className='flex gap-1'>
														<Button
															onClick={() => {
																insert(item.index + 1, { ...NEW_LINE })
															}}
														>
															{`Duplicate ${String(item.index + 1)}`}
														</Button>
														<Button onClick={item.remove}>{`Remove ${String(item.index + 1)}`}</Button>
														<Button
															onClick={item.moveUp}
															disabled={item.isFirst}
														>
															{`Up ${String(item.index + 1)}`}
														</Button>
													</td>
												</tr>
											))}
										</tbody>
									</table>

									{invalid && <p role='alert'>{errors.join(', ')}</p>}
								</section>
							)}
						</form.Array>

						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>

			{saved !== null && <pre>{JSON.stringify(saved, null, 2)}</pre>}
		</div>
	)
}
```

Check two things against the existing `arrays.tsx` before running: that `FormKit` exports `Form`
under that name, and how the sibling example prints its payload — `form.submitted()` in the
browser fixture parses that `<pre>`, so it must match.

- [ ] **Step 2: Register it in BOTH halves**

`manifest.json` gets `form-arrays-custom` → `components/arrays-custom.tsx` / `ArraysCustomExample`.
`registry.ts` gets the `sourceFile` → dynamic import entry. **A missing registry entry passes
lint, typecheck and build, and throws only when the page renders** — nothing catches it for you.

- [ ] **Step 3: Write the page section**

Add "Custom layout" to `arrays.mdx`: when to reach for `form.Array`, the example, and an option
table for `ArrayProps`, `ArrayScope`, `ArrayItemScope` and `ArrayItemProps`. State the footgun the
spec names — an author who never renders `errors` gets a `minLength` failure that blocks submit
with nothing on screen.

- [ ] **Step 4: Map every new table**

Add `PAGE_ENTRIES` entries with the governing type and the **exact** name count for each table.
An unclassified table fails the test, and so does a count that drifts.

- [ ] **Step 5: Run the docs suite**

```bash
pnpm --filter @ez-kit/docs test
pnpm --filter @ez-kit/docs lint
node apps/docs/scripts/verify-manifest-coverage.mjs
```

Expected: pass, including `docs-option-names.test.ts`. If a count is wrong the failure names the
file, the line, the bogus name and the legal keys.

- [ ] **Step 6: Commit**

```bash
git add apps/docs
git commit -m "docs(form): document the array primitive and a custom layout"
```

---

### Task 7: Browser proof, both kits

**Files:**

- Create: `apps/docs/e2e/packages/form/arrays/arrays-custom.spec.ts`

- [ ] **Step 1: Write the spec**

The `form` fixture is kit-agnostic and already carries what this needs: `open`, `items(name)`,
`item(name, index)`, `field(path)`, `input(path)` and `submitted()`. Every spec below addresses
fields by `data-field` (the full path, stamped by the react layer) and controls by accessible
name, so one file drives both kits.

```ts
import { expect, test } from '../../../fixtures'

test.describe('an array composed by hand', () => {
	test.beforeEach(async ({ form }) => {
		await form.open('form-arrays-custom')
	})

	test('adds an entry from a control the composition could not place', async ({ form, page }) => {
		await expect(form.items('lines')).toHaveCount(1)

		await page.getByRole('button', { name: 'Add line' }).click()
		await expect(form.items('lines')).toHaveCount(2)

		await form.input('lines[1].sku').fill('EZ-200')
		await page.getByRole('button', { name: 'Save' }).click()

		expect(await form.submitted()).toEqual({
			reference: 'PO-1042',
			lines: [
				{ sku: 'EZ-100', qty: 2 },
				{ sku: 'EZ-200', qty: 1 },
			],
		})
	})

	test('inserts a fresh entry directly below the one asked for', async ({ form, page }) => {
		await page.getByRole('button', { name: 'Add line' }).click()
		await form.input('lines[1].sku').fill('EZ-200')

		await page.getByRole('button', { name: 'Duplicate 1' }).click()
		await expect(form.items('lines')).toHaveCount(3)

		// The inserted entry is blank and sits at index 1; the one that was there moved down
		// with its value intact. An insert that renumbered identities would show EZ-200 here.
		await expect(form.input('lines[1].sku')).toHaveValue('')
		await expect(form.input('lines[2].sku')).toHaveValue('EZ-200')

		await page.getByRole('button', { name: 'Save' }).click()
		expect(await form.submitted()).toEqual({
			reference: 'PO-1042',
			lines: [
				{ sku: 'EZ-100', qty: 2 },
				{ sku: '', qty: 1 },
				{ sku: 'EZ-200', qty: 1 },
			],
		})
	})

	test('removes the entry whose own control was clicked', async ({ form, page }) => {
		await page.getByRole('button', { name: 'Add line' }).click()
		await form.input('lines[1].sku').fill('EZ-200')

		await page.getByRole('button', { name: 'Remove 1' }).click()
		await expect(form.items('lines')).toHaveCount(1)

		await page.getByRole('button', { name: 'Save' }).click()
		expect(await form.submitted()).toEqual({
			reference: 'PO-1042',
			lines: [{ sku: 'EZ-200', qty: 1 }],
		})
	})

	test('disables the up control on the first entry only', async ({ page }) => {
		await page.getByRole('button', { name: 'Add line' }).click()

		await expect(page.getByRole('button', { name: 'Up 1' })).toBeDisabled()
		await expect(page.getByRole('button', { name: 'Up 2' })).toBeEnabled()
	})
})
```

`form.items('lines')` resolves through the `form-array-item` slot, which the author's table rows
do **not** carry — this example draws its own rows. Either give each `<tr>` that slot in the
example, or replace `form.items('lines')` with a locator over `[data-field^="lines["]` rows.
Decide this **before** writing the spec and keep the example and the spec consistent; do not
discover it by watching the suite fail.

- [ ] **Step 2: Check the slot guard first — it is cheaper than the browser**

```bash
pnpm --filter @ez-kit/docs test
```

`e2e-slots.test.ts` fails on any `data-slot` the spec addresses that no package writes. Fix the
spec, never the regex and never a package's slot name.

- [ ] **Step 3: Run the browser suite**

Read `apps/docs/package.json` for the real `test:e2e` script and follow it — it needs the app built
or served. Run the form specs for **both** kits. The seven pre-existing array cases must pass
**unedited**; that is the proof the composition did not drift.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/e2e
git commit -m "test(form): drive a custom array layout in the browser for both kits"
```

---

### Task 8: Changeset and the full gate

**Files:**

- Modify: `.changeset/form-array-fields.md`

- [ ] **Step 1: Amend the existing changeset — do not add a second**

`.changeset/form-array-fields.md` already describes the array feature, and **none of it has
shipped**: `@ez-kit/form-react` is at `0.3.1` and the release that carries arrays has not been cut.
A second changeset would announce a primitive as an addition to something no consumer has ever
seen. Rewrite the existing summary so it describes the API as it now stands — `form.Array` beside
`form.ArrayField` — and keep the existing "Breaking for a kit outside this repo" note, which is
still true and still complete, because `FormComponents` gains no further key.

All four form packages are public and none is in `.changeset/config.json`'s `ignore`, so naming
them together is legal. `scripts/check-changesets.mjs` runs first in `pnpm lint` and will say so if
not.

- [ ] **Step 2: Run the whole gate, cold**

```bash
pnpm exec turbo run lint typecheck test build size --force
```

`--force` matters: a cache hit replays someone else's logs and proves nothing about this tree.
Expected: every task successful, `Cached: 0`.

- [ ] **Step 3: Commit**

```bash
git add .changeset/form-array-fields.md
git commit -m "docs: describe the array API as it ships, primitive included"
```

---

## Definition of done

- `form.Array` and `form.ArrayField` both exported, both typed, both documented.
- `FormComponents` unchanged — `git diff` on `contract.ts` shows no new key.
- `array-field.test.tsx` and the seven original browser specs pass **with no edits**.
- `pnpm exec turbo run lint typecheck test build size --force` green, `Cached: 0`.
- The browser suite green for shadcn and heroui.
- No agent attribution anywhere in the commits.
