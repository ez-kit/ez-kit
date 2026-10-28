# Form composition — stage 1: package graph and names

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the mechanical half of spec 009 — one TanStack copy in the graph, the renamed public
types, `SchemaForm` — behind a kit-parity test, so stage 2 reshapes the factory on a clean surface.

**Architecture:** No runtime behaviour changes in this stage. Kits stop depending on TanStack and on
`@ez-kit/form-core`; everything a kit or an app needs is re-exported by `@ez-kit/form-react`. Public
type names converge on `FormInstance`, `OptionSourceRef` and `SchemaForm*`. A new docs test compares
both kits' built `.d.ts` exports so the renames cannot leave the kits apart.

**Tech Stack:** pnpm + Turborepo, TypeScript 5.9 (`strict`, `exactOptionalPropertyTypes`), TanStack
Form v1, tsup, Vitest, changesets.

**Spec:** `specs/009-form-composition/design.md` — D3, D8, D9, D11, D12 (and §7 rows for them).

## Stages of spec 009

All stages land on branch `form-check` in **one PR into `develop`**. The user reviews after each
stage; nothing is merged between stages. Only stage 1 is detailed here — each later stage gets its
own plan once the previous one is reviewed, because real code will move details.

1. **Graph and names** (this plan): D3, D8, D9, D11, D12.
2. **Factory and context:** D1, D2, D4, D6 (`useFormContext`, `FormProvider`), `form.Submit` from D5,
   kit `SubmitButton` on `form.Submit`, `allFormFields` / `allFormComponents`, tree-shaking cases.
   Context moved here from the old stage 2 because D4's `components` (kit `SubmitButton`, app
   `SaveBar`) get the form from context — the factory reshape cannot land without it.
3. **Field primitives:** rest of D5 (`form.Field`, `form.NativeField`), generic
   `useFormContext<TValues>()` (D6).
4. **Behaviour:** D13, D14, D16, D17, D15 hydration test.
5. **Composition:** D7.
6. **Steps:** D18 and the schema wizard on `form.Steps` (§5).
7. **Docs sweep:** `native-api.mdx`, `custom-fields.mdx`, second pass over stale claims.

## Global Constraints

- Code, comments, docblocks, commit messages: English. No agent attribution anywhere in git
  (`AGENTS.md`).
- Conventional Commits (commitlint runs on `commit-msg`); pre-commit runs Prettier + ESLint on staged
  files; `--max-warnings=0`.
- Type imports use `import type`; `import/order` is enforced.
- Every breaking change is a **minor** bump in each package it touches (pre-1.0, spec §7). One
  changeset per task, naming only the packages that task changes.
- Between edits run `pnpm verify:affected`; before the stage review run the full gate sequentially:
  `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm size` (`AGENTS.md` → "Which of
  those to run").
- Docs tests read **built** packages (`dist/`): run `pnpm build --filter=...@ez-kit/form-react`
  before `pnpm --filter @ez-kit/docs test`.
- Never bump a dependency with `pnpm up -r`; edit the manifest and run `pnpm install`.

## Review Focus

1. **An app that imports `useStore` from `@tanstack/react-form`.** `reactivity.mdx` tells readers to
   do exactly that. Once TanStack stops being a peer (D9) the app installs its own copy and gets a
   second one in the tree. Expected: the kit re-exports `useStore`, and the page imports it from the
   kit. Pinned in Task 5 by the parity test (both kits export it) and by the graph test.
2. **A kit test that imports from `@ez-kit/form-core`.** Six kit test files do. Once the kits drop
   that dependency the import no longer resolves under pnpm's strict layout. Expected: they import
   from `@ez-kit/form-react`, which re-exports `OptionValue`, `FormSchema`, `DateRangeValue`,
   `FormFieldType`. Pinned in Task 5: the graph test scans every kit source file, tests included.
3. **`useForm` with real validators assigned to `FormInstance<Values>`.** TanStack's `FormApi` is
   invariant in its validator parameters, so a naively defaulted alias rejects every instance that
   has validators. Expected: assignable, with values and field `name` still typed. Pinned in Task 3.
4. **A reader following an old name.** `KitFormApi`, `FormRenderer`, `OptionsSource` appear in ~40
   docs examples and ~17 pages. Expected: no stale name left in docs or docblocks; the docs option
   test still resolves every documented option. Pinned in Task 4 and Task 3 by a repo-wide grep that
   must come back empty, plus `docs-option-names.test.ts`.
5. **The two kits drifting apart during the renames.** Expected: identical value and type exports.
   Pinned by Task 1, which every later task re-runs.

---

### Task 1: Kit export parity test (D12)

**Files:**

- Create: `apps/docs/test/kit-exports-parity.test.ts`
- Create: `apps/docs/test/kit-exports-parity/exports-of.ts`
- Modify: `packages/form/react/heroui/src/index.ts` (add the five missing exports)
- Create: `.changeset/form-heroui-parity.md`

**Interfaces:**

- Produces: `kitExports(moduleName: string): { values: string[]; types: string[] }` in
  `apps/docs/test/kit-exports-parity/exports-of.ts`, reused by Task 5.

- [ ] **Step 1: Write the helper**

`apps/docs/test/kit-exports-parity/exports-of.ts`:

```ts
import { resolve } from 'node:path'

import ts from 'typescript'

const DOCS_ROOT = resolve(__dirname, '../..')
const PROBE_FILE = resolve(DOCS_ROOT, 'test/kit-exports-parity/__probe__.ts')

export type KitExports = { values: string[]; types: string[] }

/**
 * The exports of a package's **built** declarations, split into values and types.
 *
 * Resolved through `apps/docs/tsconfig.json`, so a specifier lands on the same `dist/*.d.ts` a
 * consumer's compiler reads. A value that is also a type (a const object plus its same-named union,
 * per the closed-set rule) counts as a value and as a type, which is what a consumer can write.
 */
export function kitExports(moduleName: string): KitExports {
	const configPath = resolve(DOCS_ROOT, 'tsconfig.json')
	const config = ts.readConfigFile(configPath, (fileName) => ts.sys.readFile(fileName))
	const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, DOCS_ROOT)
	const source = `import * as kit from '${moduleName}'\nexport { kit }\n`

	const host = ts.createCompilerHost(parsed.options, true)
	const readFile = host.readFile.bind(host)
	const fileExists = host.fileExists.bind(host)
	const getSourceFile = host.getSourceFile.bind(host)
	host.fileExists = (fileName) => fileName === PROBE_FILE || fileExists(fileName)
	host.readFile = (fileName) => (fileName === PROBE_FILE ? source : readFile(fileName))
	host.getSourceFile = (fileName, languageVersion, ...rest) =>
		fileName === PROBE_FILE
			? ts.createSourceFile(fileName, source, languageVersion, true)
			: getSourceFile(fileName, languageVersion, ...rest)

	const program = ts.createProgram([PROBE_FILE], parsed.options, host)
	const checker = program.getTypeChecker()
	const probe = program.getSourceFile(PROBE_FILE)
	const declaration = probe?.statements.find(ts.isImportDeclaration)
	const moduleSymbol = declaration && checker.getSymbolAtLocation(declaration.moduleSpecifier)
	if (moduleSymbol === undefined) throw new Error(`Cannot resolve ${moduleName} from apps/docs`)

	const values: string[] = []
	const types: string[] = []
	for (const exported of checker.getExportsOfModule(moduleSymbol)) {
		const target = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported
		if (target.flags & ts.SymbolFlags.Value) values.push(exported.name)
		if (target.flags & ts.SymbolFlags.Type) types.push(exported.name)
	}

	return { values: values.sort(), types: types.sort() }
}
```

- [ ] **Step 2: Write the failing test**

`apps/docs/test/kit-exports-parity.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { kitExports } from './kit-exports-parity/exports-of'

