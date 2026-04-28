# Implementation Plan: Column Sizing (Resizing)

## Overview

Add column resizing to `@ez-kit/data-grid` following TanStack Table's performant CSS-variable pattern. The core layer adds a `sizing` config that maps to TanStack's `columnResizeMode` / `enableColumnResizing`. The React layer renders a drag handle in header cells and drives column widths through CSS custom properties set on the `<table>` element, avoiding full re-renders during drag.

## Requirements

- Per-column `size`, `minSize`, `maxSize`, `enableResizing` in `defineColumns` (already in ColumnDef types — just need TanStack wiring)
- Global `sizing` config on `TableConfig` / `useDataGrid` with `mode: 'onChange' | 'onEnd'` and optional `direction: 'ltr' | 'rtl'`
- CSS-variable-driven widths for performance (only `<table style>` updates during drag)
- Drag handle in each resizable header cell via `header.getResizeHandler()`
- Double-click to reset column size

## Architecture Approach

TanStack Table's performant resize pattern:

1. `<table>` element gets CSS variables `--header-{id}-size` and `--col-{id}-size` for every column
2. Each `<th>` / `<td>` reads width from `calc(var(--header-{id}-size) * 1px)` instead of calling `header.getSize()` per cell
3. During active drag, only the `<table style={...}>` CSS variables change — React does not re-render rows/cells
4. A resize handle `<div>` inside `<th>` captures mouse/touch via `header.getResizeHandler()`

This maps cleanly onto ez-kit where `data-grid-core` is framework-agnostic and `data-grid-react` renders the UI.

## What is Already in Place

The column-level properties `size`, `minSize`, `maxSize`, `enableResizing` are **already defined** in `ColumnDef` and **already mapped through** to TanStack columns by `mapColumns`. No changes needed there.

## Out of Scope

- **Persisted column widths**: Saving/restoring column sizes to localStorage or URL state is user-land responsibility via `table.getState().columnSizing`
- **Programmatic resize API**: `table.setColumnSizing()` is already available from TanStack Table; no wrapper needed
- **Shadcn / HeroUI resizer styling**: UI-kit-specific resizer styles are a separate task; this plan provides the `data-slot="column-resizer"` hook for them to target
- **Column auto-size on double-click**: The plan includes `resetSize()` on double-click (reset to initial size), not auto-fit-to-content
- **Resize indicator line**: A vertical line that follows the cursor during drag is a UI-kit concern

---

## Implementation Steps

### Phase 1: Core Layer — Types and TanStack Wiring

**Step 1. Add `SizingConfig` type and `sizing` field to `TableConfig`**

File: `packages/data-grid/core/src/types.ts`

Add after the existing feature config interfaces:

```ts
export type ColumnResizeMode = 'onChange' | 'onEnd'
export type ColumnResizeDirection = 'ltr' | 'rtl'

export interface SizingConfig {
	/** Resize mode. 'onChange' updates live; 'onEnd' updates after mouse release. Default: 'onChange'. */
	mode?: ColumnResizeMode
	/** Text direction for resize calculation. Default: 'ltr'. */
	direction?: ColumnResizeDirection
}
```

Add to `TableConfig` interface:

```ts
sizing?: boolean | SizingConfig
```

**Step 2. Map `sizing` to TanStack options in `createTable`**

File: `packages/data-grid/core/src/create-table.ts`

In the options spread, add:

```ts
// Column resizing
...(config.sizing
  ? {
      enableColumnResizing: true,
      columnResizeMode:
        typeof config.sizing === 'object' && config.sizing.mode
          ? config.sizing.mode
          : 'onChange',
      columnResizeDirection:
        typeof config.sizing === 'object' && config.sizing.direction
          ? config.sizing.direction
          : 'ltr',
    }
  : {}),
```

**Step 3. Export new types from core index**

File: `packages/data-grid/core/src/index.ts`

```ts
export type { ColumnResizeDirection, ColumnResizeMode, SizingConfig } from './types'
```

---

### Phase 2: React Layer — CSS Variables and Resize Handle

**Step 4. Create `getColumnSizeVars` utility**

File (new): `packages/data-grid/react/react/src/utils/column-size-vars.ts`

```ts
import type { DataTable } from '@ez-kit/data-grid-core'
import type { CSSProperties } from 'react'

/**
 * Builds a CSS custom property map for all column widths.
 * Set these on `<table style={vars}>` so that `<th>` / `<td>` can read
 * widths via `calc(var(--header-{id}-size) * 1px)` without per-cell re-renders.
 */
export function getColumnSizeVars(table: DataTable<any>): CSSProperties {
	const headers = table.getFlatHeaders()
	const vars: Record<string, string> = {}

	for (const header of headers) {
		const colId = header.column.id
		vars[`--header-${colId}-size`] = String(header.getSize())
		vars[`--col-${colId}-size`] = String(header.column.getSize())
	}

	return vars as CSSProperties
}
```

**Step 5. Apply CSS variables to `<table>` in `DataGridTable`**

