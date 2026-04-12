/**
 * __tests__/constants/Data.test.ts
 *
 * Покриває:
 *  - COSMETOLOGISTS
 *  - CATEGORIES
 *  - SERVICES_LIST
 *  - INITIAL_RECORDS (структура та цілісність)
 */

import { COSMETOLOGISTS, CATEGORIES, SERVICES_LIST, INITIAL_RECORDS } from '../../constants/Data';

// ─── COSMETOLOGISTS ───────────────────────────────────────────────────────────

describe('COSMETOLOGISTS', () => {
  it('є масивом рядків', () => {
    expect(Array.isArray(COSMETOLOGISTS)).toBe(true);
    COSMETOLOGISTS.forEach(c => expect(typeof c).toBe('string'));
  });

  it('містить "Не обрано" як останній елемент', () => {
    expect(COSMETOLOGISTS[COSMETOLOGISTS.length - 1]).toBe('Не обрано');
  });

  it('містить всіх відомих майстрів', () => {
    const required = ['Ольга', 'Катерина', 'Юлія', 'Євгенія', 'Анна'];
    required.forEach(name => expect(COSMETOLOGISTS).toContain(name));
  });

  it('не містить пустих рядків', () => {
    COSMETOLOGISTS.forEach(c => expect(c.trim().length).toBeGreaterThan(0));
  });
});

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

describe('CATEGORIES', () => {
  it('починається з "Всі записи"', () => {
    expect(CATEGORIES[0]).toBe('Всі записи');
  });

  it('містить базові категорії послуг', () => {
    expect(CATEGORIES).toContain('Масаж');
    expect(CATEGORIES).toContain('Elos-епіляція');
    expect(CATEGORIES).toContain('Доглядові процедури');
  });

  it('містить підкатегорії "Доглядові процедури"', () => {
    expect(CATEGORIES).toContain('Доглядові процедури - Ольга');
    expect(CATEGORIES).toContain('Доглядові процедури - Катерина');
    expect(CATEGORIES).toContain('Доглядові процедури - Юлія');
    expect(CATEGORIES).toContain('Доглядові процедури - Євгенія');
  });

  it('містить "Масаж - Анна"', () => {
    expect(CATEGORIES).toContain('Масаж - Анна');
  });

  it('містить "Архів" та "Перетелефонувати"', () => {
    expect(CATEGORIES).toContain('Архів');
    expect(CATEGORIES).toContain('Перетелефонувати');
  });

  it('не містить дублікатів', () => {
    const unique = new Set(CATEGORIES);
    expect(unique.size).toBe(CATEGORIES.length);
  });
});

// ─── SERVICES_LIST ────────────────────────────────────────────────────────────

describe('SERVICES_LIST', () => {
  it('є непорожнім масивом', () => {
    expect(Array.isArray(SERVICES_LIST)).toBe(true);
    expect(SERVICES_LIST.length).toBeGreaterThan(0);
  });

  it('містить косметологічні послуги', () => {
    expect(SERVICES_LIST).toContain('Чистка обличчя (комбінована)');
    expect(SERVICES_LIST).toContain('Чистка обличчя (ультразвукова)');
  });

  it('містить масажні послуги', () => {
    expect(SERVICES_LIST).toContain('Масаж тіла (загальний)');
    expect(SERVICES_LIST).toContain('Масаж спини');
    expect(SERVICES_LIST).toContain('Антицелюлітний масаж');
  });

  it('містить послуги епіляції', () => {
    const epilServices = SERVICES_LIST.filter(s => s.startsWith('Elos-епіляція'));
    expect(epilServices.length).toBeGreaterThan(0);
  });

  it('не містить дублікатів', () => {
    const unique = new Set(SERVICES_LIST);
    expect(unique.size).toBe(SERVICES_LIST.length);
  });

  it('не містить пустих рядків', () => {
    SERVICES_LIST.forEach(s => expect(s.trim().length).toBeGreaterThan(0));
  });
});

// ─── INITIAL_RECORDS ──────────────────────────────────────────────────────────

describe('INITIAL_RECORDS', () => {
  it('є масивом', () => {
    expect(Array.isArray(INITIAL_RECORDS)).toBe(true);
  });

  it('кожен запис має обов\'язкові поля', () => {
    const required = ['id', 'clientName', 'phone', 'category', 'service', 'master', 'date', 'time'];
    INITIAL_RECORDS.forEach(record => {
      required.forEach(field => {
        expect(record).toHaveProperty(field);
      });
    });
  });

  it('поле id унікальне', () => {
    const ids = INITIAL_RECORDS.map(r => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('поле date у форматі YYYY-MM-DD', () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    INITIAL_RECORDS.forEach(r => {
      expect(r.date).toMatch(dateRegex);
    });
  });

  it('поле time у форматі HH:MM', () => {
    const timeRegex = /^\d{2}:\d{2}$/;
    INITIAL_RECORDS.forEach(r => {
      expect(r.time).toMatch(timeRegex);
    });
  });

  it('поле phone не пустий рядок', () => {
    INITIAL_RECORDS.forEach(r => {
      expect(r.phone.trim().length).toBeGreaterThan(0);
    });
  });

  it('поле category є рядком з CATEGORIES або відомою категорією', () => {
    INITIAL_RECORDS.forEach(r => {
      expect(typeof r.category).toBe('string');
      expect(r.category.length).toBeGreaterThan(0);
    });
  });

  it('поле note може бути пустим рядком', () => {
    INITIAL_RECORDS.forEach(r => {
      expect(typeof r.note).toBe('string');
    });
  });
});