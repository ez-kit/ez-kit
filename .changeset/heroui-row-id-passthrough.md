---
'@ez-kit/data-grid-heroui': patch
'@ez-kit/docs': patch
---

heroui: keep `data-row-id` on body rows

The `Tr` adapter consumed the attribute — it read the value into React Aria's collection `id`
and then dropped it — so `[data-row-id]`, documented as part of the react layer's row contract,
selected nothing under heroui while working under shadcn. It is now passed through alongside
the `id`; React Aria's own `data-key` is unaffected.
