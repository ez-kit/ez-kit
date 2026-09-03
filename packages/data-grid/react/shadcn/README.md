# @ez-kit/data-grid-shadcn

[Shadcn UI](https://ui.shadcn.com) flavour of **@ez-kit/data-grid**. Wraps [`@ez-kit/data-grid-react`](../react) with Shadcn/Radix components and ships a ready-to-use `DataGrid`.

This is **not** an npm package — it's distributed as a [shadcn registry](https://ui.shadcn.com/docs/registry) item, the way shadcn itself ships components: source is copied into your project, not installed as a versioned dependency, so it's yours to read, diff, and edit from the moment you add it.

## Install

```bash
npx shadcn@latest add https://ez-kit.dev/r/data-grid.json
```

This copies `components/data-grid/**` into your project (cells, toolbar, filtering, pagination, editing blocks, plus the shadcn UI primitives they use) and adds `@ez-kit/data-grid-react` and its other runtime dependencies to your `package.json`. To pull in later updates, re-run the same command or use `npx shadcn add https://ez-kit.dev/r/data-grid.json --diff` to see what changed upstream first.

## Usage

Import from where the CLI placed the file — by default `@/components/data-grid/data-grid`. `createColumns` / `createColumnHelper` are bound to this kit's cell-type registry; the ones from `@ez-kit/data-grid-react` are not, and using those silently stops checking `cell: { type: '…' }` against the types this kit actually renders.

```tsx
import { DataGrid, createColumns, useDataGrid } from '@/components/data-grid/data-grid'
import '@/components/data-grid/styles.css'

type User = { name: string; role: string }

const columns = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'role', header: 'Role' },
])

export function Example({ users }: { users: User[] }) {
	const table = useDataGrid({ data: users, columns, sorting: true })
	return <DataGrid table={table} />
}
```

`useDataGrid` is a hook, so it must be called inside the component — that is what keeps the grid in step with a changing `data` prop.

Own the instance only when you need it (to read state, or to share one grid across several components). Otherwise skip the hook and hand the same config to `DataGrid` directly:

```tsx
<DataGrid
	data={users}
	columns={columns}
	sorting
/>
```

Pick one mode for the lifetime of a given grid — switching between them remounts it and resets its state.

### Extending cell types

`cellTypes` and the `KitCellTypes` type — needed by `extendDataGrid` to add a custom cell type — are also exported from `@/components/data-grid/data-grid`, alongside everything above. Everything else (`ColumnDef`, `ColumnSortingConfig`, `RowActionsVariant`, and the rest of the headless API surface) is not re-exported from the copied files — import those directly from `@ez-kit/data-grid-react`, which is already a `package.json` dependency after install.

Full documentation: [ez-kit.dev/docs/data-grid](https://ez-kit.dev/docs/data-grid).

## License

MIT
