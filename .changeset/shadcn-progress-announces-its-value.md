---
'@ez-kit/data-grid-shadcn': patch
---

Progress cells announce their value. The vendored `Progress` primitive took `value` for the
indicator's transform and never handed it to the Radix root, so every progress bar rendered
`data-state="indeterminate"` with no `aria-valuenow` — visually correct, silent to assistive
technology. The root now receives the value, which is also what the `progress` cell type's
`config.max` scaling is for.
