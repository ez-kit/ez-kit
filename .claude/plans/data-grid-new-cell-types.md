# Plan: New Cell Types — select, badge, image, link, progress

## Context

Monorepo at `ez-kit/ez-kit/`. All edits are relative to that root.

Architecture layers:

- `packages/data-grid/core/` — headless, framework-agnostic types + TanStack mapping
- `packages/data-grid/react/react/` — React adapter (cell registry, rendering)
- `packages/data-grid/react/shadcn/` — Shadcn UI flavor (concrete components)
- `apps/docs/app/sandbox/data-grid/` — sandbox demo page

Each new type must provide: **view** (read-only cell), **edit** input, **creating** input (falls back to edit), **filter** input.

---

## Cell config shape (discriminated union with `config` field)

```ts
// select
cell: { type: 'select', config: { items: Array<{ value: string; label: string }> } }

// badge
cell: { type: 'badge', config: { items: Array<{ value: string; label: string; variant?: BadgeVariant }> } }
// BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

// image
cell: { type: 'image', config?: { alt?: string; width?: number; height?: number } }

// link — no config needed (value is the href, displayed as text)
cell: { type: 'link' }

// progress
cell: { type: 'progress', config?: { max?: number } }  // max defaults to 100
```

---

## Phase 1 — Core: types + mapping

### 1.1 `packages/data-grid/core/src/column/types.ts`

- Add `'select' | 'badge' | 'image' | 'link' | 'progress'` to the `CellType` union.
- Add config interfaces:

  ```ts
  export interface SelectItem {
  	value: string
  	label: string
  }
  export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'
  export interface BadgeItem {
  	value: string
  	label: string
  	variant?: BadgeVariant
  }

  export interface SelectCellConfig {
  	items: SelectItem[]
  }
  export interface BadgeCellConfig {
  	items: BadgeItem[]
  }
  export interface ImageCellConfig {
  	alt?: string
  	width?: number
  	height?: number
  }
  export interface ProgressCellConfig {
  	max?: number
  }
  ```

- Replace the current `CellDef<TRow, TValue>` interface with a discriminated union:

  ```ts
  type SimpleType = Exclude<CellType, 'select' | 'badge' | 'image' | 'link' | 'progress'>

  interface BasicCellDef<TRow, TValue = unknown> {
  	type?: SimpleType
  	component?: (ctx: CellViewCtx<TRow, TValue>) => unknown
  }
  interface SelectCellDef<TRow, TValue = unknown> {
  	type: 'select'
  	config: SelectCellConfig
  	component?: (ctx: CellViewCtx<TRow, TValue>) => unknown
  }
  interface BadgeCellDef<TRow, TValue = unknown> {
  	type: 'badge'
  	config: BadgeCellConfig
  	component?: (ctx: CellViewCtx<TRow, TValue>) => unknown
  }
  interface ImageCellDef<TRow, TValue = unknown> {
  	type: 'image'
  	config?: ImageCellConfig
  	component?: (ctx: CellViewCtx<TRow, TValue>) => unknown
  }
  interface LinkCellDef<TRow, TValue = unknown> {
  	type: 'link'
  	component?: (ctx: CellViewCtx<TRow, TValue>) => unknown
  }
  interface ProgressCellDef<TRow, TValue = unknown> {
  	type: 'progress'
  	config?: ProgressCellConfig
  	component?: (ctx: CellViewCtx<TRow, TValue>) => unknown
  }

  export type CellDef<TRow extends object, TValue = unknown> =
  	| BasicCellDef<TRow, TValue>
  	| SelectCellDef<TRow, TValue>
  	| BadgeCellDef<TRow, TValue>
  	| ImageCellDef<TRow, TValue>
  	| LinkCellDef<TRow, TValue>
  	| ProgressCellDef<TRow, TValue>
  ```

- Add `cellConfig?: Record<string, unknown>` to the TanStack `ColumnMeta` module augmentation block.

### 1.2 `packages/data-grid/core/src/column/map-columns.ts`

In `mapColumn()`, after `if (cell?.type !== undefined) meta.cellType = cell.type`, add:

```ts
if ('config' in cell && cell.config !== undefined) {
	meta.cellConfig = cell.config as Record<string, unknown>
}
```

---

