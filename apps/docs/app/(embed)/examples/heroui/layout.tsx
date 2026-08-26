import '../_styles/heroui.css'

import { HerouiDialogKitProvider } from './dialog-kit-provider'
import { HerouiFormKitProvider } from './form-kit-provider'

import type { ReactNode } from 'react'

export default function HerouiExamplesLayout({ children }: { children: ReactNode }) {
	return (
		<HerouiFormKitProvider>
			<HerouiDialogKitProvider>{children}</HerouiDialogKitProvider>
		</HerouiFormKitProvider>
	)
}
