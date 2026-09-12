---
'@ez-kit/data-grid-shadcn': patch
'@ez-kit/data-grid-heroui': patch
---

Drop the "Loading more…" caption from the infinite-scroll loader row in both kits — the fetching
state is now the kit's spinner alone, matching the wordless refetch overlay. shadcn uses its own
`Spinner` component (`components/ui/spinner`) instead of a hand-spun `Loader2`; heroui already
used `Spinner` and only loses the text beside it. The label the caption carried survives as the
spinner's `aria-label`, so a screen reader still announces the load. The error state and the
manual "Load more" button keep their text — neither can be a spinner.
