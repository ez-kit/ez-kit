# Plan: Column Dependency Injection Refactor

## Summary

Replace hardcoded `<Input>` usage in cell, filter, editing, and creating rendering with a
flexible DI approach. Add a `component` field to every column-level config so users can
inject custom React components per column. Add a `CellTypeRegistry` so custom string types
(e.g. `cell: { type: 'my-type' }`) can be registered once and render everywhere automatically.

## User Story

As a library consumer, I want to configure any column's view, filter, edit, and create
rendering either via a typed preset (`cell: { type: 'number' }`) or an inline component
(`cell: { component: () => <MyWidget /> }`), so that I never have to fork or patch the
data-grid internals.

## Problem → Solution

**Current:** `cell.tsx`, `creating-row.tsx`, `header.tsx`, and `auto-form.tsx` all
hard-code `<Input>` for every editable / filterable cell; custom rendering is only
possible via the undocumented `cell.view` or `colDef.input` (typed as `unknown`).

**Desired:** Every column config object exposes a typed `component` field; an optional
`CellTypeRegistry` maps custom type strings to `{ view, edit, creating }` triples; built-in
types (`boolean`, `number`, `date`) get proper view-mode rendering automatically.

## Metadata

- **Complexity**: Large
- **Source PRD**: refactor-columns.md
- **PRD Phase**: N/A (single-phase refactor)
- **Estimated Files**: 11

---

## UX Design

### Before

```
defineColumns<User>([
  { accessorKey: 'active', header: 'Active', cell: { type: 'boolean' } },
  // renders raw "true" / "false" string in view mode
  // editing shows a plain text <input> regardless of type
  // no way to plug in a custom component per-column without forking
])
```

### After

```
defineColumns<User>([
  // built-in boolean: view renders ✓/✗, edit uses <input type="checkbox">
  { accessorKey: 'active', header: 'Active', cell: { type: 'boolean' } },

  // inline custom view component
  { accessorKey: 'age', header: 'Age', cell: { component: ({ value }) => <Badge>{value}</Badge> } },

  // inline custom edit component per column
  { accessorKey: 'status', header: 'Status', editing: { component: ({ value, onChange }) => <Select ... /> } },

  // custom filter component
  { accessorKey: 'name', header: 'Name', filtering: { component: ({ value, onChange }) => <Combobox ... /> } },

  // custom creating component
  { accessorKey: 'address', header: 'Address', creating: { component: ({ value, onChange }) => <AddressPicker ... /> } },

  // registry-based custom type (registered once in useDataGrid / DataGrid)
  { accessorKey: 'price', header: 'Price', cell: { type: 'currency' } },
])

// Register custom types once:
const table = useDataGrid({
  data, columns,
  cellTypes: {
    currency: {
      view: ({ value }) => <span>${value}</span>,
      edit: ({ value, onChange }) => <CurrencyInput value={value} onChange={onChange} />,
      // creating falls back to `edit` when omitted
    }
  }
})
<DataGrid table={table} />
```

### Interaction Changes

| Touchpoint         | Before           | After                                        | Notes          |
| ------------------ | ---------------- | -------------------------------------------- | -------------- |
| Boolean cell view  | "true" / "false" | ✓ / ✗ text                                   | built-in       |
| Number cell view   | raw number       | formatted number                             | built-in       |
| Date cell view     | raw ISO string   | formatted date                               | built-in       |
| Edit cell          | always `<Input>` | `editing.component` → registry → type-Input  | priority chain |
| Filter header      | always `<Input>` | `filtering.component` → `<Input>`            |                |
| Creating row/modal | always `<Input>` | `creating.component` → registry → type-Input |                |

---

## Mandatory Reading

| Priority | File                                                            | Lines | Why                         |
| -------- | --------------------------------------------------------------- | ----- | --------------------------- |
| P0       | `packages/data-grid/core/src/column/types.ts`                   | all   | Types to extend             |
| P0       | `packages/data-grid/react/react/src/data-grid/cell.tsx`         | all   | Main render target          |
| P0       | `packages/data-grid/react/react/src/data-grid/auto-form.tsx`    | all   | Editing/creating form       |
| P0       | `packages/data-grid/core/src/column/map-columns.ts`             | all   | Where types → meta          |
| P1       | `packages/data-grid/react/react/src/data-grid/header.tsx`       | all   | Filter rendering            |
| P1       | `packages/data-grid/react/react/src/data-grid/creating-row.tsx` | all   | Inline creating row         |
| P1       | `packages/data-grid/react/react/src/components-context.tsx`     | all   | DI pattern to mirror        |
| P1       | `packages/data-grid/react/react/src/use-data-grid.ts`           | all   | Hook to extend              |
| P1       | `packages/data-grid/react/react/src/data-grid/data-grid.tsx`    | all   | Root to wrap with provider  |
| P2       | `packages/data-grid/react/react/src/types.ts`                   | all   | GridComponents DI reference |
| P2       | `packages/data-grid/core/src/column/map-columns.test.ts`        | all   | Test patterns to mirror     |

## External Documentation