File: `packages/data-grid/react/react/src/data-grid/table.tsx`

```tsx
import { useGridComponents } from '../components-context'
import { getColumnSizeVars } from '../utils/column-size-vars'
import { Body } from './body'
import { Header } from './header'
import { useTableContext } from './table-context'

export function DataGridTable() {
	const { Table } = useGridComponents()
	const table = useTableContext()

	const isResizingEnabled = Boolean(table.options.enableColumnResizing)
	const sizeVars = isResizingEnabled ? getColumnSizeVars(table) : undefined

	return (
		<Table
			style={{
				...sizeVars,
				...(isResizingEnabled ? { tableLayout: 'fixed' } : {}),
			}}
		>
			<Header />
			<Body />
		</Table>
	)
}
```

Key points:

- `tableLayout: 'fixed'` is required for CSS-variable widths to take effect
- During active drag, only CSS variables on `<table>` update — child cells do NOT re-render

**Step 6. Add resize handle and CSS-variable width to header cells**

File: `packages/data-grid/react/react/src/data-grid/header.tsx`

Inside the `headerGroup.headers.map(...)` callback, compute resize state and add handle:

```tsx
const resizeEnabled = header.column.getCanResize()

// Merge pin styles with sizing styles
const thStyle = {
	...pinStyles,
	...(resizeEnabled
		? {
				width: `calc(var(--header-${header.column.id}-size) * 1px)`,
				position: 'relative' as const,
			}
		: {}),
}

// ... existing render ...

{
	resizeEnabled && (
		<div
			data-slot='column-resizer'
			onMouseDown={header.getResizeHandler()}
			onTouchStart={header.getResizeHandler()}
			onDoubleClick={() => {
				header.column.resetSize()
			}}
			style={{
				position: 'absolute',
				top: 0,
				right: 0,
				width: '4px',
				height: '100%',
				cursor: 'col-resize',
				userSelect: 'none',
				touchAction: 'none',
				...(header.column.getIsResizing()
					? { background: 'var(--resizer-active-color, #2563eb)', opacity: 1 }
					: { opacity: 0 }),
			}}
		/>
	)
}
```

Design decisions:

- `data-slot="column-resizer"` enables styling from UI-kit layers via CSS attribute selectors
- Default invisible (`opacity: 0`), visible on active resize; UI kits add `:hover` visibility via `[data-slot="column-resizer"]:hover { opacity: 1 }`
- `--resizer-active-color` CSS variable lets UI kits customize without code changes
- `onDoubleClick` resets to original size
- `touchAction: 'none'` prevents scroll interference on touch

**Step 7. Apply CSS-variable width to `<td>` in `DataGridCell`**

File: `packages/data-grid/react/react/src/data-grid/cell.tsx`

Add helper function:

```ts
function getCellSizeStyle(columnId: string, isResizable: boolean): CSSProperties {
	if (!isResizable) return {}
	return { width: `calc(var(--col-${columnId}-size) * 1px)` }
}
```

In `DataGridCell`, compute once and merge into all `<Td>` render sites:

```ts
const isResizable = cell.column.getCanResize()
const sizeStyle = getCellSizeStyle(cell.column.id, isResizable)
const cellStyle = { ...pinStyles, ...sizeStyle }
```

Replace `style={pinStyles}` → `style={cellStyle}` across all `<Td>` render sites in the file.

**Step 8. Export from React index**

File: `packages/data-grid/react/react/src/index.ts`

```ts
export { getColumnSizeVars } from './utils/column-size-vars'
export type { ColumnResizeDirection, ColumnResizeMode, SizingConfig } from '@ez-kit/data-grid-core'
```

---

### Phase 3: Sandbox Examples

**Step 9. Add resizing examples to sandbox page**

File: `apps/docs/app/sandbox/data-grid/page.tsx`

Add a second grid instance:

```tsx
// Example 1: onChange mode (live resize)
const resizableColumns = defineColumns<User>([
	{ accessorKey: 'name', header: 'Name', size: 200, minSize: 100, maxSize: 400 },
	{ accessorKey: 'email', header: 'Email', size: 250, minSize: 150 },
	{ accessorKey: 'age', header: 'Age', size: 80, minSize: 50, maxSize: 150 },
	{ accessorKey: 'active', header: 'Active', size: 100, enableResizing: false },
])

const resizableOnChange = useDataGrid({
	data,
	columns: resizableColumns,
	sizing: { mode: 'onChange' },
})

// Example 2: onEnd mode (performant, updates only after release)
const resizableOnEnd = useDataGrid({
	data,
	columns: resizableColumns,
	sizing: { mode: 'onEnd' },
})
```

Render:

```tsx
<section>
  <h2>Column Resizing — onChange</h2>
  <p>Drag column borders to resize. Double-click to reset.</p>
  <DataGrid table={resizableOnChange} />
</section>

<section>
  <h2>Column Resizing — onEnd (performant)</h2>
  <p>Width updates only after mouse release. No re-renders during drag.</p>
  <DataGrid table={resizableOnEnd} />
</section>
```

