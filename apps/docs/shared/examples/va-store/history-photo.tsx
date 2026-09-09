'use client'

import { useId } from 'react'

import { cn } from '@/lib/utils'

/** The knobs the picture exposes — and, in the example, the whole of the store's state. */
export type Adjustments = {
	brightness: number
	contrast: number
	saturate: number
}

export const NEUTRAL: Adjustments = { brightness: 100, contrast: 100, saturate: 100 }

export const CHANNELS = [
	{ key: 'brightness', label: 'Brightness' },
	{ key: 'contrast', label: 'Contrast' },
	{ key: 'saturate', label: 'Saturation' },
] as const

const toFilter = (a: Adjustments): string =>
	`brightness(${String(a.brightness)}%) contrast(${String(a.contrast)}%) saturate(${String(a.saturate)}%)`

/**
 * A stand-in for the photo being edited — inline SVG, so the example pulls in no assets. Decorative
 * unless given a `label`: every thumbnail sits inside a button that carries its own.
 */
export function Photo({
	adjustments,
	label,
	className,
}: {
	adjustments: Adjustments
	label?: string
	className?: string
}) {
	const skyId = useId()

	return (
		<svg
			viewBox='0 0 160 100'
			{...(label === undefined ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label })}
			className={cn('block h-full w-full', className)}
			style={{ filter: toFilter(adjustments) }}
		>
			<defs>
				<linearGradient
					id={skyId}
					x1='0'
					y1='0'
					x2='0'
					y2='1'
				>
					<stop
						offset='0%'
						stopColor='#1e3a8a'
					/>
					<stop
						offset='55%'
						stopColor='#f97316'
					/>
					<stop
						offset='100%'
						stopColor='#fcd34d'
					/>
				</linearGradient>
			</defs>
			<rect
				width='160'
				height='100'
				fill={`url(#${skyId})`}
			/>
			<circle
				cx='112'
				cy='58'
				r='14'
				fill='#fef3c7'
			/>
			<path
				d='M0 74 L38 46 L72 74 Z'
				fill='#0f766e'
			/>
			<path
				d='M52 78 L96 40 L160 78 Z'
				fill='#134e4a'
			/>
			<rect
				y='76'
				width='160'
				height='24'
				fill='#042f2e'
			/>
		</svg>
	)
}
