---
'@ez-kit/data-grid-react': minor
---

Add state-persistence utilities: `extractState(table)` reads the persistable grid slices into a JSON-safe `DataGridState`, `parseState(stored)` validates and prunes an untrusted stored value back into that shape (feed it to `useDataGrid`'s `initialState`), and the reactive `useExtractedState(grid)` hook returns the always-current extracted state for save-on-change. Storage read/write stays consumer-owned; slice selection is controlled via `keys` (default excludes `rowSelection` and `expanded`). Exposes `PERSISTABLE_STATE_KEYS` / `DEFAULT_STATE_KEYS` and the `DataGridState` / `DataGridStateOptions` / `PersistableStateKey` types.
