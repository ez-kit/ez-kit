import { readExampleSource } from '@/components/example-source'

import { DataGridDocsExampleClient } from './data-grid-docs-example-client'

export type DataGridDocsExampleFlavor = 'shadcn' | 'heroui'

export type DataGridDocsExampleProps = {
	exampleId: string
	defaultType?: DataGridDocsExampleFlavor
	lockFlavor?: boolean
}

export async function DataGridDocsExample({ exampleId, defaultType, lockFlavor }: DataGridDocsExampleProps) {
	if (lockFlavor === true && defaultType === undefined) {
		throw new Error('<DataGridDocsExample />: `lockFlavor` requires `defaultType` ("shadcn" or "heroui").')
	}

	const source = await readExampleSource(exampleId)

	return (
		<DataGridDocsExampleClient
			exampleId={exampleId}
			source={source}
			defaultType={defaultType}
			lockFlavor={lockFlavor ?? false}
		/>
	)
}
