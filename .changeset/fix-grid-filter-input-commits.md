---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Apply the configured filter debounce consistently to built-in text and single-number editors, including standard UI-kit renderers. These inputs now wait 250 ms by default outside draft mode; use `filtering.debounce: 0` for immediate commits. Global search retains its own override and otherwise inherits the table delay.

With `draft: true`, typing updates the internal draft immediately so Apply and programmatic apply include the latest values. Enter in filter inputs or search no longer applies the query. Explicit clear/reset and operator changes cancel pending input, including same-value clears. Keyboard deletion follows typing timing. Programmatic setters, batch panel writes, discrete controls, and custom editors remain synchronous. HeroUI number filters use the control's native parsed value while preserving intermediate text; editing and creating keep their existing behavior.
