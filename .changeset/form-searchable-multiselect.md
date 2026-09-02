---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

`searchable` on a `multiselect`: the same combo box, with chips that carry resolved labels.

`searchable` shipped on `select` only, and `parseFormSchema` rejected it on `multiselect` with
"not supported in this version". It is supported now: the parser accepts the flag there, the
JSX prop exists on `MultiSelectFieldProps`, and both kits render a multi-value combo box.

**The source contract did not change**, and does not need to. `useSelectedOptions` already took
its `values` as an array; a `multiselect` simply sends its whole selection where a `select`
sends a one-element one. A source written for a searchable select serves a searchable
multiselect unchanged — the same registry entry can serve both fields in one form.

Resolving those values is the entire point. With a server-side search the current selection is
normally absent from the current page of results, so without the second hook every chip would
read as a raw id. The renderer merges both hooks' options into the one list the kit sees, and
each kit labels its chips by looking a value up in it — neither kit learns two queries exist.

After a selection **the query resets to empty**, in both kits: the term that produced the chip
has been consumed by it, and leaving it behind would silently narrow the next search. Removing a
chip updates form state and leaves the query alone. Changing the source's resolved parameters
still clears the whole selection to `[]`, as it always did.

**Breaking for third-party kit authors, not for source or form authors.**
`MultiSelectFieldRenderProps` gains a required `search: { query, onQueryChange } | undefined`
key, the identical one `SelectFieldRenderProps` grew — a kit that does not declare it no longer
satisfies `FormComponents`. Handling it is optional in practice: `search === undefined` is every
non-searchable field, and a kit may pass the prop through and keep rendering its plain control.

`searchable` stays illegal on `radiogroup` and `checkboxgroup`, which render every option
inline; the parse error now names both legal kinds. A `searchable` field wired to a static
`options` list, or to a plain-function source, still throws at render naming the field.

No new package dependency in either kit: `@ez-kit/form-shadcn` uses the `multiple` mode and the
chip parts of the Base UI combobox it already vendored, and `@ez-kit/form-heroui` uses
`ComboBox` in `selectionMode='multiple'` with `Chip` for the selection.
