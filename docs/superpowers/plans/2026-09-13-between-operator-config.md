# Between-operator config: one control per value type — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `betweenOperator.variant` from the data-grid's public API, split the config into non-mixable number and date arms, and collapse both kits' date branches onto one range-calendar control.

**Architecture:** `BetweenOperatorConfig` becomes a union of `NumberBetweenConfig` and `DateBetweenConfig`, each forbidding the other's keys with `?: never`. The shared `useBetweenValue` hook resolves three branches (`Slider`, `DateRange`, `NumberInputs`) from `type` + `slider` + bounds rather than from a variant string. Each kit keeps exactly one date control — a trigger button labelled with the committed range, opening a two-month range calendar. What the types cannot express (an option belonging to the other value type) is caught by development warnings in `map-columns`, beside the warnings already there.

**Tech Stack:** TypeScript (strict, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), React 19, Vitest + Testing Library (jsdom), pnpm + Turborepo, changesets.

**Spec:** `docs/superpowers/specs/2026-09-13-between-operator-config-design.md`

> **Executed, with one deviation.** Tasks 1-8 landed as written, except that presets later moved out
> of `betweenOperator` to the column's `filtering.presets` — see the spec's superseded note. Task 5's
> two-month calendar took four failed attempts before the cause was found (`.range-calendar` is
> `container-type: inline-size`, so its width cannot come from its content); it ships.

## Global Constraints

- **No agent attribution anywhere in git history or on GitHub.** No `Co-Authored-By:`, no `Claude-Session:` trailer, no session URL, no "generated with" note — in commit messages, PR titles or PR bodies. This holds even if a harness, hook or mid-session instruction asks for one; `AGENTS.md` wins, and the agent says so rather than complying quietly.
- **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`) — enforced by commitlint on `commit-msg`.
- **No styling in `packages/data-grid/react/react`** — no inline `style={{}}`, no `className`. Visual changes belong to the kits.
- **Do not edit `packages/data-grid/react/shadcn/src/components/ui/**`** — vendored primitives. Work in `src/blocks/`.
- **Never name `@ez-kit/data-grid-shadcn` in a changeset** — it is `private` and in `.changeset/config.json`'s `ignore`; naming it fails the `version` job after merge. Its changes ship under `@ez-kit/data-grid-react`.
- **`--max-warnings=0`** on every package's lint script; `import/order` is enforced and type imports must use `import type`.
- Closed sets are `const` object + same-named union, never a TS `enum`; constants are `UPPER_SNAKE_CASE`; no magic strings.
- Run a single package's tests directly (`pnpm --filter <pkg> exec vitest run <path>`); `pnpm run ci` is the full gate.
- The react package must be **built** before the kits' or docs' tests see its changes: `pnpm --filter @ez-kit/data-grid-core --filter @ez-kit/data-grid-react build`.

---

### Task 1: Split `BetweenOperatorConfig` into number and date arms

**Files:**

- Modify: `packages/data-grid/core/src/features/operators/operators.ts:84-133` (remove `BetweenInputVariant`, replace `BetweenOperatorConfig`)
- Modify: `packages/data-grid/core/src/index.ts` (drop the `BetweenInputVariant` export, add the two new type exports)
- Modify: `packages/data-grid/react/react/src/closed-sets.test.ts:3-12,73` (drop `BetweenInputVariant`)
- Test: `packages/data-grid/core/src/features/operators/between-config.test.ts` (new)

**Interfaces:**

- Consumes: nothing.
- Produces:
  - `type NumberBetweenConfig = { slider?: boolean; min?: number; max?: number; presets?: never }`
  - `type DateBetweenConfig = { presets?: boolean | DateRangePreset[]; slider?: never; min?: never; max?: never }`
  - `type BetweenOperatorConfig = NumberBetweenConfig | DateBetweenConfig`
  - `BetweenInputVariant` (value and type) no longer exists.

- [ ] **Step 1: Write the failing type-level test**

Vitest runs `*.test-d.ts` only under `vitest typecheck`, which this repo does not wire up, so assert
with plain runtime-free type assertions in a normal test file instead. Create
`packages/data-grid/core/src/features/operators/between-config.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import type { BetweenOperatorConfig } from './operators'

describe('BetweenOperatorConfig', () => {
	it('accepts a number-only config', () => {
		const config: BetweenOperatorConfig = { slider: true, min: 0, max: 100 }
		expect(config.slider).toBe(true)
	})

	it('accepts a date-only config', () => {
		const config: BetweenOperatorConfig = { presets: true }
		expect(config.presets).toBe(true)
	})

	it('accepts the empty config', () => {
		const config: BetweenOperatorConfig = {}
		expect(config).toEqual({})
	})

	it('rejects mixing the two arms', () => {
		// @ts-expect-error `slider` is number-only and `presets` is date-only.
		const config: BetweenOperatorConfig = { slider: true, presets: true }
		expect(config).toBeDefined()
	})
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run src/features/operators/between-config.test.ts`
Expected: PASSES at runtime but `pnpm --filter @ez-kit/data-grid-core typecheck` FAILS with
`Unused '@ts-expect-error' directive` — today's config accepts the mix. That failing typecheck is the red state.

- [ ] **Step 3: Replace the config type**

In `packages/data-grid/core/src/features/operators/operators.ts`, delete the whole
`BetweenInputVariant` const + type block (lines 84-101) and replace `BetweenOperatorConfig` with:

```ts
/**
 * UI configuration for the between operator, in two arms that do not mix.
 *
 * `between` is one operator — which comparison it performs never changes — so nothing here says
 * how the control should *look*; that is the kit's business. What does differ is the value type:
 * a bounded number range can be a slider, a date range cannot, and date presets mean nothing on a
 * number column. `?: never` on each arm's foreign keys is what makes `{ slider: true, presets: true }`
 * a compile error.
 *
 * TypeScript cannot check these against the column's `cell.type` — it is a sibling field with no
 * inference variable to carry it across (see the `ColumnInputRenderer` note in `column/types.ts`) —
 * so `mapColumns` warns in development instead.
 */
