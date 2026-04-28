# Implementation Plan: Column Pinning UI + `pinning` prop refactor

## Overview

Refactor the `pinning` prop on `TableConfig` from `RowPinningConfig` to a unified shape
covering both row and column pinning. Add a dynamic column pin UI — a `ColumnMenu` DI
component that renders a trigger icon in each column header and an extensible dropdown.

---

## Final API

### `TableConfig.pinning` (refactored)

```ts
pinning?: boolean | PinningConfig

interface PinningConfig {
  column?: boolean
  row?: boolean | RowPinningConfig  // RowPinningConfig = { top?, bottom? }
}
```

| Value                    | Result                                  |
| ------------------------ | --------------------------------------- |
| `true`                   | column pin UI on + row pin top + bottom |
| `{ column: true }`       | column pin UI only                      |
| `{ row: true }`          | row pin top + bottom                    |
| `{ row: { top: true } }` | row pin top only                        |
| `false` / omitted        | nothing                                 |

### `ColumnDef.pinning` (new — replaces `pin`)

```ts
// Remove: pin?: 'left' | 'right'
// Add:
pinning?: false | ColumnPinningDef

interface ColumnPinningDef {
  pin?: 'left' | 'right'         // static — always pinned, no UI section
  defaultPin?: 'left' | 'right'  // dynamic — starts pinned, user can change
}
```

| Column config            | Behaviour                               |
| ------------------------ | --------------------------------------- |
| omitted                  | pinnable if global column pinning is on |
| `false`                  | no pinning, no pin section in menu      |
| `{ pin: 'left' }`        | always left, no pin section (static)    |
| `{ defaultPin: 'left' }` | starts left, user can change/unpin      |

### `ColumnMenuProps` (new DI component)

```ts
interface ColPinSection {
	isPinned: 'left' | 'right' | false
	canPinLeft: boolean // false when already pinned left
	canPinRight: boolean // false when already pinned right
	onPinLeft: () => void
	onPinRight: () => void
	onUnpin: () => void
}

interface ColumnMenuSections {
	pin?: ColPinSection
	// future: sort?, hide?, filter?
}

interface ColumnMenuProps {
	column: Column<any>
	sections: ColumnMenuSections
}
```

### Header layout (per `<th>`)

```
<sort-trigger>[header text][sort indicator]</sort-trigger>
<ColumnMenu ... />          ← after title, NOT inside sort-trigger
[header-extras: filter]
<Resizer />                 ← always last
```

- `ColumnMenu` renders trigger icon (always visible, not clickable for sort)
- If no sections would be shown → icon not rendered at all (Q7)
- System columns (`isSystemColumn: true`) never get `ColumnMenu`

---

## Implementation Phases

### Phase 1 — Core: Type Refactoring

**Step 1. `packages/data-grid/core/src/column/types.ts`**

- Remove `pin?: 'left' | 'right'` from `ColumnDef`
- Add `pinning?: false | ColumnPinningDef`
- Export `ColumnPinningDef`
- Update `ColumnMeta` augmentation: remove `pin?`, add `columnPinning?: false | ColumnPinningDef`

```ts
export interface ColumnPinningDef {
  pin?: 'left' | 'right'
  defaultPin?: 'left' | 'right'
}

// In ColumnDef:
pinning?: false | ColumnPinningDef

// In declare module '@tanstack/table-core' ColumnMeta:
columnPinning?: false | ColumnPinningDef
// remove: pin?: 'left' | 'right'
```

**Step 2. `packages/data-grid/core/src/types.ts`**

- Remove `RowPinningConfig` usage as direct `pinning` type
- Add `PinningConfig` interface
- Change `TableConfig.pinning` type

```ts
export interface PinningConfig {
  column?: boolean
  row?: boolean | RowPinningConfig
}

// In TableConfig:
pinning?: boolean | PinningConfig  // was: pinning?: RowPinningConfig
```

- Export `PinningConfig` and `ColumnPinningDef` from index

---

### Phase 2 — Core: Logic

**Step 3. `packages/data-grid/core/src/system-columns.ts`**

- `extractPinningState`: read from `meta.columnPinning` instead of `meta.pin`
- Update actions system column meta: `pin: 'right'` → `columnPinning: { pin: 'right' }`

```ts
// extractPinningState:
const pinDef = col.meta?.columnPinning
if (!pinDef || pinDef === false) continue
const position = pinDef.pin ?? pinDef.defaultPin
```