| Topic                     | Source            | Key Takeaway                                                                                                       |
| ------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| TanStack Table ColumnMeta | internal codebase | Augmented via `declare module '@tanstack/table-core'` in types.ts                                                  |
| React Context             | internal pattern  | `createContext` → `useContext` → JSX provider, no `React.createContext` wrapper needed (React 19 `<Ctx value={}>`) |

---

## Patterns to Mirror

### NAMING_CONVENTION

```ts
// SOURCE: packages/data-grid/react/react/src/components-context.tsx:131-144
export const defaultComponents: Required<GridComponents> = { ... }
const GridComponentsContext = createContext(defaultComponents)
export function GridComponentsProvider({ components, children }: ...) { ... }
export function useGridComponents(): Required<GridComponents> { ... }
```

→ New context follows identical pattern: `CellTypesContext`, `CellTypesProvider`, `useCellTypes`.

### DI_CONTEXT_MERGE

```ts
// SOURCE: packages/data-grid/react/react/src/components-context.tsx:155-166
const value = useMemo(() => {
	const prevMerged = { ...defaultComponents, ...parentComponents }
	const merged = components ? { ...prevMerged, ...components } : prevMerged
	return merged
}, [parentComponents, components])
```

→ CellTypesProvider merges parent registry with local overrides via `useMemo`.

### META_MAPPING

```ts
// SOURCE: packages/data-grid/core/src/column/map-columns.ts:46-51
if (pin !== undefined) meta.pin = pin
if (filtering !== undefined) meta.filtering = filtering
if (editing !== undefined) meta.editing = editing
if (creating !== undefined) meta.creating = creating
if (cell?.type !== undefined) meta.cellType = cell.type
if (cell?.input !== undefined) meta.cellInput = cell.input
```

→ New `cell.component` maps to `meta.cellView` the same way.

### COLUMN_META_AUGMENTATION

```ts
// SOURCE: packages/data-grid/core/src/column/types.ts:70-82
declare module '@tanstack/table-core' {
	interface ColumnMeta<TData, TValue> {
		pin?: 'left' | 'right'
		cellType?: CellType
		cellInput?: unknown
		filtering?: false | ColumnFilteringConfig
		editing?: false | ColumnEditingConfig
		creating?: false | ColumnCreatingConfig
		isSystemColumn?: boolean
	}
}
```

→ Add `cellView` to this block following the same pattern.

### COMPONENT_RESOLUTION (priority chain in cell.tsx)

```ts
// SOURCE: packages/data-grid/react/react/src/data-grid/auto-form.tsx:42-48
const customInput = colDef?.input as
  | ((props: { value: unknown; onChange: (v: unknown) => void }) => ReactNode)
  | undefined
if (customInput) { return <div key={col.id}>{customInput({ value, onChange })}</div> }
```

→ New resolution order: `column.component` → `registry[type].edit` → built-in type Input.

### TEST_STRUCTURE

```ts
// SOURCE: packages/data-grid/core/src/column/map-columns.test.ts:1-10
import { describe, expect, it, vi } from 'vitest'
import { mapColumns } from './map-columns'
import type { ColumnDef } from './types'

interface Row {
	id: number
	name: string
	age: number
}

describe('mapColumns', () => {
	it('cell.type goes into meta.cellType', () => {
		const result = mapColumns<Row>([{ accessorKey: 'age', cell: { type: 'number' } }])
		expect(result[0]?.meta?.cellType).toBe('number')
	})
})
```

→ All new tests follow this `describe/it/expect` pattern with `vitest`.

### REACT_CONTEXT_CONSUMPTION

```ts
// SOURCE: packages/data-grid/react/react/src/data-grid/cell.tsx:27-28
const table = useTableContext()
const { Td, Input, Checkbox } = useGridComponents()
```

→ Add `const cellTypes = useCellTypes()` alongside existing hooks.

---

## Files to Change

| File                                                            | Action | Justification                                                             |
| --------------------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| `packages/data-grid/core/src/column/types.ts`                   | UPDATE | Add `component` to CellDef + column configs; add `cellView` to ColumnMeta |
| `packages/data-grid/core/src/column/map-columns.ts`             | UPDATE | Map `cell.component` → `meta.cellView` + TanStack `cell` renderer         |
| `packages/data-grid/react/react/src/cell-types-context.tsx`     | CREATE | CellTypeRegistry types, context, provider, hook                           |
| `packages/data-grid/react/react/src/use-data-grid.ts`           | UPDATE | Accept `cellTypes` in config; store on table instance                     |
| `packages/data-grid/react/react/src/data-grid/data-grid.tsx`    | UPDATE | Accept `cellTypes` prop; wrap root with CellTypesProvider                 |
| `packages/data-grid/react/react/src/data-grid/cell.tsx`         | UPDATE | Type-aware view rendering; component-aware edit rendering                 |
| `packages/data-grid/react/react/src/data-grid/header.tsx`       | UPDATE | Support `filtering.component`                                             |
| `packages/data-grid/react/react/src/data-grid/creating-row.tsx` | UPDATE | Support `creating.component` + registry                                   |
| `packages/data-grid/react/react/src/data-grid/auto-form.tsx`    | UPDATE | Prefer `component` over `input`; check registry                           |
| `packages/data-grid/react/react/src/index.ts`                   | UPDATE | Export new types and CellTypesProvider                                    |
| `packages/data-grid/core/src/index.ts`                          | UPDATE | Export new component prop types                                           |