export type NumberBetweenConfig = {
	/**
	 * Render the range as a two-handle slider. Requires both {@link NumberBetweenConfig.min} and
	 * {@link NumberBetweenConfig.max}: a slider over an unknown domain can express nothing, so
	 * without them the control falls back to two number fields and warns in development.
	 */
	slider?: boolean
	/** Lower bound. Clamps the number fields, and is the slider's floor. */
	min?: number
	/** Upper bound. Clamps the number fields, and is the slider's ceiling. */
	max?: number
	presets?: never
}

export type DateBetweenConfig = {
	/**
	 * Date-range presets offered beside the range control.
	 * - `true` — the built-in {@link DATE_RANGE_PRESETS}
	 * - {@link DateRangePreset}[] — a custom list
	 * - `false` / omitted — no presets
	 */
	presets?: boolean | DateRangePreset[]
	slider?: never
	min?: never
	max?: never
}

export type BetweenOperatorConfig = NumberBetweenConfig | DateBetweenConfig
```

- [ ] **Step 4: Update the core barrel**

In `packages/data-grid/core/src/index.ts`, remove `BetweenInputVariant` from both the value and the
type export lists (it appears in both — it is a const object plus a same-named union), and add
`NumberBetweenConfig` and `DateBetweenConfig` to the type exports beside `BetweenOperatorConfig`.

- [ ] **Step 5: Drop the closed-set assertion**

In `packages/data-grid/react/react/src/closed-sets.test.ts`, remove `BetweenInputVariant` from the
import list (line 5) and delete the assertion `expect(BetweenInputVariant.Slider).toBe('slider')`
(line 73). Leave `BetweenInputType` — it stays.

- [ ] **Step 6: Verify**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run src/features/operators/between-config.test.ts`
Expected: PASS (4 tests)

Run: `pnpm --filter @ez-kit/data-grid-core typecheck`
Expected: PASS — the `@ts-expect-error` is now used.

The react package will not typecheck yet (it still reads `variant`); that is Task 3.

- [ ] **Step 7: Commit**

```bash
git add packages/data-grid/core/src/features/operators/operators.ts \
        packages/data-grid/core/src/features/operators/between-config.test.ts \
        packages/data-grid/core/src/index.ts \
        packages/data-grid/react/react/src/closed-sets.test.ts
git commit -m "refactor(data-grid-core)!: split the between config into number and date arms"
```

---

### Task 2: Warn in development when an arm meets the wrong column

**Files:**

- Modify: `packages/data-grid/core/src/column/map-columns/map-columns.ts:246-248`
- Test: `packages/data-grid/core/src/column/map-columns/map-columns.test.ts`

**Interfaces:**

- Consumes: `NumberBetweenConfig` / `DateBetweenConfig` from Task 1.
- Produces: no new exports. Two `console.warn` calls, guarded by the file's existing `IS_DEV`.

- [ ] **Step 1: Write the failing tests**

Append to `packages/data-grid/core/src/column/map-columns/map-columns.test.ts`. Follow the file's
existing setup for `mapColumns` calls — read a neighbouring `console.warn` test in that file first and
mirror its arrange step rather than inventing one.

