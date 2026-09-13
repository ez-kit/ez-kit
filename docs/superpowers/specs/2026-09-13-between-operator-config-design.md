# `between` operator config: one control per value type

**Date:** 2026-09-13
**Packages:** `@ez-kit/data-grid-core`, `@ez-kit/data-grid-react`, `@ez-kit/data-grid-shadcn`, `@ez-kit/data-grid-heroui`, `@ez-kit/docs`

## Problem

`BetweenOperatorConfig` (`packages/data-grid/core/src/features/operators/operators.ts`) is one object
holding two unrelated configurations:

```ts
export type BetweenOperatorConfig = {
	variant?: 'inputs' | 'slider' | 'calendar'
	min?: number // "Minimum value for slider variant"
	max?: number // "Maximum value for slider variant"
	presets?: boolean | DateRangePreset[] // only meaningful when cell.type === 'date'
}
```

Three of the four fields already belong to one value type or the other, and nothing in the types says
so: `variant: 'slider'` on a date column compiles and is then silently resolved to a date branch by
`resolveBranch`.

`variant` itself is the deeper mistake. `between` is **one** operator — which comparison the filter
performs does not change with the picker. What the option really encodes is _what the control looks
like_, and that is the UI kit's business, not the column author's. It also does not survive contact
with the kits: `'inputs'` and `'calendar'` are two spellings of "pick a date range", differing only in
whether the kit happened to compose two single-date pickers or one range calendar.

The number side is not the same case. Two number fields and a slider are genuinely different controls
for genuinely different situations — a slider needs a bounded domain, two fields do not — so that
choice stays, as an option that says what the column _is_, not what it should look like.

## Design

### 1. Public API

`variant` and the exported `BetweenInputVariant` closed set are removed. The config splits into two
arms that cannot be mixed:

```ts
export type NumberBetweenConfig = {
	/** Render the bounded range as a slider. Requires both `min` and `max`. */
	slider?: boolean
	min?: number
	max?: number
	presets?: never
}

export type DateBetweenConfig = {
	presets?: boolean | DateRangePreset[]
	slider?: never
	min?: never
	max?: never
}

export type BetweenOperatorConfig = NumberBetweenConfig | DateBetweenConfig
```

Written out:

```ts
// number column
betweenOperator: { slider: true, min: 0, max: 100 }
// date column
betweenOperator: { presets: true }
// compile error — the two arms do not mix
betweenOperator: { slider: true, presets: true }
```

`{}` satisfies both arms, which is correct: a between filter needs no configuration at all.

**What this does not catch.** `presets` on a _number_ column still compiles, because the governing
`cell.type` is a sibling field of the same column object and TypeScript has no inference variable to
carry it across — the reason is already written down in `packages/data-grid/core/src/column/types.ts`
(see the `ColumnInputRenderer` note). Making the column def a discriminated union over `cell.type` is
a separate typing project with real risk to every `createColumns` error message, and is deliberately
out of scope. The gap is closed at runtime instead (§3).

`min` / `max` keep their meaning without `slider`: they already clamp the two number fields through
`BetweenNumberController`, and that stays true.

### 2. Slider requires a bounded domain

Today `variant: 'slider'` without `min` / `max` silently renders a `0..100` slider —
`DEFAULT_SLIDER_MIN` / `DEFAULT_SLIDER_MAX` in `use-between-value.ts`. Those bounds are an invention,
not data: a column of prices in the thousands gets a slider that can express nothing.

New rule: the slider renders only when **both** bounds are declared. `slider: true` without them logs
a development warning and falls back to two number fields. Both defaults are deleted.

### 3. Development warnings

`createTable` already warns in development when `pagination.pageSize` is written beside
`initialState.pagination.pageSize`. Two warnings join it, covering exactly the misuse the types cannot:

- `presets` on a column whose `cell.type` is not `date` — the option is ignored.
- `slider: true` without both `min` and `max` — the control falls back to two fields.