/**
 * The two form kits must export the same names, values and types alike.
 *
 * Behaviour parity is the e2e suite's job — every form spec runs against both kits. What it cannot
 * see is a name one kit exports and the other does not: an example written against shadcn and
 * copied into a HeroUI app fails to compile, and nothing in either kit's own suite notices. The
 * first divergence found was in types only (`ArrayFieldScope`, `ArrayItemScope`, `ArrayNode`).
 *
 * A legitimate difference goes in `ONLY_IN`, with the reason. There is none today.
 */
const ONLY_IN: Record<'shadcn' | 'heroui', Record<string, string>> = { shadcn: {}, heroui: {} }

function without(names: readonly string[], allowed: Record<string, string>): string[] {
	return names.filter((name) => !Object.hasOwn(allowed, name))
}

describe('form kit exports', () => {
	const shadcn = kitExports('@ez-kit/form-shadcn')
	const heroui = kitExports('@ez-kit/form-heroui')

	it('resolves a non-trivial surface from both kits', () => {
		expect(shadcn.values).toContain('useForm')
		expect(heroui.values).toContain('useForm')
	})

	it('exports the same values', () => {
		expect(without(shadcn.values, ONLY_IN.shadcn)).toEqual(without(heroui.values, ONLY_IN.heroui))
	})

	it('exports the same types', () => {
		expect(without(shadcn.types, ONLY_IN.shadcn)).toEqual(without(heroui.types, ONLY_IN.heroui))
	})
})
```

- [ ] **Step 3: Run it to see it fail**

Run: `pnpm build --filter=@ez-kit/form-shadcn --filter=@ez-kit/form-heroui && pnpm --filter @ez-kit/docs exec vitest run test/kit-exports-parity.test.ts`
Expected: FAIL — values differ by `defineFormItem`; types differ by `ArrayFieldProps`,
`ArrayFieldScope`, `ArrayItemScope`, `ArrayNode`.

- [ ] **Step 4: Add the missing exports to heroui**

In `packages/form/react/heroui/src/index.ts`, add `ArrayFieldProps`, `ArrayFieldScope`,
`ArrayItemScope` to the `export type { … } from '@ez-kit/form-react'` block (alphabetical, after
`AnyFormProps`), `defineFormItem` to the `export { … } from '@ez-kit/form-core'` block (after
`buildValidator`), and `ArrayNode` to the `export type { … } from '@ez-kit/form-core'` block (after
`AnyFormSchema`) — the same positions as in `packages/form/react/shadcn/src/index.ts`.

- [ ] **Step 5: Run it to see it pass**

Run: `pnpm build --filter=@ez-kit/form-heroui && pnpm --filter @ez-kit/docs exec vitest run test/kit-exports-parity.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Changeset**

