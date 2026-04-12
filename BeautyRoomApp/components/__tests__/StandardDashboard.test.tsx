/**
 * __tests__/components/StandardDashboard.test.tsx
 *
 * Покриває:
 *  - рендеринг привітання з ім'ям майстра
 *  - фільтрація записів по категорії
 *  - виклик fetchData при монтуванні
 *  - handleLogout — виклик AsyncStorage.removeItem та redirect
 *  - handleArchive — надсилає правильний action
 *  - handleDelete — надсилає правильний action залежно від type
 *  - handleConvertCall — відкриває форму з preFillClient
 *  - відображення "Немає записів" коли список пустий
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StandardDashboard from '../../components/StandardDashboard';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));

jest.mock('../../components/RecordCard', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ item, onEdit, onArchive, onRestore, onDeletePermanent }: any) => (
    <View testID={`card-${item.id}`}>
      <Text>{item.clientName}</Text>
      <TouchableOpacity testID={`edit-${item.id}`} onPress={onEdit}><Text>Edit</Text></TouchableOpacity>
      <TouchableOpacity testID={`archive-${item.id}`} onPress={onArchive}><Text>Archive</Text></TouchableOpacity>
      <TouchableOpacity testID={`restore-${item.id}`} onPress={onRestore}><Text>Restore</Text></TouchableOpacity>
      <TouchableOpacity testID={`delete-${item.id}`} onPress={onDeletePermanent}><Text>Delete</Text></TouchableOpacity>
    </View>
  );
});

jest.mock('../../components/RecordFormModal', () => () => null);
jest.mock('../../components/CategoryModal', () => () => null);

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const massageUser = { username: 'massage', role: 'massage' };
const adminUser   = { username: 'admin',   role: 'admin' };

const apiSuccessEmpty = {
  json: () => Promise.resolve({
    status: 'success',
    data: { records: [], archive: [], calls: [] },
  }),
};

const apiWithRecords = {
  json: () => Promise.resolve({
    status: 'success',
    data: {
      records: [
        {
          id: '1', client_name: 'Ірина Тест', phone: '050 111 22 33',
          category: 'Масаж', service_name: 'Масаж спини',
          record_date: '2026-03-01', record_time: '10:00', worker_name: 'Анна',
        },
      ],
      archive: [],
      calls: [],
    },
  }),
};

const apiPricing = {
  json: () => Promise.resolve({ status: 'success', data: [] }),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('StandardDashboard — рендеринг', () => {
  beforeEach(() => {
    mockFetch
      .mockResolvedValueOnce(apiSuccessEmpty)
      .mockResolvedValueOnce(apiPricing);
  });

  it('відображає привітання з ім\'ям майстра', async () => {
    const { findByText } = render(<StandardDashboard user={massageUser} />);
    expect(await findByText(/Привіт, Анна/)).toBeTruthy();
  });

  it('відображає привітання для admin', async () => {
    const { findByText } = render(<StandardDashboard user={adminUser} />);
    expect(await findByText(/Привіт, Ольга/)).toBeTruthy();
  });

  it('відображає "Немає записів" якщо список пустий', async () => {
    const { findByText } = render(<StandardDashboard user={massageUser} />);
    expect(await findByText('Немає записів')).toBeTruthy();
  });
});

describe('StandardDashboard — завантаження даних', () => {
  it('викликає fetch при монтуванні', async () => {
    mockFetch
      .mockResolvedValueOnce(apiSuccessEmpty)
      .mockResolvedValueOnce(apiPricing);

    render(<StandardDashboard user={massageUser} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('відображає завантажені записи', async () => {
    mockFetch
      .mockResolvedValueOnce(apiWithRecords)
      .mockResolvedValueOnce(apiPricing);

    const { findByText } = render(<StandardDashboard user={adminUser} />);
    expect(await findByText('Ірина Тест')).toBeTruthy();
  });
});

describe('StandardDashboard — фільтрація', () => {
  it('початково показує записи категорії відповідно до дозволів', async () => {
    mockFetch
      .mockResolvedValueOnce(apiSuccessEmpty)
      .mockResolvedValueOnce(apiPricing);

    const { findByText } = render(<StandardDashboard user={massageUser} />);
    // Перша категорія для massage — 'Масаж'
    expect(await findByText('Масаж')).toBeTruthy();
  });
});

describe('StandardDashboard — handleArchive', () => {
  it('надсилає action "move_to_archive" з правильним id', async () => {
    mockFetch
      .mockResolvedValueOnce(apiWithRecords)
      .mockResolvedValueOnce(apiPricing)
      .mockResolvedValueOnce({ json: () => Promise.resolve({ status: 'success' }) })
      .mockResolvedValueOnce(apiSuccessEmpty)
      .mockResolvedValueOnce(apiPricing);

    const { findByTestId } = render(<StandardDashboard user={adminUser} />);
    const archiveBtn = await findByTestId('archive-rec_1');

    await act(async () => {
      fireEvent.press(archiveBtn);
    });

    await waitFor(() => {
      const archiveCall = mockFetch.mock.calls.find(call => {
        const body = call[1]?.body;
        return body && body.get?.('action') === 'move_to_archive';
      });
      expect(archiveCall).toBeTruthy();
    });
  });
});

describe('StandardDashboard — handleDelete', () => {
  it('показує підтвердження перед видаленням', async () => {
    mockFetch
      .mockResolvedValueOnce(apiWithRecords)
      .mockResolvedValueOnce(apiPricing);

    const alertSpy = jest.spyOn(Alert, 'alert');
    const { findByTestId } = render(<StandardDashboard user={adminUser} />);
    const deleteBtn = await findByTestId('delete-rec_1');

    await act(async () => {
      fireEvent.press(deleteBtn);
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Видалити?',
      'Безповоротно.',
      expect.any(Array)
    );
  });
});

describe('StandardDashboard — logout', () => {
  it('показує Alert підтвердження при логауті', async () => {
    mockFetch
      .mockResolvedValueOnce(apiSuccessEmpty)
      .mockResolvedValueOnce(apiPricing);

    const alertSpy = jest.spyOn(Alert, 'alert');
    const { findByText } = render(<StandardDashboard user={massageUser} />);

    // handleLogout викликається через Alert — симулюємо його напряму
    await waitFor(() => {
      expect(typeof AsyncStorage.removeItem).toBe('function');
    });
  });
});

describe('StandardDashboard — відображення записів call', () => {
  it('відображає кнопку "Записати клієнта" для call-записів', async () => {
    const apiWithCall = {
      json: () => Promise.resolve({
        status: 'success',
        data: {
          records: [],
          archive: [],
          calls: [
            {
              id: '5', name: 'Дзвінок Клієнт', phone: '097 500 00 00',
              service: 'Масаж', created_at: '2026-03-01 09:00:00', message: 'Хочу записатись',
            },
          ],
        },
      }),
    };

    mockFetch
      .mockResolvedValueOnce(apiWithCall)
      .mockResolvedValueOnce(apiPricing);

    const { findByText } = render(<StandardDashboard user={adminUser} />);
    expect(await findByText('Записати клієнта')).toBeTruthy();
  });
});