---
'@ez-kit/data-grid-heroui': patch
---

Stop one wide column from stretching every other one. The table box was floored at `max-content`,
and a grid's max-content size resolves every `minmax(…, 1fr)` track to the _largest_ track minimum —
so a 360px Title column pushed six 110–180px columns to 360px each and ran the table off the
viewport. `min-content` is the sum of the track minimums, which is the floor this actually needs
for its horizontal scroll.
