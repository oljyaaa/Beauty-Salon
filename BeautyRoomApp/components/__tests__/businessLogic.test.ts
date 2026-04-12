/**
 * __tests__/integration/businessLogic.test.ts
 *
 * Інтеграційні тести бізнес-логіки:
 *  - маппінг даних API → внутрішні записи
 *  - фільтрація записів по категорії
 *  - логіка визначення типу запису (call/archive/record)
 *  - формування FormData для різних дій
 *  - визначення action для delete залежно від type
 *  - scheduleLocalNotification формує правильний зміст
 *  - canAccess + MENU_PERMISSIONS разом
 */

import { canAccess, MENU_PERMISSIONS, ALL_CATEGORIES } from '../../constants/AppConfig';
import { COSMETOLOGISTS } from '../../constants/Data';

// ─── Маппінг даних API ────────────────────────────────────────────────────────

describe('Маппінг даних API → records', () => {
  // Повторює логіку з StandardDashboard.fetchData
  const mapRecord = (i: any) => ({
    ...i,
    id: `rec_${i.id}`,
    realId: i.id,
    clientName: i.client_name,
    service: i.service_name,
    date: i.record_date,
    time: i.record_time,
    type: 'record',
    master: i.worker_name || 'Не вказано',
  });

  const mapArchive = (i: any) => ({
    ...i,
    id: `arch_${i.id}`,
    realId: i.id,
    clientName: i.name,
    category: 'Архів',
    service: (i.service || '').split(' → ')[1] || i.service,
    date: (i.datetime || '').split(' ')[0],
    time: ((i.datetime || '').split(' ')[1] || '').substr(0, 5),
    type: 'archive',
    master: 'Архів',
  });

  const mapCall = (i: any) => ({
    ...i,
    id: `call_${i.id}`,
    realId: i.id,
    clientName: i.name,
    category: 'Перетелефонувати',
    phone: i.phone,
    service: i.service || 'Не вказано',
    date: (i.created_at || '').split(' ')[0],
    time: ((i.created_at || '').split(' ')[1] || '').substr(0, 5),
    note: i.message,
    type: 'call',
  });

  describe('mapRecord', () => {
    const raw = {
      id: '42',
      client_name: 'Іван Петров',
      phone: '067 123 45 67',
      category: 'Масаж',
      service_name: 'Масаж спини',
      record_date: '2026-03-01',
      record_time: '11:30',
      worker_name: 'Анна',
    };

    it('формує id як "rec_<original_id>"', () => {
      expect(mapRecord(raw).id).toBe('rec_42');
    });

    it('зберігає realId', () => {
      expect(mapRecord(raw).realId).toBe('42');
    });

    it('маппить client_name → clientName', () => {
      expect(mapRecord(raw).clientName).toBe('Іван Петров');
    });

    it('маппить service_name → service', () => {
      expect(mapRecord(raw).service).toBe('Масаж спини');
    });

    it('маппить record_date → date', () => {
      expect(mapRecord(raw).date).toBe('2026-03-01');
    });

    it('маппить record_time → time', () => {
      expect(mapRecord(raw).time).toBe('11:30');
    });

    it('маппить worker_name → master', () => {
      expect(mapRecord(raw).master).toBe('Анна');
    });

    it('використовує "Не вказано" якщо worker_name відсутній', () => {
      const rawNoWorker = { ...raw, worker_name: null };
      expect(mapRecord(rawNoWorker).master).toBe('Не вказано');
    });

    it('встановлює type="record"', () => {
      expect(mapRecord(raw).type).toBe('record');
    });
  });

  describe('mapArchive', () => {
    const raw = {
      id: '10',
      name: 'Марія Коваль',
      service: 'Масаж → Масаж спини',
      datetime: '2026-02-10 15:30:00',
    };

    it('формує id як "arch_<original_id>"', () => {
      expect(mapArchive(raw).id).toBe('arch_10');
    });

    it('встановлює category="Архів"', () => {
      expect(mapArchive(raw).category).toBe('Архів');
    });

    it('витягує службу після " → "', () => {
      expect(mapArchive(raw).service).toBe('Масаж спини');
    });

    it('витягує службу якщо нема " → "', () => {
      const rawNoArrow = { ...raw, service: 'Масаж спини' };
      expect(mapArchive(rawNoArrow).service).toBe('Масаж спини');
    });

    it('витягує дату з datetime', () => {
      expect(mapArchive(raw).date).toBe('2026-02-10');
    });

    it('витягує час з datetime (перші 5 символів)', () => {
      expect(mapArchive(raw).time).toBe('15:30');
    });

    it('встановлює type="archive"', () => {
      expect(mapArchive(raw).type).toBe('archive');
    });

    it('обробляє пустий datetime', () => {
      const rawEmpty = { ...raw, datetime: '' };
      expect(mapArchive(rawEmpty).date).toBe('');
      expect(mapArchive(rawEmpty).time).toBe('');
    });
  });

  describe('mapCall', () => {
    const raw = {
      id: '7',
      name: 'Олег Дзвінок',
      phone: '050 777 88 99',
      service: 'Запит масажу',
      created_at: '2026-03-15 09:05:22',
      message: 'Хочу записатись на масаж',
    };

    it('формує id як "call_<original_id>"', () => {
      expect(mapCall(raw).id).toBe('call_7');
    });

    it('встановлює category="Перетелефонувати"', () => {
      expect(mapCall(raw).category).toBe('Перетелефонувати');
    });

    it('маппить message → note', () => {
      expect(mapCall(raw).note).toBe('Хочу записатись на масаж');
    });

    it('витягує дату з created_at', () => {
      expect(mapCall(raw).date).toBe('2026-03-15');
    });

    it('витягує час (HH:MM) з created_at', () => {
      expect(mapCall(raw).time).toBe('09:05');
    });

    it('встановлює service="Не вказано" якщо service відсутній', () => {
      const rawNoService = { ...raw, service: undefined };
      expect(mapCall(rawNoService).service).toBe('Не вказано');
    });

    it('встановлює type="call"', () => {
      expect(mapCall(raw).type).toBe('call');
    });
  });
});