## NOT Building

- Changing the public `DataTable<TRow>` interface in core
- Adding `cellTypes` to the core `TableConfig` (it is React-layer only)
- Removing backward compat for `cell.view` or `colDef.input` (they remain)
- Building form validation / labels inside `AutoForm`
- Any UI styling / CSS
- Changing pagination, sorting, selection, or deletion behavior

---

## Step-by-Step Tasks

### Task 1: Extend core column types

- **ACTION**: Modify `packages/data-grid/core/src/column/types.ts`
- **IMPLEMENT**:
  1. Add `InputComponentProps` interface:
     ```ts
     export interface InputComponentProps {
     	value: unknown
     	onChange: (value: unknown) => void
     }
     ```
  2. Add `component?` to `CellDef` (alias for `view`, preferred name):
     ```ts
     export interface CellDef<TRow, TValue = unknown> {
     	type?: CellType
     	view?: (ctx: CellViewCtx<TRow, TValue>) => unknown // keep for compat
     	component?: (ctx: CellViewCtx<TRow, TValue>) => unknown // NEW: preferred
     	input?: unknown // keep for compat
     }
     ```
  3. Add `component?` to `ColumnFilteringConfig`, `ColumnEditingConfig`, `ColumnCreatingConfig`:
     ```ts
     export interface ColumnFilteringConfig {
     	input?: unknown
     	component?: (props: InputComponentProps) => unknown
     }
     export interface ColumnEditingConfig {
     	input?: unknown
     	component?: (props: InputComponentProps) => unknown
     }
     export interface ColumnCreatingConfig {
     	input?: unknown
     	component?: (props: InputComponentProps) => unknown
     }
     ```
  4. Add `cellView` to `ColumnMeta` augmentation:
     ```ts
     declare module '@tanstack/table-core' {
     	interface ColumnMeta<TData, TValue> {
     		// existing fields...
     		cellView?: (ctx: CellViewCtx<unknown, unknown>) => unknown // NEW
     	}
     }
     ```
- **MIRROR**: `COLUMN_META_AUGMENTATION` pattern
- **IMPORTS**: none new
- **GOTCHA**: `TValue` in `CellViewCtx` is generic — cast to `unknown` in meta to avoid complex generic propagation in TanStack's module augmentation
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-core typecheck` — zero errors

### Task 2: Update mapColumns to handle `cell.component`

- **ACTION**: Modify `packages/data-grid/core/src/column/map-columns.ts`
- **IMPLEMENT**:
  1. Resolve the view function: prefer `cell.component` over `cell.view`:
     ```ts
     const viewFn = cell?.component ?? cell?.view
     if (viewFn !== undefined) {
     	result.cell = (ctx: { row: { original: TRow; index: number }; getValue: () => unknown }) =>
     		viewFn({ row: ctx.row.original, value: ctx.getValue(), rowIndex: ctx.row.index })
     }
     // Store in meta too so React layer can access without re-deriving
     if (viewFn !== undefined) meta.cellView = viewFn as (ctx: CellViewCtx<unknown, unknown>) => unknown
     ```
  2. Keep all existing meta mappings unchanged.
- **MIRROR**: `META_MAPPING` pattern
- **IMPORTS**: `CellViewCtx` from `./types`
- **GOTCHA**: `cell.view` and `cell.component` must NOT both set `result.cell` — use `??` so `component` wins, and only set `meta.cellView` once
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-core test` — existing map-columns tests pass; add new test: `it('cell.component maps to TanStack cell renderer and meta.cellView', ...)`

### Task 3: Create CellTypeRegistry context (react layer)

- **ACTION**: Create `packages/data-grid/react/react/src/cell-types-context.tsx`
- **IMPLEMENT**:

  ```tsx
  import { createContext, useContext, useMemo } from 'react'
  import type { ComponentType, ReactNode } from 'react'

  export interface CellViewProps {
  	value: unknown
  	row: unknown
  	rowIndex: number
  }

  export interface CellInputProps {
  	value: unknown
  	onChange: (value: unknown) => void
  }

  export interface CellTypeDefinition {
  	/** View-mode renderer */
  	view?: (props: CellViewProps) => ReactNode
  	/** Edit-mode input. Falls back to `creating` if omitted. */
  	edit?: (props: CellInputProps) => ReactNode
  	/** Create-mode input. Falls back to `edit` if omitted. */
  	creating?: (props: CellInputProps) => ReactNode
  }

  export type CellTypeRegistry = Record<string, CellTypeDefinition>

  const CellTypesContext = createContext<CellTypeRegistry>({})

  export interface CellTypesProviderProps {
  	types: CellTypeRegistry
  	children: ReactNode
  }

  export function CellTypesProvider({ types, children }: CellTypesProviderProps) {
  	const parent = useContext(CellTypesContext)
  	const merged = useMemo(() => ({ ...parent, ...types }), [parent, types])
  	return <CellTypesContext value={merged}>{children}</CellTypesContext>
  }

  export function useCellTypes(): CellTypeRegistry {
  	return useContext(CellTypesContext)
  }
  ```

