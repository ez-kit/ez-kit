'use client'

import { Button as HeroButton } from '@heroui/react'
import * as React from 'react'
import * as ReactDOM from 'react-dom'

import { useAsRef } from '../../hooks/use-as-ref'
import { useIsomorphicLayoutEffect } from '../../hooks/use-isomorphic-layout-effect'
import { useComposedRefs } from '../../lib/compose-refs'

const ROOT_NAME = 'ActionBar'
const GROUP_NAME = 'ActionBarGroup'
const ITEM_NAME = 'ActionBarItem'
const CLOSE_NAME = 'ActionBarClose'
const SEPARATOR_NAME = 'ActionBarSeparator'
const ITEM_SELECT = 'actionbar.itemSelect'
const ENTRY_FOCUS = 'actionbarFocusGroup.onEntryFocus'
const EVENT_OPTIONS = { bubbles: false, cancelable: true }

type Direction = 'ltr' | 'rtl'
type Orientation = 'horizontal' | 'vertical'

type HeroButtonProps = React.ComponentProps<typeof HeroButton>
type HeroPressEvent = Parameters<NonNullable<HeroButtonProps['onPress']>>[0]

type RootElement = HTMLDivElement
type ItemElement = HTMLButtonElement
type CloseElement = HTMLButtonElement

function focusFirst(candidates: React.RefObject<HTMLElement | null>[], preventScroll = false) {
	const PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement
	for (const candidateRef of candidates) {
		const candidate = candidateRef.current
		if (!candidate) continue
		if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return
		candidate.focus({ preventScroll })
		if (document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT) return
	}
}

function wrapArray<T>(array: T[], startIndex: number) {
	return array.map<T>((_, index) => array[(startIndex + index) % array.length] as T)
}

function getDirectionAwareKey(key: string, dir?: Direction) {
	if (dir !== 'rtl') return key
	return key === 'ArrowLeft' ? 'ArrowRight' : key === 'ArrowRight' ? 'ArrowLeft' : key
}

type ItemData = {
	id: string
	ref: React.RefObject<ItemElement | null>
	disabled: boolean
}

type ActionBarContextValue = {
	onOpenChange?: (open: boolean) => void
	dir: Direction
	orientation: Orientation
	loop: boolean
}

const ActionBarContext = React.createContext<ActionBarContextValue | null>(null)

function useActionBarContext(consumerName: string) {
	const context = React.useContext(ActionBarContext)
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``)
	}
	return context
}

type FocusContextValue = {
	tabStopId: string | null
	onItemFocus: (tabStopId: string) => void
	onItemShiftTab: () => void
	onFocusableItemAdd: () => void
	onFocusableItemRemove: () => void
	onItemRegister: (item: ItemData) => void
	onItemUnregister: (id: string) => void
	getItems: () => ItemData[]
}

const FocusContext = React.createContext<FocusContextValue | null>(null)

function useFocusContext(consumerName: string) {
	const context = React.useContext(FocusContext)
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`FocusProvider\``)
	}
	return context
}

type DivProps = React.ComponentProps<'div'>

type ActionBarProps = {
	open?: boolean
	onOpenChange?: (open: boolean) => void
	onEscapeKeyDown?: (event: KeyboardEvent) => void
	align?: 'start' | 'center' | 'end'
	alignOffset?: number
	side?: 'top' | 'bottom'
	sideOffset?: number
	portalContainer?: Element | DocumentFragment | null
	dir?: Direction
	orientation?: Orientation
	loop?: boolean
} & DivProps

function subscribeToMountedStore() {
	return () => {}
}

function getClientMountedSnapshot() {
	return true
}

function getServerMountedSnapshot() {
	return false
}

