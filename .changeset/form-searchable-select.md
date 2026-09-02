---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

`searchable` on a `select`: a combo box that queries a source as the user types.

Everything `optionsFrom` shipped so far assumes a source returns **the whole list**, which is
what guarantees the option carrying the value in form state is on it and can be found for its
label. Server-side search breaks that permanently: the source returns only the page matching
the last query, so form state holding `city: 4821` next to results for "lis" draws a blank
control forever.

So a source may now take a second, optional shape — two hooks instead of one:

```ts
type OptionSource = ((input: OptionSourceInput) => OptionSourceResult) | SearchableOptionSource
```

`useOptions` answers "what matches what was just typed" (its input gains an additive `query`),
and `useSelectedOptions` answers "what is the option behind the values already selected". The
renderer calls both and merges their results — deduped by value, `loading` true while either is
— so a kit still sees one `options` list and one `loading` flag. react-admin pays the same
price, with `getMany(ids)` alongside `getList`.

`searchable` is a flag on `select`, not a new node type: the value and its shape are unchanged.
It is rejected on `radiogroup` / `checkboxgroup` (they render every option inline) and, for now,
on `multiselect` (coherent, not yet built — the parse error says so in those words). A
`searchable` field wired to a static `options` list, or to a plain-function source, throws at
render naming the field.

The query reaches the source **raw**, every keystroke. Debouncing and a `minChars` gate are the
source's job for now — there is deliberately no delay option, constant or timer in the package;
it intends to take debouncing over later.

Both kits gained the widget. `@ez-kit/form-heroui` renders `ComboBox` from `@heroui/react`, so
it costs nothing new. `@ez-kit/form-shadcn` takes a **new dependency, `@base-ui/react`**: the
`radix-nova` style's own combobox is built on it, Radix ships no combobox primitive, and this is
the registry's first-class answer. The kit therefore now ships two primitive systems side by
side; no existing Radix-based block was migrated. Its size budget moves 95 KB → 135 KB (real
size 124.86 KB, up from 88.88 KB). Tree-shaking is intact — only the combobox lands, not the
library.

Who this breaks:

- **Source authors: no one.** The widening is a union, `query` is additive, and every source
  written against the function shape stays valid.
- **Third-party kit authors: yes.** `SelectFieldRenderProps` gains a required
  `search: { query, onQueryChange } | undefined` key — the same class of break `loading` made.
  A kit that spreads unknown props onto the DOM must destructure it; one that wants the feature
  branches on `search !== undefined` and must not filter `options` itself.
