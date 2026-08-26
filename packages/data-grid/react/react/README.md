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
import { createDataGrid, defaultComponents } from '@ez-kit/data-grid-react'
import '@ez-kit/data-grid-react/styles.css'

const { DataGrid, useDataGrid } = createDataGrid({
	components: {
		// ...your UI-kit components implementing GridComponents
	},
})
```

`createDataGrid({ components })` injects your UI components into the shared headless render layer and returns `DataGrid`, `useDataGrid`, and the re-exported column helpers.

## State persistence

`extractState` / `parseState` (Layer 1 utilities) and `useExtractedState` (Layer 2 reactive hook) let you serialize grid state to the URL or storage and rehydrate it. `parseState` is defensive against malformed/untrusted input and never throws.

## License

MIT
