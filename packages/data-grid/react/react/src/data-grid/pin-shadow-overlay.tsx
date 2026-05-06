import { useTableContext } from './table-context'

export function PinShadowOverlay() {
	const table = useTableContext()
	const leftCols = table.getLeftLeafColumns()
	const rightCols = table.getRightLeafColumns()

	if (leftCols.length === 0 && rightCols.length === 0) return null

	const leftSize = leftCols.reduce((acc, col) => acc + col.getSize(), 0)
	const rightSize = rightCols.reduce((acc, col) => acc + col.getSize(), 0)

	return (
		<div
			aria-hidden
			style={{
				position: 'absolute',
				top: 0,
				bottom: 0,
				left: leftSize,
				right: rightSize,
				pointerEvents: 'none',
				overflow: 'hidden',
			}}
		>
			{leftCols.length > 0 && <div className='dg-shadow-left' />}
			{rightCols.length > 0 && <div className='dg-shadow-right' />}
		</div>
	)
}