function ActionBar(props: ActionBarProps) {
	const {
		open = false,
		onOpenChange,
		onEscapeKeyDown,
		side = 'bottom',
		alignOffset = 0,
		align = 'center',
		sideOffset = 16,
		portalContainer: portalContainerProp,
		dir = 'ltr',
		orientation = 'horizontal',
		loop = true,
		style,
		ref,
		...rootProps
	} = props

	const mounted = React.useSyncExternalStore(
		subscribeToMountedStore,
		getClientMountedSnapshot,
		getServerMountedSnapshot,
	)

	const rootRef = React.useRef<RootElement>(null)
	const composedRef = useComposedRefs(ref, rootRef)

	const propsRef = useAsRef({
		onEscapeKeyDown,
		onOpenChange,
	})

	React.useEffect(() => {
		if (!open) return

		const ownerDocument = rootRef.current?.ownerDocument ?? document

		function onKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				propsRef.current.onEscapeKeyDown?.(event)
				if (!event.defaultPrevented) {
					propsRef.current.onOpenChange?.(false)
				}
			}
		}

		ownerDocument.addEventListener('keydown', onKeyDown)
		return () => {
			ownerDocument.removeEventListener('keydown', onKeyDown)
		}
	}, [open, propsRef])

	const contextValue = React.useMemo<ActionBarContextValue>(
		() => ({
			...(onOpenChange !== undefined ? { onOpenChange } : {}),
			dir,
			orientation,
			loop,
		}),
		[onOpenChange, dir, orientation, loop],
	)

	const portalContainer = portalContainerProp ?? (mounted ? globalThis.document.body : null)

	if (!portalContainer || !open) return null

	const isHorizontal = orientation === 'horizontal'

	const rootClassName = [
		'fixed',
		'z-50',
		'flex',
		isHorizontal ? 'flex-row items-center gap-2 py-1.5 px-2' : 'flex-col items-start gap-2 px-1.5 py-2',
		'rounded-[var(--heroui-radius-large,12px)]',
		'text-[hsl(var(--heroui-foreground))]',
		'border',
		'border-solid',
		'border-[hsl(var(--heroui-divider))]',
		'shadow-[0_10px_15px_-3px_rgb(0_0_0_/_0.1),0_4px_6px_-4px_rgb(0_0_0_/_0.1)]',
		'outline-none',
		rootProps?.className,
	]
		.filter(Boolean)
		.join(' ')

	const rootStyle: React.CSSProperties = {
		[side]: `${String(sideOffset)}px`,
		...(align === 'center' && {
			left: '50%',
			translate: '-50% 0',
		}),
		...(align === 'start' && { left: `${String(alignOffset)}px` }),
		...(align === 'end' && { right: `${String(alignOffset)}px` }),
		...style,
	}

	return (
		<ActionBarContext.Provider value={contextValue}>
			{ReactDOM.createPortal(
				<div
					role='toolbar'
					aria-orientation={orientation}
					data-slot='action-bar'
					data-state='open'
					data-side={side}
					data-align={align}
					data-orientation={orientation}
					dir={dir}
					{...rootProps}
					ref={composedRef}
					className={rootClassName}
					style={rootStyle}
				/>,
				portalContainer,
			)}
		</ActionBarContext.Provider>
	)
}

function ActionBarSelection(props: DivProps) {
	const { style, ...selectionProps } = props

	return (
		<div
			data-slot='action-bar-selection'
			{...selectionProps}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: '0.25rem',
				borderRadius: 'var(--heroui-radius-small, 6px)',
				border: '1px solid hsl(var(--heroui-divider))',
				padding: '0.25rem 0.5rem',
				fontWeight: 500,
				fontSize: '0.875rem',
				fontVariantNumeric: 'tabular-nums',
				...style,
			}}
		/>
	)
}

