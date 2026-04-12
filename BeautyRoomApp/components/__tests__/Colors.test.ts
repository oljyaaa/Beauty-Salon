/**
 * __tests__/constants/Colors.test.ts
 *
 * Покриває:
 *  - наявність всіх кольорових токенів
 *  - формат hex-кольорів
 *  - унікальність значень (де це має бути)
 */

import { Colors } from '../../constants/Colors';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Colors', () => {
  const HEX_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

  const requiredTokens = [
    'primary',
    'primaryDark',
    'accent',
    'background',
    'cardBg',
    'textMain',
    'textSecondary',
    'inputBg',
    'border',
    'success',
    'danger',
  ];

  it('містить усі обов\'язкові токени', () => {
    requiredTokens.forEach(token => {
      expect(Colors).toHaveProperty(token);
    });
  });

  it('всі значення є рядками у форматі #HEX', () => {
    Object.entries(Colors).forEach(([key, value]) => {
      expect(typeof value).toBe('string');
      expect(value).toMatch(HEX_REGEX);
    });
  });

  it('primary відрізняється від primaryDark', () => {
    expect(Colors.primary).not.toBe(Colors.primaryDark);
  });

  it('success відрізняється від danger', () => {
    expect(Colors.success).not.toBe(Colors.danger);
  });

  it('background та cardBg визначені', () => {
    expect(Colors.background.length).toBeGreaterThan(0);
    expect(Colors.cardBg.length).toBeGreaterThan(0);
  });
});