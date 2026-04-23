import Link from 'next/link'

export function DataGrid() {
	return (
		<div>
			<h1>DataGrid</h1>
			<div className='flex gap-2 flex-col'>
				<Link href='/sandbox/data-grid/shadcn'>Shadcn</Link>
				<Link href='/sandbox/data-grid/heroui'>HeroUI</Link>
				<Link href='/sandbox/data-grid/react'>React</Link>
			</div>
		</div>
	)
}
