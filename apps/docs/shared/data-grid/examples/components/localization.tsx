'use client'

import {
	columnFilteringFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	filterFns,
	globalFilteringFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { defaultOperators } from '@ez-kit/data-grid-core/operators'
import { createColumns } from '@ez-kit/data-grid-react'
import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { makeUsers } from './_data'

import type { User } from './_data'
import type { FilterOperatorDef, OperatorsConfig } from '@ez-kit/data-grid-core'
import type { PartialGridMessages } from '@ez-kit/data-grid-react'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	columnFilteringFeature,
	filterFns,
	globalFilteringFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	sortFns,
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	sortedRowModel: createSortedRowModel(),
})

const columns = createColumns<User>([
	{ accessorKey: 'name', header: 'Имя', filtering: { operators: true } },
	{ accessorKey: 'email', header: 'Почта' },
	{ accessorKey: 'age', header: 'Возраст', align: 'end', cell: { type: 'number' }, filtering: { operators: true } },
])

const RU_OPERATOR_LABELS: Partial<Record<string, string>> = {
	contains: 'Содержит',
	equals: 'Равно',
	notEquals: 'Не равно',
	startsWith: 'Начинается с',
	endsWith: 'Заканчивается на',
	greaterThan: 'Больше',
	greaterOrEqual: 'Больше или равно',
	lessThan: 'Меньше',
	lessOrEqual: 'Меньше или равно',
	between: 'В диапазоне',
	isEmpty: 'Пусто',
	isNotEmpty: 'Не пусто',
}

function translated(set: FilterOperatorDef[]): FilterOperatorDef[] {
	return set.map((op) => ({ ...op, label: RU_OPERATOR_LABELS[op.id] ?? op.label }))
}

const ruOperators: OperatorsConfig = {
	byType: {
		text: translated(defaultOperators.byType.text),
		number: translated(defaultOperators.byType.number),
	},
}

const PLURAL_RULES = new Intl.PluralRules('ru-RU')

function rows(count: number): string {
	const forms: Record<Intl.LDMLPluralRule, string> = {
		one: 'строка',
		few: 'строки',
		many: 'строк',
		other: 'строки',
		zero: 'строк',
		two: 'строки',
	}
	return `${String(count)} ${forms[PLURAL_RULES.select(count)]}`
}

const ru: PartialGridMessages = {
	grid: { label: 'Таблица пользователей' },
	selection: {
		selectRow: 'Выбрать строку',
		selectAll: 'Выбрать все строки',
		clear: 'Снять выделение',
		count: ({ count }) => `Выбрано ${rows(count)}`,
	},
	columnMenu: {
		trigger: 'Меню столбца',
		sorting: 'Сортировка',
		sortAsc: 'По возрастанию',
		sortDesc: 'По убыванию',
		clearSort: 'Сбросить сортировку',
		pin: 'Закрепление',
		pinStart: 'Закрепить слева',
		pinEnd: 'Закрепить справа',
		unpin: 'Открепить',
		hide: 'Скрыть',
	},
	filtering: {
		placeholder: ({ columnId }) => `Фильтр: ${columnId}`,
		operator: 'Оператор фильтра',
		operatorTrigger: ({ label }) => `Оператор фильтра: ${label}`,
		clearAll: 'Сбросить фильтры',
		trigger: 'Фильтр',
	},
	globalFiltering: { placeholder: 'Поиск…', label: 'Поиск' },
	pagination: {
		navigation: 'Навигация по страницам',
		page: 'Страница',
		of: 'из',
		rowsPerPage: 'Строк на странице',
		first: 'В начало',
		last: 'В конец',
		previous: 'Назад',
		next: 'Вперёд',
	},
	visibility: { menu: 'Видимость столбцов', trigger: 'Столбцы' },
	sorting: { trigger: 'Сортировка' },
	fallbacks: { empty: 'Нет данных', noResults: 'Ничего не найдено' },
}

export function LocalizationExample() {
	const data = useMemo(() => makeUsers(24), [])

	return (
		<DataGrid
			features={features}
			data={data}
			columns={columns}
			messages={ru}
			operators={ruOperators}
			selection
			filtering
			globalFiltering
			visibility
			pagination={{ pageSize: 5 }}
		/>
	)
}
