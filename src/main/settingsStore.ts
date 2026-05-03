import Store from 'electron-store';
import type { Settings } from '../renderer/types';

const defaultSettings: Settings = {
  folderPath: '',
  muted: true,
  showControls: false,
  fullscreen: false
};

const store = new Store<Settings>({
  defaults: defaultSettings
});

export function getSettings(): Settings {
  return { ...defaultSettings, ...store.store };
}

export function saveSettings(settings: Settings): void {
  store.set(settings);
}
