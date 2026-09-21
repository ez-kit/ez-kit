---
'@ez-kit/data-grid-react': minor
---

**`<DataGrid.HeaderMain>` and `<DataGrid.HeaderExtras>`, so composing a header cell no longer means
hand-writing a `div`.**

`HeaderCell`'s render function replaces the cell's content entirely — there is no "default plus my
change" form, and none is planned, because a partial one is the runtime registration the
composition model exists to avoid. The consequence was that a header wanting one thing changed —
the filter in a popover rather than inline, or no filter at all — had to restate the wrapper the
default renders, as `<div data-slot='header-main'>`. Every layout preset, example and docs snippet
that composed a header carried that literal: eleven of them, against one module that owns the slot.
A rename would have gone red in two stylesheets and stayed silent at all eleven.

Both components render the slot with a plain `div`, spread the props they are given, and write
`data-slot` last so a caller cannot overwrite it. `HeaderCell`'s own default content is built from
them, so each literal now lives in exactly one place.

They are also injectable. `HeaderMain` / `HeaderExtras` join `core` in the **optional** component
tier beside `TableWrapper`, `TableScroll`, `Layout` and `Tooltip` — a kit may supply either and
needs neither, because the package has a correct answer without one. That tier is `Partial` inside
`FullGridComponents`, so a kit that wrote `satisfies FullGridComponents` keeps compiling and keeps
its current rendering; nothing here is breaking. Neither shipped kit binds them: shadcn styles
`header-main` through the structural stylesheet and heroui styles `header-extras` through its own,
which is exactly the case the optional tier is for.

`HeaderMainProps` and `HeaderExtrasProps` are exported beside `TableWrapperProps`.