### 4. Shared layer (`@ez-kit/data-grid-react`)

- `BetweenBranch` becomes `Slider | DateRange | NumberInputs`. `DateInputs` and `Calendar` merge:
  every date column resolves to `DateRange`.
- `resolveBranch` reads `type` and `slider` instead of `variant`: date → `DateRange`; number with
  `slider` and both bounds → `Slider`; otherwise `NumberInputs`.
- `BetweenInputProps.variant` is replaced by `slider?: boolean`.
- `BetweenController.dates` is removed. It exists for per-end date editing, which no kit does after
  this change.
- `BetweenPresetsController` is untouched — presets are orthogonal to this and already landed.

### 5. Kits

Both kits render the same thing for a date column: a trigger button labelled with the committed range
(`08.05.2026 – 14.05.2026`, or the empty-state message), opening a popover with a two-month range
calendar. Keyboard entry is through the calendar, not through a text field — a typeable range field
is a heroui-only primitive, and hand-rolling one for shadcn would put the kits' parsing behaviour on
two different code paths.

- **shadcn** — this is the existing `CalendarRange` (`Popover` + `Calendar mode='range'`,
  `numberOfMonths={2}`, anchor-based commit). Its `DateInputs` branch and the `DateCellInput` import
  are deleted.
- **heroui** — the `Popover` + `Button` trigger stays; its `RangeCalendar` gains
  `visibleDuration={{ months: 2 }}` with two `offset` grids and a `YearPickerTrigger` header, matching
  the kit's own `DateCell` anatomy and shadcn's two months. Its `DateInputs` branch and the
  `DateCellInput` import are deleted.
- The committed-range-only behaviour both kits already have is now the documented contract for the
  date branch rather than an artefact of one variant.

### 6. Documentation and examples

- `filtering/date-range.mdx` — the inputs/calendar split disappears; the page documents one date
  control plus presets. Three examples become two (built-in presets, custom presets).
- `filtering/operators.mdx` — the `variant` row of the `betweenOperator` table becomes `slider`, with
  the two arms spelled out.
- Examples touched: `filter-date-range.tsx`, `filter-operators-between-inputs.tsx`,
  `filter-operators-between-slider.tsx`, `filter-operators-date-between.tsx`, plus
  `shared/data-grid/examples/manifest.json` and `registry.ts` for any id that goes away.
- `packages/data-grid/react/react/src/closed-sets.test.ts` lists `BetweenInputVariant`; that entry is
  removed with the export.
- `apps/docs/test/docs-options/page-type-map.ts` — checked-name counts for the two pages move.

### 7. Versioning

`@ez-kit/data-grid-core` and `@ez-kit/data-grid-react` are at `0.3.0`. This is a breaking change to a
documented option, shipped as a **minor** under the pre-1.0 convention, with the migration in the
changeset body:

- `variant: 'slider'` → `slider: true` (and declare `min` / `max` if they were missing)
- `variant: 'inputs'` / `variant: 'calendar'` on a date column → delete the option

`@ez-kit/data-grid-shadcn` is `private` and ignored by changesets, so it is never named in one; its
change ships under `@ez-kit/data-grid-react`.

## Testing

- `use-between-value.test.ts` — branch resolution per `type` + `slider` + bounds; the `0..100` default
  is gone; `dates` no longer exists.
- `render-filter-input.test.tsx` — `slider` is forwarded, `variant` is not.
- `createTable` warning tests for both new development warnings.
- Kit tests: each kit renders one trigger for a date column and commits only a complete range.
- Type-level: `{ slider: true, presets: true }` must not compile (a `@ts-expect-error` case).

## Out of scope

- Typing `betweenOperator` against the sibling `cell.type` (§1).
- A typeable date-range field in either kit (§5).
- Renaming `filtering.operators.betweenOperator`; the name is settled in `AGENTS.md`.