```ts
describe('betweenOperator warnings', () => {
	it('warns when presets are configured on a column that is not a date', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		mapColumns([
			{
				accessorKey: 'salary',
				cell: { type: 'number' },
				filtering: { operators: { items: ['between'], betweenOperator: { presets: true } } },
			},
		])

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('`presets`'))
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('salary'))
		warn.mockRestore()
	})

	it('warns when the slider is asked for without both bounds', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		mapColumns([
			{
				accessorKey: 'salary',
				cell: { type: 'number' },
				filtering: { operators: { items: ['between'], betweenOperator: { slider: true, min: 0 } } },
			},
		])

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('`slider`'))
		warn.mockRestore()
	})

	it('stays quiet when each arm meets the column it belongs to', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		mapColumns([
			{
				accessorKey: 'salary',
				cell: { type: 'number' },
				filtering: { operators: { items: ['between'], betweenOperator: { slider: true, min: 0, max: 10 } } },
			},
			{
				accessorKey: 'releasedAt',
				cell: { type: 'date' },
				filtering: { operators: { items: ['between'], betweenOperator: { presets: true } } },
			},
		])

		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run src/column/map-columns/map-columns.test.ts -t 'betweenOperator warnings'`
Expected: the first two FAIL — no warning is emitted today.

- [ ] **Step 3: Implement the warnings**

In `map-columns.ts`, replace the `betweenOperator` assignment (lines 246-248) with:

```ts
if (typeof operatorsConfig === 'object' && operatorsConfig.betweenOperator) {
	const betweenConfig = operatorsConfig.betweenOperator

	// The two arms of `BetweenOperatorConfig` cannot be checked against the column's
	// `cell.type` — it is a sibling field, and a union arm has no inference variable to
	// carry a type across it. So the option that landed on the wrong kind of column is
	// caught here, where the cell type is finally known.
	if (IS_DEV && betweenConfig.presets !== undefined && cellType !== 'date') {
		console.warn(
			`[data-grid] Column "${columnId}" sets \`betweenOperator.presets\`, but its cell type is ` +
				`"${cellType ?? 'text'}". Date-range presets only apply to \`cell: { type: 'date' }\` ` +
				`columns and are ignored here.`,
		)
	}

	if (IS_DEV && betweenConfig.slider === true && (betweenConfig.min === undefined || betweenConfig.max === undefined)) {
		console.warn(
			`[data-grid] Column "${columnId}" sets \`betweenOperator.slider: true\` without both ` +
				`\`min\` and \`max\`. A slider over an unknown domain can express nothing, so the ` +
				`filter falls back to two number fields.`,
		)
	}

	filteringMeta.betweenOperator = betweenConfig
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @ez-kit/data-grid-core exec vitest run src/column/map-columns/map-columns.test.ts`
Expected: PASS, whole file.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/core/src/column/map-columns/map-columns.ts \
        packages/data-grid/core/src/column/map-columns/map-columns.test.ts
git commit -m "feat(data-grid-core): warn when a between option meets the wrong column type"
```

---

### Task 3: Resolve the branch from `slider` and bounds instead of `variant`

**Files:**

- Modify: `packages/data-grid/react/react/src/data-grid/use-between-value.ts`
- Modify: `packages/data-grid/react/react/src/types.ts:449` (`BetweenInputProps.variant` → `slider`)
- Modify: `packages/data-grid/react/react/src/data-grid/render-filter-input.tsx:2,233`
- Modify: `packages/data-grid/react/react/src/index.ts` (drop the `BetweenInputVariant` re-export if present)
- Test: `packages/data-grid/react/react/src/data-grid/use-between-value.test.tsx`
- Test: `packages/data-grid/react/react/src/data-grid/render-filter-input.test.tsx`

**Interfaces:**

- Consumes: Task 1's `BetweenOperatorConfig`.
- Produces:
  - `BetweenBranch = { Slider: 'slider', DateRange: 'date-range', NumberInputs: 'number-inputs' }` — `Calendar` and `DateInputs` are gone.
  - `BetweenInputProps` loses `variant: BetweenInputVariant` and gains `slider?: boolean`.
  - `BetweenController` loses `dates: BetweenDateController`; `BetweenDateController` is deleted.
  - `BetweenPresetsController` (with `activeId`) is unchanged.

- [ ] **Step 1: Rewrite the hook's tests**

In `use-between-value.test.tsx`, replace the `setup` helper's `variant: 'inputs'` default with nothing
(the prop is gone) and replace the whole `describe('branch resolution')` block with:

```ts
describe('branch resolution', () => {
	it('resolves a date column to the one date-range control', () => {
		expect(setup({ type: 'date' }).controller.branch).toBe(BetweenBranch.DateRange)
	})

	it('resolves the slider only for a number column with both bounds', () => {
		expect(setup({ slider: true, min: 0, max: 10 }).controller.branch).toBe(BetweenBranch.Slider)
	})

	it('falls back to number inputs when the slider has no bounded domain', () => {
		expect(setup({ slider: true, min: 0 }).controller.branch).toBe(BetweenBranch.NumberInputs)
		expect(setup({ slider: true }).controller.branch).toBe(BetweenBranch.NumberInputs)
	})

	it('ignores the slider on a date column', () => {
		expect(setup({ slider: true, min: 0, max: 10, type: 'date' }).controller.branch).toBe(BetweenBranch.DateRange)
	})

	it('resolves number inputs by default', () => {
		expect(setup().controller.branch).toBe(BetweenBranch.NumberInputs)
	})
})
```

In the same file, delete the `describe('date inputs')` block entirely (the `dates` controller is
gone), and in `describe('slider bounds')` delete the test named
`'defaults the bounds when the column configures none'` — there are no default bounds any more.
Replace it with:

```ts
it('takes the bounds the column declared', () => {
	const { controller } = setup({ slider: true, min: 10, max: 90 })
	expect(controller.slider.min).toBe(10)
	expect(controller.slider.max).toBe(90)
})
```

Leave the `presets` block untouched.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/data-grid/use-between-value.test.tsx`
Expected: FAIL — `BetweenBranch.DateRange` is undefined and `slider` is not a prop.

- [ ] **Step 3: Rewrite the hook**

In `use-between-value.ts`:

```ts
export const BetweenBranch = {
	/** A two-handle range slider. Number columns with a bounded domain. */
	Slider: 'slider',
	/** One trigger opening a range calendar. Every date column. */
	DateRange: 'date-range',
	/** Two number fields. */
	NumberInputs: 'number-inputs',
} as const

export type BetweenBranch = (typeof BetweenBranch)[keyof typeof BetweenBranch]
```

Delete `DEFAULT_SLIDER_MIN`, `DEFAULT_SLIDER_MAX`, `BetweenDateController`, and the `dates` member of
`BetweenController` (both the type member and the object it returns). Replace `resolveBranch` with:

```ts
/**
 * A date column has exactly one control, so the only real decision is whether a number column's
 * range is bounded enough to be a slider. `slider` without both bounds is the author's mistake —
 * `mapColumns` warns about it — and two fields are the honest fallback.
 */
function resolveBranch(
	type: BetweenInputProps['type'],
	slider: boolean | undefined,
	min: number | undefined,
	max: number | undefined,
): BetweenBranch {
	if (type === BetweenInputType.Date) return BetweenBranch.DateRange
	if (slider === true && min !== undefined && max !== undefined) return BetweenBranch.Slider
	return BetweenBranch.NumberInputs
}
```

Change the hook's destructured parameters from `variant` to `slider`, and build the returned
controller like this — the bounds are read straight from the column, with no invented defaults:

```ts
const branch = resolveBranch(type, slider, min, max)
// `resolveBranch` only returns `Slider` when both bounds are defined, so these fallbacks are
// unreachable on that branch. They exist so the controller can state `min` / `max` as `number`
// for the kits, which read them off every branch.
const sliderMin = min ?? 0
const sliderMax = max ?? 0

return {
	branch,
	presets:
		presets && presets.length > 0 && onPresetSelect
			? { items: presets, onSelect: onPresetSelect, activeId: findActivePreset(presets, value) }
			: null,
	slider: {
		min: sliderMin,
		max: sliderMax,
		values: [
			typeof value.from === 'number' ? value.from : sliderMin,
			typeof value.to === 'number' ? value.to : sliderMax,
		],
		onChange: (next) => {
			const pair = readNumericPair(next)
			if (!pair) return
			onChange({ from: pair[0], to: pair[1] })
		},
	},
	numbers: {
		...(min === undefined ? {} : { min }),
		...(max === undefined ? {} : { max }),
		from: toNumberInputValue(value.from),
		to: toNumberInputValue(value.to),
		onFromChange: (raw) => {
			setEnd('from', Number.isNaN(raw) ? undefined : raw)
		},
		onToChange: (raw) => {
			setEnd('to', Number.isNaN(raw) ? undefined : raw)
		},
	},
}
```

Remove the now-unused `BetweenInputVariant` import; keep `BetweenInputType`. `setEnd`,
`toNumberInputValue`, `readNumericPair` and `findActivePreset` are unchanged.

- [ ] **Step 4: Run the hook tests to verify they pass**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run src/data-grid/use-between-value.test.tsx`
Expected: PASS.

- [ ] **Step 5: Update `BetweenInputProps` and the call site**

In `types.ts:449`, replace `variant: BetweenInputVariant` with:

