---
'@ez-kit/data-grid-react': minor
---

Export every compound member by name beside `DataGrid.X`

`DataGridToolbar`, `DataGridTable`, `DataGridHeader`, `DataGridBody`, `DataGridFooter` and the rest
are now exported individually, under the names their `DataGrid*Props` types already used, plus
`DataGridRoot` — the root without the statics. `DataGrid.X` is unchanged and keeps working; this is
purely additive.

Naming one component no longer costs the whole namespace. The compound is a single object literal
of all 29 components, so reading one key off it keeps every one of them: measured with esbuild
(minified, gzipped, React external) `DataGrid` costs 34 272 bytes whatever a call site renders,
while a grid composed from ten named components costs 19 265. Roughly 9 500 of either figure is the
shared floor, so the components themselves go from about 25 kB to about 10 kB.

The heroui kit is where the cost was found: its table adapter split `<DataGrid.Footer>` out of
HeroUI's React Aria collection with `child.type === DataGrid.Footer`, and that one key read
anchored all 29 components into the kit's `./core` entry — 40 658 gzipped bytes, against 16 139
with the check naming `DataGridFooter` directly. That adapter no longer needs to split anything,
so the entry ends this release at 10 522, but the rule stands for any kit that reaches for a
single component, and `apps/docs/test/tree-shaking.test.ts` pins it.