- **MIRROR**: `DI_CONTEXT_MERGE` and `NAMING_CONVENTION` patterns from `components-context.tsx`
- **IMPORTS**: `createContext`, `useContext`, `useMemo` from `react`
- **GOTCHA**: React 19 JSX provider syntax — use `<CellTypesContext value={merged}>` not `<CellTypesContext.Provider value={merged}>` (match existing pattern in `components-context.tsx` line 166)
- **VALIDATE**: File has no TS errors (`pnpm --filter @ez-kit/data-grid-react typecheck`)

### Task 4: Extend `useDataGrid` to accept `cellTypes`

- **ACTION**: Modify `packages/data-grid/react/react/src/use-data-grid.ts`
- **IMPLEMENT**:

  ```ts
  import type { CellTypeRegistry } from './cell-types-context'

  export interface UseDataGridConfig<TRow extends object> extends TableConfig<TRow> {
  	/** Custom cell type renderers. Pass to DataGrid via table instance. */
  	cellTypes?: CellTypeRegistry
  }

  // Internal symbol to carry cellTypes on the table instance
  const CELL_TYPES_KEY = Symbol('cellTypes')

  export function useDataGrid<TRow extends object>(config: UseDataGridConfig<TRow>): DataTable<TRow> {
  	const { cellTypes, ...tableConfig } = config // strip before passing to core
  	const tableRef = useRef<DataTable<TRow> | null>(null)
  	tableRef.current ??= createTable(tableConfig as TableConfig<TRow>)

  	// Store cellTypes on the table instance so DataGrid can read without extra prop
  	const cellTypesRef = useRef(cellTypes)
  	cellTypesRef.current = cellTypes
  	;(tableRef.current as Record<symbol, unknown>)[CELL_TYPES_KEY] = cellTypesRef.current

  	// ... rest of function body unchanged (useSyncExternalStore, data sync, loading sync)
  	return tableRef.current
  }

  /** @internal — read by DataGridRoot */
  export { CELL_TYPES_KEY }
  ```

