---
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

**`form.Section` and `form.GridItem` — the JSX half of the layout the document side already had.**

Both kits have implemented `Section` and `GridItem` since v1: the schema renderer draws a `section`
node as a headed column grid and wraps each child of that grid in a `GridItem` carrying the node's
`colSpan`. Neither was reachable from JSX — `createForm` built the fields and nothing else — so a
hand-written form had to reproduce the grouping in its own markup, which is what the docs' showcase
example did, in six lines of local component nobody could import.

They are now on the form instance beside the fields:

```tsx
<form.Section
	title='Company'
	columns={3}
>
	<form.GridItem colSpan={2}>
		<form.TextField
			name='company'
			label='Company'
		/>
	</form.GridItem>
	<form.TextField
		name='vatId'
		label='VAT id'
	/>
</form.Section>
```

The one difference from the document spelling is where the span is written: a node carries
`colSpan` itself, because a node cannot wrap itself, while JSX wraps the child — and only where a
span above one column is wanted, since an unwrapped child is already a cell of its own. Both reach
the same kit components, so the two spellings still produce identical DOM.

New exported types: `SectionProps`, `GridItemProps`. New docs page: [Layout](https://ez-kit.dev/docs/form/layout).
