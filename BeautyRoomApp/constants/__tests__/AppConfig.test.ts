import { canAccess } from '../AppConfig';

describe('AppConfig Permissions', () => {
  it('should allow creator to access any tab', () => {
    expect(canAccess('Масаж', 'creator')).toBe(true);
    expect(canAccess('Всі записи', 'creator')).toBe(true);
  });

  it('should allow admin to access any tab based on ALL_CATEGORIES', () => {
    expect(canAccess('Масаж', 'admin')).toBe(true);
    expect(canAccess('Всі записи', 'admin')).toBe(true);
  });

  it('should allow massage master to access specific allowed tabs', () => {
    expect(canAccess('Масаж', 'massage')).toBe(true);
    expect(canAccess('Архів', 'massage')).toBe(true);
  });

  it('should deny massage master from accessing unallowed tabs', () => {
    expect(canAccess('Elos-епіляція', 'massage')).toBe(false);
    // Massage cannot see "Всі записи"
    expect(canAccess('Всі записи', 'massage')).toBe(false);
  });
});