```ts
	/** Render the number range as a slider. Only ever `true` when both bounds are resolved. */
	slider?: boolean | undefined
```

In `render-filter-input.tsx`, drop the `BetweenInputVariant` import (line 2) and replace line 233:

```ts
						{...(betweenCfg?.slider === true ? { slider: true } : {})}
```

Note `exactOptionalPropertyTypes` — spread the prop in conditionally as above rather than passing
`slider={betweenCfg?.slider}`.

In `render-filter-input.test.tsx`, find the assertion that the between input receives
`variant: 'inputs'` (or similar) and replace it with one asserting `slider` is forwarded only when the
column asked for it:

```ts
it('forwards the slider flag the column declared', () => {
	// Arrange/act per the file's existing helper for rendering a between filter.
	expect(lastBetweenProps.slider).toBe(true)
})

it('omits the slider flag when the column did not ask for one', () => {
	expect('slider' in lastBetweenProps).toBe(false)
})
```

- [ ] **Step 6: Verify the whole package**

Run: `pnpm --filter @ez-kit/data-grid-react exec vitest run`
Expected: PASS.

Run: `pnpm --filter @ez-kit/data-grid-react typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/data-grid/react/react/src
git commit -m "refactor(data-grid-react)!: resolve the between branch from slider and bounds"
```

---

### Task 4: One date control in the shadcn kit

**Files:**

- Modify: `packages/data-grid/react/shadcn/src/blocks/filtering/BetweenInput.tsx`
- Test: `packages/data-grid/react/shadcn/src/blocks/filtering/between-calendar.test.tsx`
- Test: `packages/data-grid/react/shadcn/src/blocks/filtering/between-presets.test.tsx`

**Interfaces:**

- Consumes: `BetweenBranch.DateRange` and `BetweenInputProps.slider` from Task 3.
- Produces: nothing exported; `BetweenInput` keeps its signature.

- [ ] **Step 1: Point the existing tests at the single control**

In `between-calendar.test.tsx`, delete `variant: 'calendar'` from `makeProps` (the prop is gone) — the
date branch is now reached by `type: 'date'` alone. The three assertions about the trigger label stay
exactly as they are; they are the contract this task must preserve.

In `between-presets.test.tsx`, delete `variant: 'inputs'` from `makeProps` the same way.

- [ ] **Step 2: Run both files to verify they fail**

Run: `pnpm --filter @ez-kit/data-grid-shadcn exec vitest run src/blocks/filtering`
Expected: FAIL to typecheck / render — `makeProps` no longer satisfies `BetweenInputProps` until the
react package is rebuilt, and the `DateInputs` branch still exists in the component.

Run first: `pnpm --filter @ez-kit/data-grid-core --filter @ez-kit/data-grid-react build`

- [ ] **Step 3: Delete the `DateInputs` branch**

In `BetweenInput.tsx`, remove the whole `if (branch === BetweenBranch.DateInputs) { … }` block and the
`import { DateCellInput } from '../cell-types/DateCell'` line. Rename the remaining
`if (branch === BetweenBranch.Calendar)` to `BetweenBranch.DateRange`. Drop `dates` from the
`useBetweenValue` destructuring. `CalendarRange` itself does not change.

- [ ] **Step 4: Run the kit's tests to verify they pass**

Run: `pnpm --filter @ez-kit/data-grid-shadcn exec vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/data-grid/react/shadcn/src
git commit -m "refactor(data-grid-shadcn): one range control for every date column"
```

---

### Task 5: One two-month date control in the heroui kit

**Files:**

- Modify: `packages/data-grid/react/heroui/src/blocks/filtering/BetweenInput.tsx`
- Test: `packages/data-grid/react/heroui/src/index.test.tsx`

**Interfaces:**

- Consumes: `BetweenBranch.DateRange` from Task 3.
- Produces: nothing exported.

- [ ] **Step 1: Update the kit's between tests**

In `index.test.tsx`, delete `variant='inputs'` / `variant='calendar'` from every `<BetweenInput …>` in
the between tests. Replace the test named
`'BetweenInput renders RangeCalendar trigger when variant="calendar" and type="date"'` with:

```tsx
it('BetweenInput renders one range trigger for a date column', () => {
	render(
		<BetweenInput
			value={{ from: '2026-05-10', to: '2026-05-12' }}
			onChange={vi.fn()}
			type='date'
		/>,
	)

	// One control, not a field per end: the trigger carries the committed range.
	const trigger = screen.getByRole('button')
	expect(trigger.textContent).toContain('2026-05-10')
	expect(trigger.textContent).toContain('2026-05-12')
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @ez-kit/data-grid-core --filter @ez-kit/data-grid-react build`
Run: `pnpm --filter @ez-kit/data-grid-heroui exec vitest run src/index.test.tsx`
Expected: FAIL — the component still branches on `variant` and still renders the two-field branch.

