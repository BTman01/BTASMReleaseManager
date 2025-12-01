import { AppSettings } from '../types';

const SETTINGS_KEY = 'ark_server_manager_settings';

const DEFAULT_SETTINGS: AppSettings = {
  startWithWindows: false,
  theme: 'dark',
  notificationsEnabled: true,
  defaultServerPath: null,
  autoSaveOnStart: false,
};

export function loadSettings(): AppSettings {
  try {
    const settingsJson = localStorage.getItem(SETTINGS_KEY);
    if (settingsJson) {
      const loaded = JSON.parse(settingsJson);
      // Merge with defaults to ensure all keys are present
      return { ...DEFAULT_SETTINGS, ...loaded };
    }
  } catch (error) {
    console.error("Failed to load settings from localStorage:", error);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    const settingsJson = JSON.stringify(settings);
    localStorage.setItem(SETTINGS_KEY, settingsJson);
  } catch (error) {
    console.error("Failed to save settings to localStorage:", error);
  }
}