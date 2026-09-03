---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Share the between-filter behaviour across UI kits, and fix two drifted spots.

`@ez-kit/data-grid-react` now exports `useBetweenValue` (branch selection, slider bounds,
`NaN`-safe number handlers, preset gate) and `buildMultiSelectLabel` (the multi-select trigger
label). Both kits' `BetweenInput` / `MultiSelectFilter` render against them, so this behaviour
is defined once instead of per kit.

Fixes carried by the move:

- **shadcn**: the between filter's number inputs now honour the column's `min` / `max`. They
  had silently dropped both, so values outside the configured range were accepted there while
  the heroui kit rejected them.
- **heroui**: the pagination label and the infinite-scroll load-more row were styled with
  `text-default-500`. HeroUI v3 has flat `--muted` / `--default` tokens and no `default-500`
  step, so the utility compiled to nothing and neither element was actually muted. Both now go
  through the kit's `var(--muted)` convention.

The shadcn calendar range picker now publishes only a **complete** range. react-day-picker
resolves the first click to a same-day range (`addToRange` returns `{ from: day, to: day }`
while `min` is 0), so the previous code applied a one-day filter on the way to the range the
user was drawing — and fired a request for it on a server-driven grid. The first click is now
held locally and the filter is written once the second click closes the range, matching the
heroui kit, where react-aria keeps the same pending anchor internally.
