import '../_styles/shadcn.css'

import { ShadcnButtonKitProvider } from './button-kit-provider'
import { ShadcnDialogKitProvider } from './dialog-kit-provider'
import { ShadcnFormKitProvider } from './form-kit-provider'

import type { ReactNode } from 'react'

export default function ShadcnExamplesLayout({ children }: { children: ReactNode }) {
	return (
		<ShadcnFormKitProvider>
			<ShadcnDialogKitProvider>
				<ShadcnButtonKitProvider>{children}</ShadcnButtonKitProvider>
			</ShadcnDialogKitProvider>
		</ShadcnFormKitProvider>
	)
}
