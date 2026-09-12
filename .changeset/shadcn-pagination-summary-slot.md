---
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/docs': patch
---

data-grid-shadcn: the pagination footer is built from buttons, and its label has a name

**The page controls are real `<button>`s.** The block built them from the vendored
`PaginationLink`, which is upstream shadcn's href-driven control: an `<a>`. This grid pages by
`onClick` and passes no href, and an `<a>` without one is not focusable and computes to the
generic role — so the footer could only be operated with a mouse, announced nothing to a screen
reader, and was "disabled" only as `aria-disabled` plus `pointer-events: none`, which no
assistive technology reads off a generic element. The block now renders `Button` directly, with
the native `disabled` attribute; `Button`'s base class already carries
`disabled:pointer-events-none disabled:opacity-50`, so nothing looks different. Two
consequences: prev/next take the `pagination-previous` / `pagination-next` slots heroui already
uses (they were both `pagination-link`), and `data-active` is present-or-absent rather than
`"false"` on every inactive link. `aria-current="page"` is unchanged.

The vendored `components/ui/pagination.tsx` is untouched — `Pagination`, `Content`, `Item` and
`Ellipsis` still come from it. A selector keyed on `a[data-slot="pagination-link"]` or on
`[data-active="false"]` needs updating.

**`data-slot="pagination-summary"` on the footer label.** heroui's footer text is a
`Pagination.Summary` and reaches the DOM with that slot name; this kit's was an unnamed
`<span>`, so the one piece of the footer a reader actually reads had to be found by position
inside the nav. It now uses heroui's name.

Both were found by the new browser specs for pagination, which drive the footer in both kits
through one set of assertions.
