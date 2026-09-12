'use client'

import { createColumns } from '@ez-kit/data-grid-react'
import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { makeUsers } from './_data'

import type { User } from './_data'
import type { PartialGridMessages } from '@ez-kit/data-grid-react'

const columns = createColumns<User>([
	{ accessorKey: 'name', header: 'Имя', filtering: { operators: true } },
	{ accessorKey: 'email', header: 'Почта' },
	{ accessorKey: 'age', header: 'Возраст', align: 'end', cell: { type: 'number' }, filtering: { operators: true } },
])

const PLURAL_RULES = new Intl.PluralRules('ru-RU')

/** `1 строка` / `2 строки` / `5 строк` — the rule is the language's, so the dictionary owns it. */
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

/**
 * A dictionary is a plain object: state the entries this grid shows, leave the rest English.
 * Nothing here is a special syntax — the parameterized entries are ordinary functions, which is
 * why `Intl.PluralRules` plugs straight in.
 */
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
		pinLeft: 'Закрепить слева',
		pinRight: 'Закрепить справа',
		unpin: 'Открепить',
		hide: 'Скрыть',
	},
	filtering: {
		placeholder: ({ columnId }) => `Фильтр: ${columnId}`,
		operator: 'Оператор фильтра',
		clearAll: 'Сбросить фильтры',
		trigger: 'Фильтр',
	},
	operators: {
		text: {
			contains: 'Содержит',
			equals: 'Равно',
			notEquals: 'Не равно',
			startsWith: 'Начинается с',
			endsWith: 'Заканчивается на',
		},
		number: {
			equals: 'Равно',
			notEquals: 'Не равно',
			greaterThan: 'Больше',
			greaterOrEqual: 'Больше или равно',
			lessThan: 'Меньше',
			lessOrEqual: 'Меньше или равно',
			between: 'В диапазоне',
		},
		empty: { isEmpty: 'Пусто', isNotEmpty: 'Не пусто' },
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
			data={data}
			columns={columns}
			messages={ru}
			selection
			filtering
			globalFiltering
			visibility
			pagination={{ pageSize: 5 }}
		/>
	)
}
