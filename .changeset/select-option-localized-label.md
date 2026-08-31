---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

form: a select/radiogroup option label is `LocalizedText`

**Breaking (schema authoring).** A `select` / `radiogroup` node's `options` now carry
`label: LocalizedText` — the new `LocalizedSelectOption` type — so a document delivered by a
backend can name a translation key instead of shipping finished copy in one language, which
every other label in the format could already do. A plain string is still a `LocalizedText`,
so existing schemas keep compiling; only code that typed its option list as `SelectOption`
needs to switch to `LocalizedSelectOption`.

`SelectOption` itself is unchanged (`label: string`): the kit contract and the JSX API stay a
resolved-strings surface, and `FormRenderer` bridges the two through the new
`resolveSelectOptions(options, translate)`.

`parseFormSchema` now also validates `options` — a `select` / `radiogroup` with no options
array, an option missing `value` or `label`, or a label that is neither a string nor a
`{ key }` object is a `FormSchemaError` instead of a silently empty dropdown.
