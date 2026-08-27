---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

**Breaking:** the `@ez-kit/data-grid-react/cell-types` sub-export is gone. Everything it held —
`baseCellTypes`, `textCellType`, `numberCellType`, `booleanCellType`, `formatNumber`,
`truncateText` and the eight cell-config types — is now exported from the package root.

```diff
- import { baseCellTypes } from '@ez-kit/data-grid-react/cell-types'
+ import { baseCellTypes } from '@ez-kit/data-grid-react'
```

One entry point instead of two. A kit already imports the root module for `defineCellType` and
the DI primitives, so reaching the base it extends through a second specifier bought nothing but
a second thing to know about — and the sub-export was never listed as public surface, so the
only way to discover it was to notice it in a docs code sample.

The package is `sideEffects`-free apart from its CSS, so a consumer that never names
`baseCellTypes` still does not ship it. Merging the two entries grows the root bundle by ~1 kB
gzipped for consumers that do use it; the root size budget is unchanged at 50 kB and the build
now measures 44 kB against it.