**Step 4. `packages/data-grid/core/src/column/map-columns.ts`**

- Destructure `pinning` instead of `pin`
- Map `meta.columnPinning = pinning` (if defined)

```ts
// mapColumn:
const { pinning, sorting, cell, ... } = def
if (pinning !== undefined) meta.columnPinning = pinning
// remove: if (pin !== undefined) meta.pin = pin
```

**Step 5. `packages/data-grid/core/src/create-table.ts`**

Add `normalizePinning` helper (local to file):

```ts
function normalizePinning(pinning: TableConfig<any>['pinning']) {
	if (!pinning) return { column: false, row: false as RowPinningConfig | false }
	if (pinning === true) return { column: true, row: { top: true, bottom: true } }
	const row = pinning.row === true ? { top: true, bottom: true } : pinning.row || false
	return { column: Boolean(pinning.column), row }
}
```

Replace current `config.pinning?.top ?? config.pinning?.bottom` logic with normalized values:

```ts
const { column: hasColPinning, row: rowPinConfig } = normalizePinning(config.pinning)
const hasPinning = Boolean(rowPinConfig && (rowPinConfig.top ?? rowPinConfig.bottom))
// pass hasPinning to buildColumnList (unchanged)
// pass rowPinConfig to TanStack row pinning options
```

**Step 6. `packages/data-grid/core/src/index.ts`**

Export `ColumnPinningDef`, `PinningConfig`.

---

### Phase 3 — React: Types + DI

**Step 7. `packages/data-grid/react/react/src/types.ts`**

Add:

```ts
import type { Column } from '@tanstack/table-core'

export interface ColPinSection {
	isPinned: 'left' | 'right' | false
	canPinLeft: boolean
	canPinRight: boolean
	onPinLeft: () => void
	onPinRight: () => void
	onUnpin: () => void
}

export interface ColumnMenuSections {
	pin?: ColPinSection
}

export interface ColumnMenuProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	column: Column<any>
	sections: ColumnMenuSections
}
```

Add `ColumnMenu` to `GridComponents`:

```ts
ColumnMenu?: ComponentType<ColumnMenuProps>
```

**Step 8. `packages/data-grid/react/react/src/use-data-grid.ts`**

Add symbol + store colPinning flag on table instance:

```ts
export const COL_PINNING_KEY = Symbol('colPinning')

// In useDataGrid body:
const colPinEnabled = pinning === true || (typeof pinning === 'object' && Boolean(pinning.column))
;(tableRef.current as unknown as Record<symbol, unknown>)[COL_PINNING_KEY] = colPinEnabled
```

**Step 9. `packages/data-grid/react/react/src/components-context.tsx`**

Add `DefaultColumnMenu` (plain HTML fallback):

```tsx
function DefaultColumnMenu({ sections }: ColumnMenuProps) {
	const [open, setOpen] = useState(false)
	const { pin } = sections

	return (
		<div style={{ position: 'relative', display: 'inline-flex' }}>
			<button
				type='button'
				onClick={() => {
					setOpen((p) => !p)
				}}
			>
				⋮
			</button>
			{open && (
				<div
					style={{
						position: 'absolute',
						top: '100%',
						background: 'white',
						border: '1px solid #ccc',
						zIndex: 10,
						minWidth: 120,
					}}
				>
					{pin && (
						<>
							{pin.canPinLeft && (
								<button
									type='button'
									onClick={() => {
										pin.onPinLeft()
										setOpen(false)
									}}
								>
									Pin Left
								</button>
							)}
							{pin.canPinRight && (
								<button
									type='button'
									onClick={() => {
										pin.onPinRight()
										setOpen(false)
									}}
								>
									Pin Right
								</button>
							)}
							{pin.isPinned && (
								<button
									type='button'
									onClick={() => {
										pin.onUnpin()
										setOpen(false)
									}}
								>
									Unpin
								</button>
							)}
						</>
					)}
				</div>
			)}
		</div>
	)
}
```

Add to `defaultComponents` and `GridComponents` map.

**Step 10. `packages/data-grid/react/react/src/index.ts`**

Export `ColumnMenuProps`, `ColumnMenuSections`, `ColPinSection`, `COL_PINNING_KEY`.

---

### Phase 4 — React: Header Rendering

**Step 11. `packages/data-grid/react/react/src/data-grid/header.tsx`**

Import `COL_PINNING_KEY`, `ColumnMenu`, and `ColumnMenuSections`.

In `Header()`:

