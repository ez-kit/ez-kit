---
'@ez-kit/data-grid-core': patch
'@ez-kit/data-grid-react': patch
'@ez-kit/data-grid-heroui': minor
'@ez-kit/form-react': patch
'@ez-kit/form-shadcn': patch
'@ez-kit/twc': patch
'@ez-kit/docs': patch
---

Update the TanStack, React, UI and documentation dependencies and refresh build and test tooling. Fix vulnerable transitive dependencies where compatible patched releases are available.

The optional data-grid drag adapters now require `@dnd-kit/react` and `@dnd-kit/dom` ^0.5.3. Update both packages when using the HeroUI `/dnd` entry or the shadcn drag registry item.
