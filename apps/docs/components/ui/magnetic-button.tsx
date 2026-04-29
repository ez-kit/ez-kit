'use client'

import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useRef, type ReactNode } from 'react'

type MagneticButtonProps = {
	children: ReactNode
	className?: string
}

export function MagneticButton({ children, className }: MagneticButtonProps) {
	const ref = useRef<HTMLDivElement>(null)
	const x = useMotionValue(0)
	const y = useMotionValue(0)
	const springX = useSpring(x, { stiffness: 300, damping: 25 })
	const springY = useSpring(y, { stiffness: 300, damping: 25 })

	function onMouseMove(e: React.MouseEvent) {
		const el = ref.current
		if (!el) return
		const rect = el.getBoundingClientRect()
		x.set((e.clientX - (rect.left + rect.width / 2)) * 0.28)
		y.set((e.clientY - (rect.top + rect.height / 2)) * 0.28)
	}

	function onMouseLeave() {
		x.set(0)
		y.set(0)
	}

	return (
		<motion.div
			ref={ref}
			style={{ x: springX, y: springY }}
			onMouseMove={onMouseMove}
			onMouseLeave={onMouseLeave}
			className={className}
		>
			{children}
		</motion.div>
	)
}
