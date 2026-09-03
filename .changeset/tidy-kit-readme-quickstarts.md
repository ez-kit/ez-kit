---
'@ez-kit/data-grid-heroui': patch
---

Rewrite both kit README quick-starts against the real entry point. They previously imported `createColumns` from `@ez-kit/data-grid-react` — which drops cell-type checking against the kit's own registry — and called `createTable` at module scope, outside React, so the grid never reacted to a changing `data` prop and the whole `useDataGrid` option layer was bypassed. Both now import everything from the kit, call `useDataGrid` inside the component, type the row via `createColumns<User>`, and ask for one package rather than three.
