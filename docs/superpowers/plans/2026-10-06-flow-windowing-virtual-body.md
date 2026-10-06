# Flow Windowing for the Virtualized Body — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Position virtualized body rows **in normal flow**, offsetting the window with the tbody's
own padding, so that `@dnd-kit`'s native row displacement works in a virtualized grid.

**Architecture:** `VirtualBody` stops writing `transform: translateY(start)` on each row and stops
setting the tbody's `height`. Instead it writes `paddingTop` = the first **window** row's `start`
and `paddingBottom` = the remaining space below the last window row, and the structural stylesheet
stops taking virtual rows out of flow. The row being dragged while it is **outside** the window is
the one exception: it stays mounted (which is what keeps the drag's index space dense) but must
occupy no flow space, or it displaces the whole band.

**Tech Stack:** React 19, `@tanstack/react-virtual` 3.13.24, `@dnd-kit/{react,dom}` 0.1.21,
Tailwind v4 (`@apply` in the structural stylesheet), Vitest + jsdom, Playwright.

**Spec:** `docs/superpowers/plans/2026-10-06-flow-windowing-virtual-body.findings.md`

## Global Constraints

- `packages/data-grid/react/react` authors **no visual styling**. The structural stylesheet
  (`src/styles/global.css`) is this package's own and may change; inline `style` is allowed only for
  runtime-computed geometry the virtualizer owns, which is what `paddingTop` / `paddingBottom` /
  `height` are. No literal class name may be written in a `.tsx` file here.
- `packages/data-grid/react/shadcn/src/components/ui/**` must not be edited.
- Spacer **elements** are not an option. The heroui kit's `Tbody` is React Aria's `TableBody`
  (`packages/data-grid/react/heroui/src/blocks/core/table-adapters.tsx:134`), a collection section
  that silently drops any child that is not a collection item — the same constraint that made
  `<tfoot>` unreachable before react-aria-components 1.18. The offset must therefore live on an
  element the collection already renders: the tbody, or a row.
- `--max-warnings=0` on every package's lint script. Scoped
  `eslint-disable-next-line @typescript-eslint/no-unnecessary-condition` comments on runtime-optional
  feature reads must not be removed.
- `@ez-kit/data-grid-shadcn` is `private` and listed in `.changeset/config.json`'s `ignore` — it must
  never be named in a changeset. The changeset for this work names `@ez-kit/data-grid-react`.
- Everything written on GitHub is in English; no agent attribution in commit messages.
- Run a single package's tests directly: `pnpm --filter @ez-kit/data-grid-react test`.
  The docs app resolves `@ez-kit/*` to `./dist`, so any browser check needs
  `pnpm build --filter @ez-kit/data-grid-react` first.

## Review Focus

Five conditions the change implies that no task's happy path exercises, most likely to bite first:

1. **A drag whose auto-scroll carries the held row out of the window.** Measured to break the band:
   the held row joins `centerEntries` at its model index, so it becomes `centerEntries[0]` and its
   `start` of 0 silences `paddingTop` for the whole gesture, while its `size` corrupts
   `paddingBottom`. Pinned by Task 2.
2. **Row pinning together with virtualization.** No example or spec combines them today. Pinned rows
   share the tbody with the window, so container padding offsets them too. Pinned by Task 4.
3. **An empty window** (`virtualItems` empty — a grid whose data arrives after mount). Both pads must
   be `0` and the tbody must still reserve `getTotalSize()`, or the scrollport collapses and the
   virtualizer never gets a range to render. Pinned by Task 1.
4. **The infinite loader row** in virtualized mode, in each of its three states (fetching, has-next,
   error). It used to be absolutely positioned below the spacer with a fixed 56px allowance; in flow
   it must follow the last row with no allowance and no clipping. Pinned by Task 3.
5. **Rows whose measured height differs from `estimateSize`.** The explicit per-row `height` is what
   keeps the band aligned with the virtualizer's arithmetic; dropping it would let a kit's natural
   row height drift the band. Pinned by Task 1.

---

## File Structure

| File                                                                   | Responsibility after this change                                                                                                                                                                              |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/data-grid/react/react/src/data-grid/virtual-body.tsx`        | Modify. Computes the two pads from the **window** entries, renders rows with `height` only, renders an out-of-window held row as `data-virtual='row-held'`, drops `tbodyHeight` and `LOAD_MORE_ALLOWANCE_PX`. |
| `packages/data-grid/react/react/src/utils/virtual-window-pads.ts`      | Create. The pad arithmetic as a pure function, so it is testable without a DOM and the body stays a renderer.                                                                                                 |
| `packages/data-grid/react/react/src/utils/virtual-window-pads.test.ts` | Create. Unit tests for the arithmetic, including the empty window.                                                                                                                                            |
| `packages/data-grid/react/react/src/styles/global.css`                 | Modify. Virtual rows leave flow; the held-out-of-window row and the load-more row get their own rules.                                                                                                        |
| `packages/data-grid/react/react/src/data-grid/row.tsx`                 | Modify. `data-virtual` accepts `'row-held'`; its docblock stops saying rows are positioned via `transform`.                                                                                                   |
| `packages/data-grid/react/react/src/data-grid/flow-windowing.test.tsx` | Create. Renders the body against a stub virtualizer and asserts the inline pads and row styles, including the held-row case.                                                                                  |
| `packages/data-grid/react/heroui/src/styles.css`                       | Modify. Its virtualized load-more rule assumed absolute positioning.                                                                                                                                          |
| `apps/docs/e2e/packages/data-grid/ordering/virtual-row-drag.spec.ts`   | Modify. `committedIndexOf` stops reading `translateY`; the one-step `test.fail()` becomes a passing assertion; a new case asserts displacement.                                                               |
| `apps/docs/content/docs/data-grid/drag-and-drop.mdx`                   | Modify. The virtualized section's two bullets and the `Not built yet` entry.                                                                                                                                  |
| `packages/data-grid/react/{shadcn,heroui}/src/dnd.tsx`                 | Modify. The docblocks that explain the one-step loss.                                                                                                                                                         |
| `AGENTS.md`                                                            | Modify. Only if it asserts the virtualized drag limit (grep before editing).                                                                                                                                  |
| `.changeset/flow-windowing-virtual-body.md`                            | Create. Minor on `@ez-kit/data-grid-react`.                                                                                                                                                                   |

---

### Task 1: Flow windowing for a grid with no pinned rows and no drag

**Files:**

- Create: `packages/data-grid/react/react/src/utils/virtual-window-pads.ts`
- Test: `packages/data-grid/react/react/src/utils/virtual-window-pads.test.ts`
- Modify: `packages/data-grid/react/react/src/data-grid/virtual-body.tsx`
- Modify: `packages/data-grid/react/react/src/styles/global.css:181-183`
- Test: `packages/data-grid/react/react/src/data-grid/flow-windowing.test.tsx`

**Interfaces:**

- Produces: `resolveVirtualWindowPads(windowSpan: VirtualWindowSpan | undefined, totalSize: number): VirtualWindowPads`
  where `type VirtualWindowSpan = { start: number; end: number }` and
  `type VirtualWindowPads = { before: number; after: number }`.
  Task 2 calls it with the **window** span while the held row is excluded; Task 3 reads
  `pads.after` to confirm the loader needs no allowance.

- [ ] **Step 1: Write the failing test for the arithmetic**

Create `packages/data-grid/react/react/src/utils/virtual-window-pads.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { resolveVirtualWindowPads } from './virtual-window-pads'

describe('resolveVirtualWindowPads', () => {
	it('offsets the window by its first row and reserves the rest below', () => {
		expect(resolveVirtualWindowPads({ start: 490, end: 980 }, 49_000)).toEqual({
			before: 490,
			after: 48_020,
		})
	})

	it('reserves nothing below a window that reaches the end of the list', () => {
		expect(resolveVirtualWindowPads({ start: 48_510, end: 49_000 }, 49_000)).toEqual({
			before: 48_510,
			after: 0,
		})
	})

	it('pads nothing for an empty window, so the tbody can still reserve the total size', () => {
		expect(resolveVirtualWindowPads(undefined, 49_000)).toEqual({ before: 0, after: 0 })
	})

	it('clamps a window whose end overshoots the total size rather than reporting a negative pad', () => {
		expect(resolveVirtualWindowPads({ start: 0, end: 50_000 }, 49_000)).toEqual({
			before: 0,
			after: 0,
		})
	})
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm --filter @ez-kit/data-grid-react test -- virtual-window-pads`
Expected: FAIL — `Failed to resolve import "./virtual-window-pads"`.

- [ ] **Step 3: Write the helper**

Create `packages/data-grid/react/react/src/utils/virtual-window-pads.ts`:

```ts
/** The vertical span the virtualizer's window occupies inside the body's total scroll height. */
export type VirtualWindowSpan = {
	/** Offset of the window's first row from the top of the list, in px. */
	start: number
	/** Offset of the bottom edge of the window's last row, in px. */
	end: number
}

/** The two paddings that place a windowed, in-flow band inside the body's total scroll height. */
export type VirtualWindowPads = {
	before: number
	after: number
}

const NO_PADS: VirtualWindowPads = { before: 0, after: 0 }

/**
 * Where the window's band sits, expressed as the padding above and below it.
 *
 * This replaced a per-row `transform: translateY(start)`. The transform took every row out of flow,
 * which left the drag library's own displacement inert: it reorders DOM nodes and FLIP-animates the
 * layout change that follows, and out of flow there is no layout change to animate. Measured, the
 * neighbours of a dragged row did not move by a pixel. In flow they do, with no optimistic state
 * and no change to the drag port.
 *
 * `undefined` for an empty window — not `{ before: 0, after: totalSize }`. The caller reserves the
 * total size on the tbody regardless, and a grid whose rows arrive after mount renders one frame
 * with no window; padding the whole list into existence there would make the scrollport jump.
 */
export function resolveVirtualWindowPads(
	windowSpan: VirtualWindowSpan | undefined,
	totalSize: number,
): VirtualWindowPads {
	if (!windowSpan) return NO_PADS

	return {
		before: Math.max(windowSpan.start, 0),
		after: Math.max(totalSize - windowSpan.end, 0),
	}
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm --filter @ez-kit/data-grid-react test -- virtual-window-pads`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing render test**

Create `packages/data-grid/react/react/src/data-grid/flow-windowing.test.tsx`. Copy the stub
virtualizer harness from `virtualized-row-drag.test.tsx` (same directory) — it mounts
`VirtualProvider` with a hand-built `Virtualizer` whose `getVirtualItems()` and
`measurementsCache` the test controls, which is how a windowed body is testable in jsdom at all:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { TEST_COLUMNS, TEST_FEATURES, testComponents } from '../test-utils'

import { DataGrid } from './data-grid'
import { VirtualProvider } from './virtual-context'

import type { TestRow } from '../test-utils'
import type { Virtualizer, VirtualItem } from '@tanstack/react-virtual'

const ROW_HEIGHT = 40
const ROW_COUNT = 1_000
const TOTAL_SIZE = ROW_COUNT * ROW_HEIGHT

const DATA: TestRow[] = Array.from({ length: ROW_COUNT }, (_, index) => ({
	id: String(index + 1),
	name: `Row ${String(index + 1)}`,
	status: 'active',
	amount: index,
}))

/** A window of `count` rows starting at `firstIndex`, the shape `getVirtualItems()` returns. */
function windowItems(firstIndex: number, count: number): VirtualItem[] {
	return Array.from({ length: count }, (_, offset) => {
		const index = firstIndex + offset
		return {
			index,
			key: String(index + 1),
			start: index * ROW_HEIGHT,
			end: (index + 1) * ROW_HEIGHT,
			size: ROW_HEIGHT,
			lane: 0,
		}
	})
}

function stubVirtualizer(items: VirtualItem[]): Virtualizer<HTMLDivElement, Element> {
	return {
		getVirtualItems: () => items,
		getTotalSize: () => TOTAL_SIZE,
		measurementsCache: windowItems(0, ROW_COUNT),
	} as unknown as Virtualizer<HTMLDivElement, Element>
}

const { DataGrid: Grid } = createDataGrid<TestRow>({
	components: testComponents,
	features: TEST_FEATURES,
})

function renderWindow(items: VirtualItem[]) {
	return render(
		<VirtualProvider rowVirtualizer={stubVirtualizer(items)}>
			<Grid
				data={DATA}
				columns={TEST_COLUMNS}
				getRowId={(row) => row.id}
				virtualization={{ row: { estimateSize: ROW_HEIGHT } }}
			>
				<DataGrid.Table />
			</Grid>
		</VirtualProvider>,
	)
}

describe('flow windowing', () => {
	it('offsets the band with the tbody padding and reserves the rest below it', () => {
		const { container } = renderWindow(windowItems(10, 5))
		const tbody = container.querySelector('[data-slot="tbody"][data-virtualized="true"]')

		expect(tbody).toHaveStyle({ paddingTop: '400px', paddingBottom: `${String(TOTAL_SIZE - 600)}px` })
	})

	it('reserves the whole scroll height on the tbody, so the scrollport keeps its range', () => {
		const { container } = renderWindow(windowItems(10, 5))
		const tbody = container.querySelector('[data-slot="tbody"][data-virtualized="true"]')

		expect(tbody).toHaveStyle({ height: `${String(TOTAL_SIZE)}px` })
	})

	it('keeps rows in flow — an explicit height and no transform', () => {
		const { container } = renderWindow(windowItems(10, 5))
		const row = container.querySelector('[data-slot="tr"][data-virtual="row"]')

		expect(row).toHaveStyle({ height: `${String(ROW_HEIGHT)}px` })
		expect(row?.getAttribute('style')).not.toContain('transform')
	})

	it('pads nothing for an empty window but still reserves the scroll height', () => {
		const { container } = renderWindow([])
		const tbody = container.querySelector('[data-slot="tbody"][data-virtualized="true"]')

		expect(tbody).toHaveStyle({ paddingTop: '0px', paddingBottom: '0px', height: `${String(TOTAL_SIZE)}px` })
	})
})
```

- [ ] **Step 6: Run it and watch it fail**

Run: `pnpm --filter @ez-kit/data-grid-react test -- flow-windowing`
Expected: FAIL — the tbody has `height` but no padding, and the row's style contains
`transform: translateY(400px)`.

- [ ] **Step 7: Rewrite the body's geometry**

In `virtual-body.tsx`, import the helper and replace the geometry. The `height` on the tbody
**stays** — it is what reserves the scroll range; the padding places the band inside it, and
`box-sizing: border-box` (Tailwind's preflight, which both kits load) is what makes the two
compose rather than add up:

```tsx
import { resolveVirtualWindowPads } from '../utils/virtual-window-pads'
```

```tsx
const totalSize = rowVirtualizer.getTotalSize()
const showLoadMore = enabled && (hasNextPage || controller.isFetching || controller.error != null)
const columnCount = table.getVisibleLeafColumns().length
/*
 * Computed from the **window**, never from `centerEntries`: that list also carries the row being
 * dragged once the window has scrolled past it, at its model index — so a held row near the top
 * of a list becomes `centerEntries[0]` and its `start` of 0 silences `paddingTop` for the rest of
 * the gesture. Measured: the band stopped being offset at all and the tbody shrank by one row's
 * height per auto-scroll frame. That row is placed out of flow instead; see `data-virtual`.
 */
const firstWindowItem = virtualItems[0]
const lastWindowItem = virtualItems[virtualItems.length - 1]
const pads = resolveVirtualWindowPads(
	firstWindowItem && lastWindowItem ? { start: firstWindowItem.start, end: lastWindowItem.end } : undefined,
	totalSize,
)
```

Then the tbody:

```tsx
		<Tbody
			data-slot='tbody'
			data-virtualized='true'
			style={{
				height: `${String(totalSize)}px`,
				paddingTop: `${String(pads.before)}px`,
				paddingBottom: `${String(pads.after)}px`,
			}}
		>
```

And each centre row loses its transform:

```tsx
{
	centerEntries.map((entry) => (
		<DataGridRow
			key={entry.row.id}
			row={entry.row}
			data-virtual='row'
			style={{ height: `${String(entry.size)}px` }}
		/>
	))
}
```

Delete the now-unused `LOAD_MORE_ALLOWANCE_PX` constant and the `tbodyHeight` local. Update the
component's docblock: the paragraph beginning "Each virtual row receives runtime
`transform: translateY(start)`" is now wrong — replace it with the band description, and say that
the explicit per-row `height` is what keeps the band aligned with the virtualizer's arithmetic when
a kit's natural row height differs from `estimateSize`.

- [ ] **Step 8: Take virtual rows out of the absolute positioning**

In `packages/data-grid/react/react/src/styles/global.css`, replace

```css
[data-slot='tr'][data-virtual='row'] {
	@apply absolute top-0 left-0 w-full;
}
```

with

```css
/* In flow: the window's band is offset by the tbody's padding, not by a per-row transform. That is
   what lets the drag library displace a row's neighbours — it reorders DOM nodes and animates the
   layout change, and out of flow there is none. */
[data-slot='tr'][data-virtual='row'] {
	@apply w-full;
}
```

- [ ] **Step 9: Run the test and the package suite**

Run: `pnpm --filter @ez-kit/data-grid-react test -- flow-windowing`
Expected: PASS, 4 tests.

Run: `pnpm --filter @ez-kit/data-grid-react test`
Expected: PASS. If `virtualized-row-drag.test.tsx` fails, read the failure before changing it — it
asserts drag **indices**, which this task does not touch.

- [ ] **Step 10: Verify in the browser**

Run: `pnpm build --filter @ez-kit/data-grid-react` then, with `pnpm docs:dev` running, open
`/examples/shadcn/virtualized`. Scroll to the middle and confirm in devtools: rows 49px apart with
no gaps, `paddingTop` tracking `scrollTop`, and the scrollport's `scrollHeight` constant at
`rowCount * 49 + chrome`. Measured on the probe: at `scrollTop=245000`, `paddingTop` was `244510px`,
the first mounted row was `4991`, and `scrollHeight` held at `490041` across every offset.

- [ ] **Step 11: Commit**

```bash
git add packages/data-grid/react/react/src/utils/virtual-window-pads.ts \
        packages/data-grid/react/react/src/utils/virtual-window-pads.test.ts \
        packages/data-grid/react/react/src/data-grid/virtual-body.tsx \
        packages/data-grid/react/react/src/data-grid/flow-windowing.test.tsx \
        packages/data-grid/react/react/src/styles/global.css
git commit -m "refactor(data-grid): place virtualized rows in flow behind tbody padding"
```

---

### Task 2: The held row keeps the band intact after it leaves the window

**Files:**

- Modify: `packages/data-grid/react/react/src/data-grid/virtual-body.tsx`
- Modify: `packages/data-grid/react/react/src/data-grid/row.tsx` (the `'data-virtual'` prop type and its docblock)
- Modify: `packages/data-grid/react/react/src/styles/global.css`
- Test: `packages/data-grid/react/react/src/data-grid/flow-windowing.test.tsx` (add cases)

**Interfaces:**

- Consumes: `resolveVirtualWindowPads` from Task 1, already called with the window span.
- Produces: the `data-virtual='row-held'` attribute value, which Task 5's e2e and Task 4's pinned
  geometry both rely on being out of flow.

- [ ] **Step 1: Write the failing test**

Add to `flow-windowing.test.tsx`. The held row is produced by the registry, so drive it the way
`virtualized-row-drag.test.tsx` does — mount a stub adapter that reports `isDragging` for one id,
and render a window that does **not** contain that row:

```tsx
it('renders a held row that has left the window out of flow, so the band keeps its offset', () => {
	// Row "1" is held; the window starts at index 200, so the row is outside it.
	const { container } = renderWindowWithDrag(windowItems(200, 5), '1')
	const tbody = container.querySelector('[data-slot="tbody"][data-virtualized="true"]')
	const heldRow = container.querySelector('[data-slot="tr"][data-row-id="1"]')

	expect(tbody).toHaveStyle({ paddingTop: `${String(200 * ROW_HEIGHT)}px` })
	expect(heldRow).toHaveAttribute('data-virtual', 'row-held')
})

it('keeps the reserved scroll height while a row outside the window is held', () => {
	const { container } = renderWindowWithDrag(windowItems(200, 5), '1')
	const tbody = container.querySelector('[data-slot="tbody"][data-virtualized="true"]')

	expect(tbody).toHaveStyle({ height: `${String(TOTAL_SIZE)}px` })
})

it('leaves a held row that is still inside the window in flow', () => {
	const { container } = renderWindowWithDrag(windowItems(0, 5), '1')
	const heldRow = container.querySelector('[data-slot="tr"][data-row-id="1"]')

	expect(heldRow).toHaveAttribute('data-virtual', 'row')
})
```

Add the helper beside `renderWindow`, copying `makeDrivableAdapter` from
`virtualized-row-drag.test.tsx:29` verbatim rather than importing it (it is file-local there):

```tsx
function renderWindowWithDrag(items: VirtualItem[], draggingId: string) {
	const { adapter } = makeDrivableAdapter(draggingId)
	const { DataGrid: DragGrid } = createDataGrid<TestRow>({
		components: testComponents,
		features: TEST_FEATURES,
		dnd: adapter,
	})

	return render(
		<VirtualProvider rowVirtualizer={stubVirtualizer(items)}>
			<DragGrid
				data={DATA}
				columns={TEST_COLUMNS}
				getRowId={(row) => row.id}
				ordering={{ row: true }}
				virtualization={{ row: { estimateSize: ROW_HEIGHT } }}
			>
				<DataGrid.Table />
			</DragGrid>
		</VirtualProvider>,
	)
}
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm --filter @ez-kit/data-grid-react test -- flow-windowing`
Expected: FAIL — the held row carries `data-virtual="row"`, and `paddingTop` is already correct
only because Task 1 reads the window; the attribute assertion is what fails first.

- [ ] **Step 3: Mark the out-of-window held row**

In `virtual-body.tsx`, `centerEntries` is already built as "window plus the held row". Carry the
distinction onto each entry rather than recomputing it at the call site:

```tsx
const centerEntries =
	heldRow && heldMeasurement && !isHeldInWindow
		? [
				...windowEntries.map((entry) => ({ ...entry, isHeldOutOfWindow: false })),
				{
					index: heldIndex,
					row: heldRow,
					start: heldMeasurement.start,
					size: heldMeasurement.size,
					isHeldOutOfWindow: true,
				},
			].sort((left, right) => left.index - right.index)
		: windowEntries.map((entry) => ({ ...entry, isHeldOutOfWindow: false }))
```

and render it out of flow, at the offset its measurement gives it:

```tsx
{
	centerEntries.map((entry) =>
		entry.isHeldOutOfWindow ? (
			<DataGridRow
				key={entry.row.id}
				row={entry.row}
				data-virtual='row-held'
				style={{ transform: `translateY(${String(entry.start)}px)`, height: `${String(entry.size)}px` }}
			/>
		) : (
			<DataGridRow
				key={entry.row.id}
				row={entry.row}
				data-virtual='row'
				style={{ height: `${String(entry.size)}px` }}
			/>
		),
	)
}
```

The transform is correct **here and only here**: this row is out of flow by design, so a transform
is the only thing that can place it, and the drag library is moving the element anyway. Say that in
a comment, and say why it must take no flow space: measured, a held row left in flow re-entered the
band and shifted every row below it by one row's height per auto-scroll frame.

- [ ] **Step 4: Widen the row's prop type**

In `row.tsx`, change `'data-virtual'?: 'row'` to `'data-virtual'?: 'row' | 'row-held'`, and in the
attribute list in its docblock replace

```
 * - `data-virtual="row"` for virtualized rows (positioned via runtime `transform`)
```

with

```
 * - `data-virtual="row"` for virtualized rows (in flow, inside the tbody's padded band)
 * - `data-virtual="row-held"` for a dragged row the window has scrolled past (out of flow, so it
 *   does not displace the band; positioned by a runtime `transform`)
```

- [ ] **Step 5: Style the held row out of flow**

In `global.css`, beside the `row` rule from Task 1:

```css
/* A dragged row the window has scrolled past. It stays mounted so the drag's index space keeps its
   density, and out of flow so it does not displace the band it is no longer part of. */
[data-slot='tr'][data-virtual='row-held'] {
	@apply absolute top-0 left-0 w-full;
}
```

- [ ] **Step 6: Run the tests**

Run: `pnpm --filter @ez-kit/data-grid-react test -- flow-windowing`
Expected: PASS, 7 tests.

Run: `pnpm --filter @ez-kit/data-grid-react test`
Expected: PASS.

- [ ] **Step 7: Verify the gesture in the browser**

Run `pnpm build --filter @ez-kit/data-grid-react`, open `/examples/shadcn/virtualized-row-drag`,
pick up row 1 by its handle and hold the pointer 3px above the scrollport's bottom edge so the
library auto-scrolls. Watch in devtools that the tbody's `paddingTop` **rises** with `scrollTop` and
its `height` stays at `490000px`. On the probe, before this task, `paddingTop` stayed `0px` and the
height fell to `489167px` over six frames — that is the regression this step is checking for.

- [ ] **Step 8: Commit**

```bash
git add packages/data-grid/react/react/src/data-grid/virtual-body.tsx \
        packages/data-grid/react/react/src/data-grid/row.tsx \
        packages/data-grid/react/react/src/data-grid/flow-windowing.test.tsx \
        packages/data-grid/react/react/src/styles/global.css
git commit -m "fix(data-grid): keep a held row out of the virtualized band's flow"
```

---

### Task 3: The infinite loader row follows the band

**Files:**

- Modify: `packages/data-grid/react/react/src/data-grid/virtual-body.tsx`
- Modify: `packages/data-grid/react/react/src/styles/global.css:186-190`
- Modify: `packages/data-grid/react/heroui/src/styles.css:107-114`
- Test: `packages/data-grid/react/react/src/data-grid/flow-windowing.test.tsx` (add a case)

**Interfaces:**

- Consumes: `pads.after` from Task 1. The loader sits after the bottom pad, so it needs no reserved
  allowance of its own — which is why `LOAD_MORE_ALLOWANCE_PX` went in Task 1.

- [ ] **Step 1: Write the failing test**

```tsx
it('renders the virtualized loader row in flow, with no transform', () => {
	const { container } = renderWindowWithInfinite(windowItems(0, 5))
	const loader = container.querySelector('[data-slot="load-more-row"][data-virtual="load-more"]')

	expect(loader).not.toBeNull()
	expect(loader?.getAttribute('style') ?? '').not.toContain('transform')
})
```

with, beside the other render helpers:

```tsx
function renderWindowWithInfinite(items: VirtualItem[]) {
	return render(
		<VirtualProvider rowVirtualizer={stubVirtualizer(items)}>
			<Grid
				data={DATA}
				columns={TEST_COLUMNS}
				getRowId={(row) => row.id}
				virtualization={{ row: { estimateSize: ROW_HEIGHT } }}
				infinite={{ hasNextPage: true, onLoadMore: () => {} }}
			>
				<DataGrid.Table />
			</Grid>
		</VirtualProvider>,
	)
}
```

Before writing it, confirm the `infinite` option's shape against
`packages/data-grid/react/react/src/types.ts` — use the field names the type has, not these, if they
differ.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm --filter @ez-kit/data-grid-react test -- flow-windowing`
Expected: FAIL — the loader row's style contains `transform: translateY(…)`.

- [ ] **Step 3: Drop the loader's transform**

In `virtual-body.tsx`, remove the `style` prop from the load-more `<Tr>`. It now follows the bottom
pad in flow.

- [ ] **Step 4: Take the loader out of absolute positioning in both stylesheets**

`packages/data-grid/react/react/src/styles/global.css` — replace the rule and its comment:

```css
/* The virtualized loader row follows the window's band in flow, after the bottom pad. */
[data-slot='tbody'][data-virtualized='true'] [data-slot='load-more-row'][data-virtual='load-more'] {
	@apply w-full;
}
```

Then read `packages/data-grid/react/heroui/src/styles.css:107-114` and correct whatever it asserts
about the row being absolutely positioned inside the tbody — the comment there says exactly that.

- [ ] **Step 5: Run the tests**

Run: `pnpm --filter @ez-kit/data-grid-react test`
Expected: PASS.

- [ ] **Step 6: Verify all three loader states in the browser**

Run `pnpm build`, then open `/examples/shadcn/infinite-scroll-virtualized` and
`/examples/heroui/infinite-scroll-virtualized`. Scroll to the end and confirm the loader is fully
visible while fetching, that the "load more" trigger is clickable, and that an error message that
wraps onto two lines is not clipped — the fixed 56px allowance that used to reserve its space is
gone, so this is the step that proves it was not needed.

- [ ] **Step 7: Commit**

```bash
git add packages/data-grid/react/react/src/data-grid/virtual-body.tsx \
        packages/data-grid/react/react/src/data-grid/flow-windowing.test.tsx \
        packages/data-grid/react/react/src/styles/global.css \
        packages/data-grid/react/heroui/src/styles.css
git commit -m "fix(data-grid): render the virtualized loader row in flow"
```

---

### Task 4: Row pinning together with virtualization

**Files:**

- Test: `packages/data-grid/react/react/src/data-grid/flow-windowing.test.tsx` (add cases)
- Modify: `packages/data-grid/react/react/src/data-grid/virtual-body.tsx`
- Modify: `packages/data-grid/react/react/src/styles/global.css`

**Interfaces:**

- Consumes: `resolveVirtualWindowPads` and the `data-virtual='row-held'` value.
- Produces: nothing new unless the measurement forces the mechanism to change; if it does, record
  the new mechanism here and re-check Tasks 1-3's assertions against it.

**Why this task exists:** no example, unit test or spec in the repo combines `virtualization` with
row pinning — checked. Pinned rows are rendered as siblings of the window inside the same tbody, and
container padding applies at the start of the tbody's content box, i.e. **before** the pinned-top
rows. So the pads from Task 1 are expected to push the pinned band down and offset the window by
`pads.before + pinnedTopHeight` instead of `pads.before`. Measure first; the fix follows the
measurement.

- [ ] **Step 1: Write the failing test**

```tsx
it('offsets the window band from the top of the list, not from below the pinned rows', () => {
	const { container } = renderWindowWithPinnedRows(windowItems(10, 5), ['1'])
	const firstWindowRow = container.querySelector('[data-slot="tr"][data-virtual="row"]')
	const pinnedRow = container.querySelector('[data-slot="tr"][data-pinned="top"]')

	// Both are in the same tbody; the pinned row must not consume the band's offset.
	expect(pinnedRow).not.toBeNull()
	expect(firstWindowRow).toHaveAttribute('data-row-id', '11')
	expect(firstWindowRow?.getAttribute('style') ?? '').toContain(`height: ${String(ROW_HEIGHT)}px`)
})
```

with:

```tsx
function renderWindowWithPinnedRows(items: VirtualItem[], top: string[]) {
	return render(
		<VirtualProvider rowVirtualizer={stubVirtualizer(items)}>
			<Grid
				data={DATA}
				columns={TEST_COLUMNS}
				getRowId={(row) => row.id}
				virtualization={{ row: { estimateSize: ROW_HEIGHT } }}
				pinning={{ row: true }}
				initialState={{ rowPinning: { top, bottom: [] } }}
			>
				<DataGrid.Table />
			</Grid>
		</VirtualProvider>,
	)
}
```

Check `pinning`'s and `initialState.rowPinning`'s real shapes in
`packages/data-grid/react/react/src/types.ts` and `@tanstack/table-core`'s `RowPinningState` before
running it.

- [ ] **Step 2: Run it and record what actually happens**

Run: `pnpm --filter @ez-kit/data-grid-react test -- flow-windowing`

jsdom reports no geometry, so this test can only pin **structure** — which rows render, with which
attributes and inline styles. The geometry has to be measured in a browser, which is the next step.
Write down what the test reports either way.

- [ ] **Step 3: Measure the geometry in a browser**

There is no example to open, so build one. Create
`apps/docs/shared/data-grid/examples/components/virtualized-row-pinning.tsx` exporting
`VirtualizedRowPinningExample` — copy `components/virtualized.tsx` and add `pinning={{ row: true }}`
with `initialState={{ rowPinning: { top: ['1'], bottom: ['10000'] } }}`. Register it in
`apps/docs/shared/data-grid/examples/manifest.json` (`id: 'virtualized-row-pinning'`, the source
file, `exportName`) **and** add the `sourceFile` → dynamic import entry to
`apps/docs/shared/data-grid/examples/registry.ts` — miss the registry and the example throws at
render time while lint, typecheck and build all still pass.

Then `pnpm build --filter @ez-kit/data-grid-react` and open
`/examples/shadcn/virtualized-row-pinning`. Record, at `scrollTop` 0 and 4900:

- the tbody's `paddingTop`
- the pinned-top row's `getBoundingClientRect().top`
- the first window row's `top`, and whether the gap to the row below it is exactly `49`
- the scrollport's `scrollHeight`

Expected failure, stated so a passing result is also informative: at `scrollTop=4900` the first
window row sits `pinnedTopHeight` px lower than it should, because the pinned row consumes flow
space inside the padded band.

- [ ] **Step 4: Fix the mechanism the measurement indicts**

If the pinned rows do consume the band's offset, move the offset off the container and onto the
band's own rows: drop `paddingTop` / `paddingBottom` from the tbody and give the **first** window
row `marginTop: pads.before` and the **last** one `marginBottom: pads.after`. A margin on a grid
item is honoured, pinned rows precede the first window row so they are unaffected, and nothing new
reaches the DOM — which matters because a spacer element is not available in the heroui kit (see
Global Constraints). Keep `height: totalSize` on the tbody either way.

With one row in the window, both margins land on the same row; write it so that case is a single
element carrying both, not two elements.

Then update Task 1's first two tests to assert the margins instead of the pads, and update
`resolveVirtualWindowPads`'s docblock to say the values are margins on the band's edge rows and why
(pinned rows share the tbody).

- [ ] **Step 5: Re-measure**

Repeat Step 3. Expected: the first window row's `top` matches `scrollTop`-relative arithmetic with
no `pinnedTopHeight` term, the pinned rows stay stuck below the header, and `scrollHeight` is
unchanged from the non-pinned example.

- [ ] **Step 6: Run the full package suite and the e2e pinning specs**

Run: `pnpm --filter @ez-kit/data-grid-react test`
Run: `cd apps/docs && pnpm exec playwright test e2e/packages/data-grid/pinning --project=shadcn`
Expected: PASS. These specs cover the non-virtualized pinning that must not have regressed.

- [ ] **Step 7: Commit**

```bash
git add packages/data-grid/react/react/src/data-grid/virtual-body.tsx \
        packages/data-grid/react/react/src/data-grid/flow-windowing.test.tsx \
        packages/data-grid/react/react/src/styles/global.css \
        packages/data-grid/react/react/src/utils/virtual-window-pads.ts \
        packages/data-grid/react/react/src/utils/virtual-window-pads.test.ts \
        apps/docs/shared/data-grid/examples/components/virtualized-row-pinning.tsx \
        apps/docs/shared/data-grid/examples/manifest.json \
        apps/docs/shared/data-grid/examples/registry.ts
git commit -m "fix(data-grid): offset the virtualized band without displacing pinned rows"
```

---

### Task 5: The heroui kit renders the same band

**Files:**

- Modify: `packages/data-grid/react/heroui/src/styles.css`
- Test: `packages/data-grid/react/heroui/src/index.test.tsx` (add a case if the kit's suite has a virtualization case to extend; otherwise rely on the browser check and the e2e matrix)

**Interfaces:**

- Consumes: `data-virtual='row'` / `'row-held'` and the tbody's inline geometry, all authored by the
  shared package. The kit authors no geometry; it only must not fight it.

**Why this task exists:** the kit's `Tbody` is React Aria's `TableBody`, and its `Tr` is a collection
`Row`. Inline `style` reaches both today, which is how the current `height` works — but the kit
hoists `Table.Root` + `Table.ScrollContainer` into its `TableScroll` slot, so its scrollport is a
different element from shadcn's, and its own stylesheet carries ~90 lines about virtualized mode.

- [ ] **Step 1: Read the kit's virtualized rules**

Read `packages/data-grid/react/heroui/src/styles.css:80-120` and `:270-285`. List every rule that
assumes the rows are out of flow or that the tbody's height is its only geometry.

- [ ] **Step 2: Check the band in the browser before changing anything**

Run `pnpm build`, open `/examples/heroui/virtualized`, and record at `scrollTop` 0 and 4900: the
tbody's computed `paddingTop` (or margins, after Task 4), the first row's `top`, the gap between
consecutive rows, and the scrollport's `scrollHeight`. Compare each against the shadcn numbers from
Task 1 Step 10. A kit that needs no change will match.

- [ ] **Step 3: Correct only the rules the measurement indicts**

Edit `packages/data-grid/react/heroui/src/styles.css`. Do not add geometry — if a rule has to go,
delete it and say in a comment what the shared package now owns. The kit's own
`[data-slot='tbody'][data-virtualized='true'] > [data-slot='load-more-row']` rule is the likely one,
and Task 3 may already have handled it.

- [ ] **Step 4: Re-measure and run the kit's suite**

Repeat Step 2; expect the shadcn numbers.
Run: `pnpm --filter @ez-kit/data-grid-heroui test`
Expected: PASS.

- [ ] **Step 5: Verify the drag in both kits**

Open `/examples/shadcn/virtualized-row-drag` and `/examples/heroui/virtualized-row-drag`, drag a row
three places down, and confirm by eye that the rows between the source and the target move aside
while the pointer is down, in **both** kits. This is the behaviour the whole plan is for; it has been
measured in shadcn and not yet in heroui.

- [ ] **Step 6: Commit**

```bash
git add packages/data-grid/react/heroui/src/styles.css packages/data-grid/react/heroui/src/index.test.tsx
git commit -m "fix(data-grid-heroui): follow the shared band's flow geometry"
```

---

### Task 6: The e2e suite stops reading a transform, and gains the displacement case

**Files:**

- Modify: `apps/docs/e2e/packages/data-grid/ordering/virtual-row-drag.spec.ts`
- Modify: `apps/docs/e2e/packages/data-grid/virtualization/virtualization.spec.ts` (only if Step 1 finds a coupling)

**Interfaces:**

- Consumes: `data-virtual='row'`, `data-virtual='row-held'`, `data-row-id`, and the tbody's inline
  geometry.

**Why this task exists:** `committedIndexOf` (`virtual-row-drag.spec.ts:113-137`) reads a row's index
out of `getComputedStyle(row).transform`'s `m42`. In flow there is no transform, so every far case
fails on a helper rather than on the product. Measured with the probe: three cases failed, and one of
them — `a one-step drag past the neighbour is lost by the drag library`, a `test.fail()` — failed
with **"Expected to fail, but passed"**, i.e. flow windowing fixes the bug that test documents.

- [ ] **Step 1: Find every coupling to the old positioning**

```bash
cd apps/docs && grep -rn "translateY\|\.transform\|m42" e2e/packages/data-grid/
```

Expected: `virtual-row-drag.spec.ts` only — one helper and two docblocks.

- [ ] **Step 2: Rewrite `committedIndexOf` against the band**

A row's index is now its offset inside the band plus the band's own offset, divided by the row
height. Read both from the DOM:

```ts
const committedIndexOf = (page: Page, rowId: string): Promise<number> =>
	page.evaluate(
		({ id, rowHeight }) => {
			const rows = document.querySelectorAll(`[data-slot="tbody"] [data-slot="tr"][data-row-id="${id}"]`)
			// -1 while the id matches more than once, which it does for a moment after release: the
			// drag library's clone of the dragged row is still in the `tbody`. Every caller reads this
			// through `expect.poll`, so the ambiguity resolves itself rather than being papered over
			// with `.first()`, which here would be a coin toss between the row and its clone.
			if (rows.length !== 1) return -1
			const row = rows[0]
			if (!(row instanceof HTMLElement)) return -1
			const band = row.closest('[data-slot="tbody"][data-virtualized="true"]')
			if (!(band instanceof HTMLElement)) return -1
			// The row's top relative to the band's border box, minus the band's own top offset, is
			// the row's distance from the top of the whole list.
			const offset = row.getBoundingClientRect().top - band.getBoundingClientRect().top
			return Math.round(offset / rowHeight)
		},
		{ id: rowId, rowHeight: ROW_HEIGHT },
	)
```

Rewrite the helper's docblock: the old one explains that a row's `translateY` **is** its index times
the row height, which is no longer how the row is placed. Say what replaced it, and keep the
paragraph about the earlier revision that scrolled to the top and read a false failure — that hazard
has not changed.

- [ ] **Step 3: Run the far cases**

Run: `cd apps/docs && pnpm exec playwright test e2e/packages/data-grid/ordering/virtual-row-drag.spec.ts --project=shadcn --reporter=line`
Expected: the two far cases pass. The one-step `test.fail()` still fails, with "Expected to fail, but
passed" — that is Step 4.

- [ ] **Step 4: Turn the documented bug into a passing assertion**

The case at `virtual-row-drag.spec.ts:344` is a `test.fail()` asserting that a one-step drag released
in the lower half of the target row commits nothing. Flow windowing fixes it. Remove the `test.fail`
marker, invert the assertion to "the row lands one place down", and rewrite the docblock: the
displacement was never lost inside the drag library — the rows were out of flow, so the dragged row's
rect travelled with the pointer while its neighbours' stayed put, and the library un-displaced them
on alternating frames. Keep the measurement that is still true (it committed at 0.25 of the row's
height and not at 0.75) as the record of what the old behaviour was.

- [ ] **Step 5: Add the case the whole change is for**

No spec asserts that a row's neighbours move while it is dragged. Add one:

```ts
test('the rows between the source and the target move aside while the row is held', async ({ page }) => {
	await openExample(page, EXAMPLE)
	const sourceId = '3'
	const topOf = async (rowId: string) => (await boxOf(rowById(page, rowId))).y

	const before = { four: await topOf('4'), five: await topOf('5') }

	const handle = handleIn(rowById(page, sourceId))
	const from = await boxOf(handle)
	await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
	await page.mouse.down()
	await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + ROW_HEIGHT * 3, { steps: 16 })

	await expect
		.poll(async () => Math.round(before.four - (await topOf('4'))), {
			message: 'row 4 did not move aside for the row being dragged over it',
		})
		.toBe(ROW_HEIGHT)
	expect(Math.round(before.five - (await topOf('5')))).toBe(ROW_HEIGHT)

	await page.mouse.up()
})
```

Use the file's own `openExample` / `boxOf` / `rowById` / `handleIn` helpers — read their signatures
at the top of the spec and match them; `boxOf` comes from `../../../fixtures`.

- [ ] **Step 6: Run both kits**

Run: `cd apps/docs && pnpm exec playwright test e2e/packages/data-grid/ordering/virtual-row-drag.spec.ts --reporter=line`
Expected: PASS in both the `shadcn` and `heroui` projects. If the new displacement case fails only in
heroui, that is Task 5's Step 5 unfinished, not a flaw in this case.

Run: `cd apps/docs && pnpm exec playwright test e2e/packages/data-grid/virtualization --reporter=line`
Expected: PASS.

- [ ] **Step 7: Run the slot check**

Run: `pnpm --filter @ez-kit/docs test`
Expected: PASS. `apps/docs/test/e2e-slots.test.ts` fails on a spec slot no package authors — the new
`data-virtual` **value** is not a slot, so it should be unaffected, but this is where it would show.

- [ ] **Step 8: Commit**

```bash
git add apps/docs/e2e/packages/data-grid/ordering/virtual-row-drag.spec.ts
git commit -m "test(data-grid): assert virtualized drag displacement and the one-step commit"
```

---

### Task 7: Documentation and the changeset

**Files:**

- Modify: `apps/docs/content/docs/data-grid/drag-and-drop.mdx:117-151` and its `Not built yet` section
- Modify: `apps/docs/content/docs/data-grid/virtualization.mdx` (only what Step 1 finds)
- Modify: `packages/data-grid/react/shadcn/src/dnd.tsx` and `packages/data-grid/react/heroui/src/dnd.tsx`
- Modify: `AGENTS.md` (only if Step 1 finds a claim there)
- Create: `.changeset/flow-windowing-virtual-body.md`

- [ ] **Step 1: Find every claim about the old behaviour, by the behaviour and not only by the name**

```bash
rg -n "translateY|out of flow|absolutely positioned|one-step|one-row drag|rect travels|displacement" \
  apps/docs/content/docs/data-grid packages/data-grid AGENTS.md --glob '!**/dist/**'
```

Known hits to expect: `drag-and-drop.mdx`'s virtualized section and its `Not built yet` bullet
("A one-row drag in a virtualized body can do nothing at all"), `shadcn/src/dnd.tsx` around the
`endAnchor` docblock ("a virtualized row is placed by `transform`, so its rect travels with the
pointer while its neighbours' stay put"), and its heroui counterpart. The repo's own convention is to
sweep for the **claims**, not the identifiers — a paragraph describing the old behaviour without
naming a symbol is exactly what survives a rename sweep.

- [ ] **Step 2: Rewrite the virtualized drag section**

In `drag-and-drop.mdx`, the two bullets under "Two things make that work" are still true and stay.
Add a third about the band, and **delete** the closing sentence that points at the `Not built yet`
limit. Then delete that bullet from `Not built yet` entirely — do not soften it, the limit is gone.

In its place, state what is true now: a virtualized body displaces a dragged row's neighbours the
same way a non-virtualized one does, because its rows are in flow, and the window is offset by the
band rather than by a per-row transform.

- [ ] **Step 3: Correct the adapter docblocks**

In both kits' `dnd.tsx`, the long `endAnchor` docblock has a section beginning "**A second,
unrelated loss sits upstream, and the refusal it produces is correct.**" Its mechanism was right and
its attribution was wrong: nothing was lost upstream. Rewrite it to say the rows were out of flow,
that this is fixed, and keep the measurement (commits at 0.25, not at 0.75 or 0.95) as a record of
the old behaviour with a note that it no longer reproduces. Do not delete the paragraph about the
plugin's own `setDropTarget(source.id)` frames — that mechanism is unchanged and still explains why a
collision-detection override changed nothing.

- [ ] **Step 4: Write the changeset**

Create `.changeset/flow-windowing-virtual-body.md`:

```markdown
---
'@ez-kit/data-grid-react': minor
---

Virtualized body rows are now positioned in normal flow, with the window offset by the body's own
band rather than by a per-row `transform`. A row dragged in a virtualized grid now displaces its
neighbours while the pointer is down, exactly as it does in a non-virtualized one, and a one-place
drag commits wherever it is released.
```

`@ez-kit/data-grid-shadcn` is `private` and ignored by changesets — naming it fails the `version` job
after the merge. The kit's stylesheet change ships through `@ez-kit/data-grid-react`.

- [ ] **Step 5: Run the docs guards**

Run: `pnpm lint`
Expected: PASS — `scripts/check-changesets.mjs` and `check-site-url.mjs` run first.

Run: `pnpm --filter @ez-kit/docs test`
Expected: PASS — `docs-option-names.test.ts` resolves documented option names against the real types,
and this change documents no new option.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/content/docs/data-grid packages/data-grid/react/shadcn/src/dnd.tsx \
        packages/data-grid/react/heroui/src/dnd.tsx AGENTS.md .changeset/flow-windowing-virtual-body.md
git commit -m "docs(data-grid): retire the virtualized drag limit and describe the band"
```

---

### Task 8: Full gate

**Files:** none — this task only runs checks.

- [ ] **Step 1: Run the repo's CI check**

Run: `pnpm run ci`
Expected: PASS — `lint + typecheck + test + build + size`.

- [ ] **Step 2: If `size` fails, read before retuning**

Each entry's budget is its real size plus ~15% headroom, and `@ez-kit/data-grid-react`'s
`dist/index.js` has ~4.6 kB of slack. This change removes a constant and adds one small module, so it
should move the number by tens of bytes. A `size` failure here means something else grew — find it
before touching a `limit`.

- [ ] **Step 3: Run the browser suite for both kits**

Run: `cd apps/docs && pnpm exec playwright test --project=shadcn --project=heroui --reporter=line`
Expected: PASS. This is the gate a PR into `develop` runs.

- [ ] **Step 4: Check the tree-shaking pins**

Run: `pnpm --filter @ez-kit/docs test -- tree-shaking`
Expected: PASS. The new `utils/virtual-window-pads` module folds onto the `./index` entry, which is
already in every set that reaches the body — but if a set changed, the failure prints the set to
record.

- [ ] **Step 5: Check RTL**

The old rule was `absolute top-0 left-0 w-full` — a **physical** `left`, which in flow disappears
entirely, so this change should only improve RTL. Confirm rather than assume: open
`/examples/shadcn/column-drag-rtl`, switch it to a virtualized grid in devtools if it is not one, or
open `/examples/shadcn/virtualized` inside a `dir="rtl"` ancestor, and check the rows span the full
width with no horizontal overflow. Neither arrangement was measured under RTL before this change.

- [ ] **Step 6: Open the PR**

Branch off `develop`, push with `-u`, and open the PR into `develop` — not `main`. Write the
description in English, with no agent attribution. Include: what changed, the measurement that
motivated it, and the fact that it removes a documented limitation (so reviewers look for the
`Not built yet` deletion rather than flagging it).
