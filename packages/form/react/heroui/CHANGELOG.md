# @ez-kit/form-heroui

## 0.2.0

### Minor Changes

- 77390a1: Invert the form UI-kit contract: a kit now owns each field's entire element tree.

  `@ez-kit/form-react` no longer renders any DOM. Instead of asking a kit for chrome
  primitives (`FieldRoot`, `Label`, `Description`, `ErrorText`) and assembling them itself in
  one fixed order as siblings of the input, it hands the kit one flat props object per field
  (`TextField`, `NumberField`, `TextareaField`, `SelectField`, `CheckboxField`) carrying
  identity, `label`, `description`, `errors`, `invalid`, `value`/`onChange` and `onBlur`.

  This fixes HeroUI, where a field is a React Aria **context**: `Label`, `Description` and
  `FieldError` must be children of `<TextField>` to receive ids, `aria-describedby` and
  validation state. The HeroUI kit now renders HeroUI's documented anatomy — including its
  real `FieldError` instead of a hand-rolled stand-in — and drops the CSS `order` hacks that
  were reordering the checkbox layout. The shadcn kit keeps its sibling layout behind its own
  internal `FieldShell`.

  The consumer API is unchanged: `form.TextField` and friends work exactly as before. Only
  custom kits need updating.

- 8b845e0: Add the `@ez-kit/form-*` packages: TanStack Form with dependency-injected UI kits.

  `createForm({ components })` returns a `useForm` that is a superset of TanStack Form's —
  the instance carries flat, fully-wired field components (`form.TextField`,
  `form.NumberField`, `form.TextareaField`, `form.SelectField`, `form.CheckboxField`) plus
  `form.SubmitButton` and `form.Form`, while the entire native API (`form.Field`,
  `form.Subscribe`, `form.handleSubmit`, `form.state`, `form.AppField`) stays available on
  the same object. Each field renders its own label, description, input and error text, and
  `name` is narrowed to the paths whose value type fits the field.
  - `@ez-kit/form-core` — field kinds, `SelectOption`, validator-error normalisation.
  - `@ez-kit/form-react` — the DI contract and field layer, with zero visual styling.
  - `@ez-kit/form-shadcn` / `@ez-kit/form-heroui` — the two UI-kit implementations.

  Validation is pure pass-through of TanStack Form's native standard-schema validators
  (zod / valibot / arktype); there is no custom resolver.

- 03073ed: Lay a checkbox field out as `[control] Label` on one row.

  The shared field frame renders chrome in one fixed order — label, description, input, error — which is right for every field except a checkbox, where it left the control stranded under its own label. Both kits now reorder that case themselves, with description and error keeping a full row beneath.

  `FieldRootProps` declares the `data-field`, `data-field-type` and `data-invalid` attributes it receives, so a kit can branch on the field kind instead of only matching it from CSS.

### Patch Changes

- Updated dependencies [77390a1]
- Updated dependencies [8b845e0]
- Updated dependencies [03073ed]
  - @ez-kit/form-react@0.2.0
