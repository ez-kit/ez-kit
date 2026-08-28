---
'@ez-kit/data-grid-react': patch
---

Docs: the `editing/**` section and `cells/cell-types.mdx` documented an API that does not exist.

`meta.editable`, `meta.editType`, `meta.validate`, `onCellEdit`, a `CreatingModal` `onSubmit`, a
`'currency'` cell type, `meta.currency` / `meta.tones` / `meta.target` / `meta.rel` — none of these
names appear anywhere in the packages. Meanwhile the real validation API (`validate`, `ValidateOn`,
`ValidationError`, `zodResolver`) was documented nowhere at all, so the live examples on those very
pages ran the correct API next to prose describing a different one.

All five pages are rewritten against the real types, and the option-name test's page map now covers
**every** page under `content/docs/data-grid/**` rather than a hand-picked subset — a new
`everyPageIsMapped` guard fails the moment a page is added without being classified. That subset is
why these pages could drift this far: an unmapped page was checked by nothing.
