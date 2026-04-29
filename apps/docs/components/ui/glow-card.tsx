import type { ReactNode } from 'react'

type GlowCardProps = {
	children: ReactNode
	className?: string
}

export function GlowCard({ children, className }: GlowCardProps) {
	return (
		<div
			className={`transition-all duration-200 hover:[box-shadow:0_0_0_1px_var(--mint-border),0_8px_28px_var(--mint-glow)] ${className ?? ''}`}
		>
			{children}
		</div>
	)
}