`.changeset/form-heroui-parity.md`:

```md
---
'@ez-kit/form-heroui': minor
---

Export `ArrayFieldProps`, `ArrayFieldScope`, `ArrayItemScope`, `ArrayNode` and `defineFormItem`, which
`@ez-kit/form-shadcn` already exported. Both kits now export the same names, checked by a test.
```

- [ ] **Step 7: Commit**

```bash
git add apps/docs/test/kit-exports-parity.test.ts apps/docs/test/kit-exports-parity packages/form/react/heroui/src/index.ts .changeset/form-heroui-parity.md
git commit -m "test(form): check that both kits export the same names"
```

---

### Task 2: `OptionsSource` → `OptionSourceRef`, input and result types in core (D11)

**Files:**

- Modify: `packages/form/core/src/options-source.ts` (rename, add `OptionSourceInput`,
  `OptionSourceResult`)
- Modify: `packages/form/core/src/index.ts`, `packages/form/core/src/schema.ts`,
  `packages/form/core/src/parse.ts` and every other `OptionsSource` reference under
  `packages/form/core/src`
- Modify: `packages/form/react/react/src/options/source-types.ts` (drop the two moved types, import
  them from core)
- Modify: `packages/form/react/react/src/index.ts`, both kit `index.ts` files
- Modify: docs pages and examples naming `OptionsSource` (find with the grep in Step 5)
- Test: `packages/form/core/src/options-source.test.ts` (create)
- Create: `.changeset/form-option-source-ref.md`

**Interfaces:**

- Produces (from `@ez-kit/form-core`, re-exported by `@ez-kit/form-react` and both kits):
  `type OptionSourceRef = { source: string; dependsOn?: Record<string, FieldRef>; params?: Record<string, JsonValue> }`,
  `type OptionSourceInput = { params: Record<string, unknown>; query?: string }`,
  `type OptionSourceResult = { options: readonly LocalizedSelectOption<OptionValue>[]; loading: boolean }`.
- `OptionSource`, `SimpleOptionSource`, `SearchableOptionSource`, `OptionSourceRegistry` stay in
  `@ez-kit/form-react`.

- [ ] **Step 1: Write the failing type test**

`packages/form/core/src/options-source.test.ts`:

```ts
import { describe, expectTypeOf, it } from 'vitest'

import type { OptionSourceInput, OptionSourceRef, OptionSourceResult } from './index'

describe('option source types', () => {
	it('names the document reference OptionSourceRef', () => {
		expectTypeOf<OptionSourceRef>().toEqualTypeOf<{
			source: string
			dependsOn?: Record<string, string>
			params?: Record<string, import('./options-source').JsonValue>
		}>()
	})

	it('owns the framework-agnostic input and result shapes', () => {
		expectTypeOf<OptionSourceInput>().toHaveProperty('params')
		expectTypeOf<OptionSourceInput['query']>().toEqualTypeOf<string | undefined>()
		expectTypeOf<OptionSourceResult['loading']>().toEqualTypeOf<boolean>()
	})
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @ez-kit/form-core typecheck`
(`expectTypeOf` assertions are checked by `tsc`, which covers `src/**/*.test.ts`; vitest alone would pass them vacuously.)
Expected: FAIL — `OptionSourceRef`, `OptionSourceInput`, `OptionSourceResult` are not exported.

- [ ] **Step 3: Move and rename**

In `packages/form/core/src/options-source.ts`: rename `export type OptionsSource` to
`export type OptionSourceRef`, update the docblock's first line to "A document's reference to an
option source — what `optionsFrom` holds", and fix the `JsonValue` docblock (`an OptionSourceRef's
params`). Then move `OptionSourceInput` and `OptionSourceResult` verbatim, docblocks included, from
`packages/form/react/react/src/options/source-types.ts` to the end of this file, adding
`import type { LocalizedSelectOption, OptionValue } from './select-option'`. Rewrite the one
docblock line in `OptionSourceInput.query` that says "This package intends to take debouncing over
later" to "`@ez-kit/form-react` intends to take debouncing over later" (it now lives in core).

In `packages/form/core/src/index.ts` replace
`export type { JsonValue, OptionsSource } from './options-source'` with
`export type { JsonValue, OptionSourceInput, OptionSourceRef, OptionSourceResult } from './options-source'`.

Rename every remaining `OptionsSource` in `packages/form/core/src` (run
`grep -rn "OptionsSource\b" packages/form/core/src` and fix each hit).

In `packages/form/react/react/src/options/source-types.ts` delete the two moved types and add
`import type { OptionSourceInput, OptionSourceResult } from '@ez-kit/form-core'` plus
`export type { OptionSourceInput, OptionSourceResult }` so existing internal imports keep working.

In `packages/form/react/react/src/index.ts`: remove `OptionSourceInput` / `OptionSourceResult` from
the `./options/source-types` block, add them and `OptionSourceRef` to the `@ez-kit/form-core` type
block, and remove `OptionsSource` from it. Do the same swap in both kit `index.ts` files
(`OptionsSource` → `OptionSourceRef`).

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter @ez-kit/form-core typecheck && pnpm verify:affected`
Expected: PASS.

- [ ] **Step 5: Sweep the old name**

