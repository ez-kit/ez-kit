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
