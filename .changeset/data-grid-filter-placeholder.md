---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Give a column's filter a hint of its own. `filtering.placeholder: '10 digits'` replaces the text an
empty filter shows, on a column and on a `filtering.fields` entry alike, and leaves the control's
accessible name on `messages.filtering.placeholder`, so a screen reader never announces the hint as
the field's name. A multi-select trigger is named by both the filter name and what it shows — the
hint, or the picked values — so its visible text stays part of its name. The hint reaches the text
input, the multi-select trigger, a cell type's filter component as `FieldState.placeholder` and a
`filtering.component` as `props.placeholder`; the `between` range keeps its own "From" / "To". The filter model carries the resolved value as `placeholder`, so a panel
built on `useFilters()` shows the same hint as the header.

The default filter name now reads the column's header instead of its id: `Filter First name…` where
it was `Filter firstName…`, with the id as the fallback for a header that is not a string.
`messages.filtering.placeholder` receives `label` beside `columnId`; a dictionary that reads only
`columnId` keeps working. Tests that find a filter by its old text need the header in it.

A kit implementing `MultiSelectFilter` should name the control by the new `label` prop rather than
by `placeholder`, which may now be an author's hint. The HeroUI kit does, and shows the hint in its
text and number filters.
