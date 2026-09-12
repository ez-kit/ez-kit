---
'@ez-kit/data-grid-heroui': minor
'@ez-kit/docs': patch
---

data-grid-heroui: the toolbar keeps its slot name, and `data-has-value` is spelled once

**`data-slot="toolbar"` reaches the DOM.** The React layer passes the attribute to whatever
`Toolbar` a kit supplies; this kit's destructured `children` / `start` / `end` and dropped the
rest, so the toolbar region simply had no name in heroui — `[data-slot="toolbar"]` matched
nothing, and `filtering: { panel: 'toolbar' }` could not be told apart from the default
placement by anything but the eye. Same omission `Tr` had with `data-row-id`, same fix: spread
the remaining props. `role="toolbar"` stays.

**`data-has-value` on a filter-panel chip is present or absent, never `"false"`.** The chip
wrote `hasValue ? 'true' : 'false'` where the shadcn one writes `hasValue || undefined`, so one
flag had two spellings and every selector over it had to know which kit it was looking at. It
now matches shadcn. A stylesheet or test keyed on `[data-has-value="false"]` must switch to
`:not([data-has-value])`.

Both were found by the new browser specs for filtering, which assert the layer's `data-*`
contract against a real layout rather than against jsdom.
