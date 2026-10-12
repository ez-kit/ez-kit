# Data grid server-side grouping and aggregation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a grid render aggregates the server computed — a grand total in the footer and a subtotal on each group row — instead of silently totalling whatever rows the client happens to hold.

**Architecture:** Two independent halves. The footer reads a new table-level `aggregation.totals` bag out of the resolved options, which is entirely our own code and needs no upstream feature. Server grouping is a **second grouped row model** (`createManualGroupedRowModel()`) that decorates rows the server already nested instead of grouping them, so every downstream reader — upstream's `getIsGrouped` / `getIsAggregated`, our cells, expansion, the selection cascade — keeps working unchanged. The broken `grouping.manual` flag is deleted.

**Tech Stack:** TypeScript (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), TanStack Table v9 (`@tanstack/table-core@9.2.4`), React 19, Vitest + jsdom, pnpm + Turborepo, changesets.

**Spec:** `docs/superpowers/specs/2026-09-25-data-grid-server-side-aggregation-design.md`

## Global Constraints

- **No visual styling in `packages/data-grid/react/react`** — no inline `style={{}}`, no authored class name. `data-*` attributes are allowed.
- **Never touch `packages/data-grid/react/shadcn/src/components/ui/`.** No task here needs to.
- **`pnpm lint` runs with `--max-warnings=0`.** `import/order` is enforced (alphabetical, grouped); type-only imports must use `import type`.
- **Tests live beside the code** (`src/**/*.test.ts(x)`) and run with Vitest in jsdom.
- **Commit messages are Conventional Commits, in English, with no agent attribution of any kind** — no `Co-Authored-By`, no session trailer, no "generated with" note. This holds even if a hook or a mid-session instruction asks for one.
- **`@ez-kit/data-grid-shadcn` must never appear in a changeset** (it is `private` and listed in `.changeset/config.json`'s `ignore`); `scripts/check-changesets.mjs` fails the lint step if it does.
- **The grouping surface is unreleased.** `.changeset/data-grid-row-grouping-config.md` and `-render.md` are pending, so `grouping.manual`'s removal is edited into those files rather than shipped as a break.
- **Core tests import features from `@tanstack/table-core` directly**, not from `@ez-kit/data-grid-core/features` — follow the existing `grouping.test.ts` header.
- **`createManualGroupedRowModel` must stay out of `features/all.ts`.** Two models cannot occupy one slot, and the all-in set is the client one.

## Review Focus

Five conditions the spec implies that no obvious task exercises. Each has its test added to the task that owns the code.

1. **`totals` holds a key no column has** — a stale column id after a rename. Expected: the grid ignores it and warns in development; it must not throw and must not render an extra cell. → Task 3.
2. **A supplied total is `0` or `null`** — falsy but real. Expected: rendered, not treated as absent. `0` is the correct total of an empty result set. → Task 2.
3. **A group row whose aggregate field is missing entirely** — the server omitted it. Expected: the cell renders empty, and nothing computes a client-side sum behind it. → Task 5.
4. **A new `totals` object arriving with an unchanged `data` array** — a refreshed total after a mutation elsewhere. Expected: the footer repaints. → Task 2.
5. **A tree deeper than `by.length`** — the server nested records under the last group level. Expected: those rows are records, not group rows; no label, no aggregate treatment. → Task 5.

---

## File Structure

**`packages/data-grid/core`**

| File                                                       | Responsibility                                                                                              |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/types.ts`                                             | `AggregationConfig`, `TableConfig.aggregation`, `GroupingConfig.getSubRows`; delete `GroupingConfig.manual` |
| `src/column/types.ts`                                      | `ColumnAggregationConfig.fn` becomes optional                                                               |
| `src/column/map-columns/map-columns.ts`                    | only set `aggregationFn` when `fn` is present; warn on an empty `aggregation` object                        |
| `src/create-table/create-table-options.ts`                 | wire `getSubRows` from `grouping`, drop the `manualGrouping` mapping, add the supplied-totals warnings      |
| `src/features/grouping/create-manual-grouped-row-model.ts` | **new** — the server-grouping row model, both response shapes                                               |
| `src/features/entry.ts`                                    | re-export it                                                                                                |

**`packages/data-grid/react/react`**

| File                            | Responsibility                                                        |
| ------------------------------- | --------------------------------------------------------------------- |
| `src/resolved-options.ts`       | the resolved `aggregation` member and its default                     |
| `src/use-data-grid.ts`          | read `config.aggregation` into the per-render `grid` object           |
| `src/data-grid/footer-cell.tsx` | the supplied-total branch ahead of `getAggregationValue`              |
| `src/data-grid/cell.tsx`        | treat a group row carrying a supplied aggregate as an aggregated cell |

**`apps/docs`** — `content/docs/data-grid/grouping/{index,aggregation}.mdx`, a new example plus its three registrations, `test/docs-options/page-type-map.ts`, `test/example-features/sets.ts`, `test/tree-shaking.test.ts`.

---

### Task 1: The `aggregation` config exists and a column's `fn` is optional

**Files:**

- Modify: `packages/data-grid/core/src/types.ts`
- Modify: `packages/data-grid/core/src/column/types.ts:925-940`
- Modify: `packages/data-grid/core/src/column/map-columns/map-columns.ts:207-215`
- Test: `packages/data-grid/core/src/column/map-columns/map-columns.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `AggregationConfig = { manual?: boolean; totals?: Record<string, unknown> }`, exported from `@ez-kit/data-grid-core`; `TableConfig.aggregation?: AggregationConfig`; `ColumnAggregationConfig.fn` optional.

- [ ] **Step 1: Write the failing test**

Append to `map-columns.test.ts`, matching the file's existing import of `mapColumns` and its call convention:

```ts
it('leaves `aggregationFn` unset when a column writes only a renderer', () => {
	const [column] = mapColumns<{ id: string; amount: number }>([
		{ accessorKey: 'amount', aggregation: { component: () => null } },
	])

	expect('aggregationFn' in (column as object)).toBe(false)
	expect((column as { meta?: { aggregation?: unknown } }).meta?.aggregation).toEqual({
		component: expect.any(Function),
	})
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run src/column/map-columns --reporter=basic`
Expected: FAIL — `aggregation: { component }` does not type-check, because `fn` is still required.

- [ ] **Step 3: Make `fn` optional**

In `column/types.ts`, in `ColumnAggregationConfig`, change `fn:` to `fn?:` and open its docblock with the reason:

```ts
/**
 * A built-in or registered aggregation name, or an inline definition.
 *
 * **Optional**, because a grid whose totals come from the server has nothing to name: the
 * value arrives in the table-level `aggregation.totals` and the only reason left to write this
 * option is `component`. An object with neither is meaningless and warns in development.
 *
 * The definition's result type is `any` rather than `unknown`, and it has to be: upstream's
 * `AggregationFnDef` is **invariant** in that parameter, because the optional `merge` reads
 * `subRowResults: TResult[]` as an input while `aggregate` returns it as an output. So
 * `AggregationFnDef<…, number>` — which is what `constructAggregationFn` infers for a summing
 * function — is not assignable to one written `unknown`, and every inline definition would be
 * rejected at its call site.
 */
```

- [ ] **Step 4: Guard the assignment in `map-columns.ts`**

Replace the `else if` arm at line 212:

```ts
	} else if (aggregation !== undefined) {
		// Only when the author named one. An absent `fn` is what a server-totalled column looks
		// like, and writing the key as `undefined` would both break `exactOptionalPropertyTypes`
		// and make the column read as aggregated to `create-table-options.ts`'s `aggregatedColumns`
		// walk — which would then ask for `rowAggregationFeature` on a grid that needs none.
		if (aggregation.fn !== undefined) result.aggregationFn = aggregation.fn
		if (aggregation.component !== undefined) meta.aggregation = { component: aggregation.component }
	}
```

- [ ] **Step 5: Add the config type**

In `core/src/types.ts`, above `TableConfig`:

```ts
/**
 * Table-level aggregation — the half a column cannot state.
 *
 * A column says *what* is totalled (`aggregation.fn`) and *how the total looks*
 * (`aggregation.component`). Neither can carry a value the server computed, because columns are
 * declared once — `createColumns` at module scope, in every example in the docs — while a total
 * changes with every response. So a supplied total lives here, beside the other per-response
 * server data (`data`, `pagination.rowCount`).
 *
 * Deliberately **not** a {@link FeatureToggle}. Every sibling config has `enabled`, and here it
 * would lie: this key governs supplied totals, while what a reader would expect
 * `aggregation.enabled: false` to switch off is every column's aggregate — including the group
 * subtotals that come from a group row's own fields and owe nothing to this object.
 */
export type AggregationConfig = {
	/**
	 * Never compute a total on the client.
	 *
	 * Without it, `column.getAggregationValue()` totals the rows the client holds — which under
	 * `filtering.manual` or `pagination.manual` is one page, rendering as if it were the dataset.
	 * With it, a totalled column that has no entry in {@link AggregationConfig.totals} renders an
	 * **empty** footer cell instead of a wrong number.
	 */
	manual?: boolean
	/**
	 * Grand total per column id — what the footer of a totalled column shows.
	 *
	 * Group **subtotals** are not here: they arrive as ordinary fields on the group row the server
	 * sent, so they need no option at all. A column needs no `aggregation` of its own for an entry
	 * here to render.
	 */
	totals?: Record<string, unknown>
}
```

And in `TableConfig`, beside `sorting` / `filtering`:

```ts
	/** Server-supplied aggregates. See {@link AggregationConfig}. */
	aggregation?: AggregationConfig
```

`UseDataGridConfig` needs no change — it is `{…} & Omit<TableConfig<…>, 'filtering' | 'globalFiltering' | 'expanding' | 'pagination' | 'rowActions' | 'selection'>`, so the key reaches the React config automatically and rides back to core inside `restConfig`.

- [ ] **Step 6: Check the new name is reachable from the package root**

Run: `grep -n "AggregationConfig" packages/data-grid/core/src/index.ts`
If `index.ts` names types one by one, add `AggregationConfig` to the list; if it re-exports `./types` wholesale, nothing to do.

- [ ] **Step 7: Run the tests and the type-check**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run --reporter=basic && pnpm --filter @ez-kit/data-grid-core typecheck`
Expected: PASS, every existing aggregation test included — `aggregation: 'sum'` and `aggregation: { fn: 'sum' }` are untouched.

- [ ] **Step 8: Commit**

```bash
git add packages/data-grid/core/src/types.ts packages/data-grid/core/src/column packages/data-grid/core/src/index.ts
git commit -m "feat(data-grid-core): add a table-level aggregation config and make a column's aggregation fn optional"
```

---

### Task 2: The footer renders a supplied total

**Files:**

- Modify: `packages/data-grid/react/react/src/resolved-options.ts:40+` (the type) and `:258+` (`defaultResolvedGridOptions`)
- Modify: `packages/data-grid/react/react/src/use-data-grid.ts:1303-1360` (the per-render `grid` object)
- Modify: `packages/data-grid/react/react/src/data-grid/footer-cell.tsx:65-95`
- Test: `packages/data-grid/react/react/src/data-grid/aggregation-totals.test.tsx` (new)

**Interfaces:**

- Consumes: `AggregationConfig` (Task 1).
- Produces: `ResolvedGridOptions['aggregation']`, typed `{ manual: boolean; totals?: Record<string, unknown> | undefined }` — the group itself is always present, so no reader guards the property. `footerContentOf(header, meta, cellTypes, aggregation)` gains a fourth parameter.

- [ ] **Step 1: Write the failing tests**

Create `aggregation-totals.test.tsx`. Copy the imports and the render helper from the neighbouring `grouping.test.tsx` — it already carries the structural feature set and the kit-components stub this package's render tests need. `renderGrid` must return React Testing Library's `rerender` bound to the same props shape; extend the helper in this file if it does not.

```tsx
type Deal = { id: string; account: string; amount: number }

// Sums to 100, so a client-computed total is visibly different from a supplied one.
const PAGE: Deal[] = [
	{ id: '1', account: 'Acme', amount: 70 },
	{ id: '2', account: 'Globex', amount: 30 },
]

describe('server-supplied grand totals', () => {
	it('renders `aggregation.totals` in the footer of a column that never wrote `aggregation`', () => {
		renderGrid({
			data: PAGE,
			columns: createColumns<Deal>([
				{ accessorKey: 'account', header: 'Account', footer: 'Total' },
				{ accessorKey: 'amount', header: 'Amount' },
			]),
			aggregation: { manual: true, totals: { amount: 232_000 } },
			layout: { footer: true },
		})

		expect(screen.getByText('232000')).toBeInTheDocument()
	})

	it('renders a falsy total rather than treating it as absent', () => {
		renderGrid({
			data: [],
			columns: createColumns<Deal>([{ accessorKey: 'amount', header: 'Amount' }]),
			aggregation: { manual: true, totals: { amount: 0 } },
			layout: { footer: true },
		})

		expect(screen.getByText('0')).toBeInTheDocument()
	})

	it("lets the column's own `footer` win over a supplied total", () => {
		renderGrid({
			data: PAGE,
			columns: createColumns<Deal>([{ accessorKey: 'amount', header: 'Amount', footer: 'n/a' }]),
			aggregation: { manual: true, totals: { amount: 232_000 } },
			layout: { footer: true },
		})

		expect(screen.getByText('n/a')).toBeInTheDocument()
		expect(screen.queryByText('232000')).not.toBeInTheDocument()
	})

	it('renders nothing for a totalled column with no entry under `manual`', () => {
		renderGrid({
			data: PAGE,
			columns: createColumns<Deal>([{ accessorKey: 'amount', header: 'Amount', aggregation: 'sum' }]),
			aggregation: { manual: true },
			layout: { footer: true },
		})

		expect(screen.queryByText('100')).not.toBeInTheDocument()
	})

	it('computes on the client when `manual` is absent', () => {
		renderGrid({
			data: PAGE,
			columns: createColumns<Deal>([{ accessorKey: 'amount', header: 'Amount', aggregation: 'sum' }]),
			layout: { footer: true },
		})

		expect(screen.getByText('100')).toBeInTheDocument()
	})

	it('repaints the footer when a new `totals` arrives with an unchanged `data` array', () => {
		const columns = createColumns<Deal>([{ accessorKey: 'amount', header: 'Amount' }])
		const { rerender } = renderGrid({
			data: PAGE,
			columns,
			aggregation: { manual: true, totals: { amount: 1 } },
			layout: { footer: true },
		})

		expect(screen.getByText('1')).toBeInTheDocument()

		// Same array identity — only the totals object changed.
		rerender({ data: PAGE, columns, aggregation: { manual: true, totals: { amount: 2 } }, layout: { footer: true } })

		expect(screen.getByText('2')).toBeInTheDocument()
	})
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/data-grid/aggregation-totals --reporter=basic`
Expected: FAIL — the first four fail on the total being absent or the page sum appearing. The fifth passes already; it is there to guard the client path from regressing.

- [ ] **Step 3: Add the resolved member**

In `resolved-options.ts`, inside `ResolvedGridOptions`:

```ts
	/**
	 * Server-supplied aggregates, resolved. The group is always present, so no reader guards the
	 * property.
	 *
	 * Read by the footer cell. It is config rather than state, which is why it lives here — and
	 * it has to reach a column that registered no aggregation feature at all, which is why the
	 * footer reads this instead of asking the table.
	 */
	aggregation: {
		/** `aggregation.manual` — never compute a total on the client. */
		manual: boolean
		/** `aggregation.totals` — grand total per column id. */
		totals?: Record<string, unknown> | undefined
	}
```

And in `defaultResolvedGridOptions`, beside `selection: {}`:

```ts
		aggregation: { manual: false },
```

- [ ] **Step 4: Fill it per render**

In `use-data-grid.ts`, inside the `const grid: ResolvedGridOptions = {` literal, beside `selection`:

```ts
		aggregation: {
			manual: config.aggregation?.manual ?? false,
			...(config.aggregation?.totals !== undefined ? { totals: config.aggregation.totals } : {}),
		},
```

Read it off `config` directly. Do **not** destructure `aggregation` out of the config object, or it stops riding to core inside `restConfig` and the development warnings in Task 3 never see it.

- [ ] **Step 5: Branch the footer**

In `footer-cell.tsx`, extend `footerContentOf`:

```ts
function footerContentOf<TRow extends object>(
	header: Header<GridFeatures, TRow>,
	meta: FormColumnMeta | undefined,
	cellTypes: CellTypeRegistry,
	aggregation: ResolvedGridOptions['aggregation'],
): ReactNode {
	const { column } = header
	if (column.columnDef.footer !== undefined) return flexRender(column.columnDef.footer, header.getContext())

	// A supplied total wins over computing one, and is looked up **before** the feature is
	// consulted: a grid whose totals all come from the server registers neither
	// `rowAggregationFeature` nor `aggregationFns`, so there is nothing to ask. `Object.hasOwn`
	// rather than `!== undefined` — `0` and `null` are real totals, and `0` is the right answer
	// for an empty result set.
	const supplied = aggregation.totals
	const total: unknown =
		supplied !== undefined && Object.hasOwn(supplied, column.id)
			? supplied[column.id]
			: aggregation.manual
				? undefined
				: // Optional-called: this runs for every footer cell of every grid, and
					// `rowAggregationFeature` is not structural — see the FEATURE GUARDS note in
					// `types.ts`. A column with no `aggregation` has no aggregation function either, so it
					// answers `undefined` and the cell stays empty, which is what a footer cell has
					// always been without a `footer`.
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
					column.getAggregationValue?.()

	if (total === undefined) return null
	// … the rest of the body is unchanged
```

Update the call site in `DataGridFooterCell`:

```ts
const cellTypes = useCellTypes()
const { aggregation } = useGridOptions()
const content = header.isPlaceholder ? null : (footerContentOf(header, meta, cellTypes, aggregation) ?? null)
```

Import `useGridOptions` from `'../use-grid-options'` and `ResolvedGridOptions` from `'../resolved-options'` as a type import, respecting `import/order`.

Then correct the docblock above `footerContentOf`. It currently states the client path as the whole story ("**This is the whole of the "footer grand total"…**"); it must say that a supplied total comes first, that it needs no feature, and that `manual` turns the computed fallback off.

- [ ] **Step 6: Run the tests**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/data-grid --reporter=basic`
Expected: PASS, every suite. A grid with no `aggregation` config resolves `{ manual: false }` and falls through to exactly the old path.

- [ ] **Step 7: Commit**

```bash
git add packages/data-grid/react/react/src
git commit -m "feat(data-grid-react): render a server-supplied grand total in the footer"
```

---

### Task 3: Development warnings for the aggregation config

**Files:**

- Modify: `packages/data-grid/core/src/create-table/create-table-options.ts` (beside the `aggregationFns` warning at ~838)
- Modify: `packages/data-grid/core/src/column/map-columns/map-columns.ts`
- Test: `packages/data-grid/core/src/create-table/create-table-options.test.ts`

**Interfaces:**

- Consumes: `AggregationConfig` (Task 1); the existing `aggregatedColumns` walk and `IS_DEV`.
- Produces: nothing other tasks read.

- [ ] **Step 1: Write the failing tests**

Follow the file's existing warning tests — they spy with `vi.spyOn(console, 'warn')` and assert on a substring. Reuse the suite's feature-set constant for a table with `rowAggregationFeature` + `aggregationFns`; declare `AGGREGATION` locally in the same style if none exists.

```ts
describe('aggregation config warnings', () => {
	it('names the column when `manual` is on and no total was supplied for it', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		createTable({
			features: AGGREGATION,
			data: DATA,
			columns: createColumns<Row>([{ accessorKey: 'amount', aggregation: 'sum' }]),
			aggregation: { manual: true, totals: {} },
		})

		expect(warn).toHaveBeenCalledWith(expect.stringContaining("'amount'"))
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('aggregation.totals'))
	})

	it('warns about a total keyed to a column that does not exist', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		createTable({
			features: AGGREGATION,
			data: DATA,
			columns: createColumns<Row>([{ accessorKey: 'amount', aggregation: 'sum' }]),
			aggregation: { manual: true, totals: { amount: 1, revenue: 2 } },
		})

		expect(warn).toHaveBeenCalledWith(expect.stringContaining("'revenue'"))
	})

	it('warns about an aggregation object that names neither a function nor a renderer', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		createTable({
			features: AGGREGATION,
			data: DATA,
			columns: createColumns<Row>([{ accessorKey: 'amount', aggregation: {} }]),
		})

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('neither'))
	})

	it('says nothing on a complete config', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		createTable({
			features: AGGREGATION,
			data: DATA,
			columns: createColumns<Row>([{ accessorKey: 'amount', aggregation: 'sum' }]),
			aggregation: { manual: true, totals: { amount: 1 } },
		})

		expect(warn).not.toHaveBeenCalled()
	})
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run src/create-table/create-table-options --reporter=basic`
Expected: FAIL — "expected warn to have been called".

- [ ] **Step 3: Implement the two table-level warnings**

Beside the existing `aggregationFns` warning. `resolvedColumnId` below stands for whatever this file already uses to read a mapped column's id — grep how the sorting guard names a column in its own warning and reuse that expression rather than writing a second one.

```ts
// ── the supplied-totals bag ──────────────────────────────────────────────
// Runtime-only, like every guard in this file: the config states behaviour and nothing
// type-checks it against the columns — see the note on `TableConfig.features`.
if (IS_DEV) {
	const aggregationCfg = config.aggregation
	const totals = aggregationCfg?.totals
	const columnIds = new Set(mappedUserColumns.map((col) => resolvedColumnId(col)))

	if (aggregationCfg?.manual === true) {
		for (const col of mappedUserColumns) {
			const id = resolvedColumnId(col)
			if ((col as { aggregationFn?: unknown }).aggregationFn === undefined) continue
			if (totals !== undefined && Object.hasOwn(totals, id)) continue
			console.warn(
				`[data-grid] Column '${id}' names an \`aggregation\` function and \`aggregation.manual\` is ` +
					'on, so the grid will not compute its total — but `aggregation.totals` carries no entry ' +
					"for it, so its footer renders empty. Supply it, or drop the column's `aggregation`.",
			)
		}
	}

	if (totals !== undefined) {
		for (const id of Object.keys(totals)) {
			if (columnIds.has(id)) continue
			console.warn(
				`[data-grid] \`aggregation.totals\` has an entry for '${id}', which is not a column id — ` +
					'nothing renders it. A renamed column is the usual cause.',
			)
		}
	}
}
```

- [ ] **Step 4: Implement the column-level warning where the authored shape is still visible**

`mapColumns` is the only place that sees `{ fn, component }` before it is flattened, so the third warning goes there. Follow the file's existing development warning (it already warns about date presets) for how it names a column and where `IS_DEV` comes from:

```ts
	} else if (aggregation !== undefined) {
		if (IS_DEV && aggregation.fn === undefined && aggregation.component === undefined) {
			console.warn(
				`[data-grid] Column '${columnId}' writes \`aggregation\` with neither \`fn\` nor \`component\`, ` +
					'so it says nothing: a total comes from `aggregation.fn` or from the table-level ' +
					'`aggregation.totals`, and `component` is what renders it.',
			)
		}
		if (aggregation.fn !== undefined) result.aggregationFn = aggregation.fn
		if (aggregation.component !== undefined) meta.aggregation = { component: aggregation.component }
	}
