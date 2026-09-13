---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Move `Modal` into the `core` component group, and forward refs to `Th` and `Button`

`Modal` was registered under `editing`, but nothing about it is editing-specific — `open` /
`onClose` / `title` / `children` / `onSave` / `onCancel` is what any grid dialog needs. It now
sits in `core`, beside the other primitives, so a feature that wants a dialog reaches for it
instead of registering a shell of its own. A kit registers it as `core: { …, Modal }`; kits that
implemented only the `editing` tier need the one-line move.

`ThProps` and `ButtonProps` now carry `RefAttributes`, as `TheadProps` and `TrProps` already did.
A header is the element a pointer drag reorders a column by, and a drag handle is a button held
the same way — both are handed to a drag library through a ref, which these two props types had
no channel for. A kit that does not forward the ref still renders and still typechecks; the
affordance just never attaches.