function ActionBarGroup(props: DivProps) {
	const { onBlur: onBlurProp, onFocus: onFocusProp, onMouseDown: onMouseDownProp, style, ref, ...groupProps } = props

	const [tabStopId, setTabStopId] = React.useState<string | null>(null)
	const [isTabbingBackOut, setIsTabbingBackOut] = React.useState(false)
	const [focusableItemCount, setFocusableItemCount] = React.useState(0)

	const groupRef = React.useRef<HTMLDivElement>(null)
	const composedRef = useComposedRefs(ref, groupRef)
	const isClickFocusRef = React.useRef(false)
	const itemsRef = React.useRef(new Map<string, ItemData>())

	const { dir, orientation } = useActionBarContext(GROUP_NAME)

	const onItemFocus = React.useCallback((nextTabStopId: string) => {
		setTabStopId(nextTabStopId)
	}, [])

	const onItemShiftTab = React.useCallback(() => {
		setIsTabbingBackOut(true)
	}, [])

	const onFocusableItemAdd = React.useCallback(() => {
		setFocusableItemCount((prevCount) => prevCount + 1)
	}, [])

	const onFocusableItemRemove = React.useCallback(() => {
		setFocusableItemCount((prevCount) => prevCount - 1)
	}, [])

	const onItemRegister = React.useCallback((item: ItemData) => {
		itemsRef.current.set(item.id, item)
	}, [])

	const onItemUnregister = React.useCallback((id: string) => {
		itemsRef.current.delete(id)
	}, [])

	const getItems = React.useCallback(() => {
		return Array.from(itemsRef.current.values())
			.filter((item) => item.ref.current)
			.sort((a, b) => {
				const elementA = a.ref.current
				const elementB = b.ref.current
				if (!elementA || !elementB) return 0
				const position = elementA.compareDocumentPosition(elementB)
				if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
					return -1
				}
				if (position & Node.DOCUMENT_POSITION_PRECEDING) {
					return 1
				}
				return 0
			})
	}, [])

	const onBlur = React.useCallback(
		(event: React.FocusEvent<HTMLDivElement>) => {
			onBlurProp?.(event)
			if (event.defaultPrevented) return

			setIsTabbingBackOut(false)
		},
		[onBlurProp],
	)

	const onFocus = React.useCallback(
		(event: React.FocusEvent<HTMLDivElement>) => {
			onFocusProp?.(event)
			if (event.defaultPrevented) return

			const isKeyboardFocus = !isClickFocusRef.current
			if (event.target === event.currentTarget && isKeyboardFocus && !isTabbingBackOut) {
				const entryFocusEvent = new CustomEvent(ENTRY_FOCUS, EVENT_OPTIONS)
				event.currentTarget.dispatchEvent(entryFocusEvent)

				if (!entryFocusEvent.defaultPrevented) {
					const items = Array.from(itemsRef.current.values()).filter((item) => !item.disabled)
					const currentItem = items.find((item) => item.id === tabStopId)

					const candidateItems = [currentItem, ...items].filter(Boolean) as ItemData[]
					const candidateRefs = candidateItems.map((item) => item.ref)
					focusFirst(candidateRefs, false)
				}
			}
			isClickFocusRef.current = false
		},
		[onFocusProp, isTabbingBackOut, tabStopId],
	)

	const onMouseDown = React.useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			onMouseDownProp?.(event)
			if (event.defaultPrevented) return

			isClickFocusRef.current = true
		},
		[onMouseDownProp],
	)

	const focusContextValue = React.useMemo<FocusContextValue>(
		() => ({
			tabStopId,
			onItemFocus,
			onItemShiftTab,
			onFocusableItemAdd,
			onFocusableItemRemove,
			onItemRegister,
			onItemUnregister,
			getItems,
		}),
		[
			tabStopId,
			onItemFocus,
			onItemShiftTab,
			onFocusableItemAdd,
			onFocusableItemRemove,
			onItemRegister,
			onItemUnregister,
			getItems,
		],
	)

	const isHorizontal = orientation === 'horizontal'

	return (
		<FocusContext.Provider value={focusContextValue}>
			{/* The roving-tabindex container needs DOM event listeners on a non-interactive role; */}
			{/* this matches the Radix Toolbar primitive pattern. */}
			{/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
			<div
				role='group'
				data-slot='action-bar-group'
				data-orientation={orientation}
				dir={dir}
				tabIndex={isTabbingBackOut || focusableItemCount === 0 ? -1 : 0}
				{...groupProps}
				ref={composedRef}
				style={{
					display: 'flex',
					flexDirection: isHorizontal ? 'row' : 'column',
					alignItems: isHorizontal ? 'center' : 'flex-start',
					width: isHorizontal ? undefined : '100%',
					gap: '0.5rem',
					outline: 'none',
					...style,
				}}
				onBlur={onBlur}
				onFocus={onFocus}
				onMouseDown={onMouseDown}
			/>
		</FocusContext.Provider>
	)
}