Run: `grep -rn "OptionsSource\b" apps packages --include='*.ts' --include='*.tsx' --include='*.md' --include='*.mdx' | grep -v node_modules | grep -v /dist/ | grep -v CHANGELOG`
Expected after fixing every hit: no output. Prose that describes the type without naming it ("the
reference a document writes") needs no change.

- [ ] **Step 6: Changeset and commit**

`.changeset/form-option-source-ref.md`:

```md
---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Rename `OptionsSource` to `OptionSourceRef` — it is the document's reference to a source, not the
source. `OptionSourceInput` and `OptionSourceResult` move to `@ez-kit/form-core` and are still
re-exported from `@ez-kit/form-react` and both kits.
```

```bash
git add -A packages/form apps/docs .changeset/form-option-source-ref.md
git commit -m "refactor(form)!: rename OptionsSource to OptionSourceRef"
```

---

### Task 3: `FormInstance` replaces four public instance types (D8)

**Files:**

- Create: `packages/form/react/react/src/form-instance.ts`
- Modify: `packages/form/react/react/src/index.ts`, both kit `index.ts` files
- Modify: `packages/form/react/react/src/schema/form-renderer.tsx` (controlled `form` prop typed as
  `FormInstance`)
- Modify: `apps/docs/test/docs-options/page-type-map.ts`, `apps/docs/test/docs-options/type-resolver.ts`
- Modify: docs pages / examples naming `KitFormApi`, `BoundForm`, `RendererForm`, `BoundFieldApi`
- Test: `packages/form/react/react/src/form-instance.test.tsx` (create)
- Create: `.changeset/form-instance-type.md`

**Interfaces:**

- Produces: `type FormInstance<TValues, TFields extends FormFieldRegistry = FormFieldSlots>` —
  `KitFormApi<TValues, Any × 10, Any>` where every validator slot and the submit meta are `any`.
  Stage 2 adds a third parameter `TComponents` with a default, which is additive.
- `KitFormApi`, `BoundForm`, `RendererForm`, `BoundFieldApi` stay as **internal** types (not
  exported from any `index.ts`).

- [ ] **Step 1: Write the failing type test**

`packages/form/react/react/src/form-instance.test.tsx`:

```tsx
import { describe, expectTypeOf, it } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields } from './test-kit'

import type { FormInstance } from './index'
import type { ReactNode } from 'react'

type Values = { email: string; age: number }
const DEFAULTS: Values = { email: '', age: 0 }

const { useForm } = createForm({ components: testComponents, fields: testFields })

/**
 * `FormInstance` is the one name an app writes for "a form of this shape" — a prop of a component
 * that receives one, say. TanStack's `FormApi` is invariant in its twelve validator parameters, so
 * an alias that defaults them to `undefined | FormValidateOrFn<…>` rejects every instance that has
 * validators. These tests are the reason the defaults are `any`.
 */
describe('FormInstance', () => {
	it('accepts an instance with no validators', () => {
		function Probe(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })
			expectTypeOf(form).toExtend<FormInstance<Values>>()
			return null
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('accepts an instance with sync and async validators', () => {
		function Probe(): ReactNode {
			const form = useForm({
				defaultValues: DEFAULTS,
				validators: {
					onChange: ({ value }) => (value.email === '' ? 'Required' : undefined),
					onSubmitAsync: async () => undefined,
				},
			})
			expectTypeOf(form).toExtend<FormInstance<Values>>()
			return null
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('keeps values and field names typed', () => {
		function Consumer({ form }: { form: FormInstance<Values> }): ReactNode {
			expectTypeOf(form.state.values).toEqualTypeOf<Values>()
			return (
				<>
					<form.TextField name='email' />
					{/* @ts-expect-error — not a path of Values */}
					<form.TextField name='nope' />
				</>
			)
		}
		expectTypeOf(Consumer).toBeFunction()
	})
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @ez-kit/form-react typecheck`
Expected: FAIL — `FormInstance` is not exported from `./index`.

- [ ] **Step 3: Write the type**

`packages/form/react/react/src/form-instance.ts`:

```ts
import type { FormFieldSlots } from './contract'
import type { FormFieldRegistry } from './field-registry'
import type { KitFormApi } from './kit-form'

/**
 * `any`, named once, for the twelve TanStack parameters `FormInstance` deliberately leaves open.
 *
 * TanStack's `FormApi` is invariant in its validator parameters — they appear in both argument and
 * return positions through `options.listeners` and `_handleSubmit` — so no non-`any` default is a
 * supertype of an instance that has validators: `undefined | FormValidateOrFn<T>` rejects
 * `useForm({ validators: { onChange } })`, and `unknown` for the submit meta rejects one whose meta
 * is `undefined`. TanStack's own `AnyFormApi` makes the same trade. Values and field names stay
 * typed, because they come from `TValues` and `TFields`, not from these.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Open = any

/**
 * The form instance `useForm` returns, as a name an app can write: a component that receives a
 * form of a known shape types its prop with this.
 *
 * Replaces `KitFormApi`, `BoundForm`, `RendererForm` and `BoundFieldApi` on the public surface. The
 * full twelve-parameter shape stays internal — `useForm` needs it to infer validators — and is
 * assignable to this one.
 */
export type FormInstance<TValues, TFields extends FormFieldRegistry = FormFieldSlots> = KitFormApi<
	TValues,
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
	TFields
>
```

- [ ] **Step 4: Swap the public surface**

In `packages/form/react/react/src/index.ts`: add `export type { FormInstance } from './form-instance'`;
delete `export type { BoundFieldApi } from './bindable-form'`; delete the
`export type { BoundForm, KitFormApi } from './kit-form'` line; remove `RendererForm` from the
`./schema/form-renderer` type block. In both kit `index.ts` files remove `BoundForm`, `KitFormApi`,
`RendererForm` from the `@ez-kit/form-react` type block and add `FormInstance` (alphabetical).

In `packages/form/react/react/src/schema/form-renderer.tsx`, keep `RendererForm` as the internal
type the implementation is written against (it is narrower and `FormInstance` is assignable to it)
but drop its `export` if nothing outside the file imports it — check with
`grep -rn "RendererForm" packages/form/react/react/src`.

- [ ] **Step 5: Update the docs option map**

In `apps/docs/test/docs-options/page-type-map.ts` replace the `KitFormApi` entry with
`FormInstance: { module: TypeModule.FormReact, name: 'FormInstance', typeArgs: FORM_INSTANCE_TYPE_ARGS }`
and rename the reference at the `roots: [FORM_TYPE.KitFormApi]` site. In
`apps/docs/test/docs-options/type-resolver.ts` add next to `FORM_API_TYPE_ARGS`:

```ts
/** Type-argument list for `FormInstance<TValues>`: the validator slots are already open. */
export const FORM_INSTANCE_TYPE_ARGS = `<${PROBE_ROW_TYPE_NAME}>`
```

and fix the `FORM_API_TYPE_ARGS` docblock so it no longer names `KitFormApi` (it still serves
`FormRendererUncontrolledProps`, renamed in Task 4).

- [ ] **Step 6: Sweep the old names in docs**

Run: `grep -rnE "\b(KitFormApi|BoundForm|RendererForm|BoundFieldApi)\b" apps packages/form/*/README.md packages/form/react/*/README.md --include='*.ts' --include='*.tsx' --include='*.md' --include='*.mdx' | grep -v node_modules | grep -v /dist/ | grep -v CHANGELOG`
Replace each docs/example use with `FormInstance<Values>` (dropping the twelve validator arguments a
call site wrote). Expected: no hits outside `packages/form/react/react/src` internals.

- [ ] **Step 7: Run the tests**

Run: `pnpm verify:affected` then
`pnpm build --filter=...@ez-kit/form-react && pnpm --filter @ez-kit/docs exec vitest run test/docs-option-names.test.ts test/kit-exports-parity.test.ts`
Expected: PASS. If `docs-option-names` reports a changed checked-name count for the page whose table
used `KitFormApi`, update that entry's expected count only after confirming the table's names all
resolve on `FormInstance`.

- [ ] **Step 8: Changeset and commit**

`.changeset/form-instance-type.md`:

```md
---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Add `FormInstance<TValues>`, the one public type for a form instance. `KitFormApi`, `BoundForm`,
`RendererForm` and `BoundFieldApi` are no longer exported: write `FormInstance<Values>` where you
wrote `KitFormApi<Values, …twelve parameters…>`.
```

```bash
git add -A packages/form apps/docs .changeset/form-instance-type.md
git commit -m "refactor(form)!: replace four public instance types with FormInstance"
```

---

### Task 4: `FormRenderer` → `SchemaForm` (D3)

**Files:**

- Rename: `packages/form/react/react/src/schema/form-renderer.tsx` → `schema/schema-form.tsx`,
  `schema/form-renderer.test.tsx` → `schema/schema-form.test.tsx`
- Modify: every file matched by the grep in Step 1 (≈260 hits in ≈67 files: `form-react` source and
  tests, both kits, `apps/docs/shared/form/FormKit.tsx`, docs examples, docs pages, e2e specs,
  `apps/docs/test/docs-options/*`)
- Create: `.changeset/form-schema-form.md`

**Interfaces:**

- Renames, exactly (public unless marked):
  `FormRenderer` → `SchemaForm`; `FormRendererControlledProps` → `SchemaFormControlledProps`;
  `FormRendererUncontrolledProps` → `SchemaFormUncontrolledProps`; `SharedRendererProps` →
  `SharedSchemaFormProps`; internal: `FormRendererUncontrolledImplProps` →
  `SchemaFormUncontrolledImplProps`, `AnyFormRendererProps` → `AnySchemaFormProps`,
  `UncontrolledFormRenderer` → `UncontrolledSchemaForm`, `isRendererControlled` →
  `isSchemaFormControlled`.
- `createForm` still returns the component in this stage (as `SchemaForm`); stage 2 moves it to
  `createSchemaForm`.

- [ ] **Step 1: Record the starting count**

Run: `grep -rnoE "FormRenderer[A-Za-z]*|SharedRendererProps|isRendererControlled|form-renderer" apps packages specs/009-form-composition --include='*.ts' --include='*.tsx' --include='*.md' --include='*.mdx' --include='*.json' | grep -v node_modules | grep -v /dist/ | grep -v CHANGELOG | wc -l`
Write the number down; Step 4 must bring the non-spec part to zero.

- [ ] **Step 2: Add a failing test for the new name**

In `packages/form/react/react/src/create-form.test.tsx` add:

```tsx
it('returns the config-driven form as SchemaForm', () => {
	const bundle = createForm({ components: testComponents, fields: testFields })

	expect(typeof bundle.SchemaForm).toBe('function')
	expect('FormRenderer' in bundle).toBe(false)
})
```

Run: `pnpm --filter @ez-kit/form-react exec vitest run src/create-form.test.tsx`
Expected: FAIL — `bundle.SchemaForm` is `undefined`.

- [ ] **Step 3: Rename mechanically**

```bash
git mv packages/form/react/react/src/schema/form-renderer.tsx packages/form/react/react/src/schema/schema-form.tsx
git mv packages/form/react/react/src/schema/form-renderer.test.tsx packages/form/react/react/src/schema/schema-form.test.tsx
FILES=$(grep -rlE "FormRenderer|SharedRendererProps|isRendererControlled|form-renderer" apps packages --include='*.ts' --include='*.tsx' --include='*.md' --include='*.mdx' --include='*.json' | grep -v node_modules | grep -v /dist/ | grep -v CHANGELOG)
perl -pi -e '
  s/\bFormRendererUncontrolledImplProps\b/SchemaFormUncontrolledImplProps/g;
  s/\bFormRendererControlledProps\b/SchemaFormControlledProps/g;
  s/\bFormRendererUncontrolledProps\b/SchemaFormUncontrolledProps/g;
  s/\bAnyFormRendererProps\b/AnySchemaFormProps/g;
  s/\bUncontrolledFormRenderer\b/UncontrolledSchemaForm/g;
  s/\bSharedRendererProps\b/SharedSchemaFormProps/g;
  s/\bisRendererControlled\b/isSchemaFormControlled/g;
  s/\bShadcnFormRenderer\b/ShadcnSchemaForm/g;
  s/\bKitFormRenderer\b/KitSchemaForm/g;
  s/\bFormRenderer\b/SchemaForm/g;
  s{schema/form-renderer\b}{schema/schema-form}g;
' $FILES
```

Do **not** touch `CHANGELOG.md` files or `specs/` other than 009 (history stays as written).

- [ ] **Step 4: Review what the regex cannot**

Run the Step 1 grep again. Expected: zero hits outside `specs/`. Then:

- Read every changed docblock in `schema/schema-form.tsx` and `create-form.tsx`; fix grammar the
  rename broke ("a `SchemaForm`" vs "an `SchemaForm`") and any sentence that says "renderer" where
  it now means the component. "The schema renderer" as a description of the module stays.
- In docs pages, check headings and prose that called it "the renderer component"; `schema.mdx` is
  the main one. Apply `AGENTS.md`'s second-sweep rule: grep for "renderer" in
  `apps/docs/content/docs/form` and read each hit.
- `apps/docs/shared/form/examples/manifest.json`: if any example **id** contained `form-renderer`,
  keep the id (it is a URL) and note it in the commit body; rename only export names.
- Run `pnpm format` on the changed files.

- [ ] **Step 5: Run the tests**

Run: `pnpm verify:affected`, then
`pnpm build --filter=...@ez-kit/form-react && pnpm --filter @ez-kit/docs exec vitest run test/docs-option-names.test.ts test/kit-exports-parity.test.ts test/e2e-slots.test.ts`
Expected: PASS, including the new test from Step 2.

- [ ] **Step 6: Changeset and commit**

`.changeset/form-schema-form.md`:

```md
---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Rename `FormRenderer` to `SchemaForm`, and its prop types to `SchemaFormControlledProps`,
`SchemaFormUncontrolledProps` and `SharedSchemaFormProps`. It is a form whose children come from a
schema document; the name now pairs with `Form` and with `defineFormSchema`. Behaviour is unchanged.
```

```bash
git add -A packages/form apps/docs .changeset/form-schema-form.md
git commit -m "refactor(form)!: rename FormRenderer to SchemaForm"
```

---

### Task 5: One TanStack copy — the package graph (D9)

**Files:**

- Modify: `packages/form/core/package.json` (`@tanstack/form-core`: dependency → peer + dev)
- Modify: `packages/form/react/react/package.json` (TanStack: peer → dependency; `size-limit` ignores)
- Modify: `packages/form/react/shadcn/package.json`, `packages/form/react/heroui/package.json` (drop
  TanStack peers and devDeps, drop `@ez-kit/form-core`; `size-limit` ignores)
- Modify: `packages/form/react/react/src/index.ts` (re-export the schema-authoring surface,
  `OptionValue`, `FormSchema`, `useStore`)
- Modify: both kit `src/index.ts` (import everything from `@ez-kit/form-react`), both kit
  `tsup.config.ts` comments, both kit `blocks/layout.tsx` comments
- Modify: the six kit test files importing `@ez-kit/form-core` (listed in Step 4)
- Modify: `apps/docs/content/docs/form/installation/shadcn.mdx`, `installation/heroui.mdx`,
  `getting-started.mdx`, `reactivity.mdx`
- Test: `apps/docs/test/form-package-graph.test.ts` (create)
- Create: `.changeset/form-one-tanstack-copy.md`

**Interfaces:**

- Consumes: `kitExports` from Task 1.
- Produces: `@ez-kit/form-react` re-exports, from `@ez-kit/form-core`: `buildValidator`,
  `defineFormItem`, `defineFormSchema`, `FormSchemaError`, `isFieldNode`, `parseFormSchema`,
  `RESERVED_NODE_TYPES`, `resolveText`, `visibleFieldNames`, `walkNodes` and types `AnyFormSchema`,
  `ArrayNode`, `BlockNode`, `Condition`, `CustomFieldNode`, `FieldNode`, `FieldRef`, `FieldValidate`,
  `FormNode`, `FormSchema`, `NamedRule`, `OptionValue`, `ParseOptions`, `Rule`, `RuleIssue`,
  `SectionNode`, `StepNode`, `SubmitNode`; from `@tanstack/react-form`: `useStore`.

- [ ] **Step 1: Write the failing graph test**

`apps/docs/test/form-package-graph.test.ts`:

```ts
// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { kitExports } from './kit-exports-parity/exports-of'

/**
 * Spec 009, D9: exactly one package depends on TanStack Form, so an app gets one copy.
 *
 * The kits used to list TanStack as a peer beside `@ez-kit/form-react`, which had it as a peer
 * too, so the version an app installed was whatever its own manifest said — and an app that also
 * imported TanStack directly could resolve two. Now `@ez-kit/form-react` owns the version, the kits
 * import nothing from TanStack or from `@ez-kit/form-core`, and everything they need arrives
 * through `@ez-kit/form-react`.
 */
const REPO_ROOT = resolve(__dirname, '../../..')
const FORM = resolve(REPO_ROOT, 'packages/form')
const KIT_DIRS = ['react/shadcn', 'react/heroui'] as const
const TANSTACK = ['@tanstack/react-form', '@tanstack/form-core'] as const

type Manifest = Partial<Record<'dependencies' | 'peerDependencies' | 'devDependencies', Record<string, string>>>

const manifest = (dir: string): Manifest =>
	JSON.parse(readFileSync(join(FORM, dir, 'package.json'), 'utf8')) as Manifest

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true, recursive: true })
		.filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
		.map((entry) => join(entry.parentPath, entry.name))
}

describe('form package graph', () => {
	it('makes @ez-kit/form-react the only package that depends on TanStack', () => {
		const react = manifest('react/react')
		for (const name of TANSTACK) {
			expect(react.dependencies?.[name], name).toBeDefined()
			expect(react.peerDependencies?.[name], name).toBeUndefined()
		}
		expect(manifest('core').peerDependencies?.['@tanstack/form-core']).toBeDefined()
		expect(manifest('core').dependencies?.['@tanstack/form-core']).toBeUndefined()
	})

	it.each(KIT_DIRS)('keeps TanStack and form-core out of %s', (dir) => {
		const kit = manifest(dir)
		for (const section of ['dependencies', 'peerDependencies', 'devDependencies'] as const) {
			for (const name of [...TANSTACK, '@ez-kit/form-core']) {
				expect(kit[section]?.[name], `${section}.${name}`).toBeUndefined()
			}
		}
	})

	it.each(KIT_DIRS)('imports neither from any source file in %s', (dir) => {
		const offenders = sourceFiles(join(FORM, dir, 'src')).filter((file) =>
			/from '(@tanstack\/|@ez-kit\/form-core)/.test(readFileSync(file, 'utf8')),
		)
		expect(offenders).toEqual([])
	})

	it('re-exports useStore from the kits, so an app never installs TanStack itself', () => {
		expect(kitExports('@ez-kit/form-shadcn').values).toContain('useStore')
		expect(kitExports('@ez-kit/form-heroui').values).toContain('useStore')
	})
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @ez-kit/docs exec vitest run test/form-package-graph.test.ts`
Expected: FAIL on every case.

- [ ] **Step 3: Edit the manifests**

`packages/form/core/package.json`: move `"@tanstack/form-core": "^1.33.2"` from `dependencies` to
`peerDependencies`, and add the same line to `devDependencies` (create the section if missing).
Delete the now-empty `dependencies` key.

`packages/form/react/react/package.json`: move `@tanstack/form-core` and `@tanstack/react-form`
(`^1.33.2`) from `peerDependencies` to `dependencies`; delete both from `devDependencies`. Add both
names to the `ignore` list of **both** `size-limit` entries (they are now runtime dependencies, and
the repo rule is that a budget ignores the package's own dependencies).

Both kit `package.json`: delete `@tanstack/form-core` and `@tanstack/react-form` from
`peerDependencies` and `devDependencies`, delete `@ez-kit/form-core` from `dependencies`, delete
`"@ez-kit/form-core"` from the `size-limit` `ignore` list.

Run: `pnpm install` (plain, never `pnpm up -r`). Expected: lockfile changes limited to these
packages' importers.

- [ ] **Step 4: Route the kits through form-react**

In `packages/form/react/react/src/index.ts`, after the existing `@ez-kit/form-core` re-export blocks,
add:

```ts
// The schema-authoring half of the surface, so a kit depends on `@ez-kit/form-react` alone (spec
// 009, D9). Under pnpm's strict layout a transitive dependency is not importable, so every name the
// docs tell a reader to import from their kit has to be re-exported on this path.
export {
	buildValidator,
	defineFormItem,
	defineFormSchema,
	FormSchemaError,
	isFieldNode,
	parseFormSchema,
	RESERVED_NODE_TYPES,
	resolveText,
	visibleFieldNames,
	walkNodes,
} from '@ez-kit/form-core'
export type {
	AnyFormSchema,
	ArrayNode,
	BlockNode,
	Condition,
	CustomFieldNode,
	FieldNode,
	FieldRef,
	FieldValidate,
	FormNode,
	FormSchema,
	NamedRule,
	OptionValue,
	ParseOptions,
	Rule,
	RuleIssue,
	SectionNode,
	StepNode,
	SubmitNode,
} from '@ez-kit/form-core'
```

and extend the TanStack re-export line to
`export { useFieldGroup, useFormGroup, useStore } from '@tanstack/react-form'`, with the comment
above it updated: `useStore` is re-exported so an app that reads the store outside a component
never installs TanStack itself — a second copy would be a second store.

In both kit `src/index.ts`: change the two `from '@ez-kit/form-core'` blocks to
`from '@ez-kit/form-react'` (merging them into the existing form-react blocks is fine), add
`useStore` and `RuleIssue`, `OptionValue` alongside, and rewrite the comment above the
schema-authoring block: it now arrives through `@ez-kit/form-react`, not a direct dependency.

Fix the kit test imports — each of these changes `'@ez-kit/form-core'` to `'@ez-kit/form-react'`
and nothing else:
`packages/form/react/{shadcn,heroui}/src/searchable-multiselect.test.tsx`,
`packages/form/react/{shadcn,heroui}/src/searchable-select.test.tsx`,
`packages/form/react/{shadcn,heroui}/src/remaining-fields.test.tsx`.

In both kits' `tsup.config.ts` and `blocks/layout.tsx`, update the comments that say the helpers
come from `@ez-kit/form-core` "re-exported through" the kit: they originate in `@ez-kit/form-core`
and reach the kit through `@ez-kit/form-react`; a server component imports them from
`@ez-kit/form-core`, which the app then installs itself.

- [ ] **Step 5: Update the docs**

- `installation/shadcn.mdx` and `installation/heroui.mdx`: delete the paragraph that starts
  "`@tanstack/react-form` and `@tanstack/form-core` (v1) are peer dependencies too" and replace it
  with one sentence: TanStack Form comes with the kit — `@ez-kit/form-react` depends on it and picks
  the version, so there is one copy in your tree; don't add it to your own `package.json`.
- `getting-started.mdx` line 28: drop "peer dependencies" from the list unless it still refers to
  HeroUI's own peers (line 14 does — keep that one).
- `reactivity.mdx` lines ~56–70: `useStore` is now re-exported by the kits. Replace the "✗ does not
  resolve" block and the TanStack import with `import { useStore } from '@ez-kit/form-shadcn'`, and
  rewrite the sentence "the kits re-export neither, so … does not compile" to say the kit
  re-exports it so the store you read is the one the form uses. Keep the advice to prefer
  `form.Subscribe`.
- `composition.mdx` line 96 stays true; reread it.

- [ ] **Step 6: Run the tests**

Run: `pnpm build --filter=...@ez-kit/form-core && pnpm --filter @ez-kit/docs exec vitest run test/form-package-graph.test.ts test/kit-exports-parity.test.ts test/tree-shaking.test.ts test/docs-option-names.test.ts` then `pnpm verify:affected` and `pnpm size`.
Expected: PASS. If a `size-limit` entry now fails, the cause is a missing `ignore` entry, not real
growth — no source changed size in this task.

- [ ] **Step 7: Changeset and commit**

`.changeset/form-one-tanstack-copy.md`:

```md
---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

TanStack Form is now a dependency of `@ez-kit/form-react` rather than a peer of every form package,
so an app gets exactly one copy and no longer installs `@tanstack/react-form` or
`@tanstack/form-core` itself — remove them from your `package.json` unless you use TanStack
elsewhere. The kits depend on `@ez-kit/form-react` alone; the schema-authoring API and `useStore`
are re-exported from it and from each kit.
```

```bash
git add -A packages/form apps/docs pnpm-lock.yaml .changeset/form-one-tanstack-copy.md
git commit -m "build(form)!: make form-react the only package that depends on TanStack"
```

---

### Task 6: Stage gate

**Files:** none new.

- [ ] **Step 1: Full gate, sequentially**

```bash
pnpm build && pnpm lint && pnpm typecheck && pnpm test && pnpm size
```

Expected: all green. A timeout-only failure in one test that passes when its package runs alone is
the machine-load artefact `AGENTS.md` describes — rerun that package, don't change the test.

- [ ] **Step 2: Spec §7 cross-check**

Confirm each row this stage owns is done, by grep returning nothing outside `specs/` and
`CHANGELOG.md`:

```bash
grep -rnE "\bFormRenderer|\bKitFormApi\b|\bBoundForm\b|\bRendererForm\b|\bBoundFieldApi\b|\bOptionsSource\b" apps packages --include='*.ts' --include='*.tsx' --include='*.md' --include='*.mdx' | grep -v node_modules | grep -v /dist/ | grep -v CHANGELOG
```

Expected: only internal hits in `packages/form/react/react/src` (`KitFormApi`, `BoundForm`,
`RendererForm`, `BoundFieldApi` remain as internal names).

- [ ] **Step 3: Hand over for review**

Report to the user: commits of the stage, the gate output, and anything the plan got wrong. Do not
start stage 2.
