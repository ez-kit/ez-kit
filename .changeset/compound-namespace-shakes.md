---
'@ez-kit/data-grid-react': patch
---

**A partial import of the package root no longer pulls the whole compound namespace when you
bundle with esbuild.**

The 29 components hung off `DataGrid` were attached by top-level `DataGrid.Toolbar = Toolbar`
assignments, which esbuild cannot drop — so each one anchored its component and everything that
component reached, and any import from `@ez-kit/data-grid-react` paid for ~92% of the package.
They are now one `/* @__PURE__ */`-annotated `Object.assign`, which esbuild drops when nothing
uses the namespace.

**If you bundle with Rollup, Vite or Next, this changes nothing for you** — both Rollup 4 and
Turbopack were measured and already dropped the namespace on the old form, byte for byte the same
as on the new one. Webpack was not measured. The change cannot make any bundler do worse.

Measured on the built output with esbuild (`--bundle --minify`, React external):

| imported           |  before |   after |
| ------------------ | ------: | ------: |
| `useDataGridTable` | 155 370 |  27 901 |
| `DefaultLayout`    | 156 115 |  83 759 |
| `DataGrid`         | 155 370 | 155 313 |
| whole surface      | 168 998 | 168 942 |

No API change: `DataGrid.Toolbar`, `DataGrid.Table` and the rest are exactly as before. Read the
`DataGrid` row as the honest one — that name _is_ the whole namespace, so it costs what everything
costs, and what got cheaper is every import that never asked for it. A grid composed out of
`DataGrid.X` members is unchanged for the same reason: writing one reaches the value that carries
all 29. Composing through `createDataGrid` and the kits' per-group subpaths is still the path where
what you name decides what ships.