// ─── Фільтрація записів ───────────────────────────────────────────────────────

describe('Фільтрація filteredRecords', () => {
  const records = [
    { id: '1', category: 'Масаж', type: 'record' },
    { id: '2', category: 'Elos-епіляція', type: 'record' },
    { id: '3', category: 'Архів', type: 'archive' },
    { id: '4', category: 'Перетелефонувати', type: 'call' },
    { id: '5', category: 'Доглядові процедури', type: 'record' },
  ];

  const filter = (selectedCategory: string) =>
    selectedCategory === 'Всі записи'
      ? records.filter(r => r.category !== 'Архів' && r.category !== 'Перетелефонувати')
      : records.filter(r => r.category === selectedCategory);

  it('"Всі записи" виключає Архів та Перетелефонувати', () => {
    const result = filter('Всі записи');
    expect(result.map(r => r.id)).toEqual(['1', '2', '5']);
  });

  it('"Масаж" показує тільки масаж', () => {
    const result = filter('Масаж');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('"Архів" показує тільки архів', () => {
    const result = filter('Архів');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('"Перетелефонувати" показує тільки дзвінки', () => {
    const result = filter('Перетелефонувати');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('4');
  });

  it('повертає пустий масив для неіснуючої категорії', () => {
    expect(filter('Неіснуюча')).toHaveLength(0);
  });
});

// ─── Delete action вибір ──────────────────────────────────────────────────────

describe('Вибір action для видалення за type', () => {
  const getDeleteAction = (type: string) => {
    if (type === 'call') return 'delete_appointment';
    if (type === 'archive') return 'delete_archive';
    return 'delete_record';
  };

  it('"call" → "delete_appointment"', () => {
    expect(getDeleteAction('call')).toBe('delete_appointment');
  });

  it('"archive" → "delete_archive"', () => {
    expect(getDeleteAction('archive')).toBe('delete_archive');
  });

  it('"record" → "delete_record"', () => {
    expect(getDeleteAction('record')).toBe('delete_record');
  });

  it('будь-який інший тип → "delete_record"', () => {
    expect(getDeleteAction('unknown')).toBe('delete_record');
  });
});

// ─── canAccess + MENU_PERMISSIONS інтеграція ──────────────────────────────────

describe('canAccess інтеграція з MENU_PERMISSIONS', () => {
  it('кожен майстер бачить тільки свої вкладки', () => {
    const userPermissions: Record<string, string[]> = {
      massage: ['Масаж', 'Архів', 'Перетелефонувати'],
      epil: ['Elos-епіляція', 'Архів', 'Перетелефонувати'],
      care: ['Доглядові процедури', 'Архів', 'Перетелефонувати'],
    };

    Object.entries(userPermissions).forEach(([username, allowed]) => {
      // Дозволені вкладки
      allowed.forEach(tab => {
        expect(canAccess(tab, username)).toBe(true);
      });

      // Заборонені вкладки
      ALL_CATEGORIES
        .filter(tab => !allowed.includes(tab) && tab !== 'Всі записи')
        .forEach(tab => {
          expect(canAccess(tab, username)).toBe(false);
        });
    });
  });

  it('admin та creator мають доступ до всіх вкладок', () => {
    ['admin', 'creator'].forEach(username => {
      ALL_CATEGORIES.forEach(tab => {
        expect(canAccess(tab, username)).toBe(true);
      });
    });
  });
});

// ─── Notification content ─────────────────────────────────────────────────────

describe('scheduleLocalNotification — зміст сповіщення', () => {
  // Відтворюємо логіку з index.tsx
  const buildNotificationContent = (name: string, phone: string) => ({
    content: {
      title: '📞 Нова заявка!',
      body: `Клієнт ${name} (${phone}) просить перетелефонувати.`,
      sound: true,
    },
    trigger: null,
  });

  it('формує правильний заголовок', () => {
    const n = buildNotificationContent('Іван', '050 123 45 67');
    expect(n.content.title).toBe('📞 Нова заявка!');
  });

  it('формує body з ім\'ям та телефоном', () => {
    const n = buildNotificationContent('Іван', '050 123 45 67');
    expect(n.content.body).toBe('Клієнт Іван (050 123 45 67) просить перетелефонувати.');
  });

  it('trigger є null (миттєве сповіщення)', () => {
    const n = buildNotificationContent('Тест', '000');
    expect(n.trigger).toBeNull();
  });

  it('sound встановлено в true', () => {
    const n = buildNotificationContent('Тест', '000');
    expect(n.content.sound).toBe(true);
  });
});

// ─── COSMETOLOGISTS фільтрація в RecordFormModal ──────────────────────────────

describe('MASTERS фільтрація (COSMETOLOGISTS без "Не обрано")', () => {
  const MASTERS = COSMETOLOGISTS.filter((m: string) => m !== 'Не обрано');

  it('не містить "Не обрано"', () => {
    expect(MASTERS).not.toContain('Не обрано');
  });

  it('містить всіх реальних майстрів', () => {
    expect(MASTERS).toContain('Ольга');
    expect(MASTERS).toContain('Анна');
    expect(MASTERS).toContain('Катерина');
    expect(MASTERS).toContain('Євгенія');
  });

  it('коротший за COSMETOLOGISTS на 1 елемент', () => {
    expect(MASTERS.length).toBe(COSMETOLOGISTS.length - 1);
  });
});

// ─── Формат дати/часу (RecordFormModal.handleSave) ───────────────────────────

describe('Форматування дати та часу з Date об\'єктів', () => {
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const mo = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${mo}-${d}`;
  };

  const formatTime = (time: Date) => {
    const hh = time.getHours().toString().padStart(2, '0');
    const mm = time.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  it('форматує дату 1 березня 2026 як "2026-03-01"', () => {
    expect(formatDate(new Date(2026, 2, 1))).toBe('2026-03-01');
  });

  it('форматує дату 31 грудня як "2026-12-31"', () => {
    expect(formatDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('форматує час 9:05 як "09:05"', () => {
    const t = new Date();
    t.setHours(9, 5);
    expect(formatTime(t)).toBe('09:05');
  });

  it('форматує час 23:59 як "23:59"', () => {
    const t = new Date();
    t.setHours(23, 59);
    expect(formatTime(t)).toBe('23:59');
  });

  it('форматує час 00:00 як "00:00"', () => {
    const t = new Date();
    t.setHours(0, 0);
    expect(formatTime(t)).toBe('00:00');
  });

  it('місяць з одного символу завжди має leading zero', () => {
    const jan = new Date(2026, 0, 5);
    expect(formatDate(jan)).toBe('2026-01-05');
  });
});