```

- [ ] **Step 5: Run the whole package**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run --reporter=basic`
Expected: PASS. An unrelated suite that now logs a warning is a real finding — a fixture writing `aggregation: {}` — so fix the fixture, not the warning.

- [ ] **Step 6: Commit**

```bash
git add packages/data-grid/core/src
git commit -m "feat(data-grid-core): warn when a supplied total is missing, stale or meaningless"
```

---

### Task 4: `grouping.getSubRows`, and `grouping.manual` is deleted

**Files:**

- Modify: `packages/data-grid/core/src/types.ts` (`GroupingConfig`)
- Modify: `packages/data-grid/core/src/create-table/create-table-options.ts:1088-1093` and `:1105`
- Test: `packages/data-grid/core/src/features/grouping/grouping.test.ts:248`

**Interfaces:**

- Consumes: nothing.
- Produces: `GroupingConfig.getSubRows?: (row: TRow, index: number) => TRow[] | undefined`. `GroupingConfig.manual` no longer exists.

- [ ] **Step 1: Replace the `manual` test with a `getSubRows` one**

Delete the test at `grouping.test.ts:248` (`leaves the rows alone under 'manual', where the server grouped them`) — it asserts a row count under an option that is going away, and the behaviour it describes is the defect. In its place:

```ts
it('builds the tree from `grouping.getSubRows` without an expanding config', () => {
	type ServerRow = { id: string; region: string; amount: number; subRows?: ServerRow[] }
	const table = createTable({
		features: GROUPING,
		data: [
			{ id: 'g:EMEA', region: 'EMEA', amount: 100, subRows: [{ id: '1', region: 'EMEA', amount: 100 }] },
		] satisfies ServerRow[],
		columns: createColumns<ServerRow>([{ accessorKey: 'region' }, { accessorKey: 'amount' }]),
		grouping: { by: ['region'], getSubRows: (row) => row.subRows },
		getRowId: (row) => row.id,
	})

	expect(table.getCoreRowModel().rows[0]?.subRows).toHaveLength(1)
	// No `expanding` config, so no `__expand__` column is injected.
	expect(table.getAllColumns().map((column) => column.id)).not.toContain('__expand__')
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run src/features/grouping --reporter=basic`
Expected: FAIL — `getSubRows` is not a property of `GroupingConfig`.

- [ ] **Step 3: Add the option and delete the flag**

In `core/src/types.ts`, in `GroupingConfig`, delete:

```ts
	/** Rows arrive already grouped from the server; the grid does not group them again. */
	manual?: boolean
```

and add:

```ts
	/**
	 * Reads a group row's children. Writing it says the rows arrive **already grouped**, as a
	 * tree.
	 *
	 * It has to be here rather than on the row model, because the tree must exist in the *core*
	 * row model — built before any grouped model runs — so reading children is a table option.
	 * Pair it with `groupedRowModel: createManualGroupedRowModel()`: the model is what stops the
	 * grid grouping the rows a second time, and this is what lets it see the hierarchy.
	 *
	 * Deliberately **not** `expanding.getSubRows`. That one is wired only under
	 * `expanding.mode: 'tree'`, and writing an `expanding` config injects the `__expand__`
	 * column — a second chevron column a server-grouped grid does not want, since the `__group__`
	 * cell carries its own.
	 */
	getSubRows?: (row: TRow, index: number) => TRow[] | undefined
```

- [ ] **Step 4: Wire it, and drop the `manualGrouping` mapping**

In `create-table-options.ts`, replace the `getSubRows` block at ~1088 so grouping can supply it:

```ts
		// `grouping.getSubRows` first: a server-grouped grid states the tree there and writes no
		// `expanding` config at all, which is what keeps `__expand__` out of the column list.
		...(groupingCfg?.getSubRows !== undefined
			? { getSubRows: groupingCfg.getSubRows }
			: hasExpanding && expandMode === ExpandingMode.Tree
				? {
						getSubRows:
							expandingCfg?.getSubRows ??
							((row: TRow) => (row as Record<string, unknown>).children as TRow[] | undefined),
					}
				: {}),
```

