# Config-Driven Forms (`FormSchema` v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a form from a plain-data `FormSchema` object through the field components that already exist on the form instance, so a form can be authored in JSX or described as data — including data delivered from a backend.

**Architecture:** All framework-agnostic logic (node types, rule compiler, parser, visibility, validator generation) lands in `@ez-kit/form-core`. React rendering lands in `@ez-kit/form-react` as a `FormRenderer` returned from `createForm`, so it is bound to a kit exactly like `Form` is. The renderer never draws anything itself: it resolves each node to an existing bound field component, and three new kit-contract members (`Section`, `GridItem`, `Wizard`) cover the new layout units.

**Tech Stack:** TypeScript 5.x (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), React 19.2, `@tanstack/form-core` + `@tanstack/react-form` 1.33.2, Vitest + jsdom + Testing Library, tsup, size-limit.

**Spec:** [./spec.md](./spec.md) — every task below cites the section it implements.

## Global Constraints

- **No visual styling in `@ez-kit/form-react`.** No inline `style`, no `className`. Layout is rendered by kit components only (`AGENTS.md`, spec I5).
- **`packages/form/react/shadcn/src/components/ui/**`is vendored and immutable.** shadcn additions go in`src/blocks/`. The heroui kit's `src/components/ui/` is hand-written and editable.
- **No new runtime dependency in any package.** In particular the validator generator must not import zod (spec §7.2, §13).
- **No `eval` / `new Function` anywhere** (spec I3).
- **Public API is exported exclusively from `src/index.ts`** of each package.
- **Type imports use `import type`; `import/order` is enforced; `--max-warnings=0`.**
- Tests live in `src/**/*.test.ts(x)`. Run one package with `pnpm --filter <pkg> test` — no turbo needed.
- Conventional Commits, enforced by commitlint. Pre-push runs `pnpm ci:fast`.
- Pre-1.0 packages ship breaking changes as **minor**; this feature is additive and ships as a minor.

---

## File Structure

**`packages/form/core/src/`** — framework-agnostic, no React import anywhere in this list:

| File                | Responsibility                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `rules.ts`          | `Rule`, `Condition`, `FieldRef`, `compileCondition`, `getValueAtPath`, `collectRuleFields` |
| `localized-text.ts` | `LocalizedText`, `resolveText`                                                             |
| `schema.ts`         | node types, `FormSchema`, `defineFormSchema`                                               |
| `parse.ts`          | `parseFormSchema`, `FormSchemaError`                                                       |
| `visibility.ts`     | `visibleFieldNames`, `stripHiddenValues`                                                   |
| `validate.ts`       | `FieldValidate`, `buildValidator` (Standard Schema, zero deps)                             |
| `walk.ts`           | `walkNodes` — the one tree traversal the four modules above share                          |

**`packages/form/react/react/src/`**:

| File                       | Responsibility                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `contract.ts` (modify)     | add `Section`, `GridItem`, `Wizard`, `WizardRenderProps`, `SectionRenderProps`, `GridItemRenderProps` |
| `schema/form-renderer.tsx` | `FormRenderer` — both modes, props, registry plumbing                                                 |
| `schema/render-node.tsx`   | one node → one bound component                                                                        |
| `schema/use-condition.ts`  | subscribes to only the fields a condition reads                                                       |
| `schema/registries.ts`     | `CustomFieldRenderProps`, registry types                                                              |
| `schema/form-wizard.tsx`   | step state machine, `WizardRenderProps` assembly                                                      |
| `create-form.tsx` (modify) | return `FormRenderer`, `withForm`, `withFieldGroup`                                                   |
| `test-kit.tsx` (modify)    | add `Section`, `GridItem`, `Wizard` to the test kit                                                   |

**Kits** — `shadcn/src/blocks/{section,grid-item,wizard}.tsx`, `heroui/src/components/ui/{section,grid-item,wizard}.tsx`, plus each kit's `form.tsx` registration and `index.ts` re-exports.

---

## Task 1: Rule language and condition compiler

Implements spec §5.

**Files:**

- Create: `packages/form/core/src/rules.ts`
- Create: `packages/form/core/src/rules.test.ts`
- Modify: `packages/form/core/src/index.ts`

**Interfaces:**

- Consumes: nothing.
- Produces:
  - `type FieldRef = string`
  - `type Rule = { field: FieldRef; eq: unknown } | { field: FieldRef; in: readonly unknown[] } | { field: FieldRef; gt: number } | { field: FieldRef; lt: number } | { field: FieldRef; truthy: true } | { and: readonly Rule[] } | { or: readonly Rule[] } | { not: Rule }`
  - `type Condition<TValues> = Rule | ((values: TValues) => boolean)`
  - `function compileCondition<TValues>(condition: Condition<TValues>): (values: TValues) => boolean`
  - `function getValueAtPath(values: unknown, path: string): unknown`
  - `function collectRuleFields(condition: Condition<unknown>): string[]` — empty array for a function condition, meaning "cannot narrow, subscribe to everything"

- [ ] **Step 1: Write the failing test**

```ts
// packages/form/core/src/rules.test.ts
import { describe, expect, test } from 'vitest'

import { collectRuleFields, compileCondition, getValueAtPath } from './rules'

describe('getValueAtPath', () => {
	test('reads a dotted path', () => {
		expect(getValueAtPath({ company: { inn: '77' } }, 'company.inn')).toBe('77')
	})

	test('returns undefined for a missing path instead of throwing', () => {
		expect(getValueAtPath({}, 'company.inn')).toBeUndefined()
	})
})

describe('compileCondition', () => {
	test('passes a function condition through unchanged', () => {
		const predicate = compileCondition((values: { a: number }) => values.a > 1)
		expect(predicate({ a: 2 })).toBe(true)
	})

	test('eq compares strictly', () => {
		const predicate = compileCondition({ field: 'clientType', eq: 'business' })
		expect(predicate({ clientType: 'business' })).toBe(true)
		expect(predicate({ clientType: 'person' })).toBe(false)
	})

	test('in, gt, lt and truthy', () => {
		expect(compileCondition({ field: 'a', in: [1, 2] })({ a: 2 })).toBe(true)
		expect(compileCondition({ field: 'a', gt: 5 })({ a: 6 })).toBe(true)
		expect(compileCondition({ field: 'a', lt: 5 })({ a: 6 })).toBe(false)
		expect(compileCondition({ field: 'a', truthy: true })({ a: '' })).toBe(false)
	})

	test('and, or and not compose', () => {
		const predicate = compileCondition({
			and: [{ field: 'type', eq: 'business' }, { not: { field: 'country', eq: 'RU' } }],
		})
		expect(predicate({ type: 'business', country: 'DE' })).toBe(true)
		expect(predicate({ type: 'business', country: 'RU' })).toBe(false)
	})

	test('a gt comparison against a non-number is false, never NaN-truthy', () => {
		expect(compileCondition({ field: 'a', gt: 1 })({ a: 'x' })).toBe(false)
	})

	test('rejects a relative reference — reserved for arrays, unusable in v1', () => {
		expect(() => compileCondition({ field: './type', eq: 'x' })).toThrow(/relative/i)
	})
})

describe('collectRuleFields', () => {
	test('lists every field a rule tree reads', () => {
		expect(collectRuleFields({ and: [{ field: 'a', eq: 1 }, { not: { field: 'b', truthy: true } }] })).toEqual([
			'a',
			'b',
		])
	})

	test('returns an empty list for a function condition', () => {
		expect(collectRuleFields(() => true)).toEqual([])
	})
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm --filter @ez-kit/form-core test`
Expected: FAIL — `Failed to resolve import "./rules"`.

- [ ] **Step 3: Implement `rules.ts`**

