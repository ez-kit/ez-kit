---
'@ez-kit/data-grid-react': minor
---

feat: `layout.classNames` for the grid shell's two boxes

The wrapper and the scrollport are the only elements this package renders itself, so they were
the only ones a kit could not reach: everything supplied through `components` sits _inside_ the
scrollport, and a border drawn there scrolls away with the content. The only way to frame a grid
was a global `[data-slot='table-wrapper']` selector — the kit-bypassing move the architecture
exists to avoid.

`layout.classNames.wrapper` / `layout.classNames.scroll` add a class beside the `data-slot`, and
nothing else: the structural rules stay in `@ez-kit/data-grid-react/styles.css` and the look stays
with the kit. It is an option rather than a React prop so a kit can state it once through
`createDataGrid({ defaults })` and have every grid it builds framed, in both call shapes, with the
app free to override either key per grid.