type ActionBarItemProps = {
	onSelect?: (event: Event) => void
} & Omit<HeroButtonProps, 'onSelect'>

function ActionBarItem(props: ActionBarItemProps) {
	const {
		onSelect,
		onPress: onPressProp,
		onFocus: onFocusProp,
		onKeyDown: onKeyDownProp,
		onMouseDown: onMouseDownProp,
		isDisabled,
		ref,
		...itemProps
	} = props

	const itemRef = React.useRef<ItemElement>(null)
	const composedRef = useComposedRefs(ref, itemRef)
	const isMouseClickRef = React.useRef(false)

	const { onOpenChange, dir, orientation, loop } = useActionBarContext(ITEM_NAME)
	const focusContext = useFocusContext(ITEM_NAME)

	const itemId = React.useId()
	const isTabStop = focusContext.tabStopId === itemId
	const disabled = !!isDisabled

	useIsomorphicLayoutEffect(() => {
		focusContext.onItemRegister({
			id: itemId,
			ref: itemRef,
			disabled,
		})

		if (!disabled) {
			focusContext.onFocusableItemAdd()
		}

		return () => {
			focusContext.onItemUnregister(itemId)
			if (!disabled) {
				focusContext.onFocusableItemRemove()
			}
		}
	}, [focusContext, itemId, disabled])

	const onPress = React.useCallback(
		(event: HeroPressEvent) => {
			onPressProp?.(event)

			const item = itemRef.current
			if (!item) return

			const itemSelectEvent = new CustomEvent(ITEM_SELECT, {
				bubbles: true,
				cancelable: true,
			})

			item.addEventListener(ITEM_SELECT, (selectEvent) => onSelect?.(selectEvent), {
				once: true,
			})

			item.dispatchEvent(itemSelectEvent)

			if (!itemSelectEvent.defaultPrevented) {
				onOpenChange?.(false)
			}
		},
		[onPressProp, onOpenChange, onSelect],
	)

	const onFocus = React.useCallback(
		(event: React.FocusEvent<ItemElement>) => {
			onFocusProp?.(event)
			if (event.defaultPrevented) return

			focusContext.onItemFocus(itemId)
			isMouseClickRef.current = false
		},
		[onFocusProp, focusContext, itemId],
	)

	const onKeyDown = React.useCallback(
		(event: React.KeyboardEvent<ItemElement>) => {
			// HeroUI's onKeyDown is typed as a React Aria BaseEvent (with `continuePropagation`).
			// Our handler receives the underlying React.KeyboardEvent — widen via `unknown` so we
			// can still forward to the user's prop without losing TS strictness elsewhere.
			onKeyDownProp?.(event as unknown as Parameters<NonNullable<HeroButtonProps['onKeyDown']>>[0])
			if (event.defaultPrevented) return

			if (event.key === 'Tab' && event.shiftKey) {
				focusContext.onItemShiftTab()
				return
			}

			if (event.target !== event.currentTarget) return

			const key = getDirectionAwareKey(event.key, dir)
			let focusIntent: 'first' | 'last' | 'prev' | 'next' | undefined

			if (orientation === 'horizontal') {
				if (key === 'ArrowLeft') focusIntent = 'prev'
				else if (key === 'ArrowRight') focusIntent = 'next'
				else if (key === 'Home') focusIntent = 'first'
				else if (key === 'End') focusIntent = 'last'
			} else {
				if (key === 'ArrowUp') focusIntent = 'prev'
				else if (key === 'ArrowDown') focusIntent = 'next'
				else if (key === 'Home') focusIntent = 'first'
				else if (key === 'End') focusIntent = 'last'
			}

			if (focusIntent !== undefined) {
				if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
				event.preventDefault()

				const items = focusContext.getItems().filter((item) => !item.disabled)
				let candidateRefs = items.map((item) => item.ref)

				if (focusIntent === 'last') {
					candidateRefs.reverse()
				} else if (focusIntent === 'prev' || focusIntent === 'next') {
					if (focusIntent === 'prev') candidateRefs.reverse()
					const currentIndex = candidateRefs.findIndex((candidateRef) => candidateRef.current === event.currentTarget)
					candidateRefs = loop ? wrapArray(candidateRefs, currentIndex + 1) : candidateRefs.slice(currentIndex + 1)
				}

				queueMicrotask(() => {
					focusFirst(candidateRefs)
				})
			}
		},
		[onKeyDownProp, focusContext, dir, orientation, loop],
	)

	const onMouseDown = React.useCallback(
		(event: React.MouseEvent<ItemElement>) => {
			onMouseDownProp?.(event)
			if (event.defaultPrevented) return

			isMouseClickRef.current = true

			if (disabled) {
				event.preventDefault()
			} else {
				focusContext.onItemFocus(itemId)
			}
		},
		[onMouseDownProp, focusContext, itemId, disabled],
	)

	// HeroUI Button uses React Aria's wrapped event types (with `continuePropagation`),
	// so the standard React.FocusEvent / KeyboardEvent / MouseEvent we use internally
	// must be widened through `unknown`. The lint rule does not see the underlying mismatch.
	/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
	return (
		<HeroButton
			type='button'
			data-slot='action-bar-item'
			size='sm'
			variant='secondary'
			{...itemProps}
			isDisabled={disabled}
			excludeFromTabOrder={!isTabStop}
			ref={composedRef}
			{...(orientation === 'vertical' ? { style: { width: '100%' } } : {})}
			onPress={onPress}
			onFocus={onFocus as unknown as NonNullable<HeroButtonProps['onFocus']>}
			onKeyDown={onKeyDown as unknown as NonNullable<HeroButtonProps['onKeyDown']>}
			onMouseDown={onMouseDown as unknown as NonNullable<HeroButtonProps['onMouseDown']>}
		/>
	)
	/* eslint-enable @typescript-eslint/no-unnecessary-type-assertion */
}

