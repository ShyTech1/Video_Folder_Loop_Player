import ElectronStore from 'electron-store';
import type { Settings } from '../renderer/types';

const defaultSettings: Settings = {
  folderPath: '',
  muted: true,
  showControls: false,
  fullscreen: false
};

const store = new ElectronStore<Settings>({
  defaults: defaultSettings
});

export function getSettings(): Settings {
  return {
    folderPath: store.get('folderPath', defaultSettings.folderPath),
    muted: store.get('muted', defaultSettings.muted),
    showControls: store.get('showControls', defaultSettings.showControls),
    fullscreen: store.get('fullscreen', defaultSettings.fullscreen)
  };
}

export function saveSettings(settings: Settings): void {
  store.set('folderPath', settings.folderPath);
  store.set('muted', settings.muted);
  store.set('showControls', settings.showControls);
  store.set('fullscreen', settings.fullscreen);
}