- **MIRROR**: `useRef` + `??=` pattern from existing `use-data-grid.ts:18-19`
- **IMPORTS**: `CellTypeRegistry` from `./cell-types-context`; `UseDataGridConfig` and `CELL_TYPES_KEY` exported
- **GOTCHA**: Must destructure `cellTypes` from config **before** passing to `createTable` — core does not know about `cellTypes`
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-react typecheck`; `use-data-grid.test.tsx` passes

### Task 5: Wrap DataGrid root with CellTypesProvider

- **ACTION**: Modify `packages/data-grid/react/react/src/data-grid/data-grid.tsx`
- **IMPLEMENT**:
  1. Add `cellTypes?` to `DataGridProps`:

     ```ts
     import type { CellTypeRegistry } from '../cell-types-context'

     export interface DataGridProps<TRow extends object> {
     	table: DataTable<TRow>
     	components?: GridComponents
     	cellTypes?: CellTypeRegistry // NEW
     	children?: ReactNode
     }
     ```

  2. In `DataGridRoot`, resolve cell types and wrap:

     ```tsx
     import { CELL_TYPES_KEY } from '../use-data-grid'
     import { CellTypesProvider } from '../cell-types-context'

     function DataGridRoot<TRow extends object>({ table, components, cellTypes, children }: DataGridProps<TRow>) {
     	// Read cellTypes from table instance (set via useDataGrid) or direct prop
     	const tableCellTypes = (table as Record<symbol, unknown>)[CELL_TYPES_KEY] as CellTypeRegistry | undefined
     	const resolvedCellTypes = { ...tableCellTypes, ...cellTypes }

     	return (
     		<CellTypesProvider types={resolvedCellTypes}>
     			<GridComponentsProvider {...(components !== undefined ? { components } : {})}>
     				<TableContext value={table}>
     					{children ?? <DefaultLayout />}
     					{table.options.creating?.mode === 'modal' && <CreatingModal />}
     					{table.options.editing?.mode === 'modal' && <EditingModal />}
     				</TableContext>
     			</GridComponentsProvider>
     		</CellTypesProvider>
     	)
     }
     ```

- **MIRROR**: `GridComponentsProvider` wrapping pattern at `data-grid.tsx:49-58`
- **IMPORTS**: `CellTypesProvider` from `../cell-types-context`; `CELL_TYPES_KEY` from `../use-data-grid`
- **GOTCHA**: `CellTypesProvider` must be the **outer** wrapper — it must contain `GridComponentsProvider` and `TableContext` so all inner components can read from it
- **VALIDATE**: Render snapshot test still passes

### Task 6: Add type-aware and component-aware cell view rendering

- **ACTION**: Modify `packages/data-grid/react/react/src/data-grid/cell.tsx`
- **IMPLEMENT**:
  The file has three rendering branches. Update each:

  **A) Editing cell branch (cell mode and row/modal mode)**

  ```tsx
  import { useCellTypes } from '../cell-types-context'

  // Inside DataGridCell:
  const cellTypes = useCellTypes()

  // In isEditingThisCell branch — replace raw <Input> with resolved component:
  const editComponent = resolveEditComponent(meta, columnId, cellTypes)
  if (isEditingThisCell) {
    return (
      <Td style={pinStyles}>
        {editComponent
          ? editComponent({ value: editingState.editingValues[columnId], onChange: (v) => table.setEditingValue(columnId, v) })
          : <Input autoFocus value={...} onChange={...} onBlur={...} />
        }
      </Td>
    )
  }

  // In isEditingRow branch — same pattern without autoFocus:
  if (isEditingRow && meta?.editing !== false) {
    const editComp = resolveEditComponent(meta, columnId, cellTypes)
    return (
      <Td style={pinStyles}>
        {editComp
          ? editComp({ value: editingState.editingValues[columnId], onChange: (v) => table.setEditingValue(columnId, v) })
          : <Input value={...} onChange={...} />
        }
      </Td>
    )
  }
  ```

  **B) Normal cell branch — type-aware view**

  ```tsx
  // After the editing branches, before return:
  const cellView = resolveViewComponent(meta, cellTypes)
  const value = cell.getValue()

  return (
  	<Td
  		style={pinStyles}
  		onDoubleClick={handleDoubleClick}
  	>
  		{cellView
  			? cellView({ value, row: cell.row.original, rowIndex: cell.row.index })
  			: flexRender(cell.column.columnDef.cell, cell.getContext() as unknown as Record<string, unknown>)}
  	</Td>
  )
  ```

  **C) Helper functions (add at bottom of file, not exported)**

  ```tsx
  import type { CellTypeRegistry } from '../cell-types-context'
  import type { ColumnMeta } from '@tanstack/table-core'
  import type { ReactNode } from 'react'
  import type { InputComponentProps, CellViewProps } from '../cell-types-context'

  function resolveEditComponent(
  	meta: ColumnMeta<unknown, unknown> | undefined,
  	_columnId: string,
  	registry: CellTypeRegistry,
  ): ((props: InputComponentProps) => ReactNode) | undefined {
  	// 1. column-level editing.component
  	const colComp = meta?.editing as { component?: (p: InputComponentProps) => ReactNode } | false | undefined
  	if (colComp && colComp !== false && colComp.component) return colComp.component
  	// 2. registry by cellType
  	if (meta?.cellType) {
  		const def = registry[meta.cellType]
  		if (def?.edit) return def.edit as (p: InputComponentProps) => ReactNode
  	}
  	return undefined
  }

  function resolveViewComponent(
  	meta: ColumnMeta<unknown, unknown> | undefined,
  	registry: CellTypeRegistry,
  ): ((props: CellViewProps) => ReactNode) | undefined {
  	// 1. meta.cellView (from cell.component / cell.view mapping)
  	if (meta?.cellView) return meta.cellView as (p: CellViewProps) => ReactNode
  	// 2. registry by cellType
  	if (meta?.cellType) {
  		const def = registry[meta.cellType]
  		if (def?.view) return def.view as (p: CellViewProps) => ReactNode
  		// 3. built-in type rendering
  		return builtInView(meta.cellType)
  	}
  	return undefined
  }

  function builtInView(cellType: string): ((props: CellViewProps) => ReactNode) | undefined {
  	if (cellType === 'boolean') return ({ value }) => <>{value ? '✓' : '✗'}</>
  	if (cellType === 'number') return ({ value }) => <>{typeof value === 'number' ? value.toLocaleString() : value}</>
  	if (cellType === 'date')
  		return ({ value }) => {
  			if (!value) return null
  			const d = value instanceof Date ? value : new Date(String(value))
  			return <>{isNaN(d.getTime()) ? String(value) : d.toLocaleDateString()}</>
  		}
  	return undefined
  }
  ```

- **MIRROR**: `REACT_CONTEXT_CONSUMPTION` and `COMPONENT_RESOLUTION` patterns
- **IMPORTS**: `useCellTypes` from `../cell-types-context`; helper types as above
- **GOTCHA**: `meta?.editing` can be `false | ColumnEditingConfig | undefined` — always check `!== false` before accessing `.component`; cast via intermediate type
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-react test`; manually verify boolean cell shows ✓/✗

### Task 7: Support `filtering.component` in header