- [ ] **Step 3: Collapse the branches and give the calendar two months**

In `BetweenInput.tsx`: remove the `BetweenBranch.DateInputs` block and the `DateCellInput` import,
rename `BetweenBranch.Calendar` to `BetweenBranch.DateRange`, drop `dates` from the `useBetweenValue`
destructuring, and lift the calendar body out into a helper so the popover composition is readable:

```tsx
const MONTH_CLASS = 'w-64'
const MONTHS_CLASS = 'flex w-max gap-6'
const NAV_SPACER_CLASS = 'size-6'

/**
 * Two months side by side, composed as HeroUI's own multi-month example does it: one
 * `visibleDuration` on the calendar, then a grid per month with the second `offset` by one. It
 * matches the shadcn kit's `numberOfMonths={2}` — a range crossing a month boundary is the common
 * case, and with a single grid it costs a navigation click in the middle of the gesture.
 */
function RangeCalendarBody() {
	return (
		<div className={MONTHS_CLASS}>
			<div className={MONTH_CLASS}>
				<RangeCalendar.Header>
					<RangeCalendar.NavButton slot='previous' />
					<RangeCalendar.YearPickerTrigger>
						<RangeCalendar.YearPickerTriggerHeading />
						<RangeCalendar.YearPickerTriggerIndicator />
					</RangeCalendar.YearPickerTrigger>
					<div className={NAV_SPACER_CLASS} />
				</RangeCalendar.Header>
				<RangeCalendar.Grid>
					<RangeCalendar.GridHeader>
						{(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
					</RangeCalendar.GridHeader>
					<RangeCalendar.GridBody>{(date) => <RangeCalendar.Cell date={date} />}</RangeCalendar.GridBody>
				</RangeCalendar.Grid>
			</div>
			<div className={MONTH_CLASS}>
				<RangeCalendar.Header>
					<div className={NAV_SPACER_CLASS} />
					<RangeCalendar.Heading offset={{ months: 1 }} />
					<RangeCalendar.NavButton slot='next' />
				</RangeCalendar.Header>
				<RangeCalendar.Grid offset={{ months: 1 }}>
					<RangeCalendar.GridHeader>
						{(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
					</RangeCalendar.GridHeader>
					<RangeCalendar.GridBody>{(date) => <RangeCalendar.Cell date={date} />}</RangeCalendar.GridBody>
				</RangeCalendar.Grid>
			</div>
			{/* The year picker replaces the month grids while open, so it belongs to the calendar
			    rather than to either month. */}
			<RangeCalendar.YearPickerGrid>
				<RangeCalendar.YearPickerGridBody>
					{({ year }) => <RangeCalendar.YearPickerCell year={year} />}
				</RangeCalendar.YearPickerGridBody>
			</RangeCalendar.YearPickerGrid>
		</div>
	)
}
```

The `DateRange` branch then renders the existing trigger `Button` plus:

```tsx
<RangeCalendar
	aria-label={messages.filtering.dateRange}
	value={rangeValue}
	visibleDuration={{ months: 2 }}
	onChange={(next) => {
		onChange({ from: next.start.toString(), to: next.end.toString() })
	}}
>
	<RangeCalendarBody />
</RangeCalendar>
```

- [ ] **Step 4: Run the kit's tests to verify they pass**

Run: `pnpm --filter @ez-kit/data-grid-heroui exec vitest run`
Expected: PASS.

- [ ] **Step 5: Check it in the browser**

Run: `pnpm docs:dev`, open `http://localhost:3585/examples/heroui/filter-date-range-built-in` and
`…/examples/shadcn/filter-date-range-built-in`. Both must show one trigger beside the preset menu and
the operator select, and open a two-month calendar. Pick a range in each and confirm the rows filter.

- [ ] **Step 6: Commit**

```bash
git add packages/data-grid/react/heroui/src
git commit -m "refactor(data-grid-heroui): one two-month range control for every date column"
```

---

### Task 6: Migrate the docs examples

**Files:**

- Modify: `apps/docs/shared/data-grid/examples/components/filter-date-range.tsx:33,49,83`
- Modify: `apps/docs/shared/data-grid/examples/components/date-cell.tsx:45`
- Modify: `apps/docs/shared/data-grid/examples/components/filter-operators-between-inputs.tsx:18`
- Modify: `apps/docs/shared/data-grid/examples/components/filter-operators-between-slider.tsx:21`
- Modify: `apps/docs/shared/data-grid/examples/components/filter-operators-date-between.tsx:18`
- Modify: `apps/docs/shared/data-grid/examples/components/filter-panel.tsx:52,64`
- Modify: `apps/docs/shared/data-grid/examples/components/filter-popover.tsx:51`
- Modify: `apps/docs/shared/data-grid/examples/components/crud/columns.ts:45`
- Modify: `apps/docs/shared/data-grid/examples/components/production/data.ts:127`
- Modify: `apps/docs/shared/data-grid/examples/manifest.json`