```ts
/** A path from the root of the form values. `./`-prefixed refs are reserved for arrays. */
export type FieldRef = string

export type Rule =
	| { field: FieldRef; eq: unknown }
	| { field: FieldRef; in: readonly unknown[] }
	| { field: FieldRef; gt: number }
	| { field: FieldRef; lt: number }
	| { field: FieldRef; truthy: true }
	| { and: readonly Rule[] }
	| { or: readonly Rule[] }
	| { not: Rule }

export type Condition<TValues> = Rule | ((values: TValues) => boolean)

const RELATIVE_PREFIX = './'

/** Reads `a.b[0].c` without throwing on a missing segment. */
export function getValueAtPath(values: unknown, path: string): unknown {
	const segments = path.replace(/\[(\d+)\]/g, '.$1').split('.')
	let current: unknown = values
	for (const segment of segments) {
		if (current === null || typeof current !== 'object') return undefined
		current = (current as Record<string, unknown>)[segment]
	}
	return current
}

function assertAbsolute(field: FieldRef): void {
	if (field.startsWith(RELATIVE_PREFIX)) {
		throw new Error(
			`Relative field reference "${field}" is reserved for array items and is not supported in FormSchema v1.`,
		)
	}
}

export function compileCondition<TValues>(condition: Condition<TValues>): (values: TValues) => boolean {
	if (typeof condition === 'function') return condition

	if ('and' in condition) {
		const parts = condition.and.map((rule) => compileCondition<TValues>(rule))
		return (values) => parts.every((part) => part(values))
	}
	if ('or' in condition) {
		const parts = condition.or.map((rule) => compileCondition<TValues>(rule))
		return (values) => parts.some((part) => part(values))
	}
	if ('not' in condition) {
		const inner = compileCondition<TValues>(condition.not)
		return (values) => !inner(values)
	}

	assertAbsolute(condition.field)
	const read = (values: TValues): unknown => getValueAtPath(values, condition.field)

	if ('eq' in condition) return (values) => read(values) === condition.eq
	if ('in' in condition) return (values) => condition.in.includes(read(values))
	if ('truthy' in condition) return (values) => Boolean(read(values))
	if ('gt' in condition) {
		return (values) => {
			const value = read(values)
			return typeof value === 'number' && value > condition.gt
		}
	}
	return (values) => {
		const value = read(values)
		return typeof value === 'number' && value < condition.lt
	}
}

/** Which fields a condition reads — used to subscribe narrowly. Empty means "unknown". */
export function collectRuleFields<TValues>(condition: Condition<TValues>): string[] {
	if (typeof condition === 'function') return []
	if ('and' in condition) return condition.and.flatMap((rule) => collectRuleFields(rule))
	if ('or' in condition) return condition.or.flatMap((rule) => collectRuleFields(rule))
	if ('not' in condition) return collectRuleFields(condition.not)
	return [condition.field]
}
```

- [ ] **Step 4: Export from the package entry point**

Add to `packages/form/core/src/index.ts`:

```ts
export { collectRuleFields, compileCondition, getValueAtPath } from './rules'
export type { Condition, FieldRef, Rule } from './rules'
```

- [ ] **Step 5: Run the tests and the linters**

Run: `pnpm --filter @ez-kit/form-core test`
Expected: PASS, 10 tests.
Run: `pnpm --filter @ez-kit/form-core lint`
Run: `pnpm --filter @ez-kit/form-core typecheck`

- [ ] **Step 6: Commit**

```bash
git add packages/form/core/src/rules.ts packages/form/core/src/rules.test.ts packages/form/core/src/index.ts
git commit -m "feat(form-core): add the serialisable condition rule language"
```

---

## Task 2: `LocalizedText`

Implements spec §4.8.

**Files:**

- Create: `packages/form/core/src/localized-text.ts`
- Create: `packages/form/core/src/localized-text.test.ts`
- Modify: `packages/form/core/src/index.ts`

**Interfaces:**

- Consumes: nothing.
- Produces:
  - `type LocalizedText = string | { key: string; params?: Record<string, string | number> }`
  - `type Translate = (key: string, params?: Record<string, string | number>) => string`
  - `function resolveText(text: LocalizedText | undefined, translate?: Translate): string | undefined`

- [ ] **Step 1: Write the failing test**

```ts
// packages/form/core/src/localized-text.test.ts
import { expect, test } from 'vitest'

import { resolveText } from './localized-text'

test('a plain string is finished copy', () => {
	expect(resolveText('Email')).toBe('Email')
})

test('undefined stays undefined', () => {
	expect(resolveText(undefined)).toBeUndefined()
})

test('a key object goes through translate', () => {
	expect(resolveText({ key: 'form.email' }, (key) => `t:${key}`)).toBe('t:form.email')
})

test('params reach translate', () => {
	const translate = (key: string, params?: Record<string, string | number>): string => `${key}:${String(params?.count)}`
	expect(resolveText({ key: 'form.items', params: { count: 3 } }, translate)).toBe('form.items:3')
})

test('a key object without translate throws rather than rendering a blank label', () => {
	expect(() => resolveText({ key: 'form.email' })).toThrow(/translate/i)
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm --filter @ez-kit/form-core test localized-text`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `localized-text.ts`**

```ts
/** Finished copy, or a translation key the app resolves. */
export type LocalizedText = string | { key: string; params?: Record<string, string | number> }

export type Translate = (key: string, params?: Record<string, string | number>) => string

export function resolveText(text: LocalizedText | undefined, translate?: Translate): string | undefined {
	if (text === undefined) return undefined
	if (typeof text === 'string') return text
	if (translate === undefined) {
		throw new Error(
			`FormSchema uses the translation key "${text.key}" but no \`translate\` function was supplied to the renderer.`,
		)
	}
	return text.params === undefined ? translate(text.key) : translate(text.key, text.params)
}
```

- [ ] **Step 4: Export and verify**

Add to `index.ts`:

```ts
export { resolveText } from './localized-text'
export type { LocalizedText, Translate } from './localized-text'
```

Run: `pnpm --filter @ez-kit/form-core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/form/core/src/localized-text.ts packages/form/core/src/localized-text.test.ts packages/form/core/src/index.ts
git commit -m "feat(form-core): add LocalizedText and its resolver"
```

---

## Task 3: Schema node types, `walkNodes` and `defineFormSchema`

Implements spec §4 and §9.2.

**Files:**

- Create: `packages/form/core/src/schema.ts`
- Create: `packages/form/core/src/walk.ts`
- Create: `packages/form/core/src/schema.test-d.ts`
- Create: `packages/form/core/src/walk.test.ts`
- Modify: `packages/form/core/src/index.ts`

**Interfaces:**

- Consumes: `Condition` (Task 1), `LocalizedText` (Task 2), `FormFieldType` and `SelectOption` (existing).
- Produces:
  - `type FormSchema<TValues>` — `{ version: 1; children: FormNode<TValues>[] }`
  - `type FormNode<TValues>` — the discriminated union of field, `section`, `step`, `submit`, `block` and custom nodes
  - `type FieldNode<TValues>`, `type SectionNode<TValues>`, `type StepNode<TValues>`, `type SubmitNode`, `type BlockNode`, `type CustomFieldNode<TValues>`
  - `const RESERVED_NODE_TYPES: readonly string[]`
  - `function defineFormSchema<TValues>(): <const S extends FormSchema<TValues>>(schema: S) => S`
  - `function walkNodes<TValues>(schema: FormSchema<TValues>, visit: (node: FormNode<TValues>, ancestors: FormNode<TValues>[]) => void): void`
  - `function isFieldNode<TValues>(node: FormNode<TValues>): node is FieldNode<TValues> | CustomFieldNode<TValues>`

- [ ] **Step 1: Write the failing traversal test**

```ts
// packages/form/core/src/walk.test.ts
import { expect, test } from 'vitest'

import { FormFieldType } from './field-types'
import { isFieldNode, walkNodes } from './walk'

import type { FormSchema } from './schema'

const schema: FormSchema<{ a: string; b: string }> = {
	version: 1,
	children: [
		{ type: 'section', title: 'S', children: [{ type: FormFieldType.Text, name: 'a' }] },
		{ type: FormFieldType.Text, name: 'b' },
	],
}

test('visits every node depth-first, containers included', () => {
	const seen: string[] = []
	walkNodes(schema, (node) => seen.push(node.type))
	expect(seen).toEqual(['section', 'text', 'text'])
})

