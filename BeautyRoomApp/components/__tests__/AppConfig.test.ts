/**
 * __tests__/constants/AppConfig.test.ts
 *
 * Покриває:
 *  - ALL_CATEGORIES, SERVICE_CATEGORIES
 *  - MASTER_NAMES
 *  - MENU_PERMISSIONS
 *  - FORM_PERMISSIONS
 *  - canAccess()
 */

import {
  ALL_CATEGORIES,
  SERVICE_CATEGORIES,
  MASTER_NAMES,
  MENU_PERMISSIONS,
  FORM_PERMISSIONS,
  canAccess,
} from '../../constants/AppConfig';

// ─── ALL_CATEGORIES ───────────────────────────────────────────────────────────

describe('ALL_CATEGORIES', () => {
  it('містить "Всі записи" першим елементом', () => {
    expect(ALL_CATEGORIES[0]).toBe('Всі записи');
  });

  it('містить усі обов\'язкові категорії', () => {
    const required = ['Масаж', 'Elos-епіляція', 'Доглядові процедури', 'Архів', 'Перетелефонувати'];
    required.forEach(cat => expect(ALL_CATEGORIES).toContain(cat));
  });

  it('містить "Прайс" та "Історія"', () => {
    expect(ALL_CATEGORIES).toContain('Прайс');
    expect(ALL_CATEGORIES).toContain('Історія');
  });

  it('є масивом рядків', () => {
    expect(Array.isArray(ALL_CATEGORIES)).toBe(true);
    ALL_CATEGORIES.forEach(c => expect(typeof c).toBe('string'));
  });
});

// ─── SERVICE_CATEGORIES ───────────────────────────────────────────────────────

describe('SERVICE_CATEGORIES', () => {
  it('містить рівно три сервісні категорії', () => {
    expect(SERVICE_CATEGORIES).toHaveLength(3);
  });

  it('містить Масаж, Elos-епіляція, Доглядові процедури', () => {
    expect(SERVICE_CATEGORIES).toEqual(
      expect.arrayContaining(['Масаж', 'Elos-епіляція', 'Доглядові процедури'])
    );
  });

  it('не містить "Архів" або "Перетелефонувати"', () => {
    expect(SERVICE_CATEGORIES).not.toContain('Архів');
    expect(SERVICE_CATEGORIES).not.toContain('Перетелефонувати');
  });
});

// ─── MASTER_NAMES ─────────────────────────────────────────────────────────────

describe('MASTER_NAMES', () => {
  it('повертає правильне ім\'я для кожного логіну', () => {
    expect(MASTER_NAMES['admin']).toBe('Ольга (Адмін)');
    expect(MASTER_NAMES['massage']).toBe('Анна');
    expect(MASTER_NAMES['epil']).toBe('Катерина');
    expect(MASTER_NAMES['care']).toBe('Євгенія');
  });

  it('містить "creator" та "pr"', () => {
    expect(MASTER_NAMES).toHaveProperty('creator');
    expect(MASTER_NAMES).toHaveProperty('pr');
  });

  it('повертає undefined для невідомого логіну', () => {
    expect(MASTER_NAMES['unknown_user']).toBeUndefined();
  });
});

// ─── MENU_PERMISSIONS ─────────────────────────────────────────────────────────

describe('MENU_PERMISSIONS', () => {
  it('масажист бачить лише Масаж, Архів, Перетелефонувати', () => {
    expect(MENU_PERMISSIONS['massage']).toEqual(['Масаж', 'Архів', 'Перетелефонувати']);
  });

  it('епіляційник бачить лише свою категорію + Архів + Перетелефонувати', () => {
    expect(MENU_PERMISSIONS['epil']).toEqual(['Elos-епіляція', 'Архів', 'Перетелефонувати']);
  });

  it('care-майстер бачить лише свою категорію', () => {
    expect(MENU_PERMISSIONS['care']).toContain('Доглядові процедури');
  });

  it('admin бачить усі категорії', () => {
    expect(MENU_PERMISSIONS['admin']).toEqual(ALL_CATEGORIES);
  });

  it('creator бачить усі категорії', () => {
    expect(MENU_PERMISSIONS['creator']).toEqual(ALL_CATEGORIES);
  });
});

