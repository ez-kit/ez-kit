import * as React from 'react'

import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect'

function useAsRef<T>(props: T) {
	const ref = React.useRef(props)

	useIsomorphicLayoutEffect(() => {
		ref.current = props
	})

	return ref
}

export { useAsRef }