test('reports the ancestor chain', () => {
	const ancestorsByName = new Map<string, number>()
	walkNodes(schema, (node, ancestors) => {
		if (isFieldNode(node)) ancestorsByName.set(node.name, ancestors.length)
	})
	expect(ancestorsByName.get('a')).toBe(1)
	expect(ancestorsByName.get('b')).toBe(0)
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter @ez-kit/form-core test walk`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `schema.ts`**

```ts
import type { FormFieldType } from './field-types'
import type { Condition } from './rules'
import type { LocalizedText } from './localized-text'
import type { SelectOption } from './select-option'
import type { FieldValidate } from './validate'

/** Container `type` values, plus the two value-less leaves. Never usable as registry keys. */
export const RESERVED_NODE_TYPES = ['section', 'step', 'submit', 'block'] as const

type CommonProps<TValues> = {
	label?: LocalizedText
	description?: LocalizedText
	when?: Condition<TValues>
	disabledWhen?: Condition<TValues>
	/** Grid columns this node spans inside its section. Default 1. */
	colSpan?: number
}

type FieldCommon<TValues> = CommonProps<TValues> & {
	required?: boolean
	validate?: FieldValidate
}

export type FieldNode<TValues> =
	| (FieldCommon<TValues> & {
			type: FormFieldType.Text
			name: string
			defaultValue?: string
			placeholder?: string
			inputType?: string
	  })
	| (FieldCommon<TValues> & {
			type: FormFieldType.Number
			name: string
			defaultValue?: number
			placeholder?: string
			min?: number
			max?: number
			step?: number
	  })
// … one member per FormFieldType, mirroring the option sets already declared in
// `packages/form/react/react/src/field-props.ts`
```

> **Implementer note:** write out all eight members explicitly. Do not collapse them into a
> generic mapped type — the whole point of the union is that picking `type` narrows the
> legal option keys, and a mapped type loses that in editor completions.

```ts
export type SectionNode<TValues> = CommonProps<TValues> & {
	type: 'section'
	title?: LocalizedText
	description?: LocalizedText
	/** Grid columns for direct children. Default 1. */
	columns?: number
	children: FormNode<TValues>[]
}

export type StepNode<TValues> = CommonProps<TValues> & {
	type: 'step'
	title?: LocalizedText
	description?: LocalizedText
	/** Opt-in data path; enables TanStack's `useFormGroup` for this step (spec §4.5). */
	path?: string
	children: FormNode<TValues>[]
}

export type SubmitNode<TValues> = CommonProps<TValues> & { type: 'submit'; disabled?: boolean }

export type BlockNode<TValues> = CommonProps<TValues> & {
	type: 'block'
	component: string
	props?: Record<string, unknown>
}

/** A field kind supplied through the registry. `name` cannot be narrowed by value type. */
export type CustomFieldNode<TValues> = FieldCommon<TValues> & {
	type: string
	name: string
	defaultValue?: unknown
	props?: Record<string, unknown>
}

export type FormNode<TValues> =
	| FieldNode<TValues>
	| SectionNode<TValues>
	| StepNode<TValues>
	| SubmitNode<TValues>
	| BlockNode<TValues>
	| CustomFieldNode<TValues>

export type FormSchema<TValues> = { version: 1; children: FormNode<TValues>[] }

/**
 * Curried on purpose: TypeScript has no partial generic inference, so `TValues` is given
 * explicitly while the schema literal is still inferred — which is what makes `name`
 * checkable per field kind.
 */
export function defineFormSchema<TValues>() {
	return <const S extends FormSchema<TValues>>(schema: S): S => schema
}
```

> **Implementer note:** narrow `name` per member with `DeepKeysOfType<TValues, string>`,
> `DeepKeysOfType<TValues, number>`, `DeepKeysOfType<TValues, boolean>` from
> `@tanstack/form-core` (already re-exported by this package's `index.ts`). Custom nodes use
> `DeepKeys<TValues>`.

- [ ] **Step 4: Implement `walk.ts`**

```ts
import { RESERVED_NODE_TYPES } from './schema'

import type { CustomFieldNode, FieldNode, FormNode, FormSchema } from './schema'

const CONTAINER_TYPES = new Set(['section', 'step'])

export function isFieldNode<TValues>(node: FormNode<TValues>): node is FieldNode<TValues> | CustomFieldNode<TValues> {
	return !RESERVED_NODE_TYPES.includes(node.type as (typeof RESERVED_NODE_TYPES)[number])
}

export function hasChildren<TValues>(node: FormNode<TValues>): node is FormNode<TValues> & {
	children: FormNode<TValues>[]
} {
	return CONTAINER_TYPES.has(node.type)
}

export function walkNodes<TValues>(
	schema: FormSchema<TValues>,
	visit: (node: FormNode<TValues>, ancestors: FormNode<TValues>[]) => void,
): void {
	const walk = (nodes: FormNode<TValues>[], ancestors: FormNode<TValues>[]): void => {
		for (const node of nodes) {
			visit(node, ancestors)
			if (hasChildren(node)) walk(node.children, [...ancestors, node])
		}
	}
	walk(schema.children, [])
}
```

- [ ] **Step 5: Write the type-level test**

```ts
// packages/form/core/src/schema.test-d.ts
import { expectTypeOf, test } from 'vitest'

import { FormFieldType } from './field-types'
import { defineFormSchema } from './schema'

type Values = { email: string; age: number }

test('a field name must match the field kind', () => {
	const define = defineFormSchema<Values>()

	define({ version: 1, children: [{ type: FormFieldType.Text, name: 'email' }] })

	// @ts-expect-error `age` is a number, not a string
	define({ version: 1, children: [{ type: FormFieldType.Text, name: 'age' }] })

	// @ts-expect-error `nope` is not a path in Values
	define({ version: 1, children: [{ type: FormFieldType.Text, name: 'nope' }] })

	expectTypeOf(define).toBeFunction()
})
```

- [ ] **Step 6: Run everything and commit**

Run: `pnpm --filter @ez-kit/form-core test`
Run: `pnpm --filter @ez-kit/form-core typecheck`
Expected: PASS. `@ts-expect-error` lines must be _used_ — if typecheck reports "unused '@ts-expect-error' directive", the narrowing is missing and the task is not done.

```bash
git add packages/form/core/src/schema.ts packages/form/core/src/walk.ts packages/form/core/src/schema.test-d.ts packages/form/core/src/walk.test.ts packages/form/core/src/index.ts
git commit -m "feat(form-core): add the FormSchema node types and traversal"
```

---

## Task 4: `parseFormSchema`

Implements spec §9.3.

**Files:**

- Create: `packages/form/core/src/parse.ts`
- Create: `packages/form/core/src/parse.test.ts`
- Modify: `packages/form/core/src/index.ts`

**Interfaces:**

- Consumes: `walkNodes`, `isFieldNode`, `RESERVED_NODE_TYPES`, `collectRuleFields`.
- Produces:
  - `class FormSchemaError extends Error { readonly path: string }` — `path` is a human-readable node location such as `children[1].children[0]`
  - `type ParseOptions = { fieldTypes?: readonly string[]; blocks?: readonly string[]; rules?: readonly string[]; hasTranslate?: boolean }`
  - `function parseFormSchema<TValues>(input: unknown, options?: ParseOptions): FormSchema<TValues>`

- [ ] **Step 1: Write the failing test**

```ts
// packages/form/core/src/parse.test.ts
import { expect, test } from 'vitest'

import { FormSchemaError, parseFormSchema } from './parse'

const base = { version: 1, children: [] }

test('accepts a minimal document', () => {
	expect(parseFormSchema(base)).toEqual(base)
})

test('rejects an unknown version', () => {
	expect(() => parseFormSchema({ version: 2, children: [] })).toThrow(/version/i)
})

test('rejects a node type that is neither built in nor registered', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'rating', name: 'a' }] })).toThrow(
		/unknown node type "rating"/i,
	)
})

test('accepts a registered custom field type', () => {
	const schema = { version: 1, children: [{ type: 'rating', name: 'a' }] }
	expect(parseFormSchema(schema, { fieldTypes: ['rating'] })).toEqual(schema)
})

test('rejects a duplicate field name', () => {
	expect(() =>
		parseFormSchema({
			version: 1,
			children: [
				{ type: 'text', name: 'a' },
				{ type: 'section', children: [{ type: 'text', name: 'a' }] },
			],
		}),
	).toThrow(/duplicate field name "a"/i)
})

test('rejects a rule key with no registered implementation', () => {
	expect(() =>
		parseFormSchema({ version: 1, children: [{ type: 'text', name: 'a', validate: { rule: 'inn' } }] }),
	).toThrow(/unknown validation rule "inn"/i)
})

test('rejects a relative field reference in v1', () => {
	expect(() =>
		parseFormSchema({
			version: 1,
			children: [{ type: 'text', name: 'a', when: { field: './b', eq: 1 } }],
		}),
	).toThrow(/relative/i)
})

test('rejects a translation key when no translate is available', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'text', name: 'a', label: { key: 'x' } }] })).toThrow(
		/translate/i,
	)
})

test('rejects a function condition in an external document', () => {
	expect(() => parseFormSchema({ version: 1, children: [{ type: 'text', name: 'a', when: () => true }] })).toThrow(
		/function/i,
	)
})

test('rejects step nodes mixed with non-step siblings', () => {
	expect(() =>
		parseFormSchema({
			version: 1,
			children: [
				{ type: 'step', children: [] },
				{ type: 'text', name: 'a' },
			],
		}),
	).toThrow(/step/i)
})

