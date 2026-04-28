# Implementation Plan: Selection Info Bar

## Overview

When row selection is enabled (`selection: true`), a floating info bar automatically appears
at the bottom of the grid showing how many rows are selected and exposing action buttons.
Controlled via `selectionBar?: boolean | SelectionBarConfig` in `useDataGrid`.

---

## Final API

### `useDataGrid` config

```ts
selectionBar?: boolean | SelectionBarConfig<TRow>

// Logic:
// selectionBar: false                → bar never shown
// selectionBar: undefined | true     → bar shown when selection > 0 (no delete button)
// selectionBar: { ... }              → bar shown with config
// selection not enabled              → bar never shown regardless of selectionBar
```

### `SelectionBarConfig<TRow>` (in `use-data-grid.ts`)

```ts
export interface SelectionBarCallbackArgs<TRow extends object = object> {
	table: Table<TRow>
	clearSelection: () => void
	selectedRows: Row<TRow>[]
}

export interface SelectionBarConfig<TRow extends object = object> {
	/** If provided — Delete button appears in the bar. */
	onDelete?: (args: SelectionBarCallbackArgs<TRow>) => void
	/**
	 * Replaces default clear behaviour.
	 * `clearSelection` arg is the default reset — call it if needed.
	 */
	onClear?: (args: SelectionBarCallbackArgs<TRow>) => void
	/** Rendered between Delete and Cancel. ReactElement or render-function. */
	actions?: ReactElement | ((args: SelectionBarCallbackArgs<TRow>) => ReactElement)
}
```

### `SelectionBarProps` (DI component interface, in `types.ts`)

The `selection-bar.tsx` sub-component pre-binds all callbacks before passing them to the DI
component — the DI layer never needs to access the table directly.

```ts
export interface SelectionBarProps {
	/** False when 0 rows selected — DI component should hide/animate out. */
	open: boolean
	/** Number of currently selected rows. */
	count: number
	/** Selected Row objects (already resolved). */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	selectedRows: Row<any>[]
	/**
	 * Pre-bound delete handler. Only present when `onDelete` was configured.
	 * When absent — Delete button must NOT be rendered.
	 */
	onDelete?: () => void
	/**
	 * Pre-bound clear handler.
	 * If user did not provide `onClear`, this calls `table.resetRowSelection()`.
	 */
	onClear: () => void
	/** Already-resolved actions slot (ReactElement | undefined). */
	actions?: ReactElement
}
```

### Visual layout (shadcn ActionBar-based)

```
[ 3 rows selected ] [ Delete ] [ {actions} ] [ Cancel ]
```

- **Delete** — only rendered when `onDelete` is configured
- **{actions}** — custom slot between Delete and Cancel
- **Cancel** — always present, triggers `onClear`
- Position: `sticky; bottom: 0` inside the grid layout (not a full-page portal)
- Animation: `animate-in slide-in-from-bottom-4 fade-in-0` on enter;
  CSS `translate-y-full opacity-0 pointer-events-none` when `!open`

---

## Implementation Phases

### Phase 1 — React: Types

**Step 1. `packages/data-grid/react/react/src/types.ts`**

Add at the end (after `ColumnMenuProps`):

```ts
import type { Row } from '@tanstack/table-core'
import type { ReactElement } from 'react'

export interface SelectionBarProps {
	open: boolean
	count: number
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	selectedRows: Row<any>[]
	onDelete?: () => void
	onClear: () => void
	actions?: ReactElement
}
```

Add `SelectionBar` to `GridComponents` interface (after `ColumnMenu`):

```ts
SelectionBar?: ComponentType<SelectionBarProps>
```

---

### Phase 2 — React: useDataGrid config

**Step 2. `packages/data-grid/react/react/src/use-data-grid.ts`**

Add exports at top (after existing Symbol exports):

```ts
import type { Row, Table } from '@tanstack/table-core'
import type { ReactElement } from 'react'

/** Symbol used to carry selectionBar config on the table instance. */
export const SELECTION_BAR_KEY = Symbol('selectionBar')

export interface SelectionBarCallbackArgs<TRow extends object = object> {
	table: Table<TRow>
	clearSelection: () => void
	selectedRows: Row<TRow>[]
}

export interface SelectionBarConfig<TRow extends object = object> {
	onDelete?: (args: SelectionBarCallbackArgs<TRow>) => void
	onClear?: (args: SelectionBarCallbackArgs<TRow>) => void
	actions?: ReactElement | ((args: SelectionBarCallbackArgs<TRow>) => ReactElement)
}
```