```tsx
const { Thead, Tr, Th, Input, Resizer, ColumnMenu } = useGridComponents()
const colPinEnabled = (table as unknown as Record<symbol, unknown>)[COL_PINNING_KEY] as boolean | undefined
```

Inside `headerGroup.headers.map(...)`, after computing `meta`:

```tsx
// Build column menu sections
const sections: ColumnMenuSections = {}
const colPinDef = meta?.columnPinning
const isStaticPin = colPinDef !== false && typeof colPinDef === 'object' && colPinDef?.pin !== undefined
const isPinningDisabled = colPinDef === false

if (colPinEnabled && !meta?.isSystemColumn && !isPinningDisabled && !isStaticPin && !header.isPlaceholder) {
	const isPinned = header.column.getIsPinned()
	sections.pin = {
		isPinned,
		canPinLeft: isPinned !== 'left',
		canPinRight: isPinned !== 'right',
		onPinLeft: () => {
			header.column.pin('left')
		},
		onPinRight: () => {
			header.column.pin('right')
		},
		onUnpin: () => {
			header.column.pin(false)
		},
	}
}

const hasSections = Object.keys(sections).length > 0
```

In the `<Th>` render, insert `ColumnMenu` after `sort-trigger`, before filter-extras:

```tsx
<Th ...>
  <div data-slot='sort-trigger' role={...} onClick={sortHandler} ...>
    {/* header content + sort indicator */}
  </div>
  {hasSections && (
    <ColumnMenu column={header.column} sections={sections} />
  )}
  {hasFiltering && ...filter...}
  {canResize && <Resizer ... />}
</Th>
```

---

### Phase 5 — Shadcn: ColumnMenu Block

**Step 12. `packages/data-grid/react/shadcn/src/blocks/ColumnMenu.tsx` (new)**

```tsx
import { ArrowLeft, ArrowRight, PinOff } from 'lucide-react'
import { EllipsisVertical } from 'lucide-react'

import { Button } from '../components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'

import type { ColumnMenuProps } from '@ez-kit/data-grid-react'

export function ColumnMenu({ sections }: ColumnMenuProps) {
	const { pin } = sections

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant='ghost'
					size='icon'
					className='h-6 w-6'
				>
					<EllipsisVertical className='h-3 w-3' />
					<span className='sr-only'>Column options</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='start'>
				{pin && (
					<>
						<DropdownMenuLabel>Pin</DropdownMenuLabel>
						{pin.canPinLeft && (
							<DropdownMenuItem onClick={pin.onPinLeft}>
								<ArrowLeft className='mr-2 h-4 w-4' />
								Pin Left
							</DropdownMenuItem>
						)}
						{pin.canPinRight && (
							<DropdownMenuItem onClick={pin.onPinRight}>
								<ArrowRight className='mr-2 h-4 w-4' />
								Pin Right
							</DropdownMenuItem>
						)}
						{pin.isPinned && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={pin.onUnpin}>
									<PinOff className='mr-2 h-4 w-4' />
									Unpin
								</DropdownMenuItem>
							</>
						)}
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
```

**Step 13. `packages/data-grid/react/shadcn/src/index.ts`**

Export `ColumnMenu` and add to default component overrides.

---

### Phase 6 — Sandbox Update

**Step 14. `apps/docs/app/sandbox/data-grid/page.tsx`**

Update `PinningExample` (old API → new):

```ts
// OLD:
pinning: { top: true, bottom: true }
// NEW:
pinning: { row: { top: true, bottom: true } }
```

Add `ColumnPinningExample`:

```tsx
const ColumnPinningExample = () => {
	const [data] = useState(INITIAL_DATA)

	const colPinColumns = defineColumns<User>([
		{ accessorKey: 'name', header: 'Name', pinning: { defaultPin: 'left' } },
		{ accessorKey: 'email', header: 'Email' },
		{ accessorKey: 'age', header: 'Age', cell: { type: 'number' } },
		{ accessorKey: 'active', header: 'Active', cell: { type: 'boolean' }, pinning: false },
	])

	const table = useDataGrid({
		data,
		columns: colPinColumns,
		sorting: true,
		pinning: { column: true },
	})

	return (
		<div>
			<h2>Column Pinning</h2>
			<p>Click ⋮ next to a column header to pin left / right or unpin. "Active" column has pinning disabled.</p>
			<DataGrid table={table} />
		</div>
	)
}
```

---

### Phase 7 — Test Updates

**Step 15. `packages/data-grid/core/src/create-table.test.ts`**

