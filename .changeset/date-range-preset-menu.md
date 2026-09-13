---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

Date-range filter presets now sit behind one menu trigger instead of a chip per preset. The
between-filter also renders inline in a column header, where six wrapped chips took the height of
the whole header row with them. The trigger names the preset the current range came from
(`BetweenPresetsController.activeId`, computed from the value rather than from the last click, so a
range restored from a deep link is recognised and an edited one stops being named), and
`messages.filtering.presets` labels it.
