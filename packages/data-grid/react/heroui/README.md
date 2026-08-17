# @ez-kit/data-grid-heroui

HeroUI wrapper for `@ez-kit/data-grid-react`.

## Install

```bash
pnpm add @ez-kit/data-grid-heroui @ez-kit/data-grid-react @ez-kit/data-grid-core @heroui/react @heroui/styles
```

## Usage

```tsx
import { createTable, createColumns } from '@ez-kit/data-grid-react'
import { DataGrid } from '@ez-kit/data-grid-heroui'
import '@ez-kit/data-grid-heroui/global.css'

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
