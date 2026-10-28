import '../../../examples/_styles/heroui.css'

import { ServerActionExample } from '@/shared/form/examples/components/server-action'

import { HerouiFormKitProvider } from '../../../examples/heroui/form-kit-provider'

/**
 * The server-actions example rendered through the normal server path, for the HeroUI kit.
 *
 * Every page under `examples/<kit>/[slug]` renders client-only, so no form there is ever
 * server-rendered and no hydration mismatch could show. This page imports the example
 * statically, so it is prerendered and then hydrated — `e2e/packages/form/hydration.spec.ts`
 * loads it and fails on any console error.
 */
export default function HerouiServerActionPage() {
	return (
		<HerouiFormKitProvider>
			<ServerActionExample />
		</HerouiFormKitProvider>
	)
}
