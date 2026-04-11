Нужно улучшить использование колонок в создании data-grid в пакетах @packages/data-grid/core/src @packages/data-grid/react/react/src.

Сейчас идут хардкодные проверки в таких файлах как @packages/data-grid/react/react/src/data-grid/cell.tsx Здесь плохо, что инпуты используются напрямую. У нас должен быть использован dependency injection. Чтобы любые инпуты настраивались гибко из вне.
Разберем пример с cell. Компонент может быть в режиме простого отображения и он просто рендерит TD и контент внутри него, который может быть либо иметь какой-то из предопределенных типов, либо эти типы можем расширять из вне.
у нас есть пример в файле @apps/docs/app/sandbox/data-grid/page.tsx и у нас колонки могут задавать с помощь. `cell: {type: 'number'}`, а так же хочу, чтобы можно было сразу использовать кастомный компонент при помощи поля `component`, то есть `cell: {component: () => ...}`
и такой функционал должен быть со всем - с редактированием, с добавлением колонок

то есть я могу использовать конфиг колонок

```
const columns = defineColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age', cell: { type: 'number' } },
	{ accessorKey: 'age', header: 'Age', cell: { component: () => <div>Custom Component</div> } },
	{ accessorKey: 'name', header: 'Age', filtering: { component: () => ... } },
	{ accessorKey: 'name2', header: 'Age', editing: { component: () => ... } },
	{ accessorKey: 'address', header: 'Age', creating: { component: () => ... } },
	{ accessorKey: 'active', header: 'Active', cell: { type: 'boolean' } },
])

```

и гибко настраивать рендер любой части.
так же я могу в хук `useDataGrid` кидать в пропсах проп для расширения дефолтных видов настроек, чтобы вот этот тип расширялся, и я мог использовать `cell: {type: 'my-custom-type}`. Это в хук я должен передавать какой-то объект с ключами стркоами, которые и являются потом индефикаторами для этого типа, а значение это:

- view - компонент для отрисовки данных
- edit - компонент служащий для отображения значений, когда включен режим редактирования
- creating - компонент для режима создания новой сущности

если мы передаем creating, то в edit должен по дефолту подставляться тот же самый компонент.
