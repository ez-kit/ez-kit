# Spec Delta

## ADDED Requirements

### Requirement: Итоговая подсказка фильтра

Модель фильтра MUST отдавать `placeholder`: `filtering.placeholder` цели, а если она не задана,
имя фильтра из `messages.filtering.placeholder`. Это MUST быть то же значение, которое показывает
встроенный фильтр этой цели.

#### Scenario: Цель с подсказкой

- **WHEN** колонка `inn` объявлена с `filtering: { placeholder: '10 цифр', operators: true }`
- **THEN** модель её фильтра отдаёт `placeholder: '10 цифр'`

#### Scenario: Цель без подсказки

- **WHEN** колонка `email` с заголовком `Email` объявлена с `filtering: { operators: true }`, а
  словарь дефолтный
- **THEN** модель её фильтра отдаёт `placeholder: 'Filter Email…'`
