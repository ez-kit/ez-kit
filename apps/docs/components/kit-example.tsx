import { readExampleSource } from '@/components/example-source'

import { KitExampleClient } from './kit-example-client'

export type DataGridDocsExampleFlavor = 'shadcn' | 'heroui'

export type KitExampleProps = {
	exampleId: string
	defaultType?: DataGridDocsExampleFlavor
	lockFlavor?: boolean
}

/**
 * A live example with a kit switcher, for any product whose examples are kit-switched.
 *
 * It is product-agnostic on purpose: `exampleId` is resolved through the shared example
 * registry, so a data-grid and a form example differ only by the id passed here.
 */
export async function KitExample({ exampleId, defaultType, lockFlavor }: KitExampleProps) {
	if (lockFlavor === true && defaultType === undefined) {
		throw new Error('<KitExample />: `lockFlavor` requires `defaultType` ("shadcn" or "heroui").')
	}

	const source = await readExampleSource(exampleId)

	return (
		<KitExampleClient
			exampleId={exampleId}
			source={source}
			defaultType={defaultType}
			lockFlavor={lockFlavor ?? false}
		/>
	)
}
