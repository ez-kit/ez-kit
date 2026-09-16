# @ez-kit/data-grid-heroui

[HeroUI](https://heroui.com) flavour of **@ez-kit/data-grid**. Wraps [`@ez-kit/data-grid-react`](../react) with HeroUI components and ships a ready-to-use `DataGrid`.

## Install

```bash
pnpm add @ez-kit/data-grid-heroui @heroui/react @heroui/styles
```

`@heroui/react` and `@heroui/styles` (v3) are **peer dependencies**, alongside `react` and `react-dom`: HeroUI is built on React Aria, whose components talk to each other through React context, and this kit's stylesheet `@import`s `@heroui/styles` — a second copy of either in your tree means a second set of contexts and a second copy of HeroUI's CSS.

The kit re-exports the whole adapter surface, so you never need `@ez-kit/data-grid-react` as a second dependency — not even to name a type. The one thing it does not re-export is the **feature set**: see [Feature composition](#feature-composition) below, which needs `@ez-kit/data-grid-core`.

## Usage

Import everything from the kit. Its `createColumns` / `createColumnHelper` are bound to the kit's cell-type registry; the ones from `@ez-kit/data-grid-react` are not, and using those silently stops checking `cell: { type: '…' }` against the types this kit actually renders.

```tsx
import { DataGrid, createColumns, useDataGrid } from '@ez-kit/data-grid-heroui'
import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createSortedRowModel,
	rowSortingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import '@ez-kit/data-grid-heroui/styles.css'

// A table has only the features you register. The first three are mandatory — see below.
const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
})

type User = { name: string; role: string }

const columns = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'role', header: 'Role' },
])

export function Example({ users }: { users: User[] }) {
	const table = useDataGrid({ features, data: users, columns, sorting: true })
	return <DataGrid table={table} />
}
```

`useDataGrid` is a hook, so it must be called inside the component — that is what keeps the grid in step with a changing `data` prop.

Own the instance only when you need it (to read state, or to share one grid across several components). Otherwise skip the hook and hand the same config to `DataGrid` directly:

```tsx
<DataGrid
	features={features}
	data={users}
	columns={columns}
	sorting
/>
```

Pick one mode for the lifetime of a given grid — switching between them remounts it and resets its state.

### Feature composition

`features` is required, and `@ez-kit/data-grid-core/features` is the one import path for it — the feature _values_ are deliberately not re-exported from the kit or from `@ez-kit/data-grid-react`. That is the one thing the kit cannot hand you: **add `@ez-kit/data-grid-core` to your `package.json`** to compose a set. Everything else still comes from the kit.

Registering a feature does not switch it on: `features` decides what exists, the config (`sorting: false`, `editing: { mode: 'row' }`) decides whether this grid uses it. Configuring a feature you did not register is a silent no-op, reported only by a development-mode warning.

`columnVisibilityFeature`, `columnPinningFeature` and `columnSizingFeature` are **mandatory**, whatever else you register: the adapter calls into all three on every render (`header.getSize()`, `column.getIsPinned()`, `table.getVisibleLeafColumns()` and the visual column-order helpers), so leaving one out is a render-time `TypeError` rather than a disabled feature. Open every set with those three.

Composing a set governs **behaviour** — an unregistered feature contributes no state slice, no API and no work at runtime. It does **not** yet make your bundle smaller: importing any single name from `@ez-kit/data-grid-core/features` currently pulls ~93% of that entry, because `allDataGridFeatures` is a top-level `tableFeatures({ … })` call a bundler cannot prove pure. A fix in core is in progress.

Full documentation: [ez-kit-docs.vercel.app/docs/data-grid](https://ez-kit-docs.vercel.app/docs/data-grid).

## License

MIT
