import { isPermissionGranted, requestPermission, sendNotification as tauriSendNotification } from '@tauri-apps/plugin-notification';
import * as appSettingsService from './appSettingsService';

let permissionChecked = false;
let permissionGranted = false;

async function checkPermission(): Promise<boolean> {
  if (permissionChecked) {
    return permissionGranted;
  }

  permissionGranted = await isPermissionGranted();
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === 'granted';
  }

  permissionChecked = true;
  return permissionGranted;
}

export async function sendNotification(title: string, body: string): Promise<void> {
  const settings = appSettingsService.loadSettings();
  if (!settings.notificationsEnabled) {
    return;
  }

  try {
    const hasPermission = await checkPermission();
    if (hasPermission) {
      tauriSendNotification({ title, body });
    }
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}
