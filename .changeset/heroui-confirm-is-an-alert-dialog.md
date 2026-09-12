---
'@ez-kit/data-grid-heroui': patch
---

Raise the delete confirmation as an `alertdialog` rather than a plain dialog.

`ConfirmDialog` serves one feature, `deleting`, and what it asks is always destructive and always
irreversible — the WAI-ARIA alertdialog pattern, not the dialog one. It was built on HeroUI's
`Modal` (`role="dialog"`), so a screen reader read the prompt only once focus landed inside it
rather than announcing it, and a stray click on the backdrop dismissed the question as if it had
been answered. It now uses HeroUI's `AlertDialog`, which carries `role="alertdialog"` and does not
dismiss on an outside click. The shadcn kit has been on Radix's `AlertDialog` all along; this
closes the gap between them.

Escape still cancels. HeroUI defaults `isKeyboardDismissDisabled` to `true` for an alert dialog;
that is turned back off here, because Escape is the _safe_ answer to a delete prompt and a
confirmation a keyboard user cannot back out of makes refusing harder than confirming.
