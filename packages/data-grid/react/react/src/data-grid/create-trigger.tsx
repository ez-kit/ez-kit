import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'

import { useGridComponents } from '../components-context'

import { useTableContext } from './table-context'

interface CreateTriggerProps {
  /**
   * When true, clones the single child element and injects onClick → startCreating.
   * When false (default), renders a <Button> from the component registry.
   */
  asChild?: boolean
  children?: ReactNode
}

/**
 * Button that opens the create form.
 * With `asChild`, injects onClick into the child element (Radix-style).
 */
export function CreateTrigger({ asChild, children }: CreateTriggerProps) {
  const table = useTableContext()
  const { Button } = useGridComponents()
  const handleClick = (): void => { table.startCreating(); }

  if (asChild && isValidElement(children)) {
    return cloneElement(children as ReactElement<{ onClick?: () => void }>, {
      onClick: handleClick,
    })
  }

  return <Button onClick={handleClick}>{children ?? '+ Add'}</Button>
}
