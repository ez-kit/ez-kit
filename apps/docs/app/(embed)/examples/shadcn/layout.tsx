import '../_styles/shadcn.css'

import { ShadcnFormKitProvider } from './form-kit-provider'

import type { ReactNode } from 'react'

export default function ShadcnExamplesLayout({ children }: { children: ReactNode }) {
	return <ShadcnFormKitProvider>{children}</ShadcnFormKitProvider>
}