Delete line 1105 entirely — `...(groupingCfg?.manual === true ? { manualGrouping: true } : {})` — and leave a note where it stood so the next reader does not restore it:

```ts
// No `manualGrouping`. Upstream's flag makes `getGroupedRowModel()` return the pre-grouped
// model untouched, and every part of group-row behaviour keys on `row.groupingColumnId`,
// which only a grouped row model sets — so the flag produced an empty `__group__` column
// and a grouped column missing from the list. Server grouping is
// `createManualGroupedRowModel()` instead; see its docblock.
```

- [ ] **Step 5: Run the package and hunt the call sites**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run --reporter=basic && pnpm --filter @ez-kit/data-grid-core typecheck`
Then: `grep -rn "manual" packages/data-grid apps/docs --include='*.ts' --include='*.tsx' --include='*.mdx' | grep -i group`
Expected: PASS, and the grep finding only prose you then fix in Task 9.

- [ ] **Step 6: Commit**

```bash
git add packages/data-grid/core/src
git commit -m "feat(data-grid-core)!: replace grouping.manual with grouping.getSubRows"
```

---

### Task 5: `createManualGroupedRowModel()` — the tree shape

**Files:**

- Create: `packages/data-grid/core/src/features/grouping/create-manual-grouped-row-model.ts`
- Modify: `packages/data-grid/core/src/features/entry.ts:87`
- Test: `packages/data-grid/core/src/features/grouping/manual-grouped-row-model.test.ts` (new)

**Interfaces:**

- Consumes: `grouping.getSubRows` (Task 4).
- Produces:

```ts
export type ManualGroupingAdapters<TRow> = {
	isGroupRow?: (row: TRow) => boolean
	getLevel?: (row: TRow) => number
}

export function createManualGroupedRowModel<TFeatures extends TableFeatures, TData extends RowData = any>(
	adapters?: ManualGroupingAdapters<TData>,
): (table: Table<TFeatures, TData>) => () => RowModel<TFeatures, TData>
```

The generic order mirrors `createGroupedRowModel` exactly, so the `tableFeatures({ groupedRowModel })` slot infers `TFeatures` from context as it does today. `TData` is inferred from `adapters`, so a consumer annotates the callback parameter — `createManualGroupedRowModel({ isGroupRow: (row: Deal) => row.level === 0 })` — rather than writing a type argument, which would bind to `TFeatures`.

- [ ] **Step 1: Write the failing tests**

Create `manual-grouped-row-model.test.ts` with the import style of `grouping.test.ts` (features from `@tanstack/table-core`; `createTable` and `createColumns` from this package):

```ts
type ServerRow = {
	id: string
	region?: string
	manager?: string
	account?: string
	amount?: number
	subRows?: ServerRow[]
}

const TREE: ServerRow[] = [
	{
		id: 'g:EMEA',
		region: 'EMEA',
		amount: 100,
		subRows: [
			{ id: '1', region: 'EMEA', manager: 'Ivanov', account: 'Acme', amount: 70 },
			{ id: '2', region: 'EMEA', manager: 'Ivanov', account: 'Globex', amount: 30 },
		],
	},
	{
		id: 'g:APAC',
		region: 'APAC',
		amount: 100,
		subRows: [{ id: '3', region: 'APAC', account: 'Umbrella', amount: 100 }],
	},
]

const COLUMNS = createColumns<ServerRow>([
	{ accessorKey: 'region' },
	{ accessorKey: 'manager' },
	{ accessorKey: 'account' },
	{ accessorKey: 'amount' },
])

const MANUAL = tableFeatures({
	columnGroupingFeature,
	groupedRowModel: createManualGroupedRowModel(),
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
})

const build = (data: ServerRow[], by: string[]) =>
	createTable({
		features: MANUAL,
		data,
		columns: COLUMNS,
		grouping: { by, getSubRows: (row) => row.subRows },
		getRowId: (row) => row.id,
	})

