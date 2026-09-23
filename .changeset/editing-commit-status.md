---
'@ez-kit/data-grid-core': patch
---

Fix a save that never ran, and a save that a blur could cancel

Two independent defects in `editingFeature` and `creatingFeature`, both of which made the row (or
the draft) sit in its editor showing neither the saved value nor a rejection.

**A field validation no longer writes `commitStatus`.** That status describes the _form_:
`isPending` in the actions cell is `commitStatus !== Idle`, and both kits bind it to the save
button's `disabled`. `validateAndApplyField` set it to `Validating` for the length of its `await`
and back to `Idle` afterwards — and the blur it runs on is, above all, the blur that pressing Save
itself causes. Pointer down on Save, focus leaves the editor, the button went disabled mid-press,
and React Aria cancelled the press: the click never became one, so `commit` was never called at
all. A field validation now writes that field's errors and nothing else.

**Form operations and field validations no longer share an `AbortController`.** They are cancelled
by different events — a field check by the next blur or keystroke, a commit by `cancel`, by the
next commit, or by a table reset — so sharing one made the save click a race with the blur it
causes: whichever reached the box second aborted the first, and when the blur arrived _during_ the
save's `await`, `onSave` resolved straight into an aborted signal and the result was dropped.
`commit`, `commitCell` and `validate` now take a `form` controller; `validateField` and the
debounced change validation take a `field` one, and return without doing anything while a form
operation is in flight. A form operation still aborts a pending field check — the commit validates
every field anyway.

Whether either bug fired depended on how a UI kit moves focus on press, which is why both surfaced
as a HeroUI 3.2 regression and were neither. The exported `EditingAbortBox` / `CreatingAbortBox`
change shape with this (`controller` becomes `form` + `field`); they describe an internal table
member and are not part of the configuration surface.
