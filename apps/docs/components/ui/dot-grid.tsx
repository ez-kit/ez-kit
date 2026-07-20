type DotGridProps = {
	className?: string
}

export function DotGrid({ className }: DotGridProps) {
	return (
		<div
			className={className}
			aria-hidden='true'
			style={{
				backgroundImage: 'radial-gradient(circle, rgba(128,128,128,0.18) 1px, transparent 1px)',
				backgroundSize: '28px 28px',
				maskImage: 'radial-gradient(ellipse 85% 75% at 50% 0%, black 30%, transparent 100%)',
				WebkitMaskImage: 'radial-gradient(ellipse 85% 75% at 50% 0%, black 30%, transparent 100%)',
			}}
		/>
	)
}
