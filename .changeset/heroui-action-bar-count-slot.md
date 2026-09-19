---
'@ez-kit/data-grid-heroui': patch
---

**The action bar's selection count carries `data-slot='action-bar-selection-count'` in this kit
too.**

The shadcn kit stamped it on the count element; heroui rendered the number as an unnamed `span`
(inline) or `Chip` (floating), so a selector written against the slot addressed nothing here. The
slot sits on a wrapper rather than on the `Chip` itself, because `Chip` spreads the caller's props
and then writes its own `data-slot='chip'` over them.

This is the class of defect `apps/docs/test/e2e-slots.test.ts` cannot see: it fails only when _no_
package authors a slot, so one kit stamping it lets a spec pass while matching nothing in the
other. Both kits now assert the rendered attribute in their own unit tests.
