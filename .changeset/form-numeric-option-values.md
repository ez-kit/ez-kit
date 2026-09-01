---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
---

feat(form): numeric values for select-like options

A `select`, `multiselect`, `radiogroup` or `checkboxgroup` option's `value` may now be a
**number** as well as a string, and `name` is checked against it: a field bound to a `number`
path (a `number[]` one for the multi-value kinds) must be given numeric options, and a
string-valued path string ones. That makes the format's headline case — a backend-authored
document whose entity ids are integers — expressible: the id stays a number all the way into
form state and back out of `onSubmit`, rather than being stringified at the edge.

No new node `type`: `select<string>` and `select<number>` are the same widget with the same
value shape, and only the JSON scalar differs. The union members are generated once per
option-value scalar (`SelectMember<TValues, string> | SelectMember<TValues, number>`, and the
same for the other three kinds), which is what keeps `name` and `options` **correlated** — a
mixture is a compile error rather than a lookup that silently finds nothing.

The kit contract is unchanged and stays string-only at the DOM edge (`value: string`,
`options: readonly SelectOption[]`) — Radix requires string item values and reserves `''`.
The binding layer stringifies option values on the way down and maps the string a kit reports
back to the option it came from; a **lookup**, never `Number(value)`, so a string-valued
`'42'` stays a string.

`parseFormSchema` follows: an option `value` must be a string or a finite number, one list
cannot mix the two (`1` and `'1'` collide as DOM keys), and a `multiselect` /
`checkboxgroup` `defaultValue` must be a homogeneous array of option values agreeing with the
list's scalar type.

**Breaking (types only, no runtime change).** `SelectFieldProps`, `MultiSelectFieldProps`,
`CheckboxGroupFieldProps` and `RadioGroupFieldProps` are now unions of a string-valued and a
number-valued arm rather than single object types, so code that referenced one of them as a
plain object type — spreading it, extending it, or writing a `Pick<…>` over it — needs
updating. Authoring a field, from JSX or from a schema, is unaffected.