describe('the manual grouped row model, tree shape', () => {
	it('marks the top level as group rows and leaves the leaves alone', () => {
		const rows = build(TREE, ['region']).getRowModel().rows

		expect(rows).toHaveLength(2)
		expect(rows[0]?.getIsGrouped()).toBe(true)
		expect(rows[0]?.groupingColumnId).toBe('region')
		expect(rows[0]?.groupingValue).toBe('EMEA')
		expect(rows[0]?.subRows[0]?.getIsGrouped()).toBe(false)
	})

	it('returns the server value for an aggregated column and computes nothing', () => {
		// The leaves happen to sum to 100 as well, so the distinction is only visible on a group
		// row whose field disagrees with its children.
		const tampered: ServerRow[] = [{ ...TREE[0]!, amount: 999 }]

		expect(build(TREE, ['region']).getRowModel().rows[0]?.getValue('amount')).toBe(100)
		expect(build(tampered, ['region']).getRowModel().rows[0]?.getValue('amount')).toBe(999)
	})

	it('reads empty rather than a computed total when the server omitted the field', () => {
		const withoutTotal: ServerRow[] = [{ id: 'g:EMEA', region: 'EMEA', subRows: TREE[0]!.subRows }]

		expect(build(withoutTotal, ['region']).getRowModel().rows[0]?.getValue('amount')).toBeUndefined()
	})

	it('counts the leaves beneath a group', () => {
		const rows = build(TREE, ['region']).getRowModel().rows

		expect(rows[0]?.getLeafRows()).toHaveLength(2)
		expect(rows[1]?.getLeafRows()).toHaveLength(1)
	})

	it('treats rows deeper than `by.length` as records', () => {
		const nested: ServerRow[] = [
			{
				id: 'g:EMEA',
				region: 'EMEA',
				amount: 100,
				subRows: [{ id: '1', region: 'EMEA', account: 'Acme', amount: 70, subRows: [{ id: '1a', amount: 70 }] }],
			},
		]
		const group = build(nested, ['region']).getRowModel().rows[0]

		expect(group?.getIsGrouped()).toBe(true)
		expect(group?.subRows[0]?.getIsGrouped()).toBe(false)
		expect(group?.subRows[0]?.subRows[0]?.getIsGrouped()).toBe(false)
	})

	it('groups two levels, outermost first', () => {
		const twoLevel: ServerRow[] = [
			{
				id: 'g:EMEA',
				region: 'EMEA',
				amount: 100,
				subRows: [{ id: 'g:EMEA>Ivanov', manager: 'Ivanov', amount: 100, subRows: TREE[0]!.subRows }],
			},
		]
		const group = build(twoLevel, ['region', 'manager']).getRowModel().rows[0]

		expect(group?.groupingColumnId).toBe('region')
		expect(group?.subRows[0]?.getIsGrouped()).toBe(true)
		expect(group?.subRows[0]?.groupingColumnId).toBe('manager')
		expect(group?.subRows[0]?.groupingValue).toBe('Ivanov')
		expect(group?.getLeafRows()).toHaveLength(2)
	})

	it('leaves a childless top-level row as a record', () => {
		const flatOnly: ServerRow[] = [{ id: '1', region: 'EMEA', account: 'Acme', amount: 70 }]

		expect(build(flatOnly, ['region']).getRowModel().rows[0]?.getIsGrouped()).toBe(false)
	})
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run src/features/grouping/manual --reporter=basic`
Expected: FAIL — `createManualGroupedRowModel` is not exported.

- [ ] **Step 3: Write the model**

Create `create-manual-grouped-row-model.ts`:

```ts
import { flattenBy, makeObjectMap, tableMemo } from '@tanstack/table-core'

import type { Row, RowData, RowModel, Table, TableFeatures } from '@tanstack/table-core'

/**
 * How to read a **flat** server response — one sequence of rows carrying their own level, which is
 * what a SQL backend produces from `GROUPING SETS` / `ROLLUP`.
 *
 * Omit both and the model expects a **tree**: rows nested through `grouping.getSubRows`, where
 * depth alone says what is a group (anything shallower than `grouping.by` is one) and no adapter
 * is needed at all.
 */
export type ManualGroupingAdapters<TRow> = {
	/** Whether this row is a group row rather than a record. */
	isGroupRow?: (row: TRow) => boolean
	/** This row's nesting level, outermost `0`. */
	getLevel?: (row: TRow) => number
}

/**
 * The grouped row model for rows the **server** already grouped.
 *
 * It occupies the same `groupedRowModel` slot as `createGroupedRowModel()` and is the one thing
 * that turns server grouping on. There is no `manual` flag, because a flag can claim a behaviour
 * the registered model does not implement — which is exactly what upstream's `manualGrouping`
 * does. That option makes `getGroupedRowModel()` hand back the pre-grouped model untouched, and
 * since every part of group-row behaviour in v9 keys on `row.groupingColumnId` — a property only a
 * grouped model sets — the result is an empty `__group__` column and a grouped column missing from
 * the list.
 *
 * So this model **decorates** rather than groups: it marks the rows the server nested with the
 * three properties the rest of the grid reads, and deliberately leaves `getValue` alone, where
 * upstream's model replaces it with an aggregating one. A group row's subtotal is therefore the
 * field the server put on it, read by the ordinary accessor — which is why a server-grouped grid
 * needs neither `rowAggregationFeature` nor `aggregationFns`, and why a group row whose field is
 * absent reads `undefined` instead of a number computed behind the author's back.
 *
 * Rows are mutated in place. Upstream does the same (`resetRowRelationships` assigns `row.depth`),
 * and it is the reason this is a row model rather than something in the React layer: the row
 * objects every downstream reader already holds are the ones that have to carry the marks.
 *
 * Keep it out of `allDataGridFeatures` — two models cannot occupy one slot, and the all-in set is
 * the client one.
 */
export function createManualGroupedRowModel<TFeatures extends TableFeatures, TData extends RowData = any>(
	adapters?: ManualGroupingAdapters<TData>,
): (table: Table<TFeatures, TData>) => () => RowModel<TFeatures, TData> {
	return (table) =>
		tableMemo({
			feature: 'columnGroupingFeature',
			table,
			fnName: 'table.getGroupedRowModel',
			memoDeps: () => [table.atoms.grouping?.get(), table.getPreGroupedRowModel(), table.options.columns],
			fn: () => build(table, adapters),
		})
}

function build<TFeatures extends TableFeatures, TData extends RowData>(
	table: Table<TFeatures, TData>,
	adapters: ManualGroupingAdapters<TData> | undefined,
): RowModel<TFeatures, TData> {
	const model = table.getPreGroupedRowModel()
	const grouping = table.atoms.grouping?.get() ?? []
	if (!model.rows.length || !grouping.length) return model

	// Only the levels that still resolve to a column, exactly as upstream filters them: a grouping
	// state can outlive a column it names.
	const levels = grouping.filter((columnId) => table.getAllColumns().some((column) => column.id === columnId))

	const flatRows: Row<TFeatures, TData>[] = []
	const rowsById: Record<string, Row<TFeatures, TData>> = makeObjectMap()

	const walk = (rows: Row<TFeatures, TData>[], depth: number): void => {
		for (const row of rows) {
			flatRows.push(row)
			rowsById[row.id] = row

			const columnId = levels[depth]
			// A group row is a row at a level `by` names that actually has children. A childless row
			// at that depth is a record the server chose not to nest — marking it would give it a
			// label and take its own columns away.
			if (columnId !== undefined && row.subRows.length > 0) {
				Object.assign(row, {
					groupingColumnId: columnId,
					groupingValue: row.getValue(columnId),
					leafRows: flattenBy(row.subRows, (child: Row<TFeatures, TData>) => child.subRows).filter(
						(candidate) => candidate.subRows.length === 0,
					),
				})
			}

			if (row.subRows.length > 0) walk(row.subRows, depth + 1)
		}
	}

	walk(model.rows, 0)

	return { rows: model.rows, flatRows, rowsById }
}
```

Two things to verify rather than assume, because they are where this can go quietly wrong:

1. **`flattenBy`'s signature and what it returns.** Check `node_modules/@tanstack/table-core/dist/utils.d.ts`. The `.filter` above assumes it returns every descendant; if it already returns only leaves, drop the filter — but keep the two-level test's `getLeafRows()).toHaveLength(2)` assertion either way, since that is what tells the two apart.
2. **`makeObjectMap`'s form.** If it takes a type argument, write `makeObjectMap<Row<TFeatures, TData>>()`; if not, the annotated `const` above is enough.

- [ ] **Step 4: Export it**

In `features/entry.ts`, beside `createGroupedRowModel` (line 87), export it from this module. It is **our** module rather than a re-export from `@tanstack/table-core`, so it goes with the file's local exports; match how the file separates the two groups.

Do **not** add it to `features/all.ts`.

- [ ] **Step 5: Run the tests and the type-check**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run --reporter=basic && pnpm --filter @ez-kit/data-grid-core typecheck`
Expected: PASS. If the `tableFeatures({ groupedRowModel: createManualGroupedRowModel() })` slot rejects the factory on variance, type the return as `ReturnType<typeof createGroupedRowModel<TFeatures, TData>>` instead of spelling it out — the same type, inferred from upstream so it cannot drift.

- [ ] **Step 6: Commit**

```bash
git add packages/data-grid/core/src/features
git commit -m "feat(data-grid-core): add createManualGroupedRowModel for server-grouped rows"
```

---

### Task 6: The flat shape, and the model/config mismatch guard

**Files:**

- Modify: `packages/data-grid/core/src/features/grouping/create-manual-grouped-row-model.ts`
- Modify: `packages/data-grid/core/src/create-table/create-table-options.ts`
- Test: `packages/data-grid/core/src/features/grouping/manual-grouped-row-model.test.ts`
- Test: `packages/data-grid/core/src/create-table/create-table-options.test.ts`

**Interfaces:**

- Consumes: `ManualGroupingAdapters` (Task 5).
- Produces: the same factory, now folding a flat sequence into a hierarchy when `isGroupRow` is
  supplied, and carrying a marker property so core can tell the two grouped row models apart:
  `MANUAL_GROUPED_ROW_MODEL`, a module-level `Symbol` exported from the same file.

- [ ] **Step 1: Write the failing tests**

Append to the same suite:

```ts
describe('the manual grouped row model, flat shape', () => {
	type FlatRow = { id: string; level: number; region?: string; account?: string; amount?: number }

	const FLAT: FlatRow[] = [
		{ id: 'g:EMEA', level: 0, region: 'EMEA', amount: 100 },
		{ id: '1', level: 1, region: 'EMEA', account: 'Acme', amount: 70 },
		{ id: '2', level: 1, region: 'EMEA', account: 'Globex', amount: 30 },
		{ id: 'g:APAC', level: 0, region: 'APAC', amount: 100 },
		{ id: '3', level: 1, region: 'APAC', account: 'Umbrella', amount: 100 },
	]

	const FLAT_FEATURES = tableFeatures({
		columnGroupingFeature,
		groupedRowModel: createManualGroupedRowModel({
			isGroupRow: (row: FlatRow) => row.level === 0,
			getLevel: (row: FlatRow) => row.level,
		}),
		rowExpandingFeature,
		expandedRowModel: createExpandedRowModel(),
	})

	const buildFlat = (data: FlatRow[]) =>
		createTable({
			features: FLAT_FEATURES,
			data,
			columns: createColumns<FlatRow>([
				{ accessorKey: 'region' },
				{ accessorKey: 'account' },
				{ accessorKey: 'amount' },
			]),
			grouping: { by: ['region'] },
			getRowId: (row) => row.id,
		})

	it('folds the sequence into groups and their records', () => {
		const rows = buildFlat(FLAT).getRowModel().rows

		expect(rows).toHaveLength(2)
		expect(rows[0]?.getIsGrouped()).toBe(true)
		expect(rows[0]?.groupingValue).toBe('EMEA')
		expect(rows[0]?.subRows.map((row) => row.id)).toEqual(['1', '2'])
		expect(rows[1]?.subRows.map((row) => row.id)).toEqual(['3'])
	})

	it('reads the subtotal off the group row rather than computing it', () => {
		expect(buildFlat(FLAT).getRowModel().rows[0]?.getValue('amount')).toBe(100)
	})

	it('sets depth and parent on the folded records', () => {
		const group = buildFlat(FLAT).getRowModel().rows[0]

		expect(group?.depth).toBe(0)
		expect(group?.subRows[0]?.depth).toBe(1)
		expect(group?.subRows[0]?.parentId).toBe('g:EMEA')
	})

	it('throws in development on a level that jumps by more than one', () => {
		expect(() =>
			buildFlat([
				{ id: 'g:EMEA', level: 0, region: 'EMEA' },
				{ id: '1', level: 2, account: 'Acme' },
			]).getRowModel(),
		).toThrow(/level/i)
	})

	it('keeps a record that arrives before any group row at the top level', () => {
		const rows = buildFlat([{ id: '1', level: 1, account: 'Acme', amount: 70 }]).getRowModel().rows

		expect(rows).toHaveLength(1)
		expect(rows[0]?.getIsGrouped()).toBe(false)
	})
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run src/features/grouping/manual --reporter=basic`
Expected: FAIL — the flat rows come back as five top-level rows, none of them grouped.

- [ ] **Step 3: Implement the fold**

Add to `create-manual-grouped-row-model.ts`. Import `IS_DEV` the way the rest of core does — grep `IS_DEV` in `create-table-options.ts` for the module it comes from.

```ts
/**
 * Folds a flat sequence into a hierarchy using each row's own level.
 *
 * A level greater than the previous row's opens a child list; an equal or smaller one closes back
 * to that depth. A jump of more than one is a hole in the response — a group level the server
 * skipped — and it **throws in development**, because both alternatives are worse: attaching the
 * row anyway invents a parent it does not have, and dropping it loses data silently. In production
 * it attaches at the nearest legal depth, so a bad page degrades rather than blanks.
 */
function foldByLevel<TFeatures extends TableFeatures, TData extends RowData>(
	rows: Row<TFeatures, TData>[],
	getLevel: (row: TData) => number,
): Row<TFeatures, TData>[] {
	const roots: Row<TFeatures, TData>[] = []
	// `stack[d]` is the row currently open at depth `d`.
	const stack: Row<TFeatures, TData>[] = []

	for (const row of rows) {
		const declared = getLevel(row.original)
		if (IS_DEV && declared > stack.length) {
			throw new Error(
				`[data-grid] Row '${row.id}' declares level ${String(declared)} but the deepest open level is ` +
					`${String(stack.length)} — the response skipped a group level. Rows must arrive in order, ` +
					'outermost first.',
			)
		}

		const depth = Math.min(declared, stack.length)
		stack.length = depth
		const parent = depth > 0 ? stack[depth - 1] : undefined
		Object.assign(row, { depth, subRows: [], parentId: parent?.id })
		if (parent) parent.subRows.push(row)
		else roots.push(row)
		stack.push(row)
	}

	return roots
}
```

In `build`, choose the roots before walking:

```ts
// `isGroupRow` is what selects the flat shape; `getLevel` is what gives the depth. With
// `isGroupRow` alone the fold degenerates to one group level, which is the common case.
const rootRows =
	adapters?.isGroupRow !== undefined
		? foldByLevel(model.rows, adapters.getLevel ?? ((row: TData) => (adapters.isGroupRow?.(row) === true ? 0 : 1)))
		: model.rows
```

then `walk(rootRows, 0)` and `return { rows: rootRows, flatRows, rowsById }`.

- [ ] **Step 4: Run the tests and the type-check**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run --reporter=basic && pnpm --filter @ez-kit/data-grid-core typecheck`
Expected: PASS, the tree tests included — the tree path must be untouched when no adapters are given.

- [ ] **Step 5: Write the failing mismatch tests**

The two models are interchangeable at the slot, so nothing stops a config that contradicts the one
registered — and both mismatches are silent. `grouping.getSubRows` with the **client** model means
the grid groups an already-grouped tree a second time; the **manual** model with neither
`getSubRows` nor adapters means flat rows and no grouping at all. Neither throws.

Add to `create-table-options.test.ts`:

```ts
describe('grouped row model vs. grouping config', () => {
	it('warns when `grouping.getSubRows` is written but the client model is registered', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		createTable({
			features: GROUPING, // groupedRowModel: createGroupedRowModel()
			data: DATA,
			columns: COLUMNS,
			grouping: { by: ['region'], getSubRows: (row) => (row as { subRows?: Row[] }).subRows },
		})

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('createManualGroupedRowModel'))
	})

	it('warns when the manual model is registered with nothing to read the groups from', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		createTable({
			features: tableFeatures({
				columnGroupingFeature,
				groupedRowModel: createManualGroupedRowModel(),
				rowExpandingFeature,
				expandedRowModel: createExpandedRowModel(),
			}),
			data: DATA,
			columns: COLUMNS,
			grouping: { by: ['region'] },
		})

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('getSubRows'))
	})

	it('says nothing when the model and the config agree', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		createTable({
			features: tableFeatures({
				columnGroupingFeature,
				groupedRowModel: createManualGroupedRowModel(),
				rowExpandingFeature,
				expandedRowModel: createExpandedRowModel(),
			}),
			data: DATA,
			columns: COLUMNS,
			grouping: { by: ['region'], getSubRows: (row) => (row as { subRows?: Row[] }).subRows },
		})

		expect(warn).not.toHaveBeenCalled()
	})
})
```

- [ ] **Step 6: Run them and watch them fail**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run src/create-table/create-table-options --reporter=basic`
Expected: FAIL — "expected warn to have been called".