// ─── FORM_PERMISSIONS ─────────────────────────────────────────────────────────

describe('FORM_PERMISSIONS', () => {
  it('масажист у формі бачить лише Масаж', () => {
    expect(FORM_PERMISSIONS['massage']).toEqual(['Масаж']);
  });

  it('epil у формі бачить лише Elos-епіляція', () => {
    expect(FORM_PERMISSIONS['epil']).toEqual(['Elos-епіляція']);
  });

  it('care у формі бачить лише Доглядові процедури', () => {
    expect(FORM_PERMISSIONS['care']).toEqual(['Доглядові процедури']);
  });

  it('немає дозволів для невідомого користувача', () => {
    expect(FORM_PERMISSIONS['ghost']).toBeUndefined();
  });
});

// ─── canAccess ────────────────────────────────────────────────────────────────

describe('canAccess()', () => {
  // creator — повний доступ
  describe('creator', () => {
    it('має доступ до будь-якої вкладки', () => {
      ALL_CATEGORIES.forEach(tab => {
        expect(canAccess(tab, 'creator')).toBe(true);
      });
    });
  });

  // admin — повний доступ (через ALL_CATEGORIES у MENU_PERMISSIONS)
  describe('admin', () => {
    it('має доступ до "Всі записи"', () => {
      expect(canAccess('Всі записи', 'admin')).toBe(true);
    });

    it('має доступ до "Архів"', () => {
      expect(canAccess('Архів', 'admin')).toBe(true);
    });

    it('має доступ до "Прайс"', () => {
      expect(canAccess('Прайс', 'admin')).toBe(true);
    });
  });

  // massage — обмежений доступ
  describe('massage', () => {
    it('має доступ до вкладки "Масаж"', () => {
      expect(canAccess('Масаж', 'massage')).toBe(true);
    });

    it('має доступ до "Архів"', () => {
      expect(canAccess('Архів', 'massage')).toBe(true);
    });

    it('має доступ до "Перетелефонувати"', () => {
      expect(canAccess('Перетелефонувати', 'massage')).toBe(true);
    });

    it('НЕ має доступу до "Elos-епіляція"', () => {
      expect(canAccess('Elos-епіляція', 'massage')).toBe(false);
    });

    it('НЕ має доступу до "Доглядові процедури"', () => {
      expect(canAccess('Доглядові процедури', 'massage')).toBe(false);
    });

    it('НЕ має доступу до "Всі записи"', () => {
      expect(canAccess('Всі записи', 'massage')).toBe(false);
    });
  });

  // epil
  describe('epil', () => {
    it('має доступ до "Elos-епіляція"', () => {
      expect(canAccess('Elos-епіляція', 'epil')).toBe(true);
    });

    it('НЕ має доступу до "Масаж"', () => {
      expect(canAccess('Масаж', 'epil')).toBe(false);
    });
  });

  // care
  describe('care', () => {
    it('має доступ до "Доглядові процедури"', () => {
      expect(canAccess('Доглядові процедури', 'care')).toBe(true);
    });

    it('НЕ має доступу до "Масаж"', () => {
      expect(canAccess('Масаж', 'care')).toBe(false);
    });
  });

  // невідомий користувач — fallback до ALL_CATEGORIES
  describe('невідомий користувач (fallback)', () => {
    it('має доступ до "Всі записи" (fallback = ALL_CATEGORIES)', () => {
      expect(canAccess('Всі записи', 'unknown')).toBe(true);
    });

    it('має доступ до "Архів" (fallback = ALL_CATEGORIES)', () => {
      expect(canAccess('Архів', 'unknown')).toBe(true);
    });
  });
});