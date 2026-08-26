---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

**Breaking:** `defineColumns` is renamed to `createColumns`. The signature and behaviour are unchanged — only the name differs, and there is no compatibility re-export.

```diff
-import { defineColumns } from '@ez-kit/data-grid-react'
+import { createColumns } from '@ez-kit/data-grid-react'

-const columns = defineColumns<User>([{ accessorKey: 'name', header: 'Name' }])
+const columns = createColumns<User>([{ accessorKey: 'name', header: 'Name' }])
```

`define*` is a Vue/Vite idiom (`defineConfig`, `defineComponent`); the React ecosystem — and the rest of this package's own surface (`createTable`, `createColumnHelper`) — uses `create*`. The helper now matches its neighbours.