## Phase 2 — React: thread `cellConfig` through props

### 2.1 `packages/data-grid/react/react/src/cell-types-context.tsx`

Add `cellConfig?: Record<string, unknown>` to both `CellViewProps` and `CellInputProps`.

### 2.2 `packages/data-grid/react/react/src/data-grid/cell.tsx`

- In the view call: `viewComp({ value: ..., row: ..., rowIndex: ..., cellConfig: meta?.cellConfig })`
- In every edit call: `editComp({ value, onChange, cellConfig: meta?.cellConfig })`

### 2.3 `packages/data-grid/react/react/src/data-grid/auto-form.tsx`

- In every registry component call and column-level component call, add `cellConfig: meta?.cellConfig`.

---

## Phase 3 — Shadcn: implement the 5 cell-type UI blocks

Create directory `packages/data-grid/react/shadcn/src/blocks/cell-types/`.

### 3.1 `SelectCellView.tsx`

- Receives `{ value, cellConfig }`.
- Finds the item in `cellConfig.items` where `item.value === value`.
- Renders the item label (fallback: `String(value ?? '')`).

### 3.2 `SelectCellInput.tsx`

- Receives `{ value, onChange, cellConfig }`.
- Renders shadcn `<Select>` with `cellConfig.items` as options.
- Filter variant: prepend an "All" option (`value: ''`, `label: 'All'`) and call `onChange(undefined)` when selected.
- Reused for edit, creating, and filter.

### 3.3 `BadgeCellView.tsx`

- Receives `{ value, cellConfig }`.
- Finds item in `cellConfig.items`.
- Renders shadcn `<Badge variant={item.variant ?? 'default'}>` with item label.
- Fallback: `<Badge>{String(value ?? '')}</Badge>`.

### 3.4 `BadgeCellInput.tsx`

- Same as `SelectCellInput.tsx` (shares the Select UI — badge edit/filter is just a select).

### 3.5 `ImageCellView.tsx`

- Receives `{ value, cellConfig }`.
- Renders `<img src={String(value)} alt={cellConfig?.alt ?? ''} width={cellConfig?.width} height={cellConfig?.height} />`.
- Wraps in a `<span>` for alignment.

### 3.6 `ImageCellInput.tsx`

- Plain `<Input type="url" value={String(value ?? '')} onChange={e => onChange(e.target.value)} />`.

### 3.7 `LinkCellView.tsx`

- Renders shadcn `<Button variant="link" asChild><a href={String(value)} target="_blank" rel="noreferrer">{String(value ?? '')}</a></Button>`.

### 3.8 `LinkCellInput.tsx`

- Plain `<Input type="url" value={String(value ?? '')} onChange={e => onChange(e.target.value)} />`.

### 3.9 `ProgressCellView.tsx`

- Receives `{ value, cellConfig }`.
- `max = cellConfig?.max ?? 100`, `pct = (Number(value) / max) * 100`.
- Renders shadcn `<Progress value={pct} />` with a numeric label alongside.

### 3.10 `ProgressCellInput.tsx`

- Renders shadcn `<NumberInput>` (uses the DI-injected component from `useGridComponents()`).

### 3.11 `packages/data-grid/react/shadcn/src/blocks/shadcn-cell-types.ts`

- Assembles and exports `SHADCN_CELL_TYPES: CellTypeRegistry`:
  ```ts
  export const SHADCN_CELL_TYPES: CellTypeRegistry = {
    select:   { view: ..., edit: ..., filter: ... },
    badge:    { view: ..., edit: ..., filter: ... },
    image:    { view: ..., edit: ..., filter: ... },
    link:     { view: ..., edit: ..., filter: ... },
    progress: { view: ..., edit: ..., filter: ... },
  }
  ```

---

## Phase 4 — Shadcn: wire into package index

### 4.1 `packages/data-grid/react/shadcn/src/index.ts`

- Import `SHADCN_CELL_TYPES` and `CellTypesProvider` (from `@ez-kit/data-grid-react`).
- Wrap `BoundDataGrid` body with `<CellTypesProvider types={SHADCN_CELL_TYPES}>` so all 5 types work out-of-the-box without consumer setup.
- Export `SHADCN_CELL_TYPES` and re-export `CellTypesProvider` for consumers who need to extend further.