- [ ] **Step 7: Mark the factory**

In `create-manual-grouped-row-model.ts`:

```ts
/**
 * Marks a factory's return value as the server-grouping model.
 *
 * Core cannot otherwise tell the two grouped row models apart — both are plain functions in the
 * same slot — and it has to, because a `grouping.getSubRows` paired with the client model and a
 * manual model paired with nothing are both silent wrong answers rather than errors.
 */
export const MANUAL_GROUPED_ROW_MODEL = Symbol('ez-kit.manualGroupedRowModel')
```

and in the factory, before returning:

```ts
const factory = (table: Table<TFeatures, TData>) =>
	tableMemo({
		/* … as above … */
	})
return Object.assign(factory, { [MANUAL_GROUPED_ROW_MODEL]: true as const })
```

Export the symbol from `features/entry.ts` beside the factory — core reads it, and a consumer never
needs to.

- [ ] **Step 8: Warn on each mismatch**

In `create-table-options.ts`, beside the other grouping guards:

```ts
// Runtime-only, like every guard in this file.
if (IS_DEV && hasGrouping) {
	const model = (registeredFeatures as { groupedRowModel?: Record<symbol, unknown> }).groupedRowModel
	const isManualModel = model?.[MANUAL_GROUPED_ROW_MODEL] === true
	const hasTreeReader = groupingCfg?.getSubRows !== undefined

	if (hasTreeReader && !isManualModel) {
		console.warn(
			'[data-grid] `grouping.getSubRows` says the rows arrive already grouped, but `features` ' +
				'registers the client grouped row model, which will group them a second time. Register ' +
				'`groupedRowModel: createManualGroupedRowModel()` instead.',
		)
	}

	if (isManualModel && !hasTreeReader) {
		console.warn(
			'[data-grid] `createManualGroupedRowModel()` is registered but nothing tells the grid where ' +
				'the groups are: write `grouping.getSubRows` for a tree response, or pass the model ' +
				'`isGroupRow` / `getLevel` for a flat one. As it stands the rows render ungrouped.',
		)
	}
}
```

