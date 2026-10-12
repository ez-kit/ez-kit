import '../_styles/heroui.css'

import { HerouiButtonKitProvider } from './button-kit-provider'
import { HerouiDialogKitProvider } from './dialog-kit-provider'
import { HerouiFormKitProvider } from './form-kit-provider'

import type { ReactNode } from 'react'

export default function HerouiExamplesLayout({ children }: { children: ReactNode }) {
	return (
		<HerouiFormKitProvider>
			<HerouiDialogKitProvider>
				<HerouiButtonKitProvider>{children}</HerouiButtonKitProvider>
			</HerouiDialogKitProvider>
		</HerouiFormKitProvider>
	)
}
