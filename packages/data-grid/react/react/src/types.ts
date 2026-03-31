import type {
  ButtonHTMLAttributes,
  ComponentType,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react'

// ── primitive component props ─────────────────────────────────────────────

export type TableProps = HTMLAttributes<HTMLTableElement>
export type TheadProps = HTMLAttributes<HTMLTableSectionElement>
export type TbodyProps = HTMLAttributes<HTMLTableSectionElement>
export type TrProps = HTMLAttributes<HTMLTableRowElement>
export type ThProps = ThHTMLAttributes<HTMLTableCellElement>
export type TdProps = TdHTMLAttributes<HTMLTableCellElement>
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>
export type InputProps = InputHTMLAttributes<HTMLInputElement>

export interface CheckboxProps {
  checked?: boolean
  indeterminate?: boolean
  onChange?: (checked: boolean) => void
  'aria-label'?: string
}

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children?: ReactNode
}

export interface ToolbarProps {
  children?: ReactNode
}

export interface PaginationProps {
  pageIndex: number
  pageCount: number
  canPreviousPage: boolean
  canNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
  onFirstPage: () => void
  onLastPage: () => void
}

// ── DI registry ──────────────────────────────────────────────────────────

export interface GridComponents {
  // layout
  Table?: ComponentType<TableProps>
  Thead?: ComponentType<TheadProps>
  Tbody?: ComponentType<TbodyProps>
  Tr?: ComponentType<TrProps>
  Th?: ComponentType<ThProps>
  Td?: ComponentType<TdProps>
  // primitives
  Button?: ComponentType<ButtonProps>
  Input?: ComponentType<InputProps>
  Checkbox?: ComponentType<CheckboxProps>
  Modal?: ComponentType<ModalProps>
  // composite
  Toolbar?: ComponentType<ToolbarProps>
  Pagination?: ComponentType<PaginationProps>
}