---

### Phase 4: Tests

**Step 10. Core unit tests for sizing config mapping**

File (new): `packages/data-grid/core/src/create-table-sizing.test.ts`

Test cases:

- `sizing: true` enables `enableColumnResizing` on the table
- `sizing: { mode: 'onEnd' }` sets `columnResizeMode` to `'onEnd'`
- `sizing: { direction: 'rtl' }` sets `columnResizeDirection` to `'rtl'`
- Default mode is `'onChange'`, default direction is `'ltr'`
- Column with `enableResizing: false` returns `false` from `column.getCanResize()`

**Step 11. Add size pass-through tests to map-columns tests**

File: `packages/data-grid/core/src/column/map-columns.test.ts`

```ts
it('passes size, minSize, maxSize to TanStack column', () => {
	const result = mapColumns<Row>([{ accessorKey: 'name', size: 200, minSize: 50, maxSize: 500 }])
	expect(result[0]?.size).toBe(200)
	expect(result[0]?.minSize).toBe(50)
	expect(result[0]?.maxSize).toBe(500)
})

it('passes enableResizing to TanStack column', () => {
	const result = mapColumns<Row>([{ accessorKey: 'name', enableResizing: false }])
	expect(result[0]?.enableResizing).toBe(false)
})
```

**Step 12. React utility test for `getColumnSizeVars`**

File (new): `packages/data-grid/react/react/src/utils/column-size-vars.test.ts`

Test that the function returns correct CSS variable names and values given a mock table with `getFlatHeaders()`.

**Step 13. React integration test for resize handle rendering**

File: `packages/data-grid/react/react/src/data-grid/data-grid.test.tsx`

Test cases:

- When `sizing` is not set, no `[data-slot="column-resizer"]` elements are rendered
- When `sizing: true`, resizer handles appear on resizable columns
- When a column has `enableResizing: false`, that column has no resizer handle
- The `<table>` element has CSS variables `--header-*-size` when sizing is enabled

---

## File Change Summary

| File                                                                | Action  | Description                                                                                           |
| ------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `packages/data-grid/core/src/types.ts`                              | Modify  | Add `SizingConfig`, `ColumnResizeMode`, `ColumnResizeDirection`, add `sizing` to `TableConfig`        |
| `packages/data-grid/core/src/create-table.ts`                       | Modify  | Map `sizing` config to TanStack `enableColumnResizing` / `columnResizeMode` / `columnResizeDirection` |
| `packages/data-grid/core/src/index.ts`                              | Modify  | Export new types                                                                                      |
| `packages/data-grid/react/react/src/utils/column-size-vars.ts`      | **New** | `getColumnSizeVars()` utility                                                                         |
| `packages/data-grid/react/react/src/data-grid/table.tsx`            | Modify  | Apply CSS variables and `tableLayout: fixed` to `<table>`                                             |
| `packages/data-grid/react/react/src/data-grid/header.tsx`           | Modify  | Add resize handle, CSS-variable width on `<Th>`                                                       |
| `packages/data-grid/react/react/src/data-grid/cell.tsx`             | Modify  | Add CSS-variable width on `<Td>`                                                                      |
| `packages/data-grid/react/react/src/index.ts`                       | Modify  | Export `getColumnSizeVars`, re-export core types                                                      |
| `apps/docs/app/sandbox/data-grid/page.tsx`                          | Modify  | Add two resizing examples                                                                             |
| `packages/data-grid/core/src/create-table-sizing.test.ts`           | **New** | Core sizing config tests                                                                              |
| `packages/data-grid/core/src/column/map-columns.test.ts`            | Modify  | Add size pass-through tests                                                                           |
| `packages/data-grid/react/react/src/utils/column-size-vars.test.ts` | **New** | CSS variable utility tests                                                                            |
| `packages/data-grid/react/react/src/data-grid/data-grid.test.tsx`   | Modify  | Add resize handle rendering tests                                                                     |

## Risks and Mitigations

- **`position: relative` vs `sticky`**: `sticky` (pinned columns) takes precedence over `relative` — no conflict
- **Special characters in column IDs**: Document that column IDs should be CSS-safe identifiers
- **`tableLayout: fixed` side effects**: Only applied when `enableColumnResizing` is true, so non-resizable grids are unaffected
- **Bundle size**: ~100 new lines across all files — well within 3 KB size-limit budget

## Success Criteria

- [ ] `sizing: true` on `useDataGrid` enables column resizing with drag handles
- [ ] `sizing: { mode: 'onEnd' }` only updates widths after mouse release
- [ ] Per-column `size`, `minSize`, `maxSize` are respected
- [ ] Per-column `enableResizing: false` hides the drag handle for that column
- [ ] During drag, only CSS variables update (no full table re-render)
- [ ] Double-click on resizer resets column to initial size
- [ ] Pinned columns can also be resized
- [ ] All new tests pass
- [ ] `pnpm ci` passes (lint, typecheck, test, build, size)
