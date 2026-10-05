---
'@ez-kit/data-grid-heroui': minor
---

Add `@ez-kit/data-grid-heroui/dnd`, exporting `adapter` — the kit's drag-and-drop adapter, built on
`@dnd-kit/react`. Pass it to `createDataGrid({ dnd: adapter })` to give a composed grid drag
mechanics.

`@dnd-kit/react` is an **optional** peer: a consumer who never imports the subpath installs nothing
new, and nothing the kit root exports reaches the drag library — the root's bundle size is
unchanged, and a test asserts both halves rather than assuming them.

A bound adapter is driven rather than merely carried: the grid mounts its provider and commits
drops on all three drag surfaces — rows, header cells and the column panel — which ship in this
same release.