Extend `UseDataGridConfig<TRow>`:

```ts
export interface UseDataGridConfig<TRow extends object> extends TableConfig<TRow> {
	cellTypes?: CellTypeRegistry
	pageSizer?: PageSizerConfig
	selectionBar?: boolean | SelectionBarConfig<TRow> // ← add this
}
```

In `useDataGrid` body — destructure `selectionBar` and store on instance:

```ts
// destructure
const { cellTypes, pageSizer, selectionBar, ...tableConfig } = config

// after existing Symbol assignments:
const selectionBarRef = useRef(selectionBar)
selectionBarRef.current = selectionBar
;(tableRef.current as unknown as Record<symbol, unknown>)[SELECTION_BAR_KEY] = selectionBarRef.current
```

---

### Phase 3 — React: Default DI component

**Step 3. `packages/data-grid/react/react/src/components-context.tsx`**

Add import for `SelectionBarProps` to the existing import block.

Add default implementation (plain HTML, no styling):

```tsx
function DefaultSelectionBar({ open, count, onDelete, onClear, actions }: SelectionBarProps) {
	if (!open) return null
	return (
		<div
			role='toolbar'
			data-slot='selection-bar'
			style={{ display: 'flex', gap: 8, padding: '6px 12px', border: '1px solid #ccc' }}
		>
			<span>{count} selected</span>
			{onDelete && (
				<button
					type='button'
					onClick={onDelete}
				>
					Delete
				</button>
			)}
			{actions}
			<button
				type='button'
				onClick={onClear}
			>
				Cancel
			</button>
		</div>
	)
}
```

Add to `defaultComponents`:

```ts
export const defaultComponents: Required<GridComponents> = {
	// ... existing ...
	SelectionBar: DefaultSelectionBar,
}
```

---

### Phase 4 — React: SelectionBar sub-component

**Step 4. `packages/data-grid/react/react/src/data-grid/selection-bar.tsx` (NEW file)**

This component reads the table from context, resolves config + callbacks, and delegates
rendering to the DI `SelectionBar` component.

```tsx
import { useGridComponents } from '../components-context'
import { SELECTION_BAR_KEY, type SelectionBarConfig } from '../use-data-grid'
import { useTableContext } from './table-context'

/**
 * Selection info bar. Automatically visible when `selection` is enabled
 * and at least one row is selected.
 *
 * Render behaviour:
 * - `selectionBar: false`        → never renders
 * - `selectionBar: undefined`    → renders (no delete button)
 * - `selectionBar: true`         → renders (no delete button)
 * - `selectionBar: { ... }`      → renders with config
 */
export function SelectionBar() {
	const table = useTableContext()
	const { SelectionBar: SelectionBarComponent } = useGridComponents()

	// Read config stored by useDataGrid
	const rawConfig = (table as unknown as Record<symbol, unknown>)[SELECTION_BAR_KEY] as
		| boolean
		| SelectionBarConfig
		| undefined

	// Determine whether the bar is enabled at all
	const selectionEnabled = Boolean(table.options.enableRowSelection)
	if (!selectionEnabled || rawConfig === false) return null

	const config: SelectionBarConfig = typeof rawConfig === 'object' ? rawConfig : {}

	const selectedRows = table.getSelectedRowModel().rows
	const count = selectedRows.length
	const open = count > 0

	const clearSelection = () => {
		table.resetRowSelection()
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const callbackArgs = { table: table as any, clearSelection, selectedRows }

	// Pre-bind onDelete (only if configured)
	const onDelete = config.onDelete
		? () => {
				config.onDelete!(callbackArgs)
			}
		: undefined

	// Pre-bind onClear: user override → call with default; no override → default
	const onClear = config.onClear
		? () => {
				config.onClear!(callbackArgs)
			}
		: clearSelection

	// Resolve actions (function or element)
	const actions =
		config.actions == null
			? undefined
			: typeof config.actions === 'function'
				? config.actions(callbackArgs)
				: config.actions

	return (
		<SelectionBarComponent
			open={open}
			count={count}
			selectedRows={selectedRows}
			onDelete={onDelete}
			onClear={onClear}
			actions={actions}
		/>
	)
}
```

---

### Phase 5 — React: Wire into DataGrid

**Step 5. `packages/data-grid/react/react/src/data-grid/data-grid.tsx`**

Import `SelectionBar`:

```ts
import { SelectionBar } from './selection-bar'
```

Add to `DefaultLayout`:

```tsx
function DefaultLayout() {
	return (
		<>
			<Toolbar />
			<DataGridTable />
			<Pagination />
			<PageSizer />
			<SelectionBar /> {/* ← add */}
		</>
	)
}
```

Add `SelectionBar` to the compound type and attach as static property:

```ts
type DataGridType = typeof DataGridRoot & {
	// ... existing ...
	SelectionBar: typeof SelectionBar // ← add
}

DataGrid.SelectionBar = SelectionBar // ← add
```

---

### Phase 6 — React: Public exports

**Step 6. `packages/data-grid/react/react/src/index.ts`**

Add exports:

```ts
export { SelectionBar } from './data-grid/selection-bar'
export type { SelectionBarProps } from './types'
export { SELECTION_BAR_KEY, type SelectionBarCallbackArgs, type SelectionBarConfig } from './use-data-grid'
```

---

### Phase 7 — Shadcn: SelectionBar block

**Step 7. `packages/data-grid/react/shadcn/src/blocks/SelectionBar.tsx` (NEW file)**

Uses inline sticky rendering (no full-page portal). The `ActionBar` component from
`action-bar.tsx` will NOT be used here because it portals to `document.body` with `fixed`
positioning. Instead, we reproduce the visual style with `sticky bottom-0`.

```tsx
'use client'

import { X } from 'lucide-react'
import { cn } from '../lib/utils'
import { ActionBarItem, ActionBarSelection, ActionBarSeparator } from '../components/ui/action-bar'
import type { SelectionBarProps } from '@ez-kit/data-grid-react'

export function SelectionBar({ open, count, onDelete, onClear, actions }: SelectionBarProps) {
	return (
		<div
			role='toolbar'
			aria-orientation='horizontal'
			data-slot='selection-bar'
			data-state={open ? 'open' : 'closed'}
			className={cn(
				'sticky bottom-2 z-10 mx-auto w-fit',
				'flex flex-row items-center gap-2 rounded-lg border bg-card px-2 py-1.5 shadow-lg',
				'transition-all duration-250 [animation-timing-function:cubic-bezier(0.16,1,0.3,1)]',
				open ? 'animate-in fade-in-0 slide-in-from-bottom-4' : 'pointer-events-none translate-y-4 opacity-0',
			)}
		>
			{/* Count badge */}
			<ActionBarSelection>{count} rows selected</ActionBarSelection>

			<ActionBarSeparator />

			{/* Delete — only when handler provided */}
			{onDelete && (
				<ActionBarItem
					variant='destructive'
					onClick={onDelete}
				>
					Delete
				</ActionBarItem>
			)}

			{/* Custom actions slot */}
			{actions}

			{/* Cancel / Clear */}
			<ActionBarSeparator />
			<button
				type='button'
				data-slot='selection-bar-close'
				onClick={onClear}
				className='rounded-xs opacity-70 outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-3.5'
				aria-label='Clear selection'
			>
				<X />
			</button>
		</div>
	)
}
```

> **Note on ActionBarItem**: `ActionBarItem` requires being inside `ActionBarGroup` (it calls
> `useActionBarContext`). Either wrap items in `ActionBarGroup` or use plain `Button`
> with matching styles. Check during implementation — if `ActionBarItem` throws outside
> `ActionBarGroup`, replace with:
>
> ```tsx
> import { Button } from '../components/ui/button'
> ;<Button
> 	variant='destructive'
> 	size='sm'
> 	onClick={onDelete}
> >
> 	Delete
> </Button>
> ```

---

### Phase 8 — Shadcn: Register in createDataGrid

**Step 8. `packages/data-grid/react/shadcn/src/index.ts`**

Import and register:

```ts
import { SelectionBar } from './blocks/SelectionBar'

export const { DataGrid, GridComponentsProvider, useDataGrid } = createDataGrid({
	// ... existing ...
	SelectionBar: SelectionBar, // ← add
})

export { SelectionBar } from './blocks/SelectionBar' // ← add re-export
```

---

### Phase 9 — Sandbox demo

**Step 9. `apps/docs/app/sandbox/data-grid/components/base.tsx`**

Add `selectionBar` to the existing base demo that already uses `selection: true`.

Simple case (no delete, just counter + cancel):

```tsx
const table = useDataGrid({
	data,
	columns,
	selection: true,
	selectionBar: true, // or just undefined — both work
	// ...
})
```

