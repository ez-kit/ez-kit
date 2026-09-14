---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

`betweenOperator.variant` is removed, `betweenOperator` is number-only, and date presets moved up to
the column's `filtering.presets`, where they serve every date operator rather than only `between`.

`between` is one operator, so nothing in its config should say how the control looks — that is the
kit's business:

- **Number columns** — `betweenOperator: { slider?: boolean; min?: number; max?: number }`. The
  slider needs a bounded domain: `slider: true` without both bounds falls back to two number fields
  and warns in development, where it used to invent a `0..100` range.
- **Date columns** — one range control in every kit (a trigger showing the committed range, opening a
  two-month range calendar), and `filtering: { presets: true }` for the presets.

Presets are no longer a `between` thing. A preset fills the current operator's value, and the two
kinds fill different shapes: a `DateRangePreset` (`getRange`) fills `between`, a `DateValuePreset`
(`getDate`) fills `equals`, `lessThan`, `greaterThan` and the rest. The control offers only the kind
the current operator can take — a range has no single date to mean, so bending one into a date would
turn "the last week" into "on last Tuesday". Built-in single dates: Today, Yesterday, A week ago,
A month ago, Start of month.

The preset menu now renders through the kit's `core.Menu`, which gains a `filter` variant plus
optional `triggerLabel` / `triggerIcon`; `GridMenuIcon` gains `calendar`. A kit that implements the
component contract has to render that variant.

Migration:

- `variant: 'slider'` → `slider: true` (add `min` / `max` if they were missing)
- `variant: 'inputs'` / `variant: 'calendar'` on a date column → remove the option
- `operators: { betweenOperator: { presets } }` → `filtering: { presets }`, one level up
- the `BetweenInputVariant` export is gone; `BetweenInputProps` no longer takes `presets` /
  `onPresetSelect`, and `localizeDateRangePresets` is now `localizeDatePresets`
