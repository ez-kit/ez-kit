---
'@ez-kit/data-grid-shadcn': patch
---

Make the delete confirmation read as destructive.

The prompt carried no danger cue at all: no icon, and a default neutral confirm button — which
left the kit disagreeing with itself, since the inline Delete in the row-actions cell that raises
the prompt is already `destructive`.

It now leads with a danger badge in `AlertDialogMedia` — the slot the vendored primitive already
reserves, tinted with the same tokens the kit's form-error banner uses — and its confirm button is
`destructive`. The heroui kit draws the same badge through its own `AlertDialog.Icon status='danger'`,
down to the size and the circle-with-exclamation glyph.
