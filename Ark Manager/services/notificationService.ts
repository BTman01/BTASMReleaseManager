import * as appSettingsService from './appSettingsService';

const isTauri = !!(window as any).__TAURI_INTERNALS__;

let permissionChecked = false;
let permissionGranted = false;

async function checkPermission(): Promise<boolean> {
  if (!isTauri) return false;
  if (permissionChecked) {
    return permissionGranted;
  }

  try {
    const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');
    permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }
  } catch (error) {
    console.error("Failed to check notification permissions:", error);
    permissionGranted = false;
  }

  permissionChecked = true;
  return permissionGranted;
}

export async function sendNotification(title: string, body: string, icon?: string): Promise<void> {
  const settings = appSettingsService.loadSettings();
  if (!settings.notificationsEnabled) {
    return;
  }

  // Format title with application branding if not already present
  const appBrandedTitle = title.startsWith('BT Ark ASM') || title.startsWith('Ark Server') 
    ? title 
    : `BT Ark ASM • ${title}`;

  if (isTauri) {
    try {
      const hasPermission = await checkPermission();
      if (hasPermission) {
        const { sendNotification: tauriSendNotification } = await import('@tauri-apps/plugin-notification');
        tauriSendNotification({ 
          title: appBrandedTitle, 
          body,
          icon: icon || 'icons/128x128.png'
        });
      }
    } catch (error) {
      console.error("Failed to send Tauri desktop notification:", error);
    }
  } else if (typeof window !== 'undefined' && 'Notification' in window) {
    // Web / browser fallback when running outside native Tauri runtime
    try {
      if (Notification.permission === 'granted') {
        new Notification(appBrandedTitle, { body, icon: icon || '/icons/128x128.png' });
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(appBrandedTitle, { body, icon: icon || '/icons/128x128.png' });
        }
      }
    } catch (err) {
      console.warn("Browser notification could not be delivered:", err);
    }
  }
}