---
'@ez-kit/data-grid-heroui': patch
---

fix(heroui): lay columns out on the model's widths so pinning lands where it should

The kit left column widths to native table layout, so the rendered widths drifted from the
table model (a long cell value stretched its column past its declared `size`). Every pin
offset is computed from that model, so pinned columns stuck at the wrong place — leaving a
gap between neighbouring pinned columns that the scrolling content showed through — and the
pin shadow floated over the middle of the table instead of hugging the pinned edge.

Rows now carry the same CSS grid column template shadcn uses, so the rendered widths are the
model widths. Column `size` (and therefore column resizing) now takes effect in this kit.

Also drops the sample label HeroUI's docs example ships on `Checkbox.Content`, which was
printing "Enable email notifications" next to every selection checkbox.
