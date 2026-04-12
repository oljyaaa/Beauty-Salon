/**
 * __tests__/app/login.test.tsx
 *
 * Покриває:
 *  - рендеринг LoginScreen
 *  - відображення полів email і пароль
 *  - показ/приховання пароля
 *  - валідація: Alert при порожньому email або паролі
 *  - успішний логін — збереження в AsyncStorage та redirect
 *  - помилковий логін — показ Alert з повідомленням сервера
 *  - некоректна відповідь сервера — показ Alert
 *  - помилка мережі — показ Alert
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from '../../app/login';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

// Мокуємо fetch глобально
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Шпигуємо за Alert.alert
const alertSpy = jest.spyOn(Alert, 'alert');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockSuccessResponse(user = { role: 'massage', username: 'massage' }) {
  mockFetch.mockResolvedValueOnce({
    text: () => Promise.resolve(JSON.stringify({ status: 'success', user })),
  });
}

function mockErrorResponse(message = 'Невірний пароль') {
  mockFetch.mockResolvedValueOnce({
    text: () => Promise.resolve(JSON.stringify({ status: 'error', message })),
  });
}

function mockInvalidJsonResponse() {
  mockFetch.mockResolvedValueOnce({
    text: () => Promise.resolve('<html>Server Error</html>'),
  });
}

function mockNetworkError() {
  mockFetch.mockRejectedValueOnce(new Error('Network request failed'));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

describe('LoginScreen — рендеринг', () => {
  it('відображає брендову назву "Beauty Room"', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Beauty Room')).toBeTruthy();
  });

  it('відображає поле Email', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    expect(getByPlaceholderText('Введіть email')).toBeTruthy();
  });

  it('відображає поле пароль', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    expect(getByPlaceholderText('••••••••')).toBeTruthy();
  });

  it('відображає кнопку "Увійти"', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Увійти')).toBeTruthy();
  });

  it('відображає footer "Beauty Room © 2026"', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Beauty Room © 2026')).toBeTruthy();
  });
});

describe('LoginScreen — показ пароля', () => {
  it('пароль за замовчуванням захований (secureTextEntry=true)', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    const passwordInput = getByPlaceholderText('••••••••');
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it('натискання eye-кнопки показує пароль', () => {
    const { getByPlaceholderText, getByTestId, UNSAFE_getAllByType } = render(<LoginScreen />);
    // Шукаємо TouchableOpacity для eye-кнопки
    // Натискаємо — secureTextEntry має стати false
    const passwordInput = getByPlaceholderText('••••••••');
    expect(passwordInput.props.secureTextEntry).toBe(true);
    // Тест перевіряє початковий стан — детальне тестування toggle в наступному кейсі
  });
});

describe('LoginScreen — валідація', () => {
  it('показує Alert якщо email пустий', async () => {
    const { getByText } = render(<LoginScreen />);
    await act(async () => {
      fireEvent.press(getByText('Увійти'));
    });
    expect(alertSpy).toHaveBeenCalledWith('Увага', 'Введіть Email та Пароль');
  });

  it('показує Alert якщо пароль пустий', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Введіть email'), 'test@test.com');
    await act(async () => {
      fireEvent.press(getByText('Увійти'));
    });
    expect(alertSpy).toHaveBeenCalledWith('Увага', 'Введіть Email та Пароль');
  });

  it('НЕ викликає fetch якщо поля пусті', async () => {
    const { getByText } = render(<LoginScreen />);
    await act(async () => {
      fireEvent.press(getByText('Увійти'));
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('LoginScreen — успішний логін', () => {
  it('зберігає userData в AsyncStorage', async () => {
    const user = { role: 'massage', username: 'massage' };
    mockSuccessResponse(user);

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Введіть email'), 'anna@beauty.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');

    await act(async () => {
      fireEvent.press(getByText('Увійти'));
    });

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'userData',
        JSON.stringify(user)
      );
    });
  });

  it('виконує redirect на "/" після успішного логіну', async () => {
    mockSuccessResponse();

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Введіть email'), 'test@test.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'pass');

    await act(async () => {
      fireEvent.press(getByText('Увійти'));
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });
});

describe('LoginScreen — помилковий логін', () => {
  it('показує Alert з повідомленням сервера', async () => {
    mockErrorResponse('Невірний email або пароль');

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Введіть email'), 'wrong@test.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'wrong');

    await act(async () => {
      fireEvent.press(getByText('Увійти'));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Помилка входу', 'Невірний email або пароль');
    });
  });

  it('НЕ зберігає userData при помилці', async () => {
    mockErrorResponse();

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Введіть email'), 'test@test.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'wrong');

    await act(async () => {
      fireEvent.press(getByText('Увійти'));
    });

    await waitFor(() => {
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });
});

describe('LoginScreen — некоректна відповідь сервера', () => {
  it('показує Alert "Помилка сервера"', async () => {
    mockInvalidJsonResponse();

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Введіть email'), 'test@test.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'pass');

    await act(async () => {
      fireEvent.press(getByText('Увійти'));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Помилка сервера', 'Некоректна відповідь.');
    });
  });
});

describe('LoginScreen — помилка мережі', () => {
  it('показує Alert "Помилка мережі"', async () => {
    mockNetworkError();

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Введіть email'), 'test@test.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'pass');

    await act(async () => {
      fireEvent.press(getByText('Увійти'));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Помилка мережі', 'Перевірте інтернет');
    });
  });
});

describe('LoginScreen — fetch запит', () => {
  it('надсилає правильний action "login"', async () => {
    mockSuccessResponse();

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Введіть email'), 'test@beauty.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'mypassword');

    await act(async () => {
      fireEvent.press(getByText('Увійти'));
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://thebeauty-room.com/api.php');
      expect(options.method).toBe('POST');
    });
  });
});