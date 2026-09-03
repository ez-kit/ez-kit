// @ts-expect-error — the fixture deliberately imports a file that does not exist.
import { gone } from './nope' // eslint-disable-line import/no-unresolved -- the fixture deliberately imports a file that does not exist.

export function BrokenExample() {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- `gone` is typed `any` because the import above is unresolved.
	return gone
}
