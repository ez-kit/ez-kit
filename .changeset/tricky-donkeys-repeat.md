---
'@ez-kit/form-core': minor
'@ez-kit/form-react': minor
'@ez-kit/form-shadcn': patch
---

Named option sources: a select-like field can name a list instead of carrying it.

A 200-country list, or a country → city cascade, cannot be written into a form document. The four select-like nodes now take `optionsFrom` — a **name**, never a URL — beside the existing `options`, and the app decides what that name fetches:

```json
{
	"type": "select",
	"name": "address.city",
	"optionsFrom": {
		"source": "dictionary",
		"params": { "domain": "cities" },
		"dependsOn": { "country": "address.country" }
	}
}
```

The same prop works in TSX, where the live value is passed directly instead: `<form.SelectField name='address.city' optionsFrom='dictionary' optionsParams={{ domain: 'cities', country }} />`.

Sources are registered on the new `<FormOptionSources value={…}>` provider — a provider rather than a `FormRenderer` prop, because unlike `fields` / `blocks` / `rules` a source serves the JSX path too. **A source is a React hook**, so it is whatever query the app already has (TanStack Query, SWR, RTK Query, or a plain synchronous list); this package ships no fetching, no cache and no abort logic, and no built-in `dictionary` source. `parseFormSchema` gains `optionSources` and rejects an unregistered name with the node's path, exactly as it does for an unknown rule or block.

When a source's resolved parameters change, the dependent field's value is cleared immediately — otherwise `{ country: 'de', city: 'msk' }` gets submitted. Parameters are compared by value, and the first computation is skipped so a loaded draft survives mount.

**Breaking (`@ez-kit/form-core`).** `options` on the four select-like schema members is no longer unconditionally required: they now take exactly one of `options` and `optionsFrom`. A node carrying both, or neither, is a compile error — and a parse error for a delivered document, whose message changed from `"select" is missing an "options" array` to `"select" needs either an "options" array or an "optionsFrom" source`. Every existing schema that writes its `options` out still compiles unchanged.

**Breaking (`@ez-kit/form-react`).** `options` on the four option-bearing field components is now optional in the types, with the "exactly one of `options` / `optionsFrom`" rule enforced at runtime with the field's name in the message. Expressing it in the types would collide with the string/number correlation those props are already a union over. `BindableForm` gains `setFieldValue`, which every real TanStack instance already has.

**Fix (`@ez-kit/form-shadcn`).** `SelectField` omitted Radix's `value` prop when the field was empty, which dropped the select into uncontrolled mode: after the user had picked an option, clearing the field left Radix holding its own last value, and the trigger rendered blank — no label, and no placeholder either. The prop is now always passed; Radix reads `''` as "no selection" and draws the placeholder, which is what the empty state was meant to look like all along. Nothing exercised this before, because nothing reset a select from a chosen value back to empty.
