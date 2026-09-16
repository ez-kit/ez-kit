# @ez-kit/data-grid-react

Framework-agnostic **React** adapter for [`@ez-kit/data-grid-core`](../../core). It provides the `useDataGrid` hook, the `DataGrid` render layer, state-persistence helpers, virtualization and infinite scroll — with **zero visual styling**. All colours, spacing and typography live in the UI-flavour packages; this package only emits semantic `data-*` attributes for those stylesheets to target.

You usually don't install this directly. Pick a flavour, which depends on this package for you:

- [`@ez-kit/data-grid-shadcn`](../shadcn) — Shadcn UI
- [`@ez-kit/data-grid-heroui`](../heroui) — HeroUI

Install it directly only when building your own UI flavour with `createDataGrid`.

## Install

```bash
pnpm add @ez-kit/data-grid-react @ez-kit/data-grid-core react
```

## Building a flavour

```tsx
import { createDataGrid } from '@ez-kit/data-grid-react'
import '@ez-kit/data-grid-react/styles.css'

const { DataGrid, useDataGrid } = createDataGrid({
	components: {
		// ...your UI-kit components implementing GridComponents
	},
})
```

`createDataGrid({ components })` injects your UI components into the shared headless render layer and returns `DataGrid`, `useDataGrid`, and the re-exported column helpers.

## Feature composition

On TanStack Table v9 a table has only the features it was handed, so **`features` is a required field of `useDataGrid`** (and of `<DataGrid>` used without the hook). Build the set with `tableFeatures` from [`@ez-kit/data-grid-core/features`](../../core) — that entry point is the single import path for the stock features, the row-model factories, the named-function registries and the grid's own features, and it is deliberately **not** re-exported from this package's root.

```tsx
import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createSortedRowModel,
	rowSortingFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'

// The first three are mandatory — see below. Add what this grid actually does after them.
const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
})

const table = useDataGrid({ features, data, columns, sorting: true })
```

Registering a feature does not switch it on: `features` decides what exists, the config (`sorting: false`, `editing: { mode: 'row' }`) decides whether this grid uses it. Configuring a feature you did not register is not a compile error — it is a silent no-op, reported only by a development-mode warning from the core. A `defaults` layer — `createDataGrid({ defaults })` or a `DataGridOptionsProvider` — may state a set once for everything below it, where `features` is optional and merges like any other option; on the instance config it is required.

`columnVisibilityFeature`, `columnPinningFeature` and `columnSizingFeature` are **mandatory**, whatever else you register: the adapter calls into all three on every render (`header.getSize()`, `column.getIsPinned()`, `table.getVisibleLeafColumns()` and the visual column-order helpers), so leaving one out is a render-time `TypeError` rather than a disabled feature. Open every set with those three.

Composing a set governs **behaviour** — an unregistered feature contributes no state slice, no API and no work at runtime. It does **not** yet make your bundle smaller: importing any single name from `@ez-kit/data-grid-core/features` currently pulls ~93% of that entry, because `allDataGridFeatures` is a top-level `tableFeatures({ … })` call a bundler cannot prove pure. A fix in core is in progress.

## State persistence

`extractState` / `parseState` (Layer 1 utilities) and `useExtractedState` (Layer 2 reactive hook) let you serialize grid state to the URL or storage and rehydrate it. `parseState` is defensive against malformed/untrusted input and never throws.

## License

MIT