- **ACTION**: Modify `packages/data-grid/react/react/src/data-grid/header.tsx`
- **IMPLEMENT**:
  Replace the hardcoded `<Input>` filter with component resolution:

  ```tsx
  import { useCellTypes } from '../cell-types-context'
  import type { InputComponentProps } from '../cell-types-context'

  // Inside Header():
  const cellTypes = useCellTypes()

  // Inside the filter rendering block:
  {
  	hasFiltering && meta?.filtering !== false && !meta?.isSystemColumn && header.column.getCanFilter() && (
  		<div>
  			{(() => {
  				const filterValue = (header.column.getFilterValue() as unknown) ?? ''
  				const onChange = (v: unknown) => header.column.setFilterValue(v)
  				// 1. column-level filtering.component
  				const colComp = (meta?.filtering as { component?: (p: InputComponentProps) => ReactNode } | undefined)
  					?.component
  				if (colComp) return colComp({ value: filterValue, onChange })
  				// 2. default Input
  				return (
  					<Input
  						placeholder={`Filter ${header.column.id}…`}
  						value={filterValue as string}
  						onChange={(e) => {
  							header.column.setFilterValue(e.target.value)
  						}}
  						onClick={(e) => {
  							e.stopPropagation()
  						}}
  					/>
  				)
  			})()}
  		</div>
  	)
  }
  ```

- **MIRROR**: Priority resolution pattern from `auto-form.tsx:42-48`
- **IMPORTS**: `useCellTypes`, `InputComponentProps` from `../cell-types-context`
- **GOTCHA**: `header.column.setFilterValue` expects the raw filter value — custom components must call `onChange` with a compatible value (string for built-in); document this in types
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-react test` passes

### Task 8: Support `creating.component` in creating row

- **ACTION**: Modify `packages/data-grid/react/react/src/data-grid/creating-row.tsx`
- **IMPLEMENT**:
  Replace hardcoded `<Input>` in the data cell:

  ```tsx
  import { useCellTypes } from '../cell-types-context'
  import type { CellTypeRegistry, InputComponentProps } from '../cell-types-context'

  // Inside CreatingRow():
  const cellTypes = useCellTypes()

  // Replace the last return block:
  return (
  	<Td key={col.id}>
  		{(() => {
  			const value = values[col.id] ?? ''
  			const onChange = (v: unknown) => {
  				table.setCreatingValue(col.id, v)
  			}
  			// 1. column-level creating.component
  			const creating = meta?.creating as { component?: (p: InputComponentProps) => ReactNode } | undefined
  			if (creating?.component) return creating.component({ value, onChange })
  			// 2. registry edit/creating by cellType
  			if (meta?.cellType) {
  				const def = cellTypes[meta.cellType]
  				const comp = def?.creating ?? def?.edit
  				if (comp) return comp({ value, onChange })
  			}
  			// 3. default Input
  			return (
  				<Input
  					value={value as string | number | readonly string[]}
  					onChange={(e) => {
  						table.setCreatingValue(col.id, e.target.value)
  					}}
  				/>
  			)
  		})()}
  	</Td>
  )
  ```

- **MIRROR**: `COMPONENT_RESOLUTION` priority chain
- **IMPORTS**: `useCellTypes`, `InputComponentProps` from `../cell-types-context`
- **GOTCHA**: `creating` fallback: registry's `creating` → registry's `edit` (not view). This mirrors the user requirement "if creating is not provided, edit is used"
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-react test` — creating row still shows inputs

### Task 9: Update AutoForm for editing + creating modals

- **ACTION**: Modify `packages/data-grid/react/react/src/data-grid/auto-form.tsx`
- **IMPLEMENT**:
  Replace the `customInput` resolution block with full priority chain:

  ```tsx
  import { useCellTypes } from '../cell-types-context'
  import type { InputComponentProps } from '../cell-types-context'

  // Inside AutoForm():
  const cellTypes = useCellTypes()

  // Replace the per-column rendering block:
  const value = values[col.id]
  const onChange = (v: unknown): void => { setValue(col.id, v) }

  // 1. column-level component (prefer `component` over legacy `input`)
  const colDef = mode === 'creating' ? meta?.creating : meta?.editing
  const colComponent = (colDef as { component?: (p: InputComponentProps) => ReactNode } | false | undefined)
  const legacyInput = (colDef as { input?: (p: InputComponentProps) => ReactNode } | false | undefined)
  const directComp = colComponent !== false ? colComponent?.component : undefined
  const legacyComp = legacyInput !== false ? legacyInput?.input as ((p: InputComponentProps) => ReactNode) | undefined : undefined
  const resolvedDirect = directComp ?? legacyComp

  if (resolvedDirect) {
    return <div key={col.id}>{resolvedDirect({ value, onChange })}</div>
  }

  // 2. registry by cellType
  if (meta?.cellType) {
    const def = cellTypes[meta.cellType]
    const regComp = mode === 'creating'
      ? (def?.creating ?? def?.edit)
      : def?.edit
    if (regComp) return <div key={col.id}>{regComp({ value, onChange })}</div>
  }

  // 3. built-in type-aware Input (existing logic — keep as-is)
  const inputType = meta?.cellType === 'number' ? 'number'
    : meta?.cellType === 'date' ? 'date'
    : meta?.cellType === 'boolean' ? 'checkbox'
    : 'text'

  return (
    <div key={col.id}>
      <label>{col.id}</label>
      <Input ... />  {/* existing JSX unchanged */}
    </div>
  )
  ```

