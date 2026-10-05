---
'@ez-kit/docs': minor
---

Serve the shadcn data-grid registry as two items, so a grid without drag no longer installs `@dnd-kit`.

`https://ez-kit-docs.vercel.app/r/data-grid.json` is unchanged as a URL and still installs a single
item — it just no longer carries `dnd.tsx` or the two `@dnd-kit` dependencies that exist only for it.
Drag now has its own item at `…/r/data-grid-dnd.json`, carrying that file and those dependencies. It
is still **one** command for a drag consumer: the drag item names the grid item as a registry
dependency, which the CLI resolves, so both file sets and both dependency lists land in one run.

This helps future installs only. `shadcn add` has no uninstall, and re-running the plain command does
not drop a dependency the item no longer declares, so a project that installed before this change
still has `@dnd-kit/react` and `@dnd-kit/dom` in its `package.json` until the two lines are removed by
hand. Nothing here cleans that up retroactively.