---

## Phase 5 — Docs: sandbox example

### 5.1 `apps/docs/app/sandbox/data-grid/components/_data.ts`

Add extended type and data:

```ts
export interface Product {
	id: number
	name: string
	status: string // badge
	category: string // select
	image: string // image (URL)
	website: string // link
	stock: number // progress (0–100)
}

export const PRODUCT_DATA: Product[] = [
	/* 5–6 rows */
]

export const productColumns = defineColumns<Product>([
	{ accessorKey: 'name', header: 'Name' },
	{
		accessorKey: 'status',
		header: 'Status',
		cell: {
			type: 'badge',
			config: {
				items: [
					{ value: 'active', label: 'Active', variant: 'default' },
					{ value: 'inactive', label: 'Inactive', variant: 'secondary' },
					{ value: 'discontinued', label: 'Discontinued', variant: 'destructive' },
				],
			},
		},
	},
	{
		accessorKey: 'category',
		header: 'Category',
		cell: {
			type: 'select',
			config: {
				items: [
					{ value: 'electronics', label: 'Electronics' },
					{ value: 'clothing', label: 'Clothing' },
					{ value: 'food', label: 'Food' },
				],
			},
		},
	},
	{ accessorKey: 'image', header: 'Image', cell: { type: 'image', config: { width: 40, height: 40, alt: 'Product' } } },
	{ accessorKey: 'website', header: 'Website', cell: { type: 'link' } },
	{ accessorKey: 'stock', header: 'Stock %', cell: { type: 'progress', config: { max: 100 } } },
])
```

### 5.2 `apps/docs/app/sandbox/data-grid/components/cell-types.tsx`

- `'use client'` component using `useDataGrid` + `<DataGrid>` from `@ez-kit/data-grid-shadcn`.
- Enables: `sorting`, `filtering`, `pagination`, `editing` (row mode), `creating` (pin-row mode).
- Uses `PRODUCT_DATA` and `productColumns`.

### 5.3 `apps/docs/app/sandbox/data-grid/page.tsx`

- Add `{ id: 'cell-types', label: 'Cell Types', component: CellTypesExample }` to the `TABS` array.
- Import `CellTypesExample` from `./components/cell-types`.

---

## Files summary

| Package | File                                          | Action |
| ------- | --------------------------------------------- | ------ |
| core    | `src/column/types.ts`                         | Edit   |
| core    | `src/column/map-columns.ts`                   | Edit   |
| react   | `src/cell-types-context.tsx`                  | Edit   |
| react   | `src/data-grid/cell.tsx`                      | Edit   |
| react   | `src/data-grid/auto-form.tsx`                 | Edit   |
| shadcn  | `src/blocks/cell-types/SelectCellView.tsx`    | New    |
| shadcn  | `src/blocks/cell-types/SelectCellInput.tsx`   | New    |
| shadcn  | `src/blocks/cell-types/BadgeCellView.tsx`     | New    |
| shadcn  | `src/blocks/cell-types/BadgeCellInput.tsx`    | New    |
| shadcn  | `src/blocks/cell-types/ImageCellView.tsx`     | New    |
| shadcn  | `src/blocks/cell-types/ImageCellInput.tsx`    | New    |
| shadcn  | `src/blocks/cell-types/LinkCellView.tsx`      | New    |
| shadcn  | `src/blocks/cell-types/LinkCellInput.tsx`     | New    |
| shadcn  | `src/blocks/cell-types/ProgressCellView.tsx`  | New    |
| shadcn  | `src/blocks/cell-types/ProgressCellInput.tsx` | New    |
| shadcn  | `src/blocks/shadcn-cell-types.ts`             | New    |
| shadcn  | `src/index.ts`                                | Edit   |
| docs    | `components/_data.ts`                         | Edit   |
| docs    | `components/cell-types.tsx`                   | New    |
| docs    | `page.tsx`                                    | Edit   |

Total: **5 edits + 13 new files**

---

## Constraints

- No `eslint-disable`, no `as any`, no `as unknown as X` casts — fix types properly.
- All files ≤ 800 lines (each cell-type file will be ≤ 40 lines).
- After all changes: run `pnpm lint` and `pnpm typecheck` — zero errors/warnings.
- Do not add `console.log`.