test('the error names the offending node location', () => {
	try {
		parseFormSchema({ version: 1, children: [{ type: 'section', children: [{ type: 'zzz' }] }] })
		expect.unreachable()
	} catch (error) {
		expect(error).toBeInstanceOf(FormSchemaError)
		expect((error as FormSchemaError).path).toBe('children[0].children[0]')
	}
})
```

- [ ] **Step 2: Run it and confirm every case fails**

Run: `pnpm --filter @ez-kit/form-core test parse`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `parse.ts`**

Structure: a recursive validator that carries the current `path` string, checks in this
order — shape, `version`, node `type` known, reserved-name collision, `name` present for
field nodes and unique across the document, `validate.rule` registered, every `when` /
`disabledWhen` is a rule object (never a function) with absolute refs only, every
`LocalizedText` object has `hasTranslate`, and step siblings are homogeneous. Throw
`FormSchemaError` with the accumulated `path` on the first violation.

```ts
export class FormSchemaError extends Error {
	readonly path: string

	constructor(message: string, path: string) {
		super(`${message} (at ${path})`)
		this.name = 'FormSchemaError'
		this.path = path
	}
}
```

> **Implementer note:** the rejection of function conditions is what makes this the trust
> boundary for BDUI payloads (spec I2/I3) — a function cannot survive `JSON.parse` anyway,
> but a caller passing a hand-built object must still be told it is not a serialisable
> document.

- [ ] **Step 4: Export and verify**

Add to `index.ts`:

```ts
export { FormSchemaError, parseFormSchema } from './parse'
export type { ParseOptions } from './parse'
```

Run: `pnpm --filter @ez-kit/form-core test`
Expected: PASS, all 11 parse cases.

- [ ] **Step 5: Commit**

```bash
git add packages/form/core/src/parse.ts packages/form/core/src/parse.test.ts packages/form/core/src/index.ts
git commit -m "feat(form-core): add parseFormSchema as the trust boundary for external documents"
```

---

## Task 5: Visibility and hidden-value stripping

Implements spec §6.

**Files:**

- Create: `packages/form/core/src/visibility.ts`
- Create: `packages/form/core/src/visibility.test.ts`
- Modify: `packages/form/core/src/index.ts`

**Interfaces:**

- Consumes: `walkNodes`, `isFieldNode`, `compileCondition`.
- Produces:
  - `function visibleFieldNames<TValues>(schema: FormSchema<TValues>, values: TValues): Set<string>` — a field is visible only when it and **every ancestor** pass their `when`
  - `function stripHiddenValues<TValues>(schema: FormSchema<TValues>, values: TValues): TValues` — returns a new object; keys not owned by any field node are left untouched

- [ ] **Step 1: Write the failing test**

```ts
// packages/form/core/src/visibility.test.ts
import { expect, test } from 'vitest'

import { FormFieldType } from './field-types'
import { stripHiddenValues, visibleFieldNames } from './visibility'

import type { FormSchema } from './schema'

type Values = { clientType: string; inn: string; note: string }

const schema: FormSchema<Values> = {
	version: 1,
	children: [
		{ type: FormFieldType.Text, name: 'clientType' },
		{
			type: 'section',
			when: { field: 'clientType', eq: 'business' },
			children: [{ type: FormFieldType.Text, name: 'inn' }],
		},
		{ type: FormFieldType.Text, name: 'note' },
	],
}

test('a field inside a hidden ancestor is hidden even when its own `when` passes', () => {
	expect(visibleFieldNames(schema, { clientType: 'person', inn: '77', note: 'x' })).toEqual(
		new Set(['clientType', 'note']),
	)
})

test('everything is visible when the condition passes', () => {
	expect(visibleFieldNames(schema, { clientType: 'business', inn: '77', note: 'x' })).toEqual(
		new Set(['clientType', 'inn', 'note']),
	)
})

test('stripHiddenValues removes only hidden field keys', () => {
	expect(stripHiddenValues(schema, { clientType: 'person', inn: '77', note: 'x' })).toEqual({
		clientType: 'person',
		note: 'x',
	})
})

test('stripHiddenValues does not mutate its input', () => {
	const values = { clientType: 'person', inn: '77', note: 'x' }
	stripHiddenValues(schema, values)
	expect(values.inn).toBe('77')
})

