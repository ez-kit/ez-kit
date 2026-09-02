---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
---

Add `creatable`: a `searchable` select or multiselect can accept a value its option list does
not contain.

When the typed text matches no option, the renderer appends one extra option offering to add
it; picking that row writes the text into form state. Nothing is committed by blurring or by
typing alone — the same explicit act react-select's `Creatable` and react-admin's `onCreate`
ask for. `createLabel` captions the row, defaulting to `Add "<query>"` and merging the typed
text in under `query` for its `{ key, params }` form.

`creatable` is legal only on a **string-valued** list — a compile error on a numeric one, and
rejected by `parseFormSchema` for a document. Typed text is a string; a numeric-valued field
would have to invent an id its backend never issued. A created value is therefore the text
itself, and it labels itself in the list, which is what keeps a multiselect's chips from going
blank once the query that made them is gone.

**Neither UI kit changed, and neither can tell the feature is on** — the offered row reaches a
kit as an ordinary option. A custom kit supports `creatable` the moment it supports
`searchable`.

`creatable` requires `searchable`, because a value is created by typing it. In exchange,
**`searchable` no longer requires an option source**: a static `options` list is now filtered
in the renderer by one fixed rule — a case-insensitive substring of the label, with no
configuration. That combination previously threw. Anything more particular than substring
matching is what an option source is for.
