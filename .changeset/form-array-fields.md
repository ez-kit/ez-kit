---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': minor
'@ez-kit/form-heroui': minor
---

Repeatable field groups, through both authoring paths.

JSX scopes the components to the entry rather than composing a path, so a field inside one is
written `<item.TextField name='firstName' />` and checked against the item's type:

```tsx
<form.ArrayField
	name='people'
	newItem={{ firstName: '' }}
>
	{({ items }) =>
		items.map((item) => (
			<item.Item key={item.key}>
				<item.TextField
					name='firstName'
					label='Name'
				/>
			</item.Item>
		))
	}
</form.ArrayField>
```

A document says the same thing with an `array` node whose `children` are the entry's fields,
named relative to the entry. Nested arrays work on both paths. `defineFormItem` authors an
entry's field set separately, for reuse across forms and across arrays.

Conditions inside an entry use the `./` prefix that `FieldRef` had reserved — `{ field: './kind',
eq: 'vip' }` means _this_ entry's `kind`, while an absolute ref still reaches the form root.

Validation treats the list as a value of its own: `minLength` / `maxLength` count entries, and a
named `rule` receives the whole array, so a cross-item check ("no two people share an email") is
expressible. Such a rule may answer with `{ path, message }` issues that name the offending
entry instead of blaming the list.

`form.Array` is the headless counterpart of `form.ArrayField`: same engine, same scope handed to
`children`, but it draws no frame, no label and no add control of its own — it renders exactly
what the render prop returns. Reach for it when the kit's own chrome doesn't fit the layout (rows
in a table, a remove control folded into a card heading, and so on):

```tsx
<form.Array
	name='people'
	newItem={{ firstName: '' }}
>
	{({ items, add, Button }) => (
		<>
			{items.map((item, index) => (
				<item.Item
					key={item.key}
					label={`Person ${index + 1}`}
				>
					<item.TextField
						name='firstName'
						label='Name'
					/>
				</item.Item>
			))}
			<Button onClick={add}>Add person</Button>
		</>
	)}
</form.Array>
```

`item.Item` works the same way inside the primitive — there's just no array-level `itemLabel` /
`removeLabel` / `reorderable` to fall back to, so `Item` takes its own `label`, `removeLabel` and
`reorderable` directly. The scope's `disabled` and `required` mirror the props given to `Array` (or
`ArrayField`) as plain data, since a bare primitive has no frame of its own to render them on;
likewise `errors` and `invalid` carry the list's own validation failures, but **nothing renders
them for you** — a `minLength` failure still blocks submit even when the render prop doesn't read
`errors`. The docs call this out at length; this note is here so it isn't missed by anyone reading
only the changelog.

**`ButtonProps` gained an optional `onClick`.** The kit's generic button used to be only the
submit button, which fires through the surrounding `<form>`'s submit event and takes no handler —
now the scope's `Button` (used above for `add`) needs to be clickable too. This is additive at the
type level and adds no `FormComponents` key, but it is a real behavioural gap for a kit outside
this repo: **implement `Button` without honouring `onClick` and it silently becomes a dead
control**, something the type system cannot catch. The shadcn and HeroUI kits already wire it
through.

**Breaking for a kit outside this repo.** `FormComponents` gains two required slots,
`ArrayField` and `ArrayItem`, so a kit that wrote `satisfies FormComponents` must implement
them. The shadcn and HeroUI kits already do. `form.Array` adds no further slot — it reuses the
same two.

Two behavioural fixes come with it, both from the same root cause — the traversal that decides
what a schema owns now follows paths instead of top-level keys:

- `stripHiddenValues` now strips a hidden field addressed by a dotted path (`company.inn`) out
  of its parent object. It previously left it in place, and the value reached `onSubmit`.
- `minLength` / `maxLength` now apply to an **empty** list. A `minLength: 1` used to pass on
  `[]`, which is the one case the option exists for; the same fix makes it work on an empty
  multi-select.