The second branch cannot see the adapters from here — they are arguments to the factory, not config
(see the spec's §3.3). So the factory must also record whether it got any: widen the marker to
`{ [MANUAL_GROUPED_ROW_MODEL]: { flat: adapters?.isGroupRow !== undefined } }` and read `.flat` in
the condition, so a flat-shape grid with no `getSubRows` is correct rather than warned at.

- [ ] **Step 9: Run the package and the type-check**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run --reporter=basic && pnpm --filter @ez-kit/data-grid-core typecheck`
Expected: PASS, and no warning from any existing suite — a grid registering the client model and no
`getSubRows` must stay silent.

- [ ] **Step 10: Commit**

```bash
git add packages/data-grid/core/src
git commit -m "feat(data-grid-core): fold a flat server response into groups, and warn on a model/config mismatch"
```

---

### Task 7: A group row's supplied aggregate reaches `aggregation.component`

**Files:**

- Modify: `packages/data-grid/react/react/src/data-grid/cell.tsx:503-518`
- Test: `packages/data-grid/react/react/src/data-grid/aggregation-totals.test.tsx`

**Interfaces:**

- Consumes: the manual model (Task 5), `ResolvedGridOptions['aggregation']` (Task 2).
- Produces: nothing other tasks read.

**Why this task exists.** Upstream gates the aggregated-cell mode on a _resolvable aggregation function_: `cell_getIsAggregated` ends in `column_getAggregationFns(cell.column).some((entry) => !!entry.aggregationFn)`. A server-grouped column has no `fn` — that is the point — so `cell.getIsAggregated()` is `false`, the cell falls through to the ordinary view branch, and the group row shows the server's value formatted by the column's cell type. The output is right; what is silently dropped is `aggregation.component` and the `data-aggregated-cell` attribute both kits' stylesheets can target. Left alone, an author's renderer does nothing on exactly the grids this spec exists for.

- [ ] **Step 1: Write the failing tests**

Append to `aggregation-totals.test.tsx`. `TREE` and `ServerRow` are Task 5's fixtures — lift them
into a shared fixture module rather than retyping them. `MANUAL_GROUPING` is **not** Task 5's
`MANUAL`: core's set needs no structural features because nothing renders there, while a React set
must carry `columnVisibilityFeature`, `columnPinningFeature` and `columnSizingFeature` or the grid
throws at render. So declare it in this package as the structural three plus the same grouping
members — `columnGroupingFeature`, `groupedRowModel: createManualGroupedRowModel()`,
`rowExpandingFeature`, `expandedRowModel` — and no aggregation feature.

```tsx
it("renders a group row's supplied subtotal through `aggregation.component`", () => {
	renderGrid({
		features: MANUAL_GROUPING, // no rowAggregationFeature, no aggregationFns
		data: TREE,
		columns: createColumns<ServerRow>([
			{ accessorKey: 'region' },
			{ accessorKey: 'amount', aggregation: { component: ({ value }) => <b>{`sum ${String(value)}`}</b> } },
		]),
		grouping: { by: ['region'], getSubRows: (row) => row.subRows },
		getRowId: (row) => row.id,
	})

	expect(screen.getByText('sum 100')).toBeInTheDocument()
})

it('stamps a group row aggregate cell so a kit can style it', () => {
	const { container } = renderGrid({
		features: MANUAL_GROUPING,
		data: TREE,
		columns: createColumns<ServerRow>([{ accessorKey: 'region' }, { accessorKey: 'amount' }]),
		grouping: { by: ['region'], getSubRows: (row) => row.subRows },
		getRowId: (row) => row.id,
	})

	expect(container.querySelectorAll('[data-aggregated-cell="true"]').length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/data-grid/aggregation-totals --reporter=basic`
Expected: FAIL — `100` renders unwrapped, and no cell carries the attribute.

- [ ] **Step 3: Widen the branch**

In `cell.tsx`, replace the single `isAggregated` read:

```ts
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
const isUpstreamAggregated = cell.getIsAggregated?.() ?? false
// Upstream's answer is gated on a **resolvable aggregation function**
// (`column_getAggregationFns(column).some((e) => !!e.aggregationFn)`), which a server-grouped
// column does not have and does not want: its subtotal is a field the server put on the group
// row. Without this second arm, `aggregation.component` and `data-aggregated-cell` would both
// go missing on exactly the grids that supply their own numbers — while the value rendered
// anyway, through the ordinary view branch, so nothing would look broken.
//
// It reads `row.getIsGrouped()`, which is not a second notion of what a group row is: the
// manual row model sets `groupingColumnId`, so that method is authoritative in both modes. A
// column on a group row with no aggregate of any kind is unaffected — `getValue()` is
// `undefined` there, which is what the `!== undefined` clause keeps out.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
const isGroupRow = row.getIsGrouped?.() ?? false
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
const isGroupedColumn = cell.column.getIsGrouped?.() ?? false
const isAggregated = isUpstreamAggregated || (isGroupRow && !isGroupedColumn && cell.getValue() !== undefined)
```

Read `AggregatedCell`'s own body before moving on and confirm it needs no change: it takes `cell` / `row` / `chrome` and resolves the renderer off `meta`, so it should not assume the feature is registered.

- [ ] **Step 4: Run the whole react suite**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run --reporter=basic`
Expected: PASS. Watch `grouping.test.tsx`'s `shows no leaf datum for a column that is neither grouped nor aggregated` — the `cell.getValue() !== undefined` clause is what keeps it passing, so if it fails the clause is wrong, not the test.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/react/react/src/data-grid
git commit -m "fix(data-grid-react): apply a column's aggregate renderer to a server-supplied subtotal"
```

---

### Task 8: A server-grouped grid renders end to end

**Files:**

- Test: `packages/data-grid/react/react/src/data-grid/manual-grouping.test.tsx` (new)

**Interfaces:**

- Consumes: everything above. Produces nothing — this task adds no source.

- [ ] **Step 1: Write the tests**

`MANUAL_GROUPING` here is the structural three plus `columnGroupingFeature`, the manual model, `rowExpandingFeature` and `expandedRowModel` — and deliberately no aggregation feature. Take the chevron's accessible name from `grouping.test.tsx` rather than guessing it; that suite already clicks one.

```tsx
describe('a server-grouped grid', () => {
	const setup = () =>
		renderGrid({
			features: MANUAL_GROUPING,
			data: TREE,
			columns: createColumns<ServerRow>([
				{ accessorKey: 'region', header: 'Region' },
				{ accessorKey: 'account', header: 'Account' },
				{ accessorKey: 'amount', header: 'Amount' },
			]),
			grouping: { by: ['region'], getSubRows: (row) => row.subRows },
			aggregation: { manual: true, totals: { amount: 200 } },
			getRowId: (row) => row.id,
			layout: { footer: true },
		})

	it('labels each group', () => {
		setup()

		expect(screen.getByText('EMEA')).toBeInTheDocument()
		expect(screen.getByText('APAC')).toBeInTheDocument()
	})

	it('takes the grouped column out of the header', () => {
		setup()

		expect(screen.queryByRole('columnheader', { name: 'Region' })).not.toBeInTheDocument()
		expect(screen.getByRole('columnheader', { name: 'Account' })).toBeInTheDocument()
	})

	it('shows the grand total in the footer and the subtotals on the group rows', () => {
		setup()

		expect(screen.getByText('200')).toBeInTheDocument()
		expect(screen.getAllByText('100')).toHaveLength(2)
	})

	it('opens a group and shows its records', async () => {
		setup()

		expect(screen.queryByText('Acme')).not.toBeInTheDocument()
		await userEvent.click(screen.getAllByRole('button', { name: /expand|collapse/i })[0]!)
		expect(screen.getByText('Acme')).toBeInTheDocument()
	})

	it('registers no aggregation feature and still totals', () => {
		expect(Object.keys(MANUAL_GROUPING)).not.toContain('rowAggregationFeature')
		expect(Object.keys(MANUAL_GROUPING)).not.toContain('aggregationFns')
	})
})
```

- [ ] **Step 2: Run them**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/data-grid/manual-grouping --reporter=basic`
Expected: PASS without touching any source. A failure here is a defect in Tasks 2–7 — fix it there, and say which task owned it.

- [ ] **Step 3: Commit**

```bash
git add packages/data-grid/react/react/src/data-grid/manual-grouping.test.tsx
git commit -m "test(data-grid-react): cover a server-grouped grid end to end"
```

---

### Task 9: Documentation

**Files:**

- Modify: `apps/docs/content/docs/data-grid/grouping/index.mdx` (the options table)
- Modify: `apps/docs/content/docs/data-grid/grouping/aggregation.mdx` (a server-totals section and a second options table)
- Create: `apps/docs/shared/data-grid/examples/components/grouping/server.tsx`
- Modify: `apps/docs/shared/data-grid/examples/manifest.json`, `apps/docs/shared/data-grid/examples/registry.ts`
- Modify: `apps/docs/test/docs-options/page-type-map.ts:859-876`, `apps/docs/test/example-features/sets.ts`

- [ ] **Step 1: Write the example**

`server.tsx`, following `basic.tsx` beside it — `'use client'`, `export function ServerGroupingExample()`, `DataGrid` from `shared/DataGrid`, features at module scope. It holds a hardcoded pre-grouped tree and a `totals` object standing in for a response:

```tsx
const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnGroupingFeature,
	// The server grouped these rows; this model marks them rather than grouping them again.
	groupedRowModel: createManualGroupedRowModel(),
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
	// Deliberately no `rowAggregationFeature` and no `aggregationFns`: every number here was
	// computed by the server.
})
```

with `grouping={{ by: ['region'], getSubRows: (row) => row.subRows }}` and `aggregation={{ manual: true, totals: RESPONSE.totals }}`.

- [ ] **Step 2: Register it in all three places**

`manifest.json` — an `id` of `grouping-server`, `group: 'grouping'`, `sourceFile: 'components/grouping/server.tsx'`, `exportName: 'ServerGroupingExample'`, matching the shape of the `grouping-basic` entry.

`registry.ts` — a `sourceFile` → dynamic import entry. **This is hand-maintained and nothing catches a miss**: lint, typecheck and build all pass, and the example throws `has no registry entry for "<sourceFile>"` only when the page renders.

`test/example-features/sets.ts` — the example's required features, following the `grouping` entry at line 65. This set has no `rowAggregationFeature`, which is the point; check whether the file's `aggregation` rule would demand it for a column writing `aggregation` and adjust that entry's reasoning comment if so.

- [ ] **Step 3: Update `index.mdx`**

In the options table, replace the `grouping.manual` row with:

```markdown
| `grouping.getSubRows` | `(row, index) => TRow[]` | Reads a group row's children. Writing it says the rows arrive already grouped. |
```

The table's `expectedCount` in `page-type-map.ts` stays **6** — one row out, one row in.

- [ ] **Step 4: Rewrite the server half of `aggregation.mdx`**

The page states the client-only behaviour as the only behaviour. Add a section after "A footer total, with no grouping at all" covering:

- a supplied total comes from `aggregation.totals`, keyed by column id;
- a column needs no `aggregation` of its own for one to render;
- `aggregation.manual` means _compute nothing_, and why that matters — without it `getAggregationValue()` totals the rows the client holds, so under `filtering.manual` or `pagination.manual` the footer shows the **page** total while reading as the dataset total;
- group subtotals arrive as fields on the group row and need no option;
- a server-grouped grid registers neither `rowAggregationFeature` nor `aggregationFns`;
- `<DataGridDocsExample exampleId='grouping-server' />`.

Then a second options table:

```markdown
### Table options

| Option               | Type                      | Description                          |
| -------------------- | ------------------------- | ------------------------------------ |
| `aggregation.manual` | `boolean`                 | Never compute a total on the client. |
| `aggregation.totals` | `Record<string, unknown>` | Grand total per column id.           |
```

And correct the existing claim about pagination counting group rows: with server grouping the server decides what a page holds, so a page can end mid-group and the grid cannot help.

- [ ] **Step 5: Map the tables**

In `page-type-map.ts`, add to `GRID_TYPE`:

```ts
	AggregationConfig: { module: TypeModule.Core, name: 'AggregationConfig' },
```

and replace the `GroupingAggregation` entry:

```ts
	{
		page: DocPage.GroupingAggregation,
		optionTables: [
			{ heading: 'Options', roots: [GRID_TYPE.ColumnDef, GRID_TYPE.ColumnAggregationConfig], expectedCount: 3 },
			{
				heading: 'Table options',
				roots: [GRID_TYPE.UseDataGridConfig, GRID_TYPE.AggregationConfig],
				expectedCount: 2,
			},
		],
		nonOptionTables: [],
	},
```

- [ ] **Step 6: Run the docs tests**

Run: `pnpm build && pnpm --filter @ez-kit/docs exec vitest run test/docs-option-names.test.ts test/example-features.test.ts --reporter=basic`
Expected: PASS. The packages must be built first — the test resolves exports through `./dist`. A failure prints the file, the line, the bogus name and the governing type's legal keys.

- [ ] **Step 7: Render the example in both kits**

Run `pnpm docs:dev`, open `/docs/data-grid/grouping/aggregation`, and check the example with `?kit=shadcn` and `?kit=heroui`: group labels, subtotals, the footer total, and a chevron that opens a group. The live preview is an iframe of the real route, so this is the only check that catches a missing `registry.ts` entry.

- [ ] **Step 8: Commit**

```bash
git add apps/docs
git commit -m "docs(data-grid): document server-supplied totals and server grouping"
```

---

### Task 10: Guards, changesets, and the full check

**Files:**

- Modify: `apps/docs/test/tree-shaking.test.ts`
- Modify: `.changeset/data-grid-row-grouping-config.md`, `.changeset/data-grid-row-grouping-render.md`
- Create: `.changeset/data-grid-server-side-aggregation.md`

- [ ] **Step 1: Add the tree-shaking case**

A case for `createManualGroupedRowModel` imported alone from `@ez-kit/data-grid-core/features`, recording the **complete** set of `@ez-kit/*` entry points it reaches. Run the test to get the set — the failure prints what to record. It must not reach the client grouped row model's graph.

Run: `pnpm --filter @ez-kit/docs exec vitest run test/tree-shaking.test.ts --reporter=basic`

- [ ] **Step 2: Edit the two pending grouping changesets in place**

They describe an unreleased surface. Remove whatever they claim about `grouping.manual` and say what replaced it. Do **not** write a changeset entry for its removal as a break — it never shipped.

- [ ] **Step 3: Write the new changeset**

`.changeset/data-grid-server-side-aggregation.md`:

```markdown
---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

Aggregates the server computed, rendered rather than recomputed.

`aggregation: { manual: true, totals: { revenue: 232000 } }` supplies a grand total per column id.
A column needs no `aggregation` of its own for one to render, so a grid whose numbers all come from
the server registers neither `rowAggregationFeature` nor `aggregationFns` — and `manual` is what
stops the footer quietly totalling the rows the client happens to hold, which under
`filtering.manual` or `pagination.manual` is one page shown as if it were the dataset.

Server grouping is `groupedRowModel: createManualGroupedRowModel()` plus `grouping.getSubRows` for a
tree, or the model's `isGroupRow` / `getLevel` adapters for a flat response. Group subtotals need no
option at all: they are ordinary fields on the group row the server sent.

`grouping.manual` is gone. It set upstream's `manualGrouping`, which hands back the ungrouped row
model — and since group-row behaviour keys on `row.groupingColumnId`, which only a grouped model
sets, it rendered an empty `__group__` column and dropped the grouped column from the list.
```

**Never name `@ez-kit/data-grid-shadcn`** — `scripts/check-changesets.mjs` fails the lint step, after the merge, where it quietly stops the release PR from being written.

- [ ] **Step 4: Run everything**

Run: `pnpm run ci`
Expected: PASS — `lint` (0 warnings), `typecheck`, `test`, `build`, `size`. If a `size-limit` budget fails, report the number rather than raising the budget: the new model is small, so a jump means something else came with it.

- [ ] **Step 5: Run the browser suite**

Check the docs package's own script name, then run the Playwright suite for both kits. Nothing here adds a `data-slot`, so `e2e-slots.test.ts` has nothing to reconcile — but the existing grouping specs exercise the cell branch Task 7 widened.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/test/tree-shaking.test.ts .changeset
git commit -m "chore(data-grid): pin the server-aggregation surface and record the changeset"
```
