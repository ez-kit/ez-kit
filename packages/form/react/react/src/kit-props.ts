/**
 * Every prop of `props` whose key is not in `owned` — the half of a call site's props that the
 * binding does not read and hands on as written: flat to a built-in's kit component, nested under
 * `props` to a custom field's.
 *
 * `owned` is one of the key sets in `field-registry.ts`, each checked against its type, so a
 * binding prop added later cannot quietly start arriving here instead.
 *
 * `Object.hasOwn`, not `in`: the key sets are object literals, so `in` walks `Object.prototype`
 * too and would silently swallow an author prop named `toString`, `constructor`, `valueOf` or any
 * other member of it. The prop would vanish between the call site and the component with nothing
 * reported anywhere.
 */
export function propsOutside(props: object, owned: Readonly<Record<string, true>>): Record<string, unknown> {
	const rest: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(props)) {
		if (!Object.hasOwn(owned, key)) rest[key] = value
	}
	return rest
}
