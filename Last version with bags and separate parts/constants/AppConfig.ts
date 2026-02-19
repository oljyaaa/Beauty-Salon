// constants/AppConfig.ts

export const API_URL = 'https://thebeauty-room.com/api.php'; 

export const ALL_CATEGORIES = ['Всі записи', 'Масаж', 'Elos-епіляція', 'Доглядові процедури', 'Архів', 'Перетелефонувати', 'Прайс', 'Історія'];
export const SERVICE_CATEGORIES = ['Масаж', 'Elos-епіляція', 'Доглядові процедури'];

export const MASTER_NAMES: {[key: string]: string} = {
  'admin': 'Ольга (Адмін)', 'massage': 'Анна', 'epil': 'Катерина', 'care': 'Євгенія', 'creator': 'Creator', 'pr': 'PR'
};

// Хто що бачить в МЕНЮ
export const MENU_PERMISSIONS: {[key: string]: string[]} = {
  'massage': ['Масаж', 'Архів', 'Перетелефонувати'],
  'epil': ['Elos-епіляція', 'Архів', 'Перетелефонувати'],
  'care': ['Доглядові процедури', 'Архів', 'Перетелефонувати'],
  'admin': ALL_CATEGORIES,
  'creator': ALL_CATEGORIES
};

// Хто що бачить у ФОРМІ ЗАПИСУ
export const FORM_PERMISSIONS: {[key: string]: string[]} = {
  'massage': ['Масаж'],
  'epil': ['Elos-епіляція'],
  'care': ['Доглядові процедури']
};

export const canAccess = (tab: string, username: string) => {
  if (username === 'creator') return true;
  const allowed = MENU_PERMISSIONS[username] || ALL_CATEGORIES;
  if (allowed.includes('Всі записи') && tab === 'Всі записи') return true;
  return allowed.includes(tab);
};