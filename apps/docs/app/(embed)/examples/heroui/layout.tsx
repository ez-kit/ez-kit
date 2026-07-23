import '../_styles/heroui.css'

import { HerouiFormKitProvider } from './form-kit-provider'

import type { ReactNode } from 'react'

export default function HerouiExamplesLayout({ children }: { children: ReactNode }) {
	return <HerouiFormKitProvider>{children}</HerouiFormKitProvider>
}
