---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

One activation verb across the UI-kit contract, and two casts removed from the HeroUI core blocks.

**Breaking: `ClearFiltersButtonComponentProps.onPress` is now `onClick`.** It was the only
activation handler in the contract spelled `onPress`; every sibling uses a semantic verb
(`onClear`, `onRemove`) and `ChevronProps` already used `onClick`. React Aria — and through it
HeroUI v3 — accepts `onClick` as an official alias of `onPress`, so a kit that wants to keep
pressing through React Aria still can: the HeroUI kit wires `onPress={onClick}`. A kit
implementing this component renames the prop; nothing else changes.

**HeroUI `Button` no longer fakes a MouseEvent.** It used to wire `onPress` and cast the
React Aria `PressEvent` to a React `MouseEvent` before handing it to the contract's handler —
an object with neither `currentTarget` nor `preventDefault`, typed as if it had both. `onClick`
is now forwarded straight through, so the handler receives the real synthetic event it is typed
for. Covered by tests for pointer activation, keyboard activation and the `disabled` mapping.

The remaining cast in `Button` and `Input` is narrowed from `as unknown as` to a plain `as`,
with a comment: it exists only because react-aria-components declares its optional props
without `| undefined`, which `exactOptionalPropertyTypes` rejects. The two shapes agree on
every prop name and value type.
