# Form-kit packages for TanStack Form (`@ez-kit/form-*`)

**Date:** 2026-07-19
**Status:** Approved (design) — pending implementation plan

## Goal

Build a set of packages mirroring the `data-grid` architecture, but for
[TanStack Form](https://tanstack.com/form). A headless-ish base, a React DI
adapter with **zero visual styling**, and two UI-kit flavours (`shadcn`,
`heroui`) that inject their own styled inputs.

The consumer-facing value is a **superset of `useForm`**: the form instance
exposes flat, fully-wired field components (`form.TextField`, `form.NumberField`,
…) that render label + input + error internally, while the entire native
TanStack Form API (`form.Field`, `form.Subscribe`, `form.handleSubmit`,
`form.state`, …) stays fully available.

This is **variant B (composable)** — the consumer writes JSX and picks the
fields. It is explicitly **not** a schema/config-driven auto-form (variant A),
which is deferred.

## Decisions (locked)

- **Approach:** variant B (composable DI inputs), not auto-form.
- **API shape:** an extended `useForm` — fields hang on the form instance
  (`form.TextField name=…`), not behind a separate context wrapper.
- **Field component ownership:** each field is a **full field** — it renders
  label + input + error text internally and adds `data-*` attributes.
- **Packages:** 4, in parity with `data-grid` — `form-core`, `form-react`,
  `form-shadcn`, `form-heroui`.
- **v1 field set:** 5 base fields — `TextField`, `NumberField`, `TextareaField`,
  `SelectField`, `CheckboxField` — with an **extensible contract** designed for
  future field types.
- **Form-level helpers:** `form.SubmitButton` (subscribed to
  `canSubmit`/`isSubmitting`, kit-styled button) and `form.Form` (a `<form>`
  element that auto-wires `onSubmit` → `form.handleSubmit`).
- **Validation:** pass-through of native TanStack Form standard-schema
  validators (zod / valibot / arktype) via `validators.onChange/onBlur/onSubmit`.
  No custom resolver.
- **Extensibility (`extendForm`):** shipped in v1 as the project-level escape
  hatch (see below). Tracked separately in a GitHub issue for its own
  worktree/branch.

## Scope

**In scope (v1):**

- 4 packages with tsup ESM + `.d.ts`, size-limit budgets, publish-ready exports.
- 5 base field components + `SubmitButton` + `Form` on the form instance.
- `createForm({ components })` factory + `FormComponents` contract in
  `form-react`.
- shadcn + heroui implementations of the contract.
- Unit tests (Vitest + jsdom + RTL) + per-kit smoke tests.

**Out of scope (v1, deferred):**

- Auto-form (variant A — schema/config-driven full-form rendering).
- Extended fields: `SwitchField`, `RadioGroupField`, `DatePickerField`,
  `ComboboxField`/`MultiSelectField`. These land later as **first-class built-in
  fields inside the kits**, added to the contract.
- Docs app integration (examples, live preview) — separate phase.
- `native` UI kit.
- `extendForm` **implementation** — designed here, built in its own
  issue/branch.

## Architecture

### Packages

| Package               | Role                                                                                                                                                                                 | Depends on                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `@ez-kit/form-core`   | Framework-agnostic: field-config types (`SelectOption`, field metadata), field-type keys, thin validation/error-format utilities, curated re-exports of `@tanstack/form-core` types. | `@tanstack/form-core`                       |
| `@ez-kit/form-react`  | React adapter, **zero styling**: `FormComponents` contract, `createForm({ components })` factory, flat wrapper field components, `extendForm`. Only adds `data-*` attributes.        | `@tanstack/react-form`, `@ez-kit/form-core` |
| `@ez-kit/form-shadcn` | Implements `FormComponents` with shadcn inputs, calls `createForm`, re-exports the bound `useForm` + curated surface.                                                                | `@ez-kit/form-react` + shadcn               |
| `@ez-kit/form-heroui` | Same on HeroUI v3 (React Aria, oklch tokens via the heroui MCP).                                                                                                                     | `@ez-kit/form-react` + heroui               |

`form-core` is admittedly thinner than `data-grid-core` (there, core holds the
whole table engine; here the engine lives in TanStack Form). The
framework-agnostic types + validation utilities + room for future logic justify
keeping it, and it preserves parity with `data-grid`.

### DI mechanism (the `createDataGrid` analogue)

TanStack Form ships `createFormHook({ fieldComponents, formComponents, fieldContext, formContext })`,
which **binds components at hook-creation time via closure** (not a runtime
provider). Therefore:

- `createForm({ components })` calls `createFormHook`, passing the kit's inputs
  as `fieldComponents`/`formComponents`.
- Each kit (`shadcn`, `heroui`) calls `createForm` with **its own** components →
  gets its own `useForm` — exactly as each kit calls `createDataGrid({ components })`.
- No runtime provider is required — the closure holds the components. This is
  simpler than `data-grid`'s `GridComponentsProvider`.

### `FormComponents` contract (zero styling; styling lives in the kit)

Injected primitives the kit must supply:

- **Field chrome:** `FieldRoot`, `Label`, `ErrorText`, `Description`.
- **Inputs:** `TextInput`, `NumberInput`, `Textarea`, `Select`, `Checkbox`.
- **Form-level:** `Button` (for `SubmitButton`), `Form` (the `<form>` element).

Each has a well-defined, framework-shared props interface (value, onChange,
onBlur, name/id, disabled, invalid, options? for Select, …) so that shadcn and
heroui implement the same interface and examples work for both kits.

### Public API — an extended `useForm`

```tsx
import { useForm } from '@ez-kit/form-shadcn'

const form = useForm({
  defaultValues: { email: '', age: 0, role: 'user', agree: false },
  validators: { onChange: zodSchema }, // native standard-schema
  onSubmit: ({ value }) => save(value),
})

<form.Form>                                     {/* <form> + auto onSubmit → handleSubmit */}
  <form.TextField     name="email" label="Email" placeholder="you@..." />
  <form.NumberField   name="age"   label="Age" />
  <form.SelectField   name="role"  label="Role" options={[{ label: 'User', value: 'user' }]} />
  <form.CheckboxField name="agree" label="I agree" />
  <form.SubmitButton>Save</form.SubmitButton>

  {/* Native TanStack API is untouched: */}
  <form.Field name="custom">{(field) => /* … */}</form.Field>
  <form.Subscribe selector={(s) => s.errors}>{(errors) => /* … */}</form.Subscribe>
</form.Form>
```

**Field naming:** `*Field` suffix for uniformity (`TextField`, `NumberField`,
`TextareaField`, `SelectField`, `CheckboxField`). Adjustable.

### Field wrapper internals

Each flat field composes `form.AppField` + injected chrome + injected input:

```tsx
// bound inside createForm({ components }), closing over `components`
function TextField({ name, label, description, ...inputProps }) {
	return (
		<form.AppField name={name}>
			{(field) => (
				<components.FieldRoot
					data-field={name}
					data-invalid={field.state.meta.errors.length > 0}
				>
					{label && <components.Label htmlFor={field.name}>{label}</components.Label>}
					{description && <components.Description>{description}</components.Description>}
					<components.TextInput
						id={field.name}
						name={field.name}
						value={field.state.value}
						onChange={(v) => field.handleChange(v)}
						onBlur={field.handleBlur}
						aria-invalid={field.state.meta.errors.length > 0}
						{...inputProps}
					/>
					<components.ErrorText errors={field.state.meta.errors} />
				</components.FieldRoot>
			)}
		</form.AppField>
	)
}
```

Errors come from `field.state.meta.errors` (standard-schema issues) and render
through the kit's `ErrorText`. The `form.SubmitButton` uses `form.Subscribe` on
`canSubmit`/`isSubmitting` and renders the injected `Button`.

### Extensibility — `extendForm` (project escape hatch)

`extendForm({ colorPicker: ProjectColorPickerField })` — the direct analogue of
`extendDataGrid({ rating: … })`. Exported from the **kit** packages
(`@ez-kit/form-shadcn` / `@ez-kit/form-heroui`) so a project can register its own
field type without waiting for us:

```tsx
import { extendForm } from '@ez-kit/form-shadcn'

const { useForm } = extendForm({ colorPicker: ProjectColorPickerField })

const form = useForm({ defaultValues: { brand: '#000' } })
<form.ColorPickerField name="brand" label="Brand color" /> // type-safe
```

Two distinct axes, not to be conflated:

- **Add a new field type** (a new component like `ColorPicker`) → `extendForm`.
- **Restyle an existing primitive** (e.g. your own `TextInput` look) → edit the
  kit's components, not `extendForm`.

Our own future fields (`Switch`, `DatePicker`, …) ship as **built-in** contract
additions inside the kits, not via `extendForm`.

> `extendForm` is designed here but implemented in a dedicated GitHub issue /
> worktree / branch.

## Validation

Pure pass-through of native TanStack Form validators (standard-schema:
zod / valibot / arktype) via `validators.onChange/onBlur/onSubmit`. No custom
resolver. `form-core` may expose small error-formatting utilities consumed by
the kits' `ErrorText`.

## Testing

- **Vitest + jsdom + React Testing Library.**
- Field binding: `value` / `onChange` / `onBlur` round-trip through TanStack
  Form state.
- Error rendering: validation issues surface through the injected `ErrorText`.
- Submit: `form.Form` wires `onSubmit` → `handleSubmit`; `SubmitButton`
  reflects `canSubmit`/`isSubmitting`.
- Native API remains accessible (`form.Field`, `form.Subscribe`).
- DI injection: `createForm` binds the passed components; per-kit smoke tests
  assert the kit's inputs render.

## Build & publish

- Scaffold via `pnpm pkg:new` (turbo gen).
- tsup → ESM + `.d.ts` into `dist/`; `"sideEffects": false`.
- size-limit budget per package.
- `exports` → `./dist`; per-package `LICENSE` + `README`.
- Peer deps: `react`, `@tanstack/react-form`; kit libraries (shadcn deps /
  `@heroui/react`) as optional peers.
- Build deps first (turbo `^build`) so kits compile against fresh `form-react`.

## Package layout (proposed)

```
packages/
  form/
    core/               # @ez-kit/form-core
    react/
      react/            # @ez-kit/form-react   (DI, contract, wrappers)
      shadcn/           # @ez-kit/form-shadcn
      heroui/           # @ez-kit/form-heroui
```

Mirrors `packages/data-grid/*`. shadcn keeps the vendored-`components/ui`
immutable rule (overrides live in `blocks/`).

## Open questions / follow-ups (non-blocking)

- Whether `form-react` needs a structural `styles.css` at all (forms need almost
  no positioning CSS, unlike the grid). Default: **no `styles.css` in v1**; kits
  own all layout. Revisit if a shared structural need appears.
- Docs app integration: reuse the `data-grid` runtime UI-switcher pattern so one
  example renders for both kits. Separate phase.
- Extended field set (Switch/RadioGroup/DatePicker/Combobox) — separate issue.

```

```
