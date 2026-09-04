---
'@ez-kit/data-grid-heroui': patch
---

Render every number field in the kit through one `NumberField` control. HeroUI shows the decrement/increment buttons only when `NumberField.Group` + `DecrementButton`/`IncrementButton` are composed in, so the cell editor — which rendered a bare `Input` — looked like a plain text field; it now has its steppers. The column filter and both ends of a between-filter use the same control without steppers (a filter value is typed, not stepped), so they gain `NumberField`'s parsing and formatting and share the editor's border and background instead of being raw `<input type='number'>`.
