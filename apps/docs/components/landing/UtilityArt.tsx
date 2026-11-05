type ArtKind = 'state' | 'query' | 'styling'

export function UtilityArt({ kind }: { kind: ArtKind }) {
	return (
		<svg
			aria-hidden='true'
			viewBox='0 0 320 150'
			className='h-36 w-full text-violet-600 dark:text-violet-400'
		>
			<defs>
				<linearGradient
					id={`gradient-${kind}`}
					x1='0'
					x2='1'
					y1='0'
					y2='1'
				>
					<stop stopColor='#ede9fe' />
					<stop
						offset='1'
						stopColor='#fff7ed'
					/>
				</linearGradient>
			</defs>
			<rect
				x='1'
				y='1'
				width='318'
				height='148'
				rx='18'
				fill={`url(#gradient-${kind})`}
				opacity='.65'
			/>
			{kind === 'state' && (
				<g
					fill='none'
					stroke='currentColor'
					strokeWidth='1.5'
				>
					<path
						d='M82 76h44m68 0h44M160 47v-13m0 84v-13'
						strokeDasharray='3 5'
					/>
					<rect
						x='126'
						y='47'
						width='68'
						height='58'
						rx='13'
						fill='#fff'
					/>
					<rect
						x='42'
						y='58'
						width='40'
						height='36'
						rx='10'
						fill='#fff'
					/>
					<rect
						x='238'
						y='58'
						width='40'
						height='36'
						rx='10'
						fill='#fff'
					/>
					<path
						d='M145 67h30m-30 9h22m-22 9h26M55 70h14m-14 8h10m182-8h14m-14 8h10'
						strokeLinecap='round'
					/>
					<circle
						cx='160'
						cy='28'
						r='5'
						fill='#c4b5fd'
					/>
					<circle
						cx='160'
						cy='124'
						r='5'
						fill='#fdba74'
					/>
				</g>
			)}
			{kind === 'query' && (
				<g
					fill='none'
					stroke='currentColor'
					strokeWidth='1.5'
				>
					<rect
						x='52'
						y='35'
						width='216'
						height='82'
						rx='14'
						fill='#fff'
					/>
					<path
						d='M68 57h82m-82 13h54m-54 13h70'
						stroke='#c4b5fd'
						strokeWidth='5'
						strokeLinecap='round'
					/>
					<path
						d='M170 87l20-17 16 9 25-28'
						strokeWidth='2.5'
						strokeLinecap='round'
						strokeLinejoin='round'
					/>
					<circle
						cx='231'
						cy='51'
						r='5'
						fill='#a78bfa'
					/>
					<path
						d='M69 101h34'
						stroke='#fb923c'
						strokeWidth='3'
						strokeLinecap='round'
					/>
				</g>
			)}
			{kind === 'styling' && (
				<g
					fill='none'
					stroke='currentColor'
					strokeWidth='1.5'
				>
					<rect
						x='76'
						y='35'
						width='168'
						height='82'
						rx='14'
						fill='#fff'
					/>
					<path
						d='M76 61h168'
						stroke='#ddd6fe'
					/>
					<circle
						cx='92'
						cy='48'
						r='3'
						fill='#a78bfa'
						stroke='none'
					/>
					<circle
						cx='102'
						cy='48'
						r='3'
						fill='#fdba74'
						stroke='none'
					/>
					<rect
						x='92'
						y='76'
						width='69'
						height='22'
						rx='11'
						fill='#7c3aed'
						stroke='none'
					/>
					<rect
						x='171'
						y='76'
						width='57'
						height='22'
						rx='11'
						fill='#f3e8ff'
						stroke='none'
					/>
					<path
						d='M111 87h31m44 0h26'
						strokeWidth='3'
						strokeLinecap='round'
						stroke='#fff'
					/>
					<path
						d='M186 87h26'
						stroke='#a78bfa'
						strokeWidth='3'
						strokeLinecap='round'
					/>
				</g>
			)}
		</svg>
	)
}
