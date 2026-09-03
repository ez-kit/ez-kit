# @ez-kit/form-core

Framework-agnostic core for the `@ez-kit/form-*` packages, built on
[TanStack Form](https://tanstack.com/form).

It holds what neither React nor a specific UI kit owns: the closed set of built-in
field kinds, the shared `SelectOption` shape, the normalisation of raw validator errors
into display strings — and the whole **`FormSchema`** format, the plain-data description
of a form that `<FormRenderer>` walks.

## Install

```bash
pnpm add @ez-kit/form-core
```

Most consumers do not install this directly — they use a UI-kit package
(`@ez-kit/form-shadcn`, `@ez-kit/form-heroui`), which depends on it transitively.

## Field kinds and error normalisation

```ts
import { FormFieldType, TextInputType, formatFieldErrors, hasFieldErrors } from '@ez-kit/form-core'
import type { LocalizedSelectOption, SelectOption } from '@ez-kit/form-core'
```

- **`FormFieldType`** / **`FORM_FIELD_TYPES`** — the built-in field kinds: `text`,
  `number`, `textarea`, `select`, `checkbox`, `switch`, `radiogroup`, `slider`.
- **`TextInputType`** — the `inputType` a text field may ask for (`email`, `tel`, …).
- **`SelectOption<TValue>`** — `{ label, value, disabled? }` with `label` already resolved
  to a string, the option shape every select-like field consumes.
- **`LocalizedSelectOption<TValue>`** — the same shape with `label: LocalizedText`, which is
  what a `select` / `radiogroup` **node in a schema** carries, so a delivered document can
  name a translation key. `resolveSelectOptions(options, translate)` turns one into the
  other; `FormRenderer` calls it for you.
- **`formatFieldErrors(errors)`** — normalises `field.state.meta.errors` (standard-schema
  issues, `Error` instances, plain strings) into `string[]`, dropping empty slots.
- **`hasFieldErrors(errors)`** — the `invalid` / `aria-invalid` predicate.

For the hand-written JSX API, validation is pure pass-through of TanStack Form's native
standard-schema validators (zod / valibot / arktype). There is no custom resolver.

## The `FormSchema` format

A `FormSchema` is `{ version: 1, children: FormNode[] }` — a form written as data. It is
JSON, with no functions anywhere, so the same document can be authored in TypeScript,
stored in a database, or delivered by a backend. `<FormRenderer>` (from a kit package)
renders it through the same bound field components the JSX API uses.

The full guide lives at [ez-kit-docs.vercel.app/docs/form/schema](https://ez-kit-docs.vercel.app/docs/form/schema).

### Authoring

```ts
import { defineFormSchema, FormFieldType } from '@ez-kit/form-core'

const schema = defineFormSchema<Values>()({
	version: 1,
	children: [
		{ type: FormFieldType.Text, name: 'email', label: 'Email', validate: { required: true, format: 'email' } },
		{ type: 'submit', label: 'Save' },
	],
})
```

- **`defineFormSchema<TValues, TCustom>()(schema)`** — curried, because TypeScript has no
  partial generic inference: `TValues` is given explicitly while the literal is still
  inferred, which is what makes `name` checkable per field kind. `TCustom` is the closed
  set of custom field-type keys the document may use.
- Types: **`FormSchema`**, **`AnyFormSchema`**, **`FormNode`**, **`FieldNode`**,
  **`SectionNode`**, **`StepNode`**, **`SubmitNode`**, **`BlockNode`**,
  **`CustomFieldNode`**.
- **`GRID_MIN`** / **`GRID_MAX`** / **`clampToGridRange(n)`** — the `1..4` range a
  section's `columns` and a node's `colSpan` share.
- **`RESERVED_NODE_TYPES`** — `section`, `step`, `submit`, `block`; never usable as a
  registry key.

### Parsing an untrusted document

```ts
import { FormSchemaError, parseFormSchema } from '@ez-kit/form-core'

const schema = parseFormSchema<Values>(await res.json(), {
	fieldTypes: Object.keys(fields),
	blocks: Object.keys(blocks),
	rules: Object.keys(rules),
	hasTranslate: true,
})
```

**`parseFormSchema(input, options?)`** is the trust boundary for a document that did not
come from your own bundle. It throws **`FormSchemaError`** (carrying `path`, the offending
node's location) on the first violation — unknown node type, duplicate field name,
unregistered rule or block, malformed condition, a `columns`/`colSpan` outside `1..4`,
`step` mixed with non-`step` siblings, a translation key with no `translate` available.
Passing the registries' keys via **`ParseOptions`** is what lets it check the document
against _this_ app's capabilities. Nothing calls it for you.

### Conditions

```ts
import { compileCondition } from '@ez-kit/form-core'
```

- **`Rule`** — the closed operator set: `{ field, eq }`, `{ field, in }`, `{ field, gt }`,
  `{ field, lt }`, `{ field, truthy: true }`, `{ and }`, `{ or }`, `{ not }`. There is no
  JavaScript in the document and no `eval`.
- **`Condition<TValues>`** — a `Rule`, or (TypeScript-authored schemas only) a plain
  `(values) => boolean`. `parseFormSchema` rejects the function form.
- **`compileCondition(condition)`** — turns either into a predicate. A `./`-prefixed field
  reference is reserved for array items and throws in v1.
- **`collectRuleFields(condition)`** / **`getValueAtPath(values, path)`** — the two helpers the
  renderer subscribes and reads with.

### Validation from the schema

```ts
import { buildValidator } from '@ez-kit/form-core'
```

**`buildValidator(schema, { rules, translate })`** walks the tree once and returns a single
standard-schema validator for the whole form — no zod, no extra runtime dependency — ready
for `validators.onChange` / `validators.onSubmit`. **`FieldValidate`** is the per-field
constraint block (`required`, `min`/`max`, `minLength`/`maxLength`, `format`, `rule`,
`messages`); constraints run in that order and stop at the first failure. There is
deliberately no `pattern`: a regex from an untrusted document is a ReDoS hazard.
**`NamedRule`** is the `(value, values) => true | string` implementation a `validate.rule`
key resolves to; an unregistered key throws when the validator is built.

### Visibility

```ts
import { stripHiddenValues, visibleFieldNames } from '@ez-kit/form-core'
```

- **`visibleFieldNames(schema, values)`** — the names whose `when` conditions currently
  hold, all the way up the tree.
- **`stripHiddenValues(schema, values)`** — the submitted payload with hidden fields
  removed. An uncontrolled `<FormRenderer>` applies this for you unless you pass
  `keepHiddenValues`; a controlled caller owns `onSubmit` and calls it themselves. v1
  strips top-level keys only.

### Traversal and text

- **`walkNodes(schema, visitor)`** / **`isFieldNode(node)`** — depth-first traversal, with
  the ancestor chain.
- **`LocalizedText`** — a finished string, or `{ key, params }`. **`Translate`** is
  `(key, params) => string`. **`resolveText(text, translate)`** resolves one.

## License

MIT
