---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Invert the form UI-kit contract: a kit now owns each field's entire element tree.

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
