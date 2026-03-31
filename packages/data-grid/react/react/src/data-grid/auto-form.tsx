
import { useGridComponents } from '../components-context'

import { useTableContext } from './table-context'

import type { ReactNode } from 'react'

interface AutoFormProps {
  mode: 'creating' | 'editing'
}

/**
 * Renders an auto-generated form for creating or editing a row.
 * Iterates over columns, renders the configured input or a default <Input>.
 */
export function AutoForm({ mode }: AutoFormProps): ReactNode {
  const table = useTableContext()
  const { Input } = useGridComponents()

  const values: Record<string, unknown> =
    mode === 'creating'
      ? table.getCreatingState().creatingValues
      : table.getEditingState().editingValues

  const setValue = (key: string, value: unknown): void => {
    if (mode === 'creating') {
      table.setCreatingValue(key, value)
    } else {
      table.setEditingValue(key, value)
    }
  }

  return (
    <div>
      {table.getAllColumns().map((col) => {
        const meta = col.columnDef.meta
        if (meta?.isSystemColumn) return null

        const colDef = mode === 'creating' ? meta?.creating : meta?.editing
        if (colDef === false) return null

        const customInput = colDef?.input as
          | ((props: {
              value: unknown
              onChange: (v: unknown) => void
            }) => ReactNode)
          | undefined

        const value = values[col.id]
        const onChange = (v: unknown): void => { setValue(col.id, v) }

        if (customInput) {
          return (
            <div key={col.id}>
              {customInput({ value, onChange })}
            </div>
          )
        }

        const inputType =
          meta?.cellType === 'number'
            ? 'number'
            : meta?.cellType === 'date'
              ? 'date'
              : meta?.cellType === 'boolean'
                ? 'checkbox'
                : 'text'

        return (
          <div key={col.id}>
            <label>{col.id}</label>
            <Input
              type={inputType}
              value={
                inputType === 'checkbox'
                  ? undefined
                  : ((value ?? '') as string | number | readonly string[])
              }
              checked={inputType === 'checkbox' ? Boolean(value) : undefined}
              onChange={(e) => {
                onChange(
                  inputType === 'checkbox'
                    ? e.target.checked
                    : inputType === 'number'
                      ? e.target.valueAsNumber
                      : e.target.value,
                )
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
