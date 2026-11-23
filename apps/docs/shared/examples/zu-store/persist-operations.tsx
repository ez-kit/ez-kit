'use client'

import { StoreProvider } from '@ez-kit/zu-store'
import { useState } from 'react'

import { createDemoSource } from './persist-operations/adapter'
import { OperationControls } from './persist-operations/controls'
import { panel } from './persist-operations/store'

export default function PersistOperationsExample() {
	const [server] = useState(createDemoSource)
	return (
		<StoreProvider
			persist={{ server: server.adapter }}
			defaultSource='server'
		>
			<panel.Provider>
				<OperationControls
					delayRead={server.delayRead}
					setFailWrites={server.setFailWrites}
				/>
			</panel.Provider>
		</StoreProvider>
	)
}