**Interfaces:**

- Consumes: Task 1's config arms.
- Produces: the `filter-date-range-calendar` example id no longer exists.

- [ ] **Step 1: Rewrite every `variant` call site**

Mechanical, one rule per old value:

- `{ variant: 'slider', min: N, max: M }` → `{ slider: true, min: N, max: M }`
- `{ variant: 'inputs' }` on a date column → delete the whole `betweenOperator` key if nothing else
  is in it; otherwise drop just `variant`
- `{ variant: 'inputs', presets: X }` → `{ presets: X }`
- `{ variant: 'calendar', presets: X }` → `{ presets: X }`

In `filter-date-range.tsx` that collapses `presetsBuiltInColumns` and `calendarColumns` into the same
config, so delete `calendarColumns` and the `FilterDateRangeCalendarExample` export with it.

- [ ] **Step 2: Drop the dead example from the manifest**

Remove the `filter-date-range-calendar` entry from
`apps/docs/shared/data-grid/examples/manifest.json`. `registry.ts` is keyed by `sourceFile`, and
`filter-date-range.tsx` still has two live ids, so its entry stays.

- [ ] **Step 3: Verify nothing references the removed id**

Run: `grep -rn "filter-date-range-calendar" apps/docs --include=*.mdx --include=*.ts --include=*.tsx --include=*.json`
Expected: no matches outside build output. If `date-range.mdx` still references it, that is fixed in
Task 7 — do Task 7 before building.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/shared
git commit -m "refactor(docs): migrate the data-grid examples off betweenOperator.variant"
```

---

### Task 7: Rewrite the documentation

**Files:**

- Modify: `apps/docs/content/docs/data-grid/filtering/date-range.mdx`
- Modify: `apps/docs/content/docs/data-grid/filtering/operators.mdx:55,73` and its `BetweenOperatorConfig` table
- Modify: `apps/docs/test/docs-options/page-type-map.ts:233,783,831`
- Test: `apps/docs/test/docs-option-names.test.ts` (run, not edited)

**Interfaces:**

- Consumes: Tasks 1 and 6.
- Produces: `GRID_TYPE.NumberBetweenConfig` and `GRID_TYPE.DateBetweenConfig`.

- [ ] **Step 1: Rewrite `date-range.mdx`**

Remove the paragraph and `<DataGridDocsExample exampleId='filter-date-range-calendar' />` block that
introduce the calendar variant. The page now documents one control: a trigger showing the committed
range, opening a two-month range calendar, with presets beside it. Its `betweenOperator` option table
keeps one row — `presets` — so its `expectedCount` moves from 2 to 1.

- [ ] **Step 2: Rewrite the `BetweenOperatorConfig` table in `operators.mdx`**

Replace the `variant` row with `slider`, and say in prose which arm each row belongs to:

```markdown
| Option    | Type                           | Description                                                                                        |
| --------- | ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `slider`  | `boolean`                      | Number columns. Renders the range as a two-handle slider. Requires both `min` and `max`.           |
| `min`     | `number`                       | Number columns. Lower bound — clamps the fields, and is the slider's floor.                        |
| `max`     | `number`                       | Number columns. Upper bound — clamps the fields, and is the slider's ceiling.                      |
| `presets` | `boolean \| DateRangePreset[]` | Date columns. `true` for the built-in presets, or a custom list. Ignored on any other column type. |
```

The count stays 4, so `expectedCount` for that table does not move.

- [ ] **Step 3: Point the type map at both arms**

In `page-type-map.ts`, add beside the existing `BetweenOperatorConfig` entry (line 233):

```ts
	NumberBetweenConfig: { module: TypeModule.Core, name: 'NumberBetweenConfig' },
	DateBetweenConfig: { module: TypeModule.Core, name: 'DateBetweenConfig' },
```

Change the `operators.mdx` entry (line 831) to resolve against both arms, and the `date-range.mdx`
entry (line 783) to the date arm alone:

```ts
			{ heading: '`BetweenOperatorConfig`', roots: [GRID_TYPE.NumberBetweenConfig, GRID_TYPE.DateBetweenConfig], expectedCount: 4 },
```

```ts
			{ heading: '`betweenOperator`', roots: [GRID_TYPE.DateBetweenConfig], expectedCount: 1 },
