---
'@ez-kit/docs': minor
---

Serve the shadcn data-grid registry as two items, so a grid without drag never installs `@dnd-kit`.

`https://ez-kit-docs.vercel.app/r/data-grid.json` is unchanged as a URL and still installs a single
item — it carries neither `dnd.tsx` nor the two `@dnd-kit` dependencies that exist only for it. Drag
has its own item at `…/r/data-grid-dnd.json`, carrying that file and those dependencies. It is still
**one** command for a drag consumer: the drag item names the grid item as a registry dependency,
which the CLI resolves, so both file sets and both dependency lists land in one run. Switching drag
on is then the same one field it is on npm:

```tsx
import { adapter } from '@/components/data-grid/dnd'

export const { DataGrid } = createDataGrid({ components: allComponents, cellTypes, features, dnd: adapter })
```

**Why two items rather than one, since the path is the argument.** The adapter was first left out of
the payload altogether so that an optional peer stayed optional, and the cost of that was larger than
it looked: this kit is not published to npm, so a file the registry does not copy cannot be imported
at all — withholding it did not make drag optional on the shadcn path, it made drag impossible there.
The answer to that is not a removal but a second item. Putting the adapter into the single item would
work, and was built that way first, but it hands the install to every consumer whether they drag
anything or not, because a `registry-item` carries one `dependencies` list and `shadcn add` installs
all of it — there is no `peerDependenciesMeta` here. **That single-item arrangement is superseded and
no release carries it**: the only item that mentions `@dnd-kit` is the drag item, and
`apps/docs/test/registry-payload.test.ts` asserts the grid item mentions it neither in its
`dependencies` nor inside any file's content.

What the drag item costs a consumer who chooses it, measured rather than guessed: six packages,
roughly 1.7 MB unpacked, one line in `package.json` — and **no bundle bytes**, since nothing reaches
`dnd.tsx` unless you write `dnd: adapter`, so an unused module is tree-shaken like any other.
Deleting the file and dropping the dependencies is supported and nothing in the grid item references
either; the file's own docblock says so.

**The npm path is untouched throughout.** `@dnd-kit/react` remains an _optional_ peer of both kits,
and the guarantee that a kit root's bundle cannot reach it is still asserted.

One thing to know for later: `shadcn add` copies verbatim and has no uninstall, and re-running a
command does not drop a dependency an item no longer declares. So the split is what any future
narrowing of the payload will have to reckon with — a dependency that reaches a consumer's
`package.json` through the registry stays there until they remove the line by hand.