Full case with delete + custom actions:

```tsx
const table = useDataGrid({
	data,
	columns,
	selection: true,
	selectionBar: {
		onDelete: ({ selectedRows, clearSelection }) => {
			setData((prev) => prev.filter((row) => !selectedRows.some((r) => r.original === row)))
			clearSelection()
		},
		actions: (
			<Button
				variant='secondary'
				size='sm'
			>
				Export
			</Button>
		),
	},
	// ...
})
```

---

## File Change Summary

| File                                                  | Action  | Description                                                                                                                                   |
| ----------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `react/react/src/types.ts`                            | Modify  | Add `SelectionBarProps`; add `SelectionBar` to `GridComponents`                                                                               |
| `react/react/src/use-data-grid.ts`                    | Modify  | Add `SELECTION_BAR_KEY`, `SelectionBarCallbackArgs`, `SelectionBarConfig`; add `selectionBar` to `UseDataGridConfig`; store on table instance |
| `react/react/src/components-context.tsx`              | Modify  | Add `DefaultSelectionBar`; add to `defaultComponents`                                                                                         |
| `react/react/src/data-grid/selection-bar.tsx`         | **New** | Sub-component: reads context, resolves callbacks, delegates to DI                                                                             |
| `react/react/src/data-grid/data-grid.tsx`             | Modify  | Add `<SelectionBar />` to `DefaultLayout`; add to compound type                                                                               |
| `react/react/src/index.ts`                            | Modify  | Export `SelectionBar`, `SelectionBarProps`, `SELECTION_BAR_KEY`, `SelectionBarCallbackArgs`, `SelectionBarConfig`                             |
| `react/shadcn/src/blocks/SelectionBar.tsx`            | **New** | Shadcn implementation: sticky bottom, ActionBar visuals, slide-in animation                                                                   |
| `react/shadcn/src/index.ts`                           | Modify  | Import + register `SelectionBar` in `createDataGrid`; re-export                                                                               |
| `apps/docs/app/sandbox/data-grid/components/base.tsx` | Modify  | Add `selectionBar` demo (simple + full with delete)                                                                                           |

---

## Risks

**ActionBarItem outside ActionBarGroup**: `ActionBarItem` uses `useFocusContext` which throws if
not inside `ActionBarGroup`. If this is the case, replace with plain `Button` + matching
`variant='destructive' size='sm'` styles inside shadcn `SelectionBar.tsx`.

**Animation on `!open`**: CSS `animate-in` classes only fire on mount. Exit animation via class
swap (`translate-y-4 opacity-0`) is a CSS transition, not the same as `animate-out`. If exit
animation is missing, add a short `transition-all duration-200` class. Alternatively wrap in a
`Transition` primitive or use `data-state=closed` with CSS `data-[state=closed]:...` Tailwind
variants.

**`selection` detection**: `table.options.enableRowSelection` should be truthy when `selection: true`
is passed. Verify this in TanStack Table — if it's a function (per-row granular), this check
still works since a function is truthy.

**`selectionBarRef` pattern**: The existing pattern in `use-data-grid.ts` uses a ref to avoid
stale closures (e.g. `pageSizerRef`). Follow the same pattern for `selectionBarRef` — do NOT
pass `selectionBar` directly via symbol without a ref, or the config object won't update
between renders.

---

## Success Criteria

- [ ] `selection: true`, `selectionBar` omitted → bar appears when ≥ 1 row selected, no Delete button
- [ ] `selectionBar: false` → bar never appears even with selection enabled
- [ ] `onDelete` provided → Delete button (destructive) appears; clicking calls `onDelete({ table, clearSelection, selectedRows })`
- [ ] `onDelete` not provided → no Delete button rendered
- [ ] Cancel button always present; clicking calls default `table.resetRowSelection()` when no `onClear` configured
- [ ] `onClear` provided → Cancel calls `onClear({ table, clearSelection, selectedRows })`; user is responsible for calling `clearSelection()` if desired
- [ ] `actions` ReactElement → rendered between Delete and Cancel
- [ ] `actions` function → called with `callbackArgs`, result rendered between Delete and Cancel
- [ ] Shadcn SelectionBar animates in from bottom on open, fades out on close
- [ ] Bar is sticky relative to grid container (not fixed to viewport)
- [ ] Compound `DataGrid.SelectionBar` works in custom layouts
- [ ] `pnpm ci` passes (lint, typecheck, test, build, size)