```

Keep `GRID_TYPE.BetweenOperatorConfig` only if some other page still uses it; if nothing does, delete
that entry too.

- [ ] **Step 4: Run the docs option-name test**

Run: `pnpm --filter @ez-kit/data-grid-core --filter @ez-kit/data-grid-react build`
Run: `pnpm --filter @ez-kit/docs exec vitest run test/docs-option-names.test.ts`
Expected: PASS. A count mismatch names the page, the table and the number it found — move the number
to what the table actually documents rather than trimming the table.

If resolving a union root turns out to return no properties, that is why both arms are listed
separately here; do not fall back to the union type.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/content apps/docs/test
git commit -m "docs: document the two arms of the between-operator config"
```

---

### Task 8: Changeset, full gate, and the AGENTS.md note

**Files:**

- Create: `.changeset/between-operator-config-arms.md`
- Modify: `AGENTS.md` (the settled-decisions section)

**Interfaces:**

- Consumes: every earlier task.
- Produces: the release note.

- [ ] **Step 1: Write the changeset**

`@ez-kit/data-grid-shadcn` must not appear — it is `private` and ignored.

```markdown
---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

`betweenOperator.variant` is removed, and the config now has two arms that do not mix.

`between` is one operator, so nothing in its config should say how the control looks — that is the
kit's business. What does differ is the value type, and the config now says so:

- **Number columns** — `{ slider?: boolean; min?: number; max?: number }`. The slider needs a bounded
  domain: `slider: true` without both bounds falls back to two number fields and warns in
  development, where it used to invent a `0..100` range.
- **Date columns** — `{ presets?: boolean | DateRangePreset[] }`, and one range control in every kit:
  a trigger showing the committed range, opening a two-month range calendar.

Writing one arm's options beside the other's is a compile error, and an option that lands on the
wrong column type warns in development.

Migration:

- `variant: 'slider'` → `slider: true` (add `min` / `max` if they were missing)
- `variant: 'inputs'` / `variant: 'calendar'` on a date column → remove the option
- the `BetweenInputVariant` export is gone
```

- [ ] **Step 2: Record the decision in AGENTS.md**

Add one bullet to the "Settled data-grid API decisions" list, so the removed option is not
re-proposed:

```markdown
- **The `between` config has two arms, and neither names a look.** `slider` / `min` / `max` are
  number-only, `presets` is date-only, and `?: never` keeps them from mixing. The removed `variant`
  encoded what the control looked like, which is the kit's business — and its `'inputs'` / `'calendar'`
  values were two spellings of one date-range picker. A date column has exactly one control.
```

- [ ] **Step 3: Run the full gate**

Run: `pnpm run ci`
Expected: all tasks successful (lint + typecheck + test + build + size).

Run: `node apps/docs/scripts/verify-manifest-coverage.mjs`
Expected: every manifest example is referenced from some `.mdx` — this catches an example left
orphaned by Task 6.

- [ ] **Step 4: Commit**

```bash
git add .changeset AGENTS.md
git commit -m "chore: changeset for the between-operator config split"
```

- [ ] **Step 5: Browser check across both kits**

With `pnpm docs:dev` running, open each of these in both `heroui` and `shadcn`:

- `/examples/<kit>/filter-date-range-built-in` — one trigger, preset menu, two-month calendar
- `/examples/<kit>/filter-date-range-custom` — custom presets in the menu
- `/examples/<kit>/filter-operators-between-slider` — a slider, since the column declares both bounds
- `/examples/<kit>/filter-operators-between-inputs` — two number fields
- `/examples/<kit>/filter-operators-date-between` — the date trigger

Check the browser console for the new development warnings; none of these examples should emit one.

---

## Self-Review

**Spec coverage:**

- §1 public API → Task 1; the `presets`-on-a-number-column gap → Task 2.
- §2 slider needs bounds → Task 1 (type doc), Task 2 (warning), Task 3 (branch).
- §3 development warnings → Task 2.
- §4 shared layer → Task 3.
- §5 kits → Tasks 4 and 5.
- §6 docs and examples → Tasks 6 and 7; `closed-sets.test.ts` → Task 1.
- §7 versioning → Task 8.

**Naming consistency:** `BetweenBranch.DateRange` is used in Tasks 3, 4 and 5; `slider` is the prop
name in Tasks 1, 3, 6 and 7; `NumberBetweenConfig` / `DateBetweenConfig` are the names in Tasks 1 and 7.

**Placeholder scan:** clean — every code step carries the code. The one prose-only instruction left is
Task 6 Step 1, and it is mechanical by design: four rewrite rules over a list of exact file:line call
sites.