- Update "pinning" describe block: `pinning: { top: true }` → `pinning: { row: { top: true } }`
- Update test `'__actions__ column has pin: "right" in meta'` → `meta?.columnPinning?.pin`
- Add new tests for `pinning.column` shape:
  ```ts
  it('pinning: true enables enableRowPinning', ...)
  it('pinning: { column: true } does NOT enable row pinning', ...)
  it('pinning: true sets columnPinning initial state from ColumnDef.pinning.defaultPin', ...)
  ```

**Step 16. `packages/data-grid/core/src/column/map-columns.test.ts`**

- Update any tests that use `pin` in column defs → use `pinning: { pin: '...' }` or `pinning: { defaultPin: '...' }`
- Add test: `ColumnDef.pinning: { pin: 'left' }` → `meta.columnPinning.pin === 'left'`

**Step 17. `packages/data-grid/core/src/system-columns.test.ts`** (if exists)

- Update `extractPinningState` test expectations

---

## File Change Summary

| File                                       | Action  | Description                                                                                        |
| ------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------- |
| `core/src/column/types.ts`                 | Modify  | Remove `pin`, add `pinning?: false\|ColumnPinningDef`; update `ColumnMeta`                         |
| `core/src/types.ts`                        | Modify  | Add `PinningConfig`; change `TableConfig.pinning` type                                             |
| `core/src/system-columns.ts`               | Modify  | `extractPinningState` reads `meta.columnPinning`; actions col meta updated                         |
| `core/src/column/map-columns.ts`           | Modify  | Map `pinning` → `meta.columnPinning` instead of `pin` → `meta.pin`                                 |
| `core/src/create-table.ts`                 | Modify  | Add `normalizePinning` helper; use normalized values                                               |
| `core/src/index.ts`                        | Modify  | Export `ColumnPinningDef`, `PinningConfig`                                                         |
| `react/react/src/types.ts`                 | Modify  | Add `ColPinSection`, `ColumnMenuSections`, `ColumnMenuProps`; add `ColumnMenu` to `GridComponents` |
| `react/react/src/use-data-grid.ts`         | Modify  | Add `COL_PINNING_KEY`; store colPinning flag on table instance                                     |
| `react/react/src/components-context.tsx`   | Modify  | Add `DefaultColumnMenu`                                                                            |
| `react/react/src/data-grid/header.tsx`     | Modify  | Compute `sections`, render `<ColumnMenu>` after sort-trigger                                       |
| `react/react/src/index.ts`                 | Modify  | Export new types and symbol                                                                        |
| `react/shadcn/src/blocks/ColumnMenu.tsx`   | **New** | Shadcn dropdown implementation                                                                     |
| `react/shadcn/src/index.ts`                | Modify  | Export `ColumnMenu`, add to shadcn component overrides                                             |
| `apps/docs/app/sandbox/data-grid/page.tsx` | Modify  | Update `PinningExample` API; add `ColumnPinningExample`                                            |
| `core/src/create-table.test.ts`            | Modify  | Update pinning tests to new API                                                                    |
| `core/src/column/map-columns.test.ts`      | Modify  | Update pin field tests                                                                             |

---

## Risks

- **MEDIUM** — `column.pin(position)` availability in TanStack Table v8: need to verify method exists on column instance (expected: yes, via column pinning feature)
- **LOW** — `ColumnMenu` open state in default HTML implementation: needs to close on outside click (shadcn Dropdown handles this natively; default impl is minimal)
- **LOW** — header layout flex/grid: `sort-trigger` and `ColumnMenu` need to coexist without overlapping — CSS `display: flex` on `<th>` inner layout

## Success Criteria

- [ ] `pinning: true` enables both column menu UI and row pinning (top+bottom)
- [ ] `pinning: { column: true }` shows column menu in headers, no row pin column
- [ ] `pinning: { row: { top: true } }` shows row pin column, no column menu
- [ ] Column with `pinning: false` → no column menu for that column
- [ ] Column with `pinning: { pin: 'left' }` → starts pinned left, no pin section in menu
- [ ] Column with `pinning: { defaultPin: 'left' }` → starts pinned left, menu shows Unpin + Pin Right
- [ ] When no sections active → trigger icon not rendered
- [ ] System columns (selection, expand, actions, row_pin) → no column menu
- [ ] Sandbox example shows working column pin UI with shadcn dropdown
- [ ] All existing tests pass with updated API
- [ ] `pnpm ci` passes (lint, typecheck, test, build, size)