type ActionBarCloseProps = React.ComponentProps<'button'>

function ActionBarClose(props: ActionBarCloseProps) {
	const { style, onClick, ...closeProps } = props

	const { onOpenChange } = useActionBarContext(CLOSE_NAME)

	const onCloseClick = React.useCallback(
		(event: React.MouseEvent<CloseElement>) => {
			onClick?.(event)
			if (event.defaultPrevented) return

			onOpenChange?.(false)
		},
		[onOpenChange, onClick],
	)

	return (
		<button
			type='button'
			data-slot='action-bar-close'
			{...closeProps}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: 'transparent',
				border: 'none',
				borderRadius: 'var(--heroui-radius-small, 6px)',
				opacity: 0.7,
				outline: 'none',
				cursor: 'pointer',
				color: 'inherit',
				padding: '0.25rem',
				...style,
			}}
			onClick={onCloseClick}
		/>
	)
}

type ActionBarSeparatorProps = {
	orientation?: Orientation
} & DivProps

function ActionBarSeparator(props: ActionBarSeparatorProps) {
	const { orientation: orientationProp, style, ...separatorProps } = props

	const context = useActionBarContext(SEPARATOR_NAME)
	const orientation = orientationProp ?? context.orientation

	const isHorizontalBar = orientation === 'horizontal'

	return (
		<div
			role='separator'
			aria-orientation={orientation}
			aria-hidden='true'
			data-slot='action-bar-separator'
			{...separatorProps}
			style={{
				background: 'hsl(var(--heroui-divider))',
				height: isHorizontalBar ? '1.5rem' : '1px',
				width: isHorizontalBar ? '1px' : '100%',
				flexShrink: 0,
				...style,
			}}
		/>
	)
}

export {
	ActionBar,
	ActionBarClose,
	ActionBarGroup,
	ActionBarItem,
	type ActionBarProps,
	ActionBarSelection,
	ActionBarSeparator,
}