test('keys no field node owns survive stripping', () => {
	const values = { clientType: 'person', inn: '77', note: 'x', meta: 1 } as unknown as Values
	expect(stripHiddenValues(schema, values)).toHaveProperty('meta', 1)
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter @ez-kit/form-core test visibility`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `visibility.ts`**

```ts
import { compileCondition } from './rules'
import { isFieldNode, walkNodes } from './walk'

import type { FormNode, FormSchema } from './schema'

function isNodeVisible<TValues>(node: FormNode<TValues>, values: TValues): boolean {
	return node.when === undefined || compileCondition<TValues>(node.when)(values)
}

export function visibleFieldNames<TValues>(schema: FormSchema<TValues>, values: TValues): Set<string> {
	const visible = new Set<string>()
	walkNodes(schema, (node, ancestors) => {
		if (!isFieldNode(node)) return
		const chainVisible = ancestors.every((ancestor) => isNodeVisible(ancestor, values))
		if (chainVisible && isNodeVisible(node, values)) visible.add(node.name)
	})
	return visible
}

/** Every field name the schema declares, visible or not. */
function allFieldNames<TValues>(schema: FormSchema<TValues>): Set<string> {
	const names = new Set<string>()
	walkNodes(schema, (node) => {
		if (isFieldNode(node)) names.add(node.name)
	})
	return names
}

export function stripHiddenValues<TValues>(schema: FormSchema<TValues>, values: TValues): TValues {
	const visible = visibleFieldNames(schema, values)
	const owned = allFieldNames(schema)
	const result: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
		if (owned.has(key) && !visible.has(key)) continue
		result[key] = value
	}
	return result as TValues
}
```

> **Implementer note:** stripping is deliberately a pure function over the submitted values,
> not a `form.deleteField` call when a field hides (spec §6). Toggling a condition twice must
> not destroy what the user typed.
>
> Nested paths (`company.inn`) are out of scope for v1 stripping: only top-level keys are
> compared. Add a test asserting the current behaviour for a dotted name so the limitation is
> recorded rather than discovered.

- [ ] **Step 4: Export and verify**

```ts
export { stripHiddenValues, visibleFieldNames } from './visibility'
```

Run: `pnpm --filter @ez-kit/form-core test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/form/core/src/visibility.ts packages/form/core/src/visibility.test.ts packages/form/core/src/index.ts
git commit -m "feat(form-core): compute field visibility and strip hidden values"
```

---

## Task 6: Constraint → Standard Schema validator

Implements spec §7.1–7.3.

**Files:**

- Create: `packages/form/core/src/validate.ts`
- Create: `packages/form/core/src/validate.test.ts`
- Modify: `packages/form/core/src/index.ts`

**Interfaces:**

- Consumes: `walkNodes`, `isFieldNode`, `visibleFieldNames`, `resolveText`.
- Produces:
  - `type FieldValidate = { required?: boolean; min?: number; max?: number; minLength?: number; maxLength?: number; format?: 'email' | 'url' | 'tel'; rule?: string; messages?: Partial<Record<string, LocalizedText>> }`
  - `type NamedRule = (value: unknown, values: unknown) => true | string`
  - `function buildValidator<TValues>(schema: FormSchema<TValues>, options: { rules?: Record<string, NamedRule>; translate?: Translate }): StandardSchemaV1<TValues, TValues>`

- [ ] **Step 1: Write the failing test**

```ts
// packages/form/core/src/validate.test.ts
import { expect, test } from 'vitest'

import { FormFieldType } from './field-types'
import { buildValidator } from './validate'

import type { FormSchema } from './schema'

type Values = { email: string; age: number; inn: string }

const schema: FormSchema<Values> = {
	version: 1,
	children: [
		{ type: FormFieldType.Text, name: 'email', validate: { required: true, format: 'email' } },
		{ type: FormFieldType.Number, name: 'age', validate: { min: 18 } },
		{ type: FormFieldType.Text, name: 'inn', validate: { rule: 'ru-inn' } },
	],
}

const rules = { 'ru-inn': (value: unknown) => value === '77' || 'Invalid tax ID' }

function issuesOf(values: Values): { path: string; message: string }[] {
	const result = buildValidator(schema, { rules })['~standard'].validate(values)
	if (result instanceof Promise) throw new Error('the generated validator must be synchronous')
	return (result.issues ?? []).map((issue) => ({
		path: String(issue.path?.[0]),
		message: issue.message,
	}))
}

test('a valid document produces no issues', () => {
	expect(issuesOf({ email: 'a@b.co', age: 30, inn: '77' })).toEqual([])
})

test('required catches an empty string', () => {
	expect(issuesOf({ email: '', age: 30, inn: '77' })[0]?.path).toBe('email')
})

test('format catches a malformed email', () => {
	expect(issuesOf({ email: 'nope', age: 30, inn: '77' })[0]?.path).toBe('email')
})

test('min catches a small number', () => {
	expect(issuesOf({ email: 'a@b.co', age: 5, inn: '77' })[0]?.path).toBe('age')
})

test('a named rule reports its own message', () => {
	expect(issuesOf({ email: 'a@b.co', age: 30, inn: '00' })[0]?.message).toBe('Invalid tax ID')
})

test('a hidden field is never validated', () => {
	const conditional: FormSchema<Values> = {
		version: 1,
		children: [
			{ type: FormFieldType.Text, name: 'email' },
			{
				type: FormFieldType.Text,
				name: 'inn',
				when: { field: 'email', eq: 'business' },
				validate: { required: true },
			},
		],
	}
	const result = buildValidator(conditional, {})['~standard'].validate({
		email: 'a@b.co',
		age: 0,
		inn: '',
	})
	if (result instanceof Promise) throw new Error('synchronous')
	expect(result.issues ?? []).toEqual([])
})

test('an unregistered rule key throws when the validator is built', () => {
	expect(() => buildValidator(schema, {})).toThrow(/ru-inn/)
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter @ez-kit/form-core test validate`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `validate.ts`**

Implement the Standard Schema v1 interface by hand — **do not import zod** (Global Constraints):

```ts
export function buildValidator<TValues>(
	schema: FormSchema<TValues>,
	options: { rules?: Record<string, NamedRule>; translate?: Translate },
): StandardSchemaV1<TValues, TValues> {
	const checks = collectChecks(schema, options) // throws on an unregistered rule key

	return {
		'~standard': {
			version: 1,
			vendor: 'ez-kit',
			validate: (value) => {
				const values = value as TValues
				const visible = visibleFieldNames(schema, values)
				const issues: { message: string; path: (string | number)[] }[] = []

				for (const check of checks) {
					if (!visible.has(check.name)) continue
					const message = check.run(getValueAtPath(values, check.name), values)
					if (message !== undefined) issues.push({ message, path: check.name.split('.') })
				}

				return issues.length > 0 ? { issues } : { value: values }
			},
		},
	}
}
```

> **Implementer note:** `required` treats `undefined`, `null`, `''` and `false`-for-checkbox as
> empty. `format` uses one small, anchored regex per format and nothing user-supplied —
> `pattern` is intentionally absent from the format (spec §7.1, ReDoS). Issue paths are split
> on `.` so TanStack maps them back onto nested fields.

- [ ] **Step 4: Export and verify**

```ts
export { buildValidator } from './validate'
export type { FieldValidate, NamedRule } from './validate'
```

Run: `pnpm --filter @ez-kit/form-core test`
Run: `pnpm --filter @ez-kit/form-core lint`
Expected: PASS.

- [ ] **Step 5: Confirm the zero-dependency constraint**

Run: `grep -rn "from 'zod'" packages/form/core/src`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add packages/form/core/src/validate.ts packages/form/core/src/validate.test.ts packages/form/core/src/index.ts
git commit -m "feat(form-core): generate a Standard Schema validator from schema constraints"
```

---

## Task 7: Contract additions — `Section` and `GridItem`

Implements spec §11. Contract and both kit implementations land together so `satisfies FormComponents` never goes red.

**Files:**

- Modify: `packages/form/react/react/src/contract.ts`
- Modify: `packages/form/react/react/src/test-kit.tsx`
- Create: `packages/form/react/shadcn/src/blocks/layout.tsx`
- Modify: `packages/form/react/shadcn/src/form.tsx`
- Create: `packages/form/react/heroui/src/components/ui/layout.tsx`
- Modify: `packages/form/react/heroui/src/form.tsx`
- Create: `packages/form/react/react/src/schema/layout-contract.test.tsx`

**Interfaces:**

- Produces:
  - `type SectionRenderProps = { title: ReactNode; description: ReactNode; columns: number | undefined; children: ReactNode }`
  - `type GridItemRenderProps = { colSpan: number | undefined; children: ReactNode }`
  - `FormComponents` gains `Section: (props: SectionRenderProps) => ReactNode` and `GridItem: (props: GridItemRenderProps) => ReactNode`

- [ ] **Step 1: Write the failing test**

```tsx
// packages/form/react/react/src/schema/layout-contract.test.tsx
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { testKit } from '../test-kit'

test('the test kit implements the layout contract', () => {
	render(
		<testKit.Section
			title='Client'
			description={undefined}
			columns={2}
		>
			<testKit.GridItem colSpan={2}>field</testKit.GridItem>
		</testKit.Section>,
	)

	expect(screen.getByTestId('section')).toHaveAttribute('data-columns', '2')
	expect(screen.getByTestId('grid-item')).toHaveAttribute('data-col-span', '2')
	expect(screen.getByText('Client')).toBeInTheDocument()
})
```

> If `test-kit.tsx` does not currently export its components as a namespace object, export one
> (`export const testKit = { … } satisfies FormComponents`) as part of this step — the schema
> tasks that follow all need it.

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter @ez-kit/form-react test layout-contract`
Expected: FAIL — `testKit.Section is not a function`.

- [ ] **Step 3: Extend the contract**

In `contract.ts`, next to the existing field render props:

```ts
export type SectionRenderProps = {
	title: ReactNode
	description: ReactNode
	/** Grid columns for the direct children. `undefined` means one column. */
	columns: number | undefined
	children: ReactNode
}

export type GridItemRenderProps = {
	/** Columns this item spans. `undefined` means one. */
	colSpan: number | undefined
	children: ReactNode
}
```

and add both to `FormComponents`.

- [ ] **Step 4: Implement in the test kit and both real kits**

Test kit — unstyled, marker attributes only:

```tsx
function Section({ title, description, columns, children }: SectionRenderProps): ReactNode {
	return (
		<section
			data-testid='section'
			data-columns={columns}
		>
			{title !== undefined && <h3>{title}</h3>}
			{description !== undefined && <p>{description}</p>}
			{children}
		</section>
	)
}
```

shadcn — `blocks/layout.tsx`, Tailwind grid, vendored `components/ui/**` untouched. heroui —
`components/ui/layout.tsx`, hand-written like its existing `action-bar.tsx`. Both map
`columns` to a grid template and `colSpan` to a column span, and both must handle
`columns === undefined` as one column.

- [ ] **Step 5: Run the whole form suite**

Run: `pnpm --filter @ez-kit/form-react test`
Run: `pnpm --filter @ez-kit/form-shadcn test`
Run: `pnpm --filter @ez-kit/form-heroui test`
Run: `pnpm --filter @ez-kit/form-shadcn typecheck`
Expected: PASS — a missing member would fail `satisfies FormComponents` at typecheck.

- [ ] **Step 6: Commit**

```bash
git add packages/form/react
git commit -m "feat(form): add Section and GridItem to the UI-kit contract"
```

---

## Task 8: `FormRenderer` — field nodes only

Implements spec §9.1, first slice: a flat list of field nodes, no containers, no conditions.

**Files:**

- Create: `packages/form/react/react/src/schema/render-node.tsx`
- Create: `packages/form/react/react/src/schema/form-renderer.tsx`
- Create: `packages/form/react/react/src/schema/form-renderer.test.tsx`
- Modify: `packages/form/react/react/src/create-form.tsx`
- Modify: `packages/form/react/react/src/index.ts`
- Modify: `packages/form/react/shadcn/src/{form.tsx,index.ts}` and the heroui equivalents

**Interfaces:**

- Consumes: `FormSchema`, `walkNodes`, `resolveText`, the bound `FormFieldComponents` built in `build-field-components.tsx`.
- Produces:
  - `type FormRendererControlledProps<TValues>` — `{ form: KitFormApi<…>; schema: FormSchema<TValues> } & SharedRendererProps`
  - `type FormRendererUncontrolledProps<TValues>` — schema plus the `FormOptions` fields, mirroring `FormUncontrolledProps`
  - `createForm` returns `{ useForm, Form, FormRenderer }`

- [ ] **Step 1: Write the failing test**

```tsx
// packages/form/react/react/src/schema/form-renderer.test.tsx
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { FormFieldType } from '@ez-kit/form-core'

import { createForm } from '../create-form'
import { testKit } from '../test-kit'

import type { FormSchema } from '@ez-kit/form-core'

const { FormRenderer } = createForm({ components: testKit })

type Values = { email: string; age: number }

const schema: FormSchema<Values> = {
	version: 1,
	children: [
		{ type: FormFieldType.Text, name: 'email', label: 'Email' },
		{ type: FormFieldType.Number, name: 'age', label: 'Age' },
	],
}

test('renders one bound field per node, through the injected kit', () => {
	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ email: '', age: 0 }}
			onSubmit={() => {}}
		/>,
	)

	expect(screen.getByLabelText('Email')).toBeInTheDocument()
	expect(screen.getByLabelText('Age')).toBeInTheDocument()
	// The kit rendered it, not the adapter — this package ships no visible elements.
	expect(screen.getAllByTestId('field-root')).toHaveLength(2)
})

test('the rendered field carries the same data attributes as the JSX API', () => {
	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ email: '', age: 0 }}
			onSubmit={() => {}}
		/>,
	)
	const root = screen.getAllByTestId('field-root')[0]
	expect(root).toHaveAttribute('data-field', 'email')
	expect(root).toHaveAttribute('data-field-type', 'text')
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter @ez-kit/form-react test form-renderer`
Expected: FAIL — `FormRenderer is not exported`.

- [ ] **Step 3: Implement `render-node.tsx`**

One node → one already-bound component. No DOM of its own:

```tsx
export function renderNode<TValues>({ node, form, context }: RenderNodeArgs<TValues>): ReactNode {
	switch (node.type) {
		case FormFieldType.Text:
			return (
				<form.TextField
					name={node.name}
					label={resolveText(node.label, context.translate)}
					description={resolveText(node.description, context.translate)}
					{...pickTextOptions(node)}
				/>
			)
		// … one case per FormFieldType, each forwarding only that kind's option keys
		default:
			throw new Error(`Unknown node type "${node.type}".`)
	}
}
```

> **Implementer note:** forward option keys explicitly per kind rather than spreading the node.
> A spread would leak `when`, `validate` and `colSpan` into the kit's props, and under
> `exactOptionalPropertyTypes` it would also turn "absent" into "explicitly undefined".

- [ ] **Step 4: Implement `form-renderer.tsx` and wire it into `createForm`**

`FormRenderer` mirrors `Form`'s two-overload shape (controlled takes `form`, uncontrolled
creates one and renders the `<form>` element through `components.Form`). Add it to the object
`createForm` returns, and re-export it from both kits' `index.ts` alongside `Form`.

- [ ] **Step 5: Run and verify both kits build**

Run: `pnpm --filter @ez-kit/form-react test`
Run: `pnpm --filter @ez-kit/form-shadcn typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/form
git commit -m "feat(form-react): render field nodes from a FormSchema"
```

---

## Task 9: Sections and the grid

Implements spec §4.4.

**Files:**

- Modify: `packages/form/react/react/src/schema/render-node.tsx`
- Create: `packages/form/react/react/src/schema/render-children.tsx`
- Create: `packages/form/react/react/src/schema/sections.test.tsx`

**Interfaces:**

- Consumes: `Section`, `GridItem` (Task 7), `renderNode` (Task 8).
- Produces: `function renderChildren<TValues>(nodes, args): ReactNode` — wraps each child in `GridItem` when its parent section declares `columns`.

- [ ] **Step 1: Write the failing test**

```tsx
test('a section renders through the kit and wraps children in grid items', () => {
	const schema: FormSchema<Values> = {
		version: 1,
		children: [
			{
				type: 'section',
				title: 'Client',
				columns: 2,
				children: [
					{ type: FormFieldType.Text, name: 'email', label: 'Email' },
					{ type: FormFieldType.Number, name: 'age', label: 'Age', colSpan: 2 },
				],
			},
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ email: '', age: 0 }}
			onSubmit={() => {}}
		/>,
	)

	expect(screen.getByTestId('section')).toHaveAttribute('data-columns', '2')
	expect(screen.getAllByTestId('grid-item')[1]).toHaveAttribute('data-col-span', '2')
})

test('a section without a title renders no heading', () => {
	const schema: FormSchema<Values> = {
		version: 1,
		children: [{ type: 'section', children: [{ type: FormFieldType.Text, name: 'email' }] }],
	}
	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ email: '', age: 0 }}
			onSubmit={() => {}}
		/>,
	)
	expect(screen.queryByRole('heading')).not.toBeInTheDocument()
})

test('nested sections build a different grid inside a grid', () => {
	// outer columns=2, inner columns=1 — assert both data-columns values are present
})
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter @ez-kit/form-react test sections`
Expected: FAIL — `Unknown node type "section"`.

- [ ] **Step 3: Implement the `section` case and `renderChildren`**

- [ ] **Step 4: Run the suite**

Run: `pnpm --filter @ez-kit/form-react test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/form/react/react/src/schema
git commit -m "feat(form-react): render sections and the column grid"
```

---

## Task 10: Conditions, disabled state and hidden values

Implements spec §5 and §6 in the renderer.

**Files:**

- Create: `packages/form/react/react/src/schema/use-condition.ts`
- Modify: `packages/form/react/react/src/schema/render-node.tsx`
- Modify: `packages/form/react/react/src/schema/form-renderer.tsx`
- Create: `packages/form/react/react/src/schema/conditions.test.tsx`

**Interfaces:**

- Consumes: `compileCondition`, `collectRuleFields`, `stripHiddenValues`.
- Produces: `function useConditionValue<TValues>(form, condition: Condition<TValues> | undefined, fallback: boolean): boolean` — subscribes through `form.Subscribe`/`useStore` to only the fields `collectRuleFields` reports, or to the whole values object when the condition is a function.

- [ ] **Step 1: Write the failing test**

```tsx
test('a field appears and disappears with its condition', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<Values> = {
		version: 1,
		children: [
			{ type: FormFieldType.Text, name: 'clientType', label: 'Type' },
			{ type: FormFieldType.Text, name: 'inn', label: 'Tax ID', when: { field: 'clientType', eq: 'business' } },
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ clientType: '', inn: '' }}
			onSubmit={() => {}}
		/>,
	)
	expect(screen.queryByLabelText('Tax ID')).not.toBeInTheDocument()

	await user.type(screen.getByLabelText('Type'), 'business')
	expect(screen.getByLabelText('Tax ID')).toBeInTheDocument()
})

test('disabledWhen disables rather than hides', async () => {
	/* … */
})

test('hidden values do not reach onSubmit by default', async () => {
	const onSubmit = vi.fn()
	// type into `inn` while visible, hide it again, submit
	expect(onSubmit.mock.calls[0][0].value).not.toHaveProperty('inn')
})

test('keepHiddenValues includes them', async () => {
	/* same flow, prop set */
})

test('a value survives hiding and re-showing — stripping happens at submit, not on hide', async () => {
	// type 77, switch away, switch back: the input still reads 77
})
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter @ez-kit/form-react test conditions`
Expected: FAIL — the conditional field renders unconditionally.

- [ ] **Step 3: Implement `use-condition.ts` and wire it into `renderNode`**

A node returns `null` when its `when` is false; `disabledWhen` is OR-ed into the `disabled`
prop passed to the field component.

- [ ] **Step 4: Wire stripping into submission**

In the uncontrolled path, wrap the caller's `onSubmit` so it receives
`stripHiddenValues(schema, value)` unless `keepHiddenValues` is set. In the controlled path,
the same wrapper is applied to the options the caller passed to `useForm`; document that a
controlled caller who builds the instance themselves must opt in by passing the schema to
`FormRenderer`, which is the only way it can know what is hidden.

- [ ] **Step 5: Run the suite and commit**

Run: `pnpm --filter @ez-kit/form-react test`

```bash
git add packages/form/react/react/src/schema
git commit -m "feat(form-react): apply schema conditions to visibility, disabled state and submitted values"
```

---

## Task 11: Registries, custom fields, blocks and the submit node

Implements spec §4.7 and §8.

**Files:**

- Create: `packages/form/react/react/src/schema/registries.ts`
- Modify: `packages/form/react/react/src/schema/{render-node.tsx,form-renderer.tsx}`
- Create: `packages/form/react/react/src/schema/registries.test.tsx`
- Modify: `packages/form/react/react/src/index.ts`

**Interfaces:**

- Consumes: `FieldRenderProps`, `formatFieldErrors`, `RESERVED_NODE_TYPES`.
- Produces:
  - `type CustomFieldRenderProps<TValue = unknown> = FieldRenderProps & { value: TValue; onChange: (value: TValue) => void; props: Record<string, unknown> }`
  - `type CustomFieldRegistry = Record<string, (props: CustomFieldRenderProps) => ReactNode>`
  - `type BlockRegistry = Record<string, (props: { props: Record<string, unknown> }) => ReactNode>`
  - `FormRenderer` props gain `fields`, `blocks`, `rules`

- [ ] **Step 1: Write the failing test**

```tsx
test('a custom field receives the full binding, not just its own props', async () => {
	const user = userEvent.setup()
	const Rating = ({ id, label, value, onChange, props, invalid }: CustomFieldRenderProps<number>) => (
		<div data-testid='rating' data-invalid={invalid} data-max={String(props.max)}>
			<label htmlFor={id}>{label}</label>
			<input id={id} value={String(value ?? '')} onChange={(e) => onChange(Number(e.target.value))} />
		</div>
	)

	const schema = {
		version: 1,
		children: [{ type: 'rating', name: 'score', label: 'Score', props: { max: 5 } }],
	} as FormSchema<{ score: number }>

	render(
		<FormRenderer
			schema={schema}
			fields={{ rating: Rating }}
			defaultValues={{ score: 0 }}
			onSubmit={() => {}}
		/>,
	)

	expect(screen.getByTestId('rating')).toHaveAttribute('data-max', '5')
	await user.clear(screen.getByLabelText('Score'))
	await user.type(screen.getByLabelText('Score'), '4')
	expect(screen.getByLabelText('Score')).toHaveValue('4')
})

test('a block renders without binding to any value', () => { /* no name, receives props only */ })

test('an unknown node type throws with the type named', () => {
	expect(() => render(<FormRenderer schema={unknownTypeSchema} … />)).toThrow(/rating/)
})

test('registering a reserved key throws', () => {
	expect(() => render(<FormRenderer schema={emptySchema} fields={{ section: Rating }} … />)).toThrow(
		/reserved/i,
	)
})

test('the submit node renders the kit button and submits the form', async () => {
	const onSubmit = vi.fn()
	// schema: one text field + { type: 'submit', label: 'Save' }
	await user.click(screen.getByRole('button', { name: 'Save' }))
	expect(onSubmit).toHaveBeenCalledOnce()
})
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter @ez-kit/form-react test registries`
Expected: FAIL — `Unknown node type "rating"`.

- [ ] **Step 3: Implement the registry lookup, the `block` case and the `submit` case**

Resolution order in `renderNode`: built-in field kind → `blocks[node.component]` for
`type: 'block'` → `submit` → `fields[node.type]` → throw naming the type. Reserved-key
collisions are checked once when `FormRenderer` mounts, not per node.

- [ ] **Step 4: Run the suite and commit**

Run: `pnpm --filter @ez-kit/form-react test`

```bash
git add packages/form/react/react/src
git commit -m "feat(form-react): support custom fields, blocks and the submit node"
```

---

## Task 12: Validation wiring

Implements spec §7.4 and §9.3.

**Files:**

- Modify: `packages/form/react/react/src/schema/form-renderer.tsx`
- Create: `packages/form/react/react/src/schema/validation.test.tsx`

**Interfaces:**

- Consumes: `buildValidator`, `parseFormSchema`.
- Produces: `FormRenderer` attaches the generated validator to `validators.onChange` and `validators.onSubmit`, or uses the caller's `validators` verbatim — never both.

- [ ] **Step 1: Write the failing test**

```tsx
test('constraints in the schema produce field errors', async () => {
	const user = userEvent.setup()
	// schema: { type: 'text', name: 'email', label: 'Email', validate: { required: true } }
	await user.click(screen.getByRole('button', { name: 'Save' }))
	expect(await screen.findByTestId('error')).toBeInTheDocument()
})

test('supplying both schema constraints and validators throws a descriptive error', () => {
	expect(() =>
		render(<FormRenderer schema={constrainedSchema} validators={{ onChange: () => undefined }} … />),
	).toThrow(/either .*constraints.* or .*validators/i)
})

test('caller-supplied validators are used verbatim when the schema has no constraints', async () => {
	// validators.onChange returns 'nope' — assert the message reaches the field
})

test('a hidden required field does not block submission', async () => {
	const onSubmit = vi.fn()
	// required field behind a false `when`; submit must succeed
	expect(onSubmit).toHaveBeenCalledOnce()
})
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter @ez-kit/form-react test validation`
Expected: FAIL — no validator is attached.

- [ ] **Step 3: Implement the wiring**

Detect "the schema declares constraints" by walking once at mount. If it does **and**
`validators` is supplied, throw. Otherwise attach `buildValidator(schema, { rules, translate })`
to `onChange` and `onSubmit`.

> **Implementer note:** TanStack accepts one validator per trigger — a standard schema _or_ a
> function, never both. That is why these modes are mutually exclusive rather than merged
> (spec §7.4). Field-level validators through the native `form.Field` still compose, and that
> is the documented escape hatch.

- [ ] **Step 4: Run the suite and commit**

```bash
git add packages/form/react/react/src/schema
git commit -m "feat(form-react): drive validation from schema constraints"
```

---

## Task 13: Contract addition — `Wizard`

Implements spec §10.2 and §11. Contract plus both kits, again in one task.

**Files:**

- Modify: `packages/form/react/react/src/contract.ts`
- Modify: `packages/form/react/react/src/test-kit.tsx`
- Create: `packages/form/react/shadcn/src/blocks/wizard.tsx`
- Create: `packages/form/react/heroui/src/components/ui/wizard.tsx`
- Modify: both kits' `form.tsx`
- Create: `packages/form/react/react/src/schema/wizard-contract.test.tsx`

**Interfaces:**

- Produces: `type WizardStep`, `type WizardRenderProps`, `FormComponents['Wizard']` — copied verbatim from spec §10.2.

- [ ] **Step 1: Write the failing test**

```tsx
test('the test kit renders the wizard chrome from the props it is given', () => {
	render(
		<testKit.Wizard
			steps={[
				{
					index: 0,
					title: 'One',
					description: undefined,
					status: 'current',
					invalid: false,
					disabled: false,
					goTo: () => {},
				},
				{
					index: 1,
					title: 'Two',
					description: undefined,
					status: 'upcoming',
					invalid: false,
					disabled: true,
					goTo: () => {},
				},
			]}
			currentIndex={0}
			canGoBack={false}
			canGoNext
			isLastStep={false}
			goNext={() => {}}
			goBack={() => {}}
			submitting={false}
		>
			body
		</testKit.Wizard>,
	)

	expect(screen.getAllByTestId('wizard-step')).toHaveLength(2)
	expect(screen.getByRole('button', { name: /back/i })).toBeDisabled()
	expect(screen.getByText('body')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter @ez-kit/form-react test wizard-contract`
Expected: FAIL — `testKit.Wizard is not a function`.

- [ ] **Step 3: Add the types to `contract.ts`** — copy `WizardStep` and `WizardRenderProps` from spec §10.2 unchanged, and add `Wizard` to `FormComponents`.

- [ ] **Step 4: Implement in the test kit and both kits**

Neither kit ships a stepper (verified: HeroUI v3.0.5 has `ProgressBar`, `ProgressCircle`,
`Tabs`, `Breadcrumbs`, `Separator` but no stepper; the `@shadcn` registry has no "stepper"
item). So:

- **shadcn** — `blocks/wizard.tsx`, assembled from `Progress`, `Separator` and `Button`;
  `components/ui/**` stays untouched.
- **heroui** — `components/ui/wizard.tsx`, hand-written like the existing `action-bar.tsx`,
  using `Breadcrumbs` or `Tabs` for the step list plus `ProgressBar` and `Button`.

Both render `invalid` steps distinctly, `disabled` steps unclickable, and `children` as the
step body.

- [ ] **Step 5: Verify all three packages**

Run: `pnpm --filter @ez-kit/form-react test`
Run: `pnpm --filter @ez-kit/form-shadcn typecheck`
Run: `pnpm --filter @ez-kit/form-heroui typecheck`

- [ ] **Step 6: Commit**

```bash
git add packages/form/react
git commit -m "feat(form): add the Wizard member to the UI-kit contract"
```

---

## Task 14: Multi-step rendering

Implements spec §4.5 and §10.

**Files:**

- Create: `packages/form/react/react/src/schema/form-wizard.tsx`
- Create: `packages/form/react/react/src/schema/use-step-fields.ts`
- Modify: `packages/form/react/react/src/schema/form-renderer.tsx`
- Create: `packages/form/react/react/src/schema/wizard.test.tsx`

**Interfaces:**

- Consumes: `walkNodes`, `isFieldNode`, `compileCondition`, `useFormGroup` from `@tanstack/react-form`.
- Produces: `function collectStepFieldNames<TValues>(step: StepNode<TValues>): string[]`; `FormRenderer` renders through `components.Wizard` when the schema's top-level children are `step` nodes.

- [ ] **Step 1: Write the failing test**

```tsx
test('renders only the current step and advances on next', async () => {
	const user = userEvent.setup()
	// two steps, one field each
	expect(screen.getByLabelText('Name')).toBeInTheDocument()
	expect(screen.queryByLabelText('Age')).not.toBeInTheDocument()

	await user.click(screen.getByRole('button', { name: /next/i }))
	expect(screen.getByLabelText('Age')).toBeInTheDocument()
})

test('next is blocked while the current step has invalid fields', async () => {
	// step 1 field is required and empty
	await user.click(screen.getByRole('button', { name: /next/i }))
	expect(screen.getByLabelText('Name')).toBeInTheDocument() // still on step 1
	expect(screen.getByTestId('error')).toBeInTheDocument()
})

test('a field on a LATER step does not block the current step', async () => {
	// step 2 has a required empty field; next from step 1 must still work
})

test('a step hidden by `when` is removed from steps and indices are recomputed', () => {
	// three steps, middle one conditional and false → two wizard-step markers, indices 0 and 1
	expect(screen.getAllByTestId('wizard-step')).toHaveLength(2)
})

test('invalid is false for a step that has never been visited', () => {
	/* … */
})

test('a step with `path` validates through useFormGroup', async () => {
	/* step-shaped values */
})
```

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm --filter @ez-kit/form-react test wizard.test`
Expected: FAIL — every step renders at once.

- [ ] **Step 3: Implement `collectStepFieldNames` and the step state machine**

`goNext` validates **only** the current step's fields — collected by walking that step's
subtree — then advances. Steps hidden by `when` are filtered before indices are assigned.
`invalid` is computed from a `visited` set so an untouched wizard never opens red.

When a step declares `path`, drive it through `useFormGroup({ name: path })` and use
`group.validate('submit')` instead of the collected-names path. Both branches must satisfy
the same tests.

> **Implementer note:** the collected-names branch is the default precisely because
> `useFormGroup` binds a group to a **data** path (`TName extends DeepKeys<TParentData>` in
> `form-core@1.33.2`), and requiring step-shaped data would put layout in charge of the payload
> — which invariant I1 forbids.

- [ ] **Step 4: Run and commit**

Run: `pnpm --filter @ez-kit/form-react test`

```bash
git add packages/form/react/react/src/schema
git commit -m "feat(form-react): render multi-step schemas through the Wizard contract"
```

---

## Task 15: Re-export TanStack composition, typed

Implements spec §12.

**Files:**

- Modify: `packages/form/react/react/src/create-form.tsx`
- Create: `packages/form/react/react/src/composition.test-d.tsx`
- Modify: `packages/form/react/react/src/index.ts` and both kits' `index.ts`

**Interfaces:**

- Produces: `createForm` additionally returns `withForm` and `withFieldGroup` whose `render` prop declares `form: KitFormApi<…>`; `useFormGroup` and `useFieldGroup` are re-exported unchanged.

- [ ] **Step 1: Write the failing type test**

```tsx
// packages/form/react/react/src/composition.test-d.tsx
import { expectTypeOf, test } from 'vitest'

import { createForm } from './create-form'
import { testKit } from './test-kit'

const { withForm } = createForm({ components: testKit })

test('the flat field components are visible inside withForm', () => {
	withForm({
		defaultValues: { email: '' },
		render: ({ form }) => {
			// This is the whole point: a bare re-export would type-error here while
			// working at runtime.
			expectTypeOf(form.TextField).toBeFunction()
			return null
		},
	})
})
```

- [ ] **Step 2: Run typecheck and confirm it fails**

Run: `pnpm --filter @ez-kit/form-react typecheck`
Expected: FAIL — `Property 'TextField' does not exist on type 'AppFieldExtendedReactFormApi<…>'`.

- [ ] **Step 3: Implement the typed wrappers**

Zero runtime: call TanStack's `withForm` / `withFieldGroup` and re-declare the `render`
parameter's `form` as `KitFormApi<…>`, the same type `useForm` already returns.

- [ ] **Step 4: Verify and commit**

Run: `pnpm --filter @ez-kit/form-react typecheck`
Run: `pnpm --filter @ez-kit/form-react test`

```bash
git add packages/form/react
git commit -m "feat(form-react): expose withForm and withFieldGroup with kit-aware types"
```

---

## Task 16: Docs, size budget and changeset

Implements spec §13 and §14 (docs bullet).

**Files:**

- Create: `apps/docs/shared/examples/form/schema-basic.tsx`
- Create: `apps/docs/shared/examples/form/schema-conditional.tsx`
- Create/modify: `apps/docs/content/docs/form/schema.mdx`
- Modify: `packages/form/react/react/package.json` (size-limit entry)
- Modify: `packages/form/core/README.md`, `packages/form/react/react/README.md`
- Create: `.changeset/<name>.md`

**Interfaces:** none — this task ships documentation and budgets only.

- [ ] **Step 1: Write the examples**

Per the repo's newer convention, per-package examples live at
`apps/docs/shared/examples/<package>/<name>.tsx` and are referenced from MDX by their relative
path without the extension — no registry entry, unlike the data-grid manifest.

`schema-basic.tsx` — a two-column section with three fields and a submit node.
`schema-conditional.tsx` — the client-type example from spec §4.9, so a reader sees a rule
object and its effect side by side.

- [ ] **Step 2: Write the docs page**

Cover, in this order: what a schema is, the TS/JSON equivalence (§4.9 shows the same document
both ways), conditions including why there is no JS in JSON, validation and the
one-source rule, registries, and the BDUI flow through `parseFormSchema`.

- [ ] **Step 3: Add the size-limit entry**

Add an entry covering the schema layer's import path so its weight is measured separately
from the JSX API, then run:

Run: `pnpm --filter @ez-kit/form-react size`
Expected: PASS. Record the measured value as the budget plus modest headroom, matching how the
other packages are tuned.

- [ ] **Step 4: Write the changeset**

```bash
pnpm changeset
```

Select `@ez-kit/form-core`, `@ez-kit/form-react`, `@ez-kit/form-shadcn`, `@ez-kit/form-heroui`,
bump **minor** for all four (pre-1.0 packages ship features and breaks as minor), summary:
"config-driven forms: render a form from a plain-data FormSchema".

- [ ] **Step 5: Full verification**

Run: `pnpm build`
Run: `pnpm run ci`
Expected: lint, typecheck, test, build and size all green.

- [ ] **Step 6: Commit**

```bash
git add apps/docs packages/form .changeset
git commit -m "docs(form): document config-driven forms and add examples"
```

---

## Self-Review Notes

Checked against the spec section by section:

| Spec section                                   | Task                           |
| ---------------------------------------------- | ------------------------------ |
| §4.1–4.3 node types, common props              | 3                              |
| §4.4 `section`, `columns`, `colSpan`           | 7, 9                           |
| §4.5 `step`, optional `path`                   | 3, 14                          |
| §4.6 `defaultValue`                            | 3, 8                           |
| §4.7 `submit` node                             | 11                             |
| §4.8 `LocalizedText`                           | 2                              |
| §5 rule language, `./` reservation             | 1, 4                           |
| §6 visibility, `keepHiddenValues`              | 5, 10                          |
| §7 validation, named rules, one source         | 6, 12                          |
| §8 registries, reserved names                  | 11                             |
| §9.1 `FormRenderer` API, `components` override | 8, 11                          |
| §9.2 `defineFormSchema`                        | 3                              |
| §9.3 `parseFormSchema`                         | 4                              |
| §10 wizard                                     | 13, 14                         |
| §11 contract additions                         | 7, 13                          |
| §12 composition re-exports                     | 15                             |
| §13 packaging, size                            | 16                             |
| §14 testing                                    | every task; docs example in 16 |

Deliberate carry-overs recorded here so an implementer does not treat them as omissions:

- **`components` partial override** (spec §9.1) is introduced as a prop in Task 8 and exercised
  by Task 13's wizard test; there is no separate task for it.
- **Nested-path stripping** is out of scope for v1 (Task 5 note) — top-level keys only.
- **Array nodes** ship in a later minor; only the `./` syntax reservation lands here (Task 1).
