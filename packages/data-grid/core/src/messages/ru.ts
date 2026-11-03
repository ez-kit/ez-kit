import type { GridMessages } from './types'

const pluralRules = /* @__PURE__ */ new Intl.PluralRules('ru')

/** The Russian form of a noun for `count` — `[one, few, many]`, as in `строка` / `строки` / `строк`. */
function plural(count: number, [one, few, many]: readonly [string, string, string]): string {
	const rule = pluralRules.select(count)
	if (rule === 'one') return one
	if (rule === 'few') return few
	return many
}

const ROWS = ['строка', 'строки', 'строк'] as const
const ROWS_ACCUSATIVE = ['строку', 'строки', 'строк'] as const

/**
 * The Russian dictionary.
 *
 * Typed as the whole {@link GridMessages} and written out entry by entry — never spread over the
 * English one — so a key added to the dictionary without a translation here is a type error in this
 * repository rather than an English string in a Russian grid.
 */
export const messages: GridMessages = {
	grid: {
		label: 'Таблица данных',
		rowCount: ({ count }) => `${String(count)} ${plural(count, ROWS)}`,
	},
	selection: {
		delete: 'Удалить',
		selectRow: 'Выбрать строку',
		selectAll: 'Выбрать все строки',
		clear: 'Снять выделение',
		count: ({ count }) => `Выбрано: ${String(count)}`,
		columnHeader: 'Выбор строк',
	},
	expanding: {
		expand: 'Развернуть строку',
		collapse: 'Свернуть строку',
		columnHeader: 'Раскрытие строк',
	},
	grouping: {
		count: ({ count }) => `(${String(count)})`,
		blank: '(Пусто)',
		columnHeader: 'Группа',
	},
	resizing: {
		resize: 'Изменить ширину колонки',
	},
	columnMenu: {
		trigger: 'Параметры колонки',
		sorting: 'Сортировка',
		sortAsc: 'По возрастанию',
		sortDesc: 'По убыванию',
		clearSort: 'Сбросить сортировку',
		pin: 'Закрепление',
		pinStart: 'Закрепить слева',
		pinEnd: 'Закрепить справа',
		unpin: 'Открепить',
		hide: 'Скрыть',
		order: 'Порядок',
		moveStart: 'Сдвинуть влево',
		moveEnd: 'Сдвинуть вправо',
		grouping: 'Группировка',
		groupBy: 'Группировать по этой колонке',
		ungroup: 'Разгруппировать',
	},
	groupBar: {
		label: 'Группировка по',
		remove: 'Убрать уровень группировки',
		moveOuter: 'Поднять уровень группировки',
		moveInner: 'Опустить уровень группировки',
		add: 'Добавить уровень группировки',
	},
	rowActions: {
		columnHeader: 'Действия со строкой',
		menu: 'Действия со строкой',
		pinning: 'Закрепление строки',
		edit: 'Изменить',
		delete: 'Удалить',
		pinTop: 'Закрепить сверху',
		pinBottom: 'Закрепить снизу',
		unpin: 'Открепить',
		order: 'Порядок',
		ordering: 'Порядок строк',
		moveUp: 'Переместить вверх',
		moveDown: 'Переместить вниз',
	},
	sorting: {
		menu: 'Сортировка колонок',
		direction: 'Направление сортировки',
		remove: 'Убрать сортировку',
		empty: 'Сортировка не задана. Добавьте её, чтобы упорядочить строки.',
		trigger: 'Сортировка',
		ascending: 'По возрастанию',
		descending: 'По убыванию',
		reset: 'Сбросить сортировку',
		sortBy: 'сортировать по',
		thenBy: 'затем по',
		add: 'Добавить сортировку',
		moveUp: ({ label }) => `Поднять сортировку по «${label}»`,
		moveDown: ({ label }) => `Опустить сортировку по «${label}»`,
		dragSort: ({ label }) => `Переместить сортировку по «${label}»`,
	},
	ordering: {
		dragRow: 'Переместить строку',
		dragColumn: 'Переместить колонку',
		columnHeader: 'Порядок строк',
		draggable: 'перетаскиваемый',
		instructions:
			'Нажмите пробел, чтобы взять элемент, затем стрелки, чтобы переместить его. Нажмите пробел ещё раз, чтобы отпустить, или Escape, чтобы отменить.',
		rowPickedUp: ({ position, total }) => `Строка ${String(position)} из ${String(total)} взята.`,
		rowMovedTo: ({ position, total }) => `Строка перемещена на позицию ${String(position)} из ${String(total)}.`,
		rowDropped: ({ position, total }) => `Строка помещена на позицию ${String(position)} из ${String(total)}.`,
		rowCancelled: ({ position, total }) =>
			`Отменено, строка вернулась на позицию ${String(position)} из ${String(total)}.`,
		columnPickedUp: ({ name, position, total }) =>
			`Колонка «${name}» взята, позиция ${String(position)} из ${String(total)}.`,
		columnMovedTo: ({ name, position, total }) =>
			`Колонка «${name}» перемещена на позицию ${String(position)} из ${String(total)}.`,
		columnDropped: ({ name, position, total }) =>
			`Колонка «${name}» помещена на позицию ${String(position)} из ${String(total)}.`,
		columnCancelled: ({ name, position, total }) =>
			`Отменено, колонка «${name}» вернулась на позицию ${String(position)} из ${String(total)}.`,
		sortPickedUp: ({ name, position, total }) =>
			`Сортировка по «${name}» взята, приоритет ${String(position)} из ${String(total)}.`,
		sortMovedTo: ({ name, position, total }) =>
			`Сортировка по «${name}» перемещена на приоритет ${String(position)} из ${String(total)}.`,
		sortDropped: ({ name, position, total }) =>
			`Сортировка по «${name}» помещена на приоритет ${String(position)} из ${String(total)}.`,
		sortCancelled: ({ name, position, total }) =>
			`Отменено, сортировка по «${name}» вернулась на приоритет ${String(position)} из ${String(total)}.`,
	},
	visibility: {
		menu: 'Видимость колонок',
		trigger: 'Колонки',
		moveStart: 'Переместить вверх',
		moveEnd: 'Переместить вниз',
	},
	filtering: {
		trigger: 'Фильтр',
		placeholder: ({ label }) => `Фильтр: ${label}…`,
		operator: 'Оператор фильтра',
		operatorTrigger: ({ label }) => `Оператор фильтра: ${label}`,
		any: 'Любое',
		clear: 'Очистить',
		clearAll: 'Сбросить фильтры',
		from: 'От',
		presets: {
			today: 'Сегодня',
			yesterday: 'Вчера',
			last7: 'Последние 7 дней',
			last30: 'Последние 30 дней',
			thisMonth: 'Этот месяц',
			lastMonth: 'Прошлый месяц',
			weekAgo: 'Неделю назад',
			monthAgo: 'Месяц назад',
			startOfMonth: 'Начало месяца',
		},
		to: 'До',
		range: 'Диапазон',
		dateRange: 'Диапазон дат',
		presetMenu: 'Быстрый выбор',
		search: 'Поиск…',
		noResults: 'Ничего не найдено',
		itemsError: 'Не удалось загрузить варианты.',
	},
	operators: {
		common: {
			contains: 'Содержит',
			startsWith: 'Начинается с',
			endsWith: 'Заканчивается на',
			equals: 'Равно',
			notEquals: 'Не равно',
			greaterThan: 'Больше',
			greaterOrEqual: 'Больше или равно',
			lessThan: 'Меньше',
			lessOrEqual: 'Меньше или равно',
			between: 'Между',
			in: 'Любое из',
			notIn: 'Ни одно из',
			isEmpty: 'Пусто',
			isNotEmpty: 'Не пусто',
		},
		date: {
			greaterThan: 'Позже',
			greaterOrEqual: 'Не раньше',
			lessThan: 'Раньше',
			lessOrEqual: 'Не позже',
		},
		boolean: {
			equals: 'Равно',
			notEquals: 'Не равно',
		},
	},
	globalFiltering: {
		placeholder: 'Поиск…',
		label: 'Поиск',
	},
	pagination: {
		navigation: 'Пагинация',
		page: 'Страница',
		of: 'из',
		rowsPerPage: 'Строк на странице',
		first: 'На первую страницу',
		last: 'На последнюю страницу',
		previous: 'Назад',
		next: 'Вперёд',
	},
	editing: {
		title: 'Редактирование',
	},
	creating: {
		title: 'Создание',
		trigger: '+ Добавить',
	},
	form: {
		save: 'Сохранить',
		cancel: 'Отмена',
	},
	deleting: {
		confirm: 'Удалить',
		cancel: 'Отмена',
		title: 'Вы уверены?',
		description: 'Это действие нельзя отменить.',
		bulkTitle: 'Удалить выбранные строки?',
		bulkDescription: ({ count }) =>
			`Удалить ${String(count)} ${plural(count, ROWS_ACCUSATIVE)}? Это действие нельзя отменить.`,
	},
	draft: {
		label: 'Не применено',
		pending: 'Неприменённые изменения',
		apply: 'Применить',
		reset: 'Сбросить',
		sorts: ({ count }) => `${String(count)} ${plural(count, ['сортировка', 'сортировки', 'сортировок'])}`,
		filters: ({ count }) => `${String(count)} ${plural(count, ['фильтр', 'фильтра', 'фильтров'])}`,
		search: 'поиск',
		summary: ({ label, parts }) => `${label}: ${parts.join(', ')}`,
	},
	cells: {
		all: 'Все',
		yes: 'Да',
		no: 'Нет',
		pickDate: 'Выберите дату',
		pickRange: 'Выберите период',
	},
	fallbacks: {
		loading: 'Загрузка',
		retry: 'Повторить',
		empty: 'Нет данных',
		noResults: 'Ничего не найдено',
		refreshing: 'Обновление',
		loadMore: 'Загрузить ещё',
		loadingMore: 'Загружаем ещё',
		loadMoreError: 'Не удалось загрузить ещё.',
	},
}
