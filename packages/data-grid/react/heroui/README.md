# @ez-kit/data-grid-heroui

[HeroUI](https://heroui.com) flavour of **@ez-kit/data-grid**. Wraps [`@ez-kit/data-grid-react`](../react) with HeroUI components and ships a ready-to-use `DataGrid`.

## Install

```bash
pnpm add @ez-kit/data-grid-heroui @ez-kit/data-grid-core @heroui/react @heroui/styles
```

`@heroui/react` and `@heroui/styles` (v3) are **peer dependencies**, alongside `react` and `react-dom`: HeroUI is built on React Aria, whose components talk to each other through React context, and this kit's stylesheet `@import`s `@heroui/styles` — a second copy of either in your tree means a second set of contexts and a second copy of HeroUI's CSS.

The kit re-exports the whole adapter surface, so you never need `@ez-kit/data-grid-react` as a second dependency — not even to name a type. The one thing it does not re-export is the **feature set**, which is why `@ez-kit/data-grid-core` is on the install line: `features` is a required option, so your own code has to import the feature helpers by name. The kit declares core as a dependency too, but a transitive dependency is not importable under pnpm's strict layout — naming it is what makes the import resolve. See [Feature composition](#feature-composition) below.

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

`features` is required, and `@ez-kit/data-grid-core/features` is the one import path for it — the feature _values_ are deliberately not re-exported from the kit or from `@ez-kit/data-grid-react`. That is the one thing the kit cannot hand you, and why core is on the install line above. Everything else still comes from the kit.

Registering a feature does not switch it on: `features` decides what exists, the config (`sorting: false`, `editing: { mode: 'row' }`) decides whether this grid uses it. Configuring a feature you did not register is a silent no-op, reported only by a development-mode warning.

`columnVisibilityFeature`, `columnPinningFeature` and `columnSizingFeature` are **structural**, so open every set with them: the shell lays out a column grid, and it needs visibility, pin groups and widths to lay one out with. Omitting any of the three is a render-time `TypeError` — not a limitation waiting to be lifted, but the consequence of asking for a grid while withholding what a grid is made of. Everything else is genuinely optional: leave out `rowSortingFeature` or `editingFeature` and you get a grid that does not sort or edit. `feature-optionality.test.tsx` renders a grid missing each optional feature and asserts these three still throw, so that boundary is executable rather than asserted.

Composing a set governs **behaviour** — an unregistered feature contributes no state slice, no API and no work at runtime — **and it governs your bundle**. Measured against the built entry: `tableFeatures` alone costs 994 bytes, `rowSortingFeature` 998, a sorting-only set 1 035, and `editingFeature` 17 163, which is what a feature with a real implementation behind it weighs. The all-in set lives on its own subpath, `@ez-kit/data-grid-core/features/all`, precisely so that reaching it is a choice: while it sat on the main entry, each of those imports cost ~46 kB, because a top-level `tableFeatures({ …stockFeatures, … })` call is not something a bundler can drop.

Full documentation: [ez-kit-docs.vercel.app/docs/data-grid](https://ez-kit-docs.vercel.app/docs/data-grid).

## License

MIT
