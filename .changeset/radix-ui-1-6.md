---
'@ez-kit/data-grid-shadcn': patch
'@ez-kit/form-shadcn': patch
---

fix(shadcn): make the vendored switch, checkbox and radio paint their checked state

`switch.tsx`, `checkbox.tsx`, `radio-group.tsx` and `field.tsx` were vendored from the Base UI
flavour of the shadcn registry, whose primitives stamp `data-checked` / `data-unchecked` — while
these kits build on `radix-ui`, which stamps `data-state="checked|unchecked"`. Every
`data-checked:` / `data-unchecked:` variant therefore matched nothing: an unchecked switch was a
transparent 32×18 box on a white cell (invisible in a boolean column, in both the editing cell and
the creating row), a checked checkbox never took the primary fill, and the thumb never travelled.
The variants now read the attribute the primitive actually sets.

`radix-ui` also moves to ^1.6.7 here and in the docs app.
