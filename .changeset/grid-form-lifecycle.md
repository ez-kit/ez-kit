---
'@ez-kit/data-grid-core': patch
'@ez-kit/data-grid-react': patch
---

Keep feature callbacks and column constraints current after rerenders. Scope editing and creating keyboard events to their owning grid, including nested grids and portalled editors. Prevent closed creating forms from saving while preserving persistent draft rows, and share form cancellation and field validation between creating and editing.

Publish refreshed feature handlers only after a render commits, so suspended transitions cannot replace the visible grid's callbacks.

Preserve resolved column definitions and TanStack column instances across unrelated rerenders with a per-table structural cache, refreshing them when column definitions or structural feature settings change.
