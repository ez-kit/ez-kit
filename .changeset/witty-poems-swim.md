---
'@ez-kit/data-grid-react': patch
---

Fix a column that is both pinned and resizable losing its pinning.

`[data-slot='th'][data-resizable='true']` set `position: relative` for the resize handle, and being declared after the pinning rule at equal specificity it overrode the `position: sticky` that pinning relies on. The header then took its pin offset as a plain relative shift, sliding over the next column instead of sticking. The rule now skips pinned headers — `sticky` already positions the handle just as well.