- **MIRROR**: `COMPONENT_RESOLUTION` priority chain; backward compat with `legacy.input`
- **IMPORTS**: `useCellTypes`, `InputComponentProps` from `../cell-types-context`
- **GOTCHA**: `meta?.creating` / `meta?.editing` can be `false | ColumnConfig | undefined` — always gate with `!== false` via type narrowing before accessing `.component`
- **VALIDATE**: AutoForm still renders in modal mode for boolean/number columns

### Task 10: Update exports

- **ACTION**: Modify `packages/data-grid/react/react/src/index.ts` and `packages/data-grid/core/src/index.ts`
- **IMPLEMENT**:

  **react/index.ts** — add:

  ```ts
  export type { CellTypeDefinition, CellTypeRegistry, CellViewProps, CellInputProps } from './cell-types-context'
  export { CellTypesProvider, useCellTypes } from './cell-types-context'
  export type { UseDataGridConfig } from './use-data-grid'
  ```

  **core/index.ts** — add:

  ```ts
  export type { InputComponentProps } from './column/types'
  ```

- **MIRROR**: Existing export grouping in both files
- **GOTCHA**: `CellTypesProvider` is React-specific — only export from react package, not core
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-react build` — dist/index.d.ts includes new exports

### Task 11: Tests for new functionality

- **ACTION**: Add tests to `packages/data-grid/core/src/column/map-columns.test.ts` and `packages/data-grid/react/react/src/data-grid/data-grid.test.tsx`
- **IMPLEMENT**:

  **map-columns.test.ts** additions:

  ```ts
  it('cell.component maps to TanStack cell renderer and meta.cellView', () => {
  	const component = vi.fn().mockReturnValue('custom')
  	const result = mapColumns<Row>([{ accessorKey: 'name', cell: { component } }])
  	expect(result[0]?.cell).toBeTypeOf('function')
  	expect(result[0]?.meta?.cellView).toBeTypeOf('function')
  })

  it('cell.component takes priority over cell.view', () => {
  	const view = vi.fn()
  	const component = vi.fn().mockReturnValue('component-wins')
  	const result = mapColumns<Row>([{ accessorKey: 'name', cell: { view, component } }])
  	// call the mapped renderer
  	const ctx = { row: { original: { id: 1, name: 'x', age: 0 }, index: 0 }, getValue: () => 'x' }
  	const cellFn = result[0]?.cell as ((ctx: typeof ctx) => unknown) | undefined
  	cellFn?.(ctx)
  	expect(component).toHaveBeenCalled()
  	expect(view).not.toHaveBeenCalled()
  })

  it('filtering.component stored in meta.filtering', () => {
  	const component = vi.fn()
  	const result = mapColumns<Row>([{ accessorKey: 'name', filtering: { component } }])
  	expect((result[0]?.meta?.filtering as { component?: unknown })?.component).toBe(component)
  })
  ```

  **data-grid.test.tsx** additions:

  ```tsx
  it('renders custom cell component when cell.component is provided', () => {
  	const cols = defineColumns<User>([
  		{
  			accessorKey: 'name',
  			header: 'Name',
  			cell: { component: ({ value }) => <span data-testid='custom'>{String(value)}</span> },
  		},
  		{ accessorKey: 'age', header: 'Age' },
  	])
  	const table = makeTable({ ...configWith(cols) })
  	render(<DataGrid table={table} />)
  	expect(screen.getAllByTestId('custom')).toHaveLength(USERS.length)
  })

  it('renders ✓ and ✗ for boolean cell type', () => {
  	// test boolean built-in view rendering
  })
  ```

- **MIRROR**: `TEST_STRUCTURE` pattern
- **IMPORTS**: Same as existing test files
- **GOTCHA**: `makeTable` in data-grid.test.tsx uses `COLUMNS` const — pass custom columns via the spread config pattern
- **VALIDATE**: `pnpm --filter @ez-kit/data-grid-core test` and `pnpm --filter @ez-kit/data-grid-react test` — all pass

---

## Testing Strategy

### Unit Tests

| Test                                              | Input                                                       | Expected Output                   | Edge Case? |
| ------------------------------------------------- | ----------------------------------------------------------- | --------------------------------- | ---------- |
| `cell.component` → TanStack renderer              | `cell: { component: fn }`                                   | `result.cell` is function         | No         |
| `cell.component` priority over `cell.view`        | both set                                                    | `component` wins                  | Yes        |
| `filtering.component` in meta                     | `filtering: { component: fn }`                              | `meta.filtering.component` is fn  | No         |
| `editing.component` in meta                       | `editing: { component: fn }`                                | `meta.editing.component` is fn    | No         |
| boolean view renders ✓/✗                          | `cellType: 'boolean'`, value true/false                     | ✓ / ✗                             | No         |
| number view formats number                        | `cellType: 'number'`, value 1234                            | "1,234" (locale)                  | No         |
| registry custom type in view                      | `cellTypes: { foo: { view: fn } }`, `cell: { type: 'foo' }` | fn called                         | No         |
| registry falls back edit→creating                 | `cellTypes: { foo: { edit: fn } }`, creating mode           | fn called                         | Yes        |
| `creating.component` overrides registry           | both set                                                    | column-level wins                 | Yes        |
| `useDataGrid` strips `cellTypes` from core config | pass `cellTypes`                                            | `createTable` does not receive it | Yes        |

### Edge Cases Checklist

- [ ] `filtering: false` — component resolution skipped entirely
- [ ] `editing: false` — component resolution skipped entirely
- [ ] `creating: false` — component resolution skipped entirely
- [ ] `cell.type` is a registered type AND `cell.component` is set — `cell.component` wins for view
- [ ] Registry type with no `creating` — falls back to `edit`
- [ ] Registry type with no `view` — falls back to `flexRender` default
- [ ] `cellTypes` passed both via `useDataGrid` and `DataGrid` prop — prop overrides (spread order)
- [ ] System columns (selection/expand/actions) — component resolution never reached

---

## Validation Commands

### Type Check

```bash
pnpm --filter @ez-kit/data-grid-core typecheck
pnpm --filter @ez-kit/data-grid-react typecheck
```

EXPECT: Zero type errors

### Unit Tests

```bash
pnpm --filter @ez-kit/data-grid-core test
pnpm --filter @ez-kit/data-grid-react test
```

EXPECT: All tests pass, no regressions

### Full Build

```bash
pnpm build
```

EXPECT: All packages build successfully

### Lint

```bash
pnpm lint
```

EXPECT: Zero warnings (max-warnings=0)

### Manual Validation

- [ ] Open `apps/docs/app/sandbox/data-grid/page.tsx` and add `cell: { type: 'boolean' }` to `active` column → grid shows ✓/✗
- [ ] Add `cell: { component: ({ value }) => <strong>{String(value)}</strong> }` to `name` column → bold names appear
- [ ] Add `editing: { component: ({ value, onChange }) => <input type="range" value={Number(value)} onChange={e => onChange(e.target.value)} /> }` to `age` → range slider in edit mode
- [ ] Pass `cellTypes: { money: { view: ({ value }) => <>€{value}</>, edit: ({ value, onChange }) => <input type="number" .../> } }` to `useDataGrid`; add `cell: { type: 'money' }` to a column → € prefix in view, number input in edit

---

## Acceptance Criteria

- [ ] All tasks completed (11 tasks)
- [ ] All validation commands pass
- [ ] Tests written and passing for new behavior
- [ ] No type errors
- [ ] No lint errors
- [ ] `cell.view` and `colDef.input` still work (backward compat)
- [ ] Built-in types (`boolean`, `number`, `date`) render properly in view mode
- [ ] `cell: { component }` works in view mode
- [ ] `filtering: { component }` replaces filter Input in header
- [ ] `editing: { component }` replaces Input in cell edit + AutoForm
- [ ] `creating: { component }` replaces Input in creating row + AutoForm
- [ ] `cellTypes` registry resolves view / edit / creating per type
- [ ] `creating` falls back to `edit` in registry when omitted
- [ ] `cellTypes` can be passed via `useDataGrid` config or `DataGrid` prop

## Completion Checklist

- [ ] Code follows `components-context.tsx` DI pattern exactly
- [ ] Helper functions in `cell.tsx` are unexported (file-private)
- [ ] No hardcoded strings for `'boolean'` / `'number'` / `'date'` outside `builtInView`
- [ ] `meta?.editing !== false` guard used everywhere before accessing config properties
- [ ] No `any` — use `unknown` and narrow, consistent with existing code
- [ ] `import type` for all type-only imports (ESLint rule enforced)
- [ ] No `console.log` left in production code (existing `console.log` in `create-data-grid.tsx:25` is pre-existing — do not add new ones)

## Risks

| Risk                                                                        | Likelihood | Impact | Mitigation                                                                                                        |
| --------------------------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| Symbol key for `_cellTypes` on table not visible across module boundaries   | Low        | Medium | Export `CELL_TYPES_KEY` symbol; use consistent import                                                             |
| `meta?.editing as { component? }` cast causing TS errors in strict mode     | Medium     | Low    | Use intermediate narrowing; gate `!== false` first                                                                |
| `builtInView` locale differences in tests                                   | Low        | Low    | Use `value.toLocaleString()` — Jest/Vitest uses system locale; assert presence not exact string                   |
| `createDataGrid` factory in `create-data-grid.tsx` doesn't pass `cellTypes` | Low        | Medium | `createDataGrid` creates bound `DataGrid`; users using factory still pass `cellTypes` directly to `DataGrid` prop |

## Notes

- The existing `colDef.input` pattern (typed as `unknown` in `auto-form.tsx:42`) is effectively the same as the new `component` field but untyped. We preserve it for backward compat and prefer `component` in new code.
- `cell.view` vs `cell.component`: these are functionally identical. `component` is the documented, preferred name going forward. `view` is kept for backward compat.
- The `CellTypesProvider` wraps outside `GridComponentsProvider` in `DataGridRoot` so it is available to all inner components, including any user-provided compound children.
- `useDataGrid` still returns `DataTable<TRow>` (not `UseDataGridConfig`) — the return type is unchanged for full backward compat.
