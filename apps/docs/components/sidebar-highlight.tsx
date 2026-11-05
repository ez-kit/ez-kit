'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type Highlight = {
	host: HTMLElement
	x: number
	y: number
	width: number
	height: number
	visible: boolean
}

/** A decorative layer over Fumadocs' existing sidebar tree; it never handles clicks or focus. */
export function SidebarHighlight() {
	const [highlight, setHighlight] = useState<Highlight | null>(null)
	const reducedMotion = useReducedMotion()

	useEffect(() => {
		let target: HTMLElement | null = null
		let fadeTimer: number | undefined

		function findItem(node: EventTarget | null): HTMLElement | null {
			if (!(node instanceof Element)) return null
			const item = node.closest('a, button')
			if (!(item instanceof HTMLElement)) return null
			const viewport = item.closest('[data-radix-scroll-area-viewport]')
			if (!viewport?.closest('#nd-sidebar, #nd-sidebar-mobile')) return null
			if (item.matches(':disabled, [aria-disabled="true"]')) return null
			return item
		}

		function moveTo(item: HTMLElement) {
			const viewport = item.closest('[data-radix-scroll-area-viewport]')
			const host = viewport?.parentElement
			if (!(host instanceof HTMLElement) || !item.isConnected) return
			const box = item.getBoundingClientRect()
			const bounds = host.getBoundingClientRect()
			setHighlight({
				host,
				x: box.left - bounds.left,
				y: box.top - bounds.top,
				width: box.width,
				height: box.height,
				visible: true,
			})
		}

		function onPointerOver(event: PointerEvent) {
			if (event.pointerType === 'touch' || !window.matchMedia('(hover: hover)').matches) return
			const item = findItem(event.target)
			if (!item) return
			window.clearTimeout(fadeTimer)
			target = item
			moveTo(item)
		}

		function onPointerOut(event: PointerEvent) {
			if (!target || !findItem(event.target)) return
			if (findItem(event.relatedTarget)) return
			window.clearTimeout(fadeTimer)
			fadeTimer = window.setTimeout(() => {
				target = null
				setHighlight((previous) => (previous ? { ...previous, visible: false } : previous))
			}, 100)
		}

		function onLayoutChange() {
			if (target?.isConnected) moveTo(target)
			else if (target) {
				target = null
				setHighlight((previous) => (previous ? { ...previous, visible: false } : previous))
			}
		}

		document.addEventListener('pointerover', onPointerOver)
		document.addEventListener('pointerout', onPointerOut)
		window.addEventListener('scroll', onLayoutChange, true)
		window.addEventListener('resize', onLayoutChange)
		return () => {
			window.clearTimeout(fadeTimer)
			document.removeEventListener('pointerover', onPointerOver)
			document.removeEventListener('pointerout', onPointerOut)
			window.removeEventListener('scroll', onLayoutChange, true)
			window.removeEventListener('resize', onLayoutChange)
		}
	}, [])

	if (!highlight) return null
	return createPortal(
		<motion.div
			aria-hidden='true'
			data-sidebar-highlight=''
			className='pointer-events-none absolute top-0 left-0 z-0 rounded-lg bg-black/[0.045] dark:bg-white/[0.08]'
			initial={{ x: highlight.x, y: highlight.y, width: highlight.width, height: highlight.height, opacity: 0 }}
			animate={{
				x: highlight.x,
				y: highlight.y,
				width: highlight.width,
				height: highlight.height,
				opacity: highlight.visible ? 1 : 0,
			}}
			transition={
				reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40, opacity: { duration: 0.16 } }
			}
		/>,
		highlight.host,
	)
}
