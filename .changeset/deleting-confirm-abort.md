---
'@ez-kit/data-grid-react': patch
---

fix(data-grid): stop the delete confirmation from aborting the delete it just confirmed

Confirming cleared the pending row, which closed the dialog, which fired the kit's close
handler — the same one a dismissal uses — and that called `deleting.cancel()`, aborting the
`AbortSignal` handed to the `onDelete` that had just started. Any handler that passed the
signal to `fetch` saw its own request cancelled. The renderer now distinguishes a confirm-driven
close from a dismissal.
