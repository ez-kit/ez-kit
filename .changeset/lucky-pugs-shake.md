---
'@ez-kit/data-grid-heroui': minor
---

The prebuilt `DataGrid` binds the all-in feature set, so it no longer asks for `features`

`import { DataGrid } from '@ez-kit/data-grid-heroui'` already carries all fourteen component
groups, and those components read the features' APIs — so they drag the implementations in
whatever set a call site names. Measured against this kit, the prebuilt grid with a sorting-only
set was 51.7 kB gzipped against 55.7 kB with every feature: 3.9 kB, for an eight-line import block
at every call site. It now registers everything and `features` is optional there.

Nothing is removed: passing `features` still **replaces** the bound set, which narrows what the
grid does — state slices and APIs — without giving those bytes back. `features` also stays
required on `@ez-kit/data-grid-react` and on any bundle you build with `createDataGrid` without
one, which is the path where composing a set still decides what ships: four component groups plus
a narrow set measures 41.1 kB against the prebuilt grid's 55.7 kB, and the docs now recommend that
shape for anything beyond a prototype. The shadcn registry's `data-grid.tsx` binds the set the
same way.
