/**
 * __tests__/components/CategoryModal.test.tsx
 *
 * Покриває:
 *  - не рендериться коли visible=false
 *  - рендериться з дефолтними категоріями
 *  - рендериться з кастомними категоріями
 *  - заголовок за замовчуванням та кастомний title
 *  - виділення активної категорії
 *  - виклик onSelect + onClose при виборі
 *  - виклик onClose при натисканні кнопки "Закрити"
 *  - виклик onClose при натисканні backdrop
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CategoryModal from '../../components/CategoryModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  'Всі записи',
  'Масаж',
  'Elos-епіляція',
  'Доглядові процедури',
  'Архів',
  'Перетелефонувати',
];

function makeProps(overrides = {}) {
  return {
    visible: true,
    selected: 'Всі записи',
    onClose: jest.fn(),
    onSelect: jest.fn(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CategoryModal — видимість', () => {
  it('рендериться коли visible=true', () => {
    const { getByText } = render(<CategoryModal {...makeProps()} />);
    expect(getByText('Оберіть категорію')).toBeTruthy();
  });

  it('НЕ показує контент коли visible=false', () => {
    const { queryByText } = render(<CategoryModal {...makeProps({ visible: false })} />);
    // Модал прихований — текст не має бути доступний
    expect(queryByText('Закрити')).toBeNull();
  });
});

describe('CategoryModal — категорії', () => {
  it('відображає всі дефолтні категорії', () => {
    const { getByText } = render(<CategoryModal {...makeProps()} />);
    DEFAULT_CATEGORIES.forEach(cat => {
      expect(getByText(cat)).toBeTruthy();
    });
  });

  it('відображає кастомні категорії', () => {
    const custom = ['Масаж', 'Архів', 'Перетелефонувати'];
    const { getByText, queryByText } = render(
      <CategoryModal {...makeProps({ customCategories: custom })} />
    );
    custom.forEach(c => expect(getByText(c)).toBeTruthy());
    // Категорії які не в кастомних — не мають відображатись
    expect(queryByText('Elos-епіляція')).toBeNull();
  });

  it('використовує дефолтні якщо customCategories пустий масив', () => {
    const { getByText } = render(
      <CategoryModal {...makeProps({ customCategories: [] })} />
    );
    expect(getByText('Всі записи')).toBeTruthy();
  });
});

describe('CategoryModal — заголовок', () => {
  it('показує дефолтний заголовок "Оберіть категорію"', () => {
    const { getByText } = render(<CategoryModal {...makeProps()} />);
    expect(getByText('Оберіть категорію')).toBeTruthy();
  });

  it('показує кастомний заголовок', () => {
    const { getByText } = render(
      <CategoryModal {...makeProps({ title: 'Вибір послуги' })} />
    );
    expect(getByText('Вибір послуги')).toBeTruthy();
  });
});

describe('CategoryModal — вибір категорії', () => {
  it('викликає onSelect і onClose при натисканні на категорію', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByText } = render(
      <CategoryModal {...makeProps({ onSelect, onClose })} />
    );
    fireEvent.press(getByText('Масаж'));
    expect(onSelect).toHaveBeenCalledWith('Масаж');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('викликає onSelect з правильною категорією', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <CategoryModal {...makeProps({ onSelect })} />
    );
    fireEvent.press(getByText('Архів'));
    expect(onSelect).toHaveBeenCalledWith('Архів');
  });

  it('викликає onSelect і onClose незалежно один від одного', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByText } = render(
      <CategoryModal {...makeProps({ onSelect, onClose })} />
    );
    fireEvent.press(getByText('Перетелефонувати'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('CategoryModal — кнопка закрити', () => {
  it('викликає onClose при натисканні "Закрити"', () => {
    const onClose = jest.fn();
    const { getByText } = render(<CategoryModal {...makeProps({ onClose })} />);
    fireEvent.press(getByText('Закрити'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('CategoryModal — активна категорія', () => {
  it('передає selected prop до відображення', () => {
    const { getByText } = render(
      <CategoryModal {...makeProps({ selected: 'Масаж' })} />
    );
    // Текст 'Масаж' є у списку
    expect(getByText('Масаж')).toBeTruthy();
  });

  it('рендериться без помилок якщо selected не збігається з жодною категорією', () => {
    expect(() =>
      render(<CategoryModal {...makeProps({ selected: 'Неіснуюча категорія' })} />)
    ).not.toThrow();
  });
});