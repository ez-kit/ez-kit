# @ez-kit/data-grid-core

Headless, UI-framework-agnostic data-grid core for **@ez-kit/data-grid**, built on top of [TanStack Table](https://tanstack.com/table) core. It owns columns, features (sorting, filtering, operators, pagination, selection, pinning, editing, creating, deleting, validation, infinite loading) and table state — with no React and no styling.

Most apps should use a UI flavour instead:

- [`@ez-kit/data-grid-shadcn`](../react/shadcn) — Shadcn UI
- [`@ez-kit/data-grid-heroui`](../react/heroui) — HeroUI
- [`@ez-kit/data-grid-native`](../react/native) — plain/native UI

Use this package directly only when building your own adapter.

## Install

```bash
pnpm add @ez-kit/data-grid-core @tanstack/table-core
```

`react` and `zod` are optional peer dependencies (needed only for the React adapters and for `zodResolver` validation, respectively).

## Usage

```ts
import { createTable, createColumns } from '@ez-kit/data-grid-core'

const columns = createColumns([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'role', header: 'Role' },
])

const table = createTable({
	data: [{ name: 'Ada Lovelace', role: 'Engineer' }],
	columns,
	sorting: true,
	filtering: true,
})
```

The returned `table` is a TanStack Table instance extended with the data-grid features. Read `table.getRowModel()`, drive state via `table.setState(...)`, and render it with your own UI or one of the flavour packages above.

## License

MIT
