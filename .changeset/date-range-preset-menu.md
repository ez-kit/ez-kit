---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
---

Date filter presets now sit behind one menu trigger instead of a chip per preset. The filter also
renders inline in a column header, where six wrapped chips took the height of the whole header row
with them.

The trigger names the preset the current value came from — computed from the value rather than
remembered from the last click, so one restored from a deep link is recognised and an edited one
stops being named. `messages.filtering.presets` labels the menu.
