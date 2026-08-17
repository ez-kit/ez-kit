# @ez-kit/data-grid-shadcn

[Shadcn UI](https://ui.shadcn.com) flavour of **@ez-kit/data-grid**. Wraps [`@ez-kit/data-grid-react`](../react) with Shadcn/Radix components and ships a ready-to-use `DataGrid`.

## Install

```bash
pnpm add @ez-kit/data-grid-shadcn @ez-kit/data-grid-react @ez-kit/data-grid-core
```

## Usage

```tsx
import { createTable, createColumns } from '@ez-kit/data-grid-react'
import { DataGrid } from '@ez-kit/data-grid-shadcn'
import '@ez-kit/data-grid-shadcn/global.css'

const columns = createColumns([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'role', header: 'Role' },
])

const table = createTable({
	data: [{ name: 'Ada Lovelace', role: 'Engineer' }],
	columns,
})

export function Example() {
	return <DataGrid table={table} />
}
```

## License

MIT
