---
'@ez-kit/docs': minor
---

The shadcn registry now ships the drag adapter, so drag works on the shadcn path.

`npx shadcn add` copies `dnd.tsx` into `components/data-grid/dnd.tsx` and installs `@dnd-kit/react`
alongside the rest of the block. Switching drag on is then the same one field it is on npm:

```tsx
import { adapter } from '@/components/data-grid/dnd'

export const { DataGrid } = createDataGrid({ components: allComponents, cellTypes, features, dnd: adapter })
```

Before this the adapter was excluded from the payload so that an optional peer stayed optional. The
cost of that was larger than it looked: this kit is not published to npm, so a file the registry does
not copy cannot be imported at all — withholding it did not make drag optional on the shadcn path, it
made drag impossible there. The trade was taken the other way.

**What it costs a consumer who never drags anything:** the install — six packages, roughly 1.7 MB
unpacked, one line in `package.json` — and **no bundle bytes**. Nothing reaches `dnd.tsx` unless you
write `dnd: adapter`, so an unused module is tree-shaken like any other. Deleting the file and dropping
the dependency is supported and nothing else in the block references either; the file's own docblock
says so.

**The npm path is unchanged.** `@dnd-kit/react` remains an _optional_ peer of both kits, and the
guarantee that a kit root's bundle cannot reach it is still asserted.

Taking the install back off consumers who do not want drag needs the registry generator to emit more
than one item, which is a separate change. Note it will not undo anything for a project that has
already run `shadcn add` — that command copies verbatim and has no uninstall.
