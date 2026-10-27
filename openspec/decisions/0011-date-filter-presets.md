# 0011. Date filter presets and `betweenOperator`

- Status: Accepted
- Recorded: 2026-10-26 (moved from `AGENTS.md`; the decision itself predates this record)
- Related: [0005-filter-operator-vocabulary](./0005-filter-operator-vocabulary.md)

## Decision

**Date presets belong to the column.** `betweenOperator` is number-only (`slider` / `min` / `max`, no `variant`); `filtering.presets` fills whichever operator is current; the preset menu is `core.Menu`, not a slot; column-level and a future table-level `presets` do not collide.

## Context, rationale and rejected alternatives

- **`betweenOperator` is number-only, and it names no look.** `slider` / `min` / `max` is the whole
  type. The removed `variant` encoded what the control looked like, which is the kit's business — and
  its `'inputs'` / `'calendar'` values were two spellings of one date-range picker. A date column has
  exactly one control.
- **Date presets belong to the column, not to `between`.** `filtering.presets` fills whichever
  operator is current: a `DateRangePreset` (`getRange`) fills `between`, a `DateValuePreset`
  (`getDate`) fills every operator that takes one date, and the control offers only the kind the
  current operator can take. Do not fold them back under `betweenOperator`, and do not bend a range
  into a date — picking an end turns "the last week" into "on last Tuesday". That presets apply to a
  date column cannot be checked in the types (`presets` and `cell` are sibling fields with no
  inference variable to carry the type across — see the `ColumnInputRenderer` note in
  `column/types.ts`), so `mapColumns` warns in development instead.
- **The preset menu is `core.Menu`, not a slot of its own.** It rendered inside each kit's
  `BetweenInput` while presets were a `between` thing; it now sits beside whichever control the
  operator renders, so the adapter draws it — through the existing menu contract, which grew a
  `filter` variant and an optional `triggerLabel` / `triggerIcon` rather than gaining a
  `filtering.PresetMenu` slot named for the feature.
- **`presets` is legal at two levels and the two do not collide.** `column.filtering.presets` are
  the date presets of one column. A future table-level saved-filter option is a different namespace
  a level up, on a different type. Considered as a rename candidate and dropped — this is not the
  one-word, two-meanings defect the audits cleaned up.
