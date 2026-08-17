# @ez-kit/data-grid-native

Plain/native UI flavour of **@ez-kit/data-grid**. Wraps [`@ez-kit/data-grid-react`](../react) with dependency-light native components and ships its own `global.css`. Useful as a reference implementation or when you don't want to pull in Shadcn or HeroUI.

## Install

```bash
pnpm add @ez-kit/data-grid-native @ez-kit/data-grid-react @ez-kit/data-grid-core
```

## Usage

```tsx
import { createTable, createColumns } from '@ez-kit/data-grid-react'
import { DataGrid } from '@ez-kit/data-grid-native'
import '@ez-kit/data-grid-native/global.css'

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
