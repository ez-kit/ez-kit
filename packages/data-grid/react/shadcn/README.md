# @ez-kit/data-grid-shadcn

[Shadcn UI](https://ui.shadcn.com) flavour of **@ez-kit/data-grid**. Wraps [`@ez-kit/data-grid-react`](../react) with Shadcn/Radix components and ships a ready-to-use `DataGrid`.

## Install

```bash
pnpm add @ez-kit/data-grid-shadcn
```

One package. The kit re-exports the whole adapter surface, so you never need `@ez-kit/data-grid-react` or `@ez-kit/data-grid-core` as a second dependency — not even to name a type.

## Usage

Import everything from the kit. Its `createColumns` / `createColumnHelper` are bound to the kit's cell-type registry; the ones from `@ez-kit/data-grid-react` are not, and using those silently stops checking `cell: { type: '…' }` against the types this kit actually renders.

```tsx
import { DataGrid, createColumns, useDataGrid } from '@ez-kit/data-grid-shadcn'
import '@ez-kit/data-grid-shadcn/styles.css'

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

Full documentation: [ez-kit.dev/docs/data-grid](https://ez-kit.dev/docs/data-grid).

## License

MIT
