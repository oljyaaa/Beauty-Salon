/**
 * __tests__/app/index.test.tsx
 *
 * Покриває:
 *  - redirect на /login якщо userData відсутній
 *  - redirect на /login при помилці AsyncStorage
 *  - показ завантажувача під час перевірки
 *  - рендеринг StandardDashboard для звичайних ролей
 *  - рендеринг CreatorDashboard для ролі "creator"
 *  - запуск polling для admin/creator
 *  - відсутність polling для звичайних майстрів
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Мокуємо дочірні компоненти щоб ізолювати логіку index
jest.mock('../../components/CreatorDashboard', () => {
  const { Text } = require('react-native');
  return ({ user }: any) => <Text>CreatorDashboard:{user.role}</Text>;
});

jest.mock('../../components/StandardDashboard', () => {
  const { Text } = require('react-native');
  return ({ user }: any) => <Text>StandardDashboard:{user.role}</Text>;
});

import Index from '../../app/index';

// ─── Мокуємо fetch ────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockUserInStorage(user: object) {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(user));
}

function mockNoUserInStorage() {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
}

function mockStorageError() {
  (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Index — redirect', () => {
  it('перенаправляє на /login якщо userData відсутній', async () => {
    mockNoUserInStorage();
    render(<Index />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('перенаправляє на /login при помилці AsyncStorage', async () => {
    mockStorageError();
    render(<Index />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });
});

describe('Index — рендеринг dashboards', () => {
  it('рендерить StandardDashboard для ролі "massage"', async () => {
    mockUserInStorage({ role: 'massage', username: 'massage' });
    const { findByText } = render(<Index />);
    expect(await findByText('StandardDashboard:massage')).toBeTruthy();
  });

  it('рендерить StandardDashboard для ролі "admin"', async () => {
    mockUserInStorage({ role: 'admin', username: 'admin' });
    // admin НЕ creator — StandardDashboard
    const { findByText } = render(<Index />);
    expect(await findByText('StandardDashboard:admin')).toBeTruthy();
  });

  it('рендерить CreatorDashboard для ролі "creator"', async () => {
    mockUserInStorage({ role: 'creator', username: 'creator' });
    const { findByText } = render(<Index />);
    expect(await findByText('CreatorDashboard:creator')).toBeTruthy();
  });
});

describe('Index — polling', () => {
  it('запускає polling для ролі "admin"', async () => {
    mockUserInStorage({ role: 'admin', username: 'admin' });
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ status: 'success', server_time: '2026-01-01 00:00:00', new_items: [] }),
    });

    render(<Index />);

    await waitFor(() => {
      expect(mockFetch).not.toHaveBeenCalled(); // Ще не викликали — перший тік після 15s
    });

    await act(async () => {
      jest.advanceTimersByTime(15000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  it('запускає polling для ролі "creator"', async () => {
    mockUserInStorage({ role: 'creator', username: 'creator' });
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ status: 'success', server_time: '2026-01-01 00:00:00', new_items: [] }),
    });

    render(<Index />);

    await act(async () => {
      jest.advanceTimersByTime(15000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  it('НЕ запускає polling для ролі "massage"', async () => {
    mockUserInStorage({ role: 'massage', username: 'massage' });

    render(<Index />);

    await act(async () => {
      jest.advanceTimersByTime(30000);
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('НЕ запускає polling для ролі "epil"', async () => {
    mockUserInStorage({ role: 'epil', username: 'epil' });

    render(<Index />);

    await act(async () => {
      jest.advanceTimersByTime(30000);
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('надсилає сповіщення якщо є нові заявки', async () => {
    const { scheduleNotificationAsync } = require('expo-notifications');
    mockUserInStorage({ role: 'admin', username: 'admin' });

    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          status: 'success',
          server_time: '2026-01-01 00:00:15',
          new_items: [{ name: 'Тест', phone: '050 000 00 00' }],
        }),
    });

    render(<Index />);

    await act(async () => {
      jest.advanceTimersByTime(15000);
    });

    await waitFor(() => {
      expect(scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: '📞 Нова заявка!',
          }),
        })
      );
    });
  });

  it('НЕ надсилає сповіщення якщо new_items пустий', async () => {
    const { scheduleNotificationAsync } = require('expo-notifications');
    mockUserInStorage({ role: 'admin', username: 'admin' });

    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          status: 'success',
          server_time: '2026-01-01 00:00:15',
          new_items: [],
        }),
    });

    render(<Index />);

    await act(async () => {
      jest.advanceTimersByTime(15000);
    });

    await waitFor(() => {
      expect(scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });
});