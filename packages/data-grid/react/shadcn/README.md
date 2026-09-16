# @ez-kit/data-grid-shadcn

[Shadcn UI](https://ui.shadcn.com) flavour of **@ez-kit/data-grid**. Wraps [`@ez-kit/data-grid-react`](../react) with Shadcn/Radix components and ships a ready-to-use `DataGrid`.

This is **not** an npm package — it's distributed as a [shadcn registry](https://ui.shadcn.com/docs/registry) item, the way shadcn itself ships components: source is copied into your project, not installed as a versioned dependency, so it's yours to read, diff, and edit from the moment you add it.

## Install

```bash
npx shadcn@latest add https://ez-kit-docs.vercel.app/r/data-grid.json
```

This copies `components/data-grid/**` into your project (cells, toolbar, filtering, pagination, editing blocks, plus the shadcn UI primitives they use) and adds `@ez-kit/data-grid-react`, `@ez-kit/data-grid-core` and the other runtime dependencies to your `package.json`. Core is there for your own code rather than for the copied files, none of which import it: `features` is a required option, so you write `tableFeatures({ … })` yourself and the helpers live on core. To pull in later updates, re-run the same command or use `npx shadcn add https://ez-kit-docs.vercel.app/r/data-grid.json --diff` to see what changed upstream first.

## Usage

Import from where the CLI placed the file — by default `@/components/data-grid/data-grid`. `createColumns` / `createColumnHelper` are bound to this kit's cell-type registry; the ones from `@ez-kit/data-grid-react` are not, and using those silently stops checking `cell: { type: '…' }` against the types this kit actually renders.

```tsx
import { DataGrid, createColumns, useDataGrid } from '@/components/data-grid/data-grid'
import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createSortedRowModel,
	rowSortingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import '@/components/data-grid/styles.css'

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

`features` is required, and `@ez-kit/data-grid-core/features` is the one import path for it — the feature _values_ are deliberately not re-exported from the copied files or from `@ez-kit/data-grid-react`. `shadcn add` adds `@ez-kit/data-grid-core` to your `package.json` for exactly this reason, even though no copied file imports it: `features` is a required option, so your own code imports the feature helpers by name.

Registering a feature does not switch it on: `features` decides what exists, the config (`sorting: false`, `editing: { mode: 'row' }`) decides whether this grid uses it. Configuring a feature you did not register is a silent no-op, reported only by a development-mode warning.

`columnVisibilityFeature`, `columnPinningFeature` and `columnSizingFeature` are **structural**, so open every set with them: the shell lays out a column grid, and it needs visibility, pin groups and widths to lay one out with. Omitting any of the three is a render-time `TypeError` — not a limitation waiting to be lifted, but the consequence of asking for a grid while withholding what a grid is made of. Everything else is genuinely optional: leave out `rowSortingFeature` or `editingFeature` and you get a grid that does not sort or edit. `feature-optionality.test.tsx` renders a grid missing each optional feature and asserts these three still throw, so that boundary is executable rather than asserted.

Composing a set governs **behaviour** — an unregistered feature contributes no state slice, no API and no work at runtime — **and it governs your bundle**. Measured against the built entry: `tableFeatures` alone costs 994 bytes, `rowSortingFeature` 998, a sorting-only set 1 035, and `editingFeature` 17 163, which is what a feature with a real implementation behind it weighs. The all-in set lives on its own subpath, `@ez-kit/data-grid-core/features/all`, precisely so that reaching it is a choice: while it sat on the main entry, each of those imports cost ~46 kB, because a top-level `tableFeatures({ …stockFeatures, … })` call is not something a bundler can drop.

### Extending cell types

`cellTypes` and the `KitCellTypes` type — needed by `extendDataGrid` to add a custom cell type — are also exported from `@/components/data-grid/data-grid`, alongside everything above. Everything else (`ColumnDef`, `ColumnSortingConfig`, `RowActionsVariant`, and the rest of the headless API surface) is not re-exported from the copied files — import those directly from `@ez-kit/data-grid-react`, which is already a `package.json` dependency after install.

Full documentation: [ez-kit-docs.vercel.app/docs/data-grid](https://ez-kit-docs.vercel.app/docs/data-grid).

## License

MIT